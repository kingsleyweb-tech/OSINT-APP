import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { explore, quotaStatus } from '../explore/exploreService';
import { SOCIAL_PLATFORMS } from '../explore/engineCatalog';
import type { ExploreItem } from '../../types/explore';
import { adminAuth, adminDb } from './admin';
import { mailConfigured, sendAlertEmail, type MailMatch } from './mailer';

/**
 * Keyword alerts. An alert belongs to one user (ownerUid). Each run searches Google News and the chosen
 * social platforms for every keyword (the same Explore searches as the search pages, cached 12 hours),
 * keeps only results whose own title or snippet contains the keyword, and stores the ones not seen
 * before. New results are emailed to the owner's account email only, and shown as an in-app notification.
 * Nothing is invented: every match is a result a search engine returned, with its link.
 */

export type AlertFrequency = 'daily' | '12h' | '6h';

export interface AlertDoc {
  ownerUid: string;
  name: string;
  keywords: string[];
  /** 'news' and/or social platform ids (x, facebook…). */
  sources: string[];
  country?: string;
  language?: string;
  frequency: AlertFrequency;
  active: boolean;
  emailEnabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt: string;
  matchCount?: number;
  lastResult?: { at: string; checked: number; newMatches: number; searchesUsed: number; status: 'ok' | 'waiting' | 'error'; message?: string };
}

const FREQ_MS: Record<AlertFrequency, number> = { daily: 24 * 3600e3, '12h': 12 * 3600e3, '6h': 6 * 3600e3 };
const ALERTS = 'alerts';
const BUDGET_DOC = 'system/alertsBudget';

const maxPerDay = () => Number(process.env.ALERTS_MAX_SEARCHES_PER_DAY) || 8;
const reserve = () => Number(process.env.ALERTS_QUOTA_RESERVE) || 25;

export function validAlertInput(a: Partial<AlertDoc>): string | null {
  if (!Array.isArray(a.keywords) || a.keywords.length < 1 || a.keywords.length > 5) return 'Add between 1 and 5 keywords.';
  if (a.keywords.some(k => typeof k !== 'string' || k.trim().length < 2 || k.length > 80)) return 'Each keyword must be 2–80 characters.';
  if (!Array.isArray(a.sources) || a.sources.length === 0) return 'Choose at least one source.';
  if (a.sources.some(s => s !== 'news' && !SOCIAL_PLATFORMS[s])) return 'Unknown source.';
  return null;
}

/** SerpApi searches one run can use at most (Google + Bing News per keyword, one search per platform per keyword). */
export function searchesPerRun(a: Pick<AlertDoc, 'keywords' | 'sources'>): number {
  const social = a.sources.filter(s => s !== 'news').length;
  return a.keywords.length * ((a.sources.includes('news') ? 2 : 0) + social);
}

function urlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}
const matchId = (url: string) => crypto.createHash('sha1').update(urlKey(url)).digest('hex').slice(0, 32);

