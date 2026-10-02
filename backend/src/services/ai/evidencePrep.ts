/**
 * Evidence preparation: turns a saved investigation (as posted by its owner) into a compact, numbered list
 * of evidence (E1, E2…) for the model. Only what the case already collected is used.
 *
 * - Results the investigator marked "Raw", and accounts or activity of other people (relation "similar"),
 *   are left out.
 * - One entry per page: text from several parts of the case about the same URL is merged.
 * - Links that are not useful public pages (CDN images, API endpoints, localhost…) are dropped.
 * - Text is trimmed and the list capped, validated and subject-owned evidence first, so the request stays
 *   small. The investigator's own name, e-mail and account never go to the model.
 */
import type { AIField, Evidence, EvidenceKind } from './types';

const MAX_ITEMS = 120;
const MAX_CHARS = 45_000;
const MAX_ITEM_CHARS = 700;

/** Same key the frontend uses for review levels (lib/workspace.ts urlKey). */
export function urlKey(url?: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    let host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
    if (host === 'twitter.com') host = 'x.com';
    return `${host}${u.pathname.replace(/\/+$/, '')}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif)(\?|$)/i;
const BAD_HOST = /(^|\.)(gstatic\.com|googleusercontent\.com|ggpht\.com|ytimg\.com|fbcdn\.net|cdninstagram\.com|twimg\.com|licdn\.com|serpapi\.com|doubleclick\.net)$/i;

/** A public page worth citing (the same spirit as the report's link filter). Empty string when not. */
export function usableUrl(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  try {
    const u = new URL(raw.trim());
    if (!/^https?:$/.test(u.protocol)) return '';
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.endsWith('.local')) return '';
    if (BAD_HOST.test(host) || /^(cdn|img|images|thumbs?|static|lh\d)\./.test(host) || IMAGE_EXT.test(u.pathname)) return '';
    if (/\/(api|wp-json|graphql)(\/|$)/i.test(u.pathname) || /^api\./.test(host)) return '';
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

export const siteOf = (url: string): string => {
  try {
    const parts = new URL(url).hostname.toLowerCase().replace(/^(www|m|mobile)\./, '').split('.');
    // Registrable domain: "bbc.co.uk", "ug.edu.gh", "nytimes.com".
    const n = parts.length >= 3 && parts[parts.length - 1].length === 2 && parts[parts.length - 2].length <= 3 ? 3 : 2;
    return parts.slice(-n).join('.');
  } catch {
    return '';
  }
};

const clean = (s: unknown): string => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');
const EMPTY_VALUE = /^(not\b|unknown|n\/a|none|-+$|organisation$)/i;
export const hasValue = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && !EMPTY_VALUE.test(v.trim());

export interface PreparedEvidence {
  subject: string;
  /** Words that name the subject in a quote (full name, its parts, username, organisation name). */
  subjectNames: string[];
  entityKind: 'person' | 'organization';
  evidence: Evidence[];
  /** What the case already holds per field (for "missing information" and "already in case"). */
  known: Partial<Record<AIField, string>>;
}

const NEWS_PATH = /\/(news|article|articles|story|stories|politics|business|sports|entertainment|opinion|world|local)\/|\/20\d{2}\/\d{1,2}\/|-\d{5,}\.html?$/i;

const PRIORITY: Record<EvidenceKind, number> = {
  'org-fact': 0, website: 1, profile: 2, news: 3, web: 4, 'org-claim': 5, activity: 6, association: 7, location: 8, contact: 9, image: 10
};

export function prepareEvidence(inv: any): PreparedEvidence {
  const review: Record<string, string> = inv?.review && typeof inv.review === 'object' ? inv.review : {};
  const isRaw = (url?: string) => Boolean(url && review[urlKey(url)] === 'raw');
  const isValidated = (url?: string) => Boolean(url && review[urlKey(url)] === 'validated');
  const entityKind: 'person' | 'organization' = inv?.entityKind === 'organization' ? 'organization' : 'person';
  const subject = clean(inv?.organization?.name) && entityKind === 'organization'
    ? clean(inv.organization.name)
    : clean(inv?.targetProfile?.fullName) || clean(inv?.searchInputs?.queryValue) || clean(inv?.name) || 'the subject';

  const byKey = new Map<string, Evidence & { order: number }>();
  let order = 0;
  const add = (kind: EvidenceKind, src: { source?: string; url?: string; title?: string; parts: unknown[]; date?: string; own?: boolean }) => {
    const url = usableUrl(src.url);
    if (src.url && isRaw(src.url)) return;
    const text = src.parts.map(clean).filter(Boolean).join('. ').replace(/\.\s*\./g, '.');
    if (text.length < 12) return;
    const key = url ? urlKey(url) : `${kind}:${text.toLowerCase().slice(0, 120)}`;
    const cur = byKey.get(key);
    if (cur) {
      if (!cur.text.toLowerCase().includes(text.toLowerCase().slice(0, 80))) cur.text = `${cur.text} | ${text}`.slice(0, MAX_ITEM_CHARS);
      if (src.own) cur.own = true;
      if (!cur.date && src.date) cur.date = src.date;
      if (PRIORITY[kind] < PRIORITY[cur.kind]) cur.kind = kind;
      return;
    }
    byKey.set(key, {
      id: '', kind, source: clean(src.source) || (url ? siteOf(url) : 'Case record'), url, title: clean(src.title).slice(0, 160),
      text: text.slice(0, MAX_ITEM_CHARS), ...(src.date ? { date: clean(src.date) } : {}),
      level: isValidated(url) ? 'validated' : 'relevant', ...(src.own ? { own: true } : {}), order: order++
    });
  };

  const known: Partial<Record<AIField, string>> = {};
  const tp = inv?.targetProfile || {};

  // Profiles of the subject (not accounts that only resemble the searched username).
  const profiles: any[] = (Array.isArray(inv?.socialProfiles) ? inv.socialProfiles : [])
    .filter((p: any) => p && p.relation !== 'similar' && p.usernameMatch !== 'similar');
  profiles.forEach(p => {
    const a = p.attributes || {};
    const own = p.confidenceLabel === 'Verified Match' || p.usernameMatch === 'exact';
    add('profile', {
      source: p.platform, url: p.profileUrl || p.url, own,
      title: `${p.platform || 'Profile'} profile${p.profileName ? `: ${p.profileName}` : p.username ? `: @${p.username}` : ''}`,
      parts: [p.title, p.snippet, p.bio, a.headline && `Headline: ${a.headline}`, a.organization && `Organization: ${a.organization}`,
        a.education && `Education: ${a.education}`, a.location && `Location: ${a.location}`, ...(Array.isArray(a.details) ? a.details : []),
        a.email && `Public email: ${a.email}`, a.website && `Website: ${a.website}`]
    });
    if (!known.employer && hasValue(a.organization)) known.employer = a.organization;
    if (!known.education && hasValue(a.education)) known.education = a.education;
    if (!known.website && hasValue(a.website)) known.website = a.website;
  });
  if (profiles.length) known.social_profile = `${profiles.length} profile${profiles.length === 1 ? '' : 's'}`;

  (Array.isArray(inv?.webAndNews) ? inv.webAndNews : []).forEach((w: any) => {
    if (!w) return;
    let news = w.metadata?.itemType === 'news' || /news/i.test(String(w.sourceType || ''));
    try { news = news || NEWS_PATH.test(new URL(w.url).pathname); } catch { /* not a URL */ }
    add(news ? 'news' : 'web', {
      source: w.source, url: w.url, title: w.title, date: w.metadata?.date || w.metadata?.publishedAt,
      parts: [w.title, w.description, w.metadata?.snippet !== w.description ? w.metadata?.snippet : '']
    });
  });

  const activities: any[] = (Array.isArray(inv?.activities) ? inv.activities : []).filter((a: any) => a && a.relation !== 'similar');
  activities.forEach(a => add('activity', { source: a.sourceName, url: a.sourceUrl, title: a.title, date: a.date, parts: [a.title, a.briefReport, a.location && `Location: ${a.location}`] }));

  const assocs: any[] = Array.isArray(inv?.associations) ? inv.associations : Array.isArray(inv?.associationsList) ? inv.associationsList : [];
  assocs.filter(a => a?.name && review[`assoc:${String(a.name).toLowerCase()}`] !== 'raw').forEach(a => {
    add('association', { source: a.sourceName, url: a.sourceUrl, title: a.name, parts: [`${a.name} (${a.relationship || a.category || 'association'})`, a.evidenceCitation] });
  });
  if (assocs.length) known.organization = assocs.slice(0, 3).map(a => a.name).join(', ');

  // Organisation: knowledge panel facts, enrichment claims (with their quotes), its own website.
  // Enrichment and the Location/Contact tabs keep only sources tied to the subject, so those count as about it.
  const org = inv?.organization;
  if (org) {
    const facts = [org.type, org.description, ...(Array.isArray(org.facts) ? org.facts : [])].filter(Boolean);
    facts.forEach((f: any) => add('org-fact', { source: f.source, url: f.sourceUrl, title: `${org.name}: ${f.label}`, own: true, parts: [`${f.label}: ${f.value}`] }));
    if (org.website?.url) known.website = org.website.url;
    if (org.type?.value) known.industry = org.type.value;
    facts.forEach((f: any) => {
      const l = String(f.label || '').toLowerCase();
      if (/founded/.test(l)) known.founded = f.value;
      if (/headquarter/.test(l)) known.headquarters = f.value;
      if (/ceo|founder|president|director|chair/.test(l)) known.leadership = known.leadership || `${f.label}: ${f.value}`;
    });
  }
  const enrich = inv?.orgEnrich;
  if (enrich && Array.isArray(enrich.claims)) {
    enrich.claims.slice(0, 80).forEach((c: any) => add('org-claim', { source: c.source, url: c.sourceUrl, title: c.source, own: true, parts: [c.quote || `${c.field}${c.role ? ` (${c.role})` : ''}: ${c.value}`] }));
    (Array.isArray(enrich.mentions) ? enrich.mentions : []).slice(0, 20).forEach((m: any) => add('web', { source: m.source, url: m.url, title: m.title, date: m.date, parts: [m.title, m.snippet] }));
  }
  const site = inv?.websiteIntel;
  if (site?.reachable && Array.isArray(site.pages)) {
    const own = site.verification?.status !== 'unverified';
    site.pages.slice(0, 8).forEach((p: any) => add('website', {
      source: site.siteName || siteOf(p.url), url: p.url, title: p.title, own,
      parts: [p.title, p.description, ...(Array.isArray(p.headings) ? p.headings.slice(0, 6) : []), ...(Array.isArray(p.text) ? p.text.slice(0, 6) : [])]
    }));
  }

  // Location and contact references the tabs found (their own words), except unconfirmed ones.
  const locRefs: any[] = [
    ...(Array.isArray(inv?.locationScan?.refs) ? inv.locationScan.refs : []),
    ...(inv?.locationScan?.runs ? Object.values(inv.locationScan.runs).flatMap((r: any) => (Array.isArray(r?.refs) ? r.refs : [])) : [])
  ];
  locRefs.filter(r => r && r.status !== 'unconfirmed').forEach(r => add('location', { source: r.sourceName, url: r.url, title: r.sourceName, date: r.date, own: r.status === 'stated', parts: [r.evidence] }));
  const contactRefs: any[] = Array.isArray(inv?.contactScan?.refs) ? inv.contactScan.refs : [];
  contactRefs.filter(r => r && r.status !== 'unconfirmed').forEach(r => add('contact', { source: r.sourceName, url: r.url, title: r.sourceName, own: true, parts: [r.evidence] }));
  const contacts = contactRefs.filter(r => r && r.status !== 'unconfirmed').map(r => r.value);
  if (contacts.length) known.contact = Array.from(new Set(contacts)).slice(0, 3).join(', ');

  (Array.isArray(inv?.imageResults) ? inv.imageResults : []).slice(0, 10).forEach((i: any) => add('image', { source: i.source, url: i.pageUrl, title: i.title, parts: [i.title] }));

  if (hasValue(tp.occupation) && entityKind === 'person') known.occupation = tp.occupation;
  if (hasValue(tp.location)) known[entityKind === 'organization' ? 'headquarters' : 'location'] = known.headquarters || tp.location;

  // Most useful first; then cap the count and the total size.
  const sorted = Array.from(byKey.values()).sort((a, b) =>
    (a.level === 'validated' ? 0 : 1) - (b.level === 'validated' ? 0 : 1) || (a.own ? 0 : 1) - (b.own ? 0 : 1) || PRIORITY[a.kind] - PRIORITY[b.kind] || a.order - b.order);
  const evidence: Evidence[] = [];
  let chars = 0;
  for (const e of sorted) {
    if (evidence.length >= MAX_ITEMS || chars + e.text.length > MAX_CHARS) continue;
    chars += e.text.length + e.title.length;
    const { order: _o, ...rest } = e;
    evidence.push({ ...rest, id: `E${evidence.length + 1}` });
  }

  const username = clean(inv?.searchInputs?.username) || (inv?.searchType === 'username' ? clean(inv?.searchInputs?.queryValue) : '');
  // Generic words ("University", "Ghana", "Limited") do not name the subject on their own.
  const generic = /^(the|and|for|of|university|college|school|institute|academy|company|limited|ltd|inc|group|holdings|ghana|africa|international|national|association|bank|ministry|services|foundation|church|club|council)$/i;
  const parts = subject.split(/[\s,]+/).map(w => w.replace(/[^\p{L}\p{N}'-]/gu, '')).filter(w => w.length >= 3 && !generic.test(w));
  const subjectNames = Array.from(new Set([subject, ...parts, username].filter(Boolean)));
  return { subject, subjectNames, entityKind, evidence, known };
}
