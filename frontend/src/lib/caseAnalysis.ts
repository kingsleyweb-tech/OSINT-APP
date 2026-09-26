import type { Investigation } from '../types/investigation';
import { hostOf, parseLooseDate, urlKey, bucketOf, kindOf } from './workspace';

/**
 * Everything here is computed from data already saved in the user's cases.
 * Nothing is fetched and nothing is inferred beyond what the saved records say.
 */

export type ConnectionType = 'Organisation' | 'Username' | 'Website' | 'Link';

export interface Connection {
  key: string;
  label: string;
  type: ConnectionType;
  detail: string;
  /** How the case records it (association evidence state, profile match label, source type). */
  evidence: string;
  urls: string[];
}

/** Hosts that appear in almost every case and say nothing about a connection. */
const GENERIC_HOSTS = new Set([
  'google.com', 'bing.com', 'duckduckgo.com', 'youtube.com', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com',
  'linkedin.com', 'tiktok.com', 'reddit.com', 'wikipedia.org', 'en.wikipedia.org', 'github.com', 'medium.com', 't.me', 'threads.net'
]);

export function caseConnections(inv: Investigation): Connection[] {
  const out = new Map<string, Connection>();
  const add = (c: Connection) => {
    const cur = out.get(c.key);
    if (cur) cur.urls = Array.from(new Set([...cur.urls, ...c.urls]));
    else out.set(c.key, c);
  };

  (inv.associations || inv.associationsList || []).forEach(a => {
    if (!a?.name) return;
    add({
      key: `org:${a.name.trim().toLowerCase()}`, label: a.name, type: 'Organisation',
      detail: [a.category, a.relationship].filter(Boolean).join(' · '),
      evidence: a.evidenceState || 'Mention only', urls: a.sourceUrl ? [a.sourceUrl] : []
    });
  });

  (inv.socialProfiles || []).forEach(p => {
    const user = (p.username || '').replace(/^@/, '').trim().toLowerCase();
    if (user.length < 3) return;
    add({
      key: `user:${user}`, label: `@${user}`, type: 'Username',
      detail: p.platform, evidence: p.confidenceLabel || `${p.confidenceLevel} confidence`,
      urls: [p.profileUrl || p.url].filter(Boolean) as string[]
    });
  });

  const hostCounts = new Map<string, string[]>();
  [...(inv.sources || []).map(s => s.url), ...(inv.webAndNews || []).map(w => w.url)].forEach(u => {
    const h = hostOf(u);
    if (!h || GENERIC_HOSTS.has(h)) return;
    hostCounts.set(h, [...(hostCounts.get(h) || []), u]);
  });
  hostCounts.forEach((urls, h) => add({
    key: `site:${h}`, label: h, type: 'Website', detail: `${urls.length} saved page${urls.length === 1 ? '' : 's'}`,
    evidence: 'Source in case', urls: Array.from(new Set(urls))
  }));

  return Array.from(out.values());
}

/** Exact pages saved in the case (used to find the same page in two cases). */
export function caseLinks(inv: Investigation): Map<string, string> {
  const m = new Map<string, string>();
  [...(inv.sources || []).map(s => s.url), ...(inv.webAndNews || []).map(w => w.url), ...(inv.socialProfiles || []).map(p => p.profileUrl || p.url)]
    .forEach(u => { const k = urlKey(u); if (k && u) m.set(k, u); });
  return m;
}

export interface CrossReference {
  connection: Connection;
  otherCases: Array<{ id: string; name: string }>;
}

export function crossReferences(target: Investigation, all: Investigation[]): CrossReference[] {
  const others = all.filter(i => i.id !== target.id).map(i => ({ inv: i, keys: new Set(caseConnections(i).map(c => c.key)) }));
  return caseConnections(target)
    .map(c => ({ connection: c, otherCases: others.filter(o => o.keys.has(c.key)).map(o => ({ id: o.inv.id, name: o.inv.name })) }))
    .filter(x => x.otherCases.length > 0);
}

export interface Comparison {
  onlyA: Connection[];
  onlyB: Connection[];
  shared: Array<{ a: Connection; b: Connection }>;
  sharedLinks: string[];
}

export function compareCases(a: Investigation, b: Investigation): Comparison {
  const ca = caseConnections(a);
  const cb = new Map(caseConnections(b).map(c => [c.key, c]));
  const shared: Comparison['shared'] = [];
  const onlyA: Connection[] = [];
  ca.forEach(c => {
    const m = cb.get(c.key);
    if (m) { shared.push({ a: c, b: m }); cb.delete(c.key); } else onlyA.push(c);
  });
  const la = caseLinks(a);
  const lb = caseLinks(b);
  const sharedLinks = Array.from(la.keys()).filter(k => lb.has(k)).map(k => la.get(k)!);
  return { onlyA, onlyB: Array.from(cb.values()), shared, sharedLinks };
}

// ─── Content analysis ────────────────────────────────────────────────────────

export interface ContentItem {
  title: string;
  text: string;
  url: string;
  platform: string;
  type: string;
  date: Date | null;
}

const TYPE_LABEL: Record<string, string> = {
  page: 'Organisation / group page', social: 'Post or video', news: 'News article', web: 'Web page'
};

export function contentItems(invs: Investigation[]): ContentItem[] {
  const out: ContentItem[] = [];
  const seen = new Set<string>();
  invs.forEach(inv => {
    (inv.webAndNews || []).forEach(w => {
      const k = urlKey(w.url);
      if (!k || seen.has(k)) return;
      seen.add(k);
      const m = w.metadata || {};
      const type = m.itemType === 'image' ? 'Image' : m.itemType === 'place' ? 'Place' : m.itemType === 'event' ? 'Event'
        : m.itemType === 'review' ? 'Review' : kindOf(w) === 'video' ? 'Video' : TYPE_LABEL[bucketOf(w)];
      out.push({
        title: w.title || '', text: `${w.title || ''} ${w.description || ''}`, url: w.url,
        platform: w.source || hostOf(w.url), type,
        date: parseLooseDate(m.publishedAt || m.date, w.discoveredAt || inv.createdAt)
      });
    });
    (inv.activities || []).forEach(a => {
      const k = urlKey(a.sourceUrl);
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push({ title: a.title, text: `${a.title} ${a.briefReport || ''}`, url: a.sourceUrl, platform: a.sourceName, type: 'Activity', date: parseLooseDate(a.date, a.foundAt || inv.createdAt) });
    });
    (inv.socialProfiles || []).forEach(p => {
      const u = p.profileUrl || p.url;
      const k = urlKey(u);
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push({ title: p.title || p.username, text: `${p.title || ''} ${p.snippet || p.bio || ''}`, url: u, platform: p.platform, type: 'Profile', date: null });
    });
  });
  return out;
}

export function countBy<T>(list: T[], key: (t: T) => string): Array<{ key: string; count: number }> {
  const m = new Map<string, number>();
  list.forEach(i => { const k = key(i) || 'Unknown'; m.set(k, (m.get(k) || 0) + 1); });
  return Array.from(m.entries()).map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}

/** Items per month, only for items whose record carries a date. */
export function perMonth(items: ContentItem[]): Array<{ month: string; count: number }> {
  const m = new Map<string, number>();
  items.forEach(i => {
    if (!i.date) return;
    const k = `${i.date.getFullYear()}-${String(i.date.getMonth() + 1).padStart(2, '0')}`;
    m.set(k, (m.get(k) || 0) + 1);
  });
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));
}