/** The result's own words contain the keyword (all of its words), or the search scored it a strong match. */
function mentions(item: ExploreItem, keyword: string): boolean {
  const text = `${item.title} ${item.snippet || ''}`.toLowerCase();
  const k = keyword.toLowerCase().replace(/^#/, '').trim();
  if (text.includes(k)) return true;
  const words = k.split(/\s+/).filter(w => w.length > 1);
  return item.relevance?.label === 'Strong match' && words.every(w => text.includes(w));
}

async function budgetUsedToday(): Promise<{ day: string; used: number }> {
  const day = new Date().toISOString().slice(0, 10);
  const snap = await adminDb().doc(BUDGET_DOC).get();
  const d = snap.data();
  return { day, used: d?.day === day ? Number(d.used) || 0 : 0 };
}

async function addBudget(used: number): Promise<void> {
  if (used <= 0) return;
  const { day, used: before } = await budgetUsedToday();
  await adminDb().doc(BUDGET_DOC).set({ day, used: before + used, updatedAt: new Date().toISOString() });
}

export async function alertsStatus(): Promise<{ budgetPerDay: number; usedToday: number; searchesLeft: number | null }> {
  const [{ used }, q] = await Promise.all([budgetUsedToday(), quotaStatus()]);
  return { budgetPerDay: maxPerDay(), usedToday: used, searchesLeft: typeof q.searchesLeft === 'number' ? q.searchesLeft : null };
}

/** Whether a run of this size fits the daily alert budget and keeps the monthly reserve. */
async function canSpend(n: number): Promise<string | null> {
  const [{ used }, q] = await Promise.all([budgetUsedToday(), quotaStatus()]);
  if (used + n > maxPerDay()) return `Daily alert search limit reached (${used} of ${maxPerDay()} used). It will run again tomorrow.`;
  if (typeof q.searchesLeft === 'number' && q.searchesLeft - n < reserve()) return `Search credits are low (${q.searchesLeft} left this month); alerts wait so the rest of the app keeps working.`;
  return null;
}

/** Runs one alert. `manual` = started by its owner with "Run now" (first run included). */
export async function runAlert(id: string, opts: { manual?: boolean } = {}): Promise<NonNullable<AlertDoc['lastResult']>> {
  const db = adminDb();
  const ref = db.collection(ALERTS).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Alert not found.');
  const alert = snap.data() as AlertDoc;
  const now = new Date();
  const at = now.toISOString();
  const firstRun = !alert.lastRunAt;
  const nextRunAt = new Date(now.getTime() + (FREQ_MS[alert.frequency] || FREQ_MS.daily)).toISOString();

  const cost = searchesPerRun(alert);
  const blocked = await canSpend(cost);
  if (blocked) {
    const result = { at, checked: 0, newMatches: 0, searchesUsed: 0, status: 'waiting' as const, message: blocked };
    // A scheduled run that cannot spend retries at the next cron cycle; a manual one keeps its schedule.
    await ref.update({ lastResult: result, ...(opts.manual ? {} : { nextRunAt: new Date(now.getTime() + 3 * 3600e3).toISOString() }) });
    return result;
  }

  // The first run looks back a week to show what is already happening; later runs look at the last day.
  const when = firstRun ? 'w' as const : 'd' as const;
  const social = alert.sources.filter(s => s !== 'news');
  const found = new Map<string, { item: ExploreItem; keyword: string }>();
  let searchesUsed = 0;
  let checked = 0;
  let failures = 0;
  let attempts = 0;

  for (const keyword of alert.keywords) {
    const runs = [
      ...(alert.sources.includes('news') ? [{ capability: 'news' as const, platforms: undefined }] : []),
      ...(social.length ? [{ capability: 'social' as const, platforms: social }] : [])
    ];
    for (const r of runs) {
      attempts++;
      try {
        const res = await explore({ capability: r.capability, query: keyword, options: { when, country: alert.country, language: alert.language, platforms: r.platforms } });
        searchesUsed += res.stats.searchesUsed || 0;
        checked += res.items.length;
        res.items.filter(i => mentions(i, keyword)).forEach(item => {
          const k = matchId(item.url);
          if (!found.has(k)) found.set(k, { item, keyword });
        });
      } catch (e) {
        failures++;
        console.error('[Alerts] search failed:', e instanceof Error ? e.message : 'unknown error');
      }
    }
  }
  await addBudget(searchesUsed);

  // Only results not stored before are new.
  const ids = Array.from(found.keys());
  const existing = new Set<string>();
  for (let i = 0; i < ids.length; i += 100) {
    const refs = ids.slice(i, i + 100).map(x => ref.collection('matches').doc(x));
    if (refs.length) (await db.getAll(...refs)).forEach(s => { if (s.exists) existing.add(s.id); });
  }
  const fresh = ids.filter(x => !existing.has(x)).map(x => ({ id: x, ...found.get(x)! }));

  const batch = db.batch();
  fresh.forEach(({ id: mid, item, keyword }) => batch.set(ref.collection('matches').doc(mid), {
    title: item.title,
    url: item.url,
    source: item.author || item.platform || item.domain,
    ...(item.snippet ? { snippet: item.snippet.slice(0, 400) } : {}),
    ...(item.publishedText ? { publishedText: item.publishedText } : {}),
    ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
    engine: item.engine,
    kind: item.kind,
    keyword,
    foundAt: at
  }));
  const status = failures > 0 && failures === attempts ? 'error' as const : 'ok' as const;
  const result = {
    at, checked, newMatches: fresh.length, searchesUsed, status,
    ...(status === 'error' ? { message: 'The search engines could not be reached. It will try again at the next run.' } : {})
  };
  batch.update(ref, { lastRunAt: at, nextRunAt, lastResult: result, matchCount: FieldValue.increment(fresh.length) });
  await batch.commit();

  if (fresh.length > 0) await notifyOwner(alert, fresh.map(f => toMail(f.item, f.keyword)), firstRun, id);
  return result;
}

const toMail = (item: ExploreItem, keyword: string): MailMatch => ({
  title: item.title, url: item.url, source: item.author || item.platform || item.domain,
  snippet: item.snippet, publishedText: item.publishedText, keyword
});

/** Email + in-app notification to the alert's owner — never to anyone else. */
async function notifyOwner(alert: AlertDoc, matches: MailMatch[], firstRun: boolean, alertId: string): Promise<void> {
  const db = adminDb();
  const id = `alert-${alertId}-${Date.now()}`;
  await db.collection('users').doc(alert.ownerUid).collection('notifications').doc(id).set({
    id, type: 'system_alert', read: false, createdAt: new Date().toISOString(),
    title: `${firstRun ? 'Alert started' : 'New matches'}: ${alert.name}`,
    message: `${matches.length} ${firstRun ? 'result' : 'new result'}${matches.length === 1 ? '' : 's'} — e.g. "${matches[0].title.slice(0, 90)}"`
  }).catch(() => undefined);

  if (!alert.emailEnabled || !mailConfigured()) return;
  try {
    const user = await adminAuth().getUser(alert.ownerUid);
    if (!user.email) return;
    await sendAlertEmail(user.email, alert.name, matches, firstRun);
  } catch {
    console.error('[Alerts] email could not be sent for an alert.');
  }
}

/** Runs every active alert whose time has come, oldest first, until the daily budget is used. */
export async function runDueAlerts(): Promise<{ ran: number; waiting: number }> {
  const now = new Date().toISOString();
  // A single-field range query (no composite index needed); paused alerts are skipped here.
  const snap = await adminDb().collection(ALERTS).where('nextRunAt', '<=', now).orderBy('nextRunAt').limit(40).get();
  let ran = 0;
  let waiting = 0;
  for (const doc of snap.docs.filter(d => d.get('active') === true).slice(0, 20)) {
    try {
      const r = await runAlert(doc.id);
      if (r.status === 'waiting') {
        waiting++;
        if (/Daily alert search limit|credits are low/.test(r.message || '')) break;
      } else ran++;
    } catch {
      console.error('[Alerts] an alert run failed.');
    }
  }
  return { ran, waiting };
}
