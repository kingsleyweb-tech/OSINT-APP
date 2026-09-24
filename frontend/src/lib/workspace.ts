import type {
  AuditEvent,
  EvidenceLevel,
  Finding,
  IntelligenceActivity,
  IntelligenceAssociation,
  IntelligenceSource,
  Investigation,
  InvestigationNote,
  NoteType,
  SearchLogEntry,
  SocialProfile
} from '../types/investigation';

/**
 * Pure helpers for the investigation workspace. Everything shown in the workspace is derived
 * from the saved investigation; nothing here invents values.
 */

export type WebItem = NonNullable<Investigation['webAndNews']>[number];

// ─── URLs ───────────────────────────────────────────────────────────────────

/** Stable key for matching the same URL across profiles, web items, sources and findings. */
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

/** URL without protocol and "www.", for display. */
export function shortUrl(url?: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname).replace(/\/$/, '');
    return `${u.hostname.replace(/^www\./, '')}${path}${u.search}`;
  } catch {
    return url;
  }
}

export function hostOf(url?: string): string {
  try {
    return new URL(url || '').hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isOpenableUrl(url?: string): boolean {
  try {
    const u = new URL(url || '');
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function openUrl(url?: string): void {
  if (isOpenableUrl(url)) window.open(url, '_blank', 'noopener,noreferrer');
}

// ─── Evidence levels ────────────────────────────────────────────────────────

export const LEVEL_LABEL: Record<EvidenceLevel, string> = {
  raw: 'Raw result',
  relevant: 'Relevant',
  validated: 'Validated'
};

/** Results the search engine kept are "relevant" until an investigator changes them. */
export function levelOf(inv: Investigation, key: string): EvidenceLevel {
  return inv.review?.[key] || 'relevant';
}

export const assocKey = (a: IntelligenceAssociation) => `assoc:${a.name.toLowerCase()}`;

// ─── Sources (S-01 …) ───────────────────────────────────────────────────────

export interface IndexedSource {
  sid: string;
  key: string;
  source: IntelligenceSource;
}

export function indexSources(inv: Investigation): { list: IndexedSource[]; byKey: Map<string, IndexedSource> } {
  const list: IndexedSource[] = [];
  const byKey = new Map<string, IndexedSource>();
  (inv.sources || []).forEach(source => {
    const key = urlKey(source.url);
    if (!key || byKey.has(key)) return;
    const entry = { sid: `S-${String(list.length + 1).padStart(2, '0')}`, key, source };
    list.push(entry);
    byKey.set(key, entry);
  });
  return { list, byKey };
}

// ─── Result buckets ─────────────────────────────────────────────────────────

const NEWS_PATH = /\/(news|article|articles|story|stories|politics|business|sports|entertainment|opinion|world|local)\/|\/20\d{2}\/\d{1,2}\/|-\d{5,}\.html?$/i;

export function kindOf(w: WebItem): string {
  const m = w.metadata || {};
  if (m.pageKind) return m.pageKind;
  const t = m.itemType;
  if (t === 'organization') return 'organization_page';
  if (t === 'reel') return 'video';
  if (t === 'document') return 'article';
  return t || 'website';
}

/**
 * Every web result belongs to exactly one bucket:
 * - page:   organization pages, groups, communities   → Profiles tab
 * - social: posts, reels, videos                     → Activity tab (listed under Profiles as "not profiles")
 * - news:   news articles                             → News tab
 * - web:    everything else                           → Web tab
 */
export type WebBucket = 'page' | 'social' | 'news' | 'web';

export function bucketOf(w: WebItem): WebBucket {
  const kind = kindOf(w);
  if (kind === 'organization_page' || kind === 'group' || kind === 'community') return 'page';
  if (kind === 'post' || kind === 'video') return 'social';
  if (w.metadata?.itemType === 'news') return 'news';
  if (kind === 'article' && !/wikipedia\.org$/.test(hostOf(w.url))) {
    try {
      if (NEWS_PATH.test(new URL(w.url).pathname)) return 'news';
    } catch { /* not a URL */ }
  }
  return 'web';
}

export function webByBucket(inv: Investigation): Record<WebBucket, WebItem[]> {
  const out: Record<WebBucket, WebItem[]> = { page: [], social: [], news: [], web: [] };
  (inv.webAndNews || []).forEach(w => out[bucketOf(w)].push(w));
  return out;
}

const KIND_LABEL: Record<string, string> = {
  person_profile: 'Profile',
  channel: 'Channel',
  organization_page: 'Organization page',
  group: 'Group',
  community: 'Community',
  post: 'Post',
  video: 'Video',
  article: 'Article',
  news: 'News',
  repository: 'Repository',
  website: 'Website'
};

export function kindLabel(w: WebItem): string {
  const kind = kindOf(w);
  if (kind === 'article' && /wikipedia\.org$/.test(hostOf(w.url))) return 'Encyclopedia';
  return KIND_LABEL[kind] || 'Page';
}

// ─── Profiles ───────────────────────────────────────────────────────────────

export const profileKey = (p: SocialProfile) => urlKey(p.profileUrl || p.url);

export function profileTypeLabel(p: SocialProfile): string {
  return p.pageKindLabel === 'Channel' || p.pageKind === 'channel' ? 'Channel' : 'Person profile';
}

export function profileEvidence(p: SocialProfile): string[] {
  if (p.evidence && p.evidence.length > 0) return p.evidence.map(e => e.text);
  if (p.matchReason && p.matchReason.length > 0) return p.matchReason;
  return [];
}

// ─── Activity ───────────────────────────────────────────────────────────────

export type ActivityType = 'Post' | 'Photo' | 'Video' | 'Profile' | 'Article' | 'News' | 'Page' | 'Mention';

export function activityType(a: IntelligenceActivity, webByKey: Map<string, WebItem>, profileKeys: Set<string>): ActivityType {
  const key = urlKey(a.sourceUrl);
  if (profileKeys.has(key)) return 'Profile';
  const url = (a.sourceUrl || '').toLowerCase();
  if (/\/photo|\/photos\/|fbid=/.test(url)) return 'Photo';
  const w = webByKey.get(key);
  if (w) {
    const kind = kindOf(w);
    if (kind === 'video') return 'Video';
    if (kind === 'post') return 'Post';
    if (bucketOf(w) === 'news') return 'News';
    if (kind === 'article') return 'Article';
    if (kind === 'organization_page' || kind === 'group' || kind === 'community') return 'Page';
  }
  if (/youtube\.com\/watch|youtu\.be\/|\/reel|\/shorts\/|tiktok\.com\/@[^/]+\/video/.test(url)) return 'Video';
  if (/\/posts\/|\/status\/|\/p\/|permalink/.test(url)) return 'Post';
  return 'Mention';
}

export const ACTIVITY_TYPE_GROUPS: Array<{ label: string; types: ActivityType[] }> = [
  { label: 'Posts', types: ['Post'] },
  { label: 'Photos', types: ['Photo'] },
  { label: 'Videos & reels', types: ['Video'] },
  { label: 'Articles & news', types: ['Article', 'News'] },
  { label: 'Profiles', types: ['Profile'] },
  { label: 'Pages', types: ['Page'] },
  { label: 'Mentions', types: ['Mention'] }
];

// ─── Dates ──────────────────────────────────────────────────────────────────

/** Parses the loose dates search engines return ("Jul 2, 2026", "3 days ago"). Null when not a date. */
export function parseLooseDate(value?: string, referenceIso?: string): Date | null {
  if (!value) return null;
  const rel = value.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
  if (rel) {
    const ref = referenceIso ? new Date(referenceIso) : new Date();
    if (Number.isNaN(ref.getTime())) return null;
    const n = Number(rel[1]);
    const d = new Date(ref);
    const unit = rel[2].toLowerCase();
    if (unit === 'minute') d.setMinutes(d.getMinutes() - n);
    if (unit === 'hour') d.setHours(d.getHours() - n);
    if (unit === 'day') d.setDate(d.getDate() - n);
    if (unit === 'week') d.setDate(d.getDate() - 7 * n);
    if (unit === 'month') d.setMonth(d.getMonth() - n);
    if (unit === 'year') d.setFullYear(d.getFullYear() - n);
    return d;
  }
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return d.getFullYear() >= 1990 && d.getFullYear() <= 2100 ? d : null;
}

export function fmtDate(iso?: string, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return withTime ? `${date}, ${fmtTime(iso)}` : date;
}

export function fmtShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function fmtTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Search log ─────────────────────────────────────────────────────────────

/**
 * Converts the per-query log a search returned into search-log rows.
 * Name searches report returned/kept per query; username searches report results found and newly accepted.
 */
export function searchLogFromTrail(
  trail: any[] | undefined,
  opts: { firstRun: number; batch: number; at: string; coverage?: Investigation['searchCoverage'] }
): SearchLogEntry[] {
  if (!Array.isArray(trail)) return [];
  return trail.map((t, i) => {
    const base = { run: opts.firstRun + i, batch: opts.batch, at: opts.at, query: String(t.query || '') };
    if (t.purpose !== undefined) {
      const cov = (opts.coverage || []).find(c => c.provider === t.purpose);
      return {
        ...base,
        purpose: String(t.purpose),
        returned: Number(t.rawResults) || 0,
        kept: cov ? cov.count : null,
        status: t.status === 'ok' ? 'Completed' : t.status === 'cached' ? 'Cached' : 'Failed',
        ...(t.error ? { error: String(t.error) } : {})
      } as SearchLogEntry;
    }
    const returned = Number(t.resultsFound) || 0;
    return {
      ...base,
      purpose: [t.platformName, t.stageName].filter(Boolean).join(' · ') || 'Search',
      returned,
      kept: typeof t.newRelevantAccepted === 'number' ? t.newRelevantAccepted : null,
      status: returned > 0 ? 'Completed' : 'No results'
    } as SearchLogEntry;
  });
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

export interface PipelineCounts {
  raw: number | null;
  relevant: number;
  validated: number;
  findings: number;
}

export function pipelineCounts(inv: Investigation): PipelineCounts {
  const s = inv.deepStats || {};
  const raw = typeof s.rawResultsReviewed === 'number'
    ? s.rawResultsReviewed
    : typeof s.resultsAccepted === 'number' && typeof s.resultsRejected === 'number'
      ? s.resultsAccepted + s.resultsRejected
      : null;
  const { list } = indexSources(inv);
  const levels = list.map(e => levelOf(inv, e.key));
  return {
    raw,
    relevant: levels.filter(l => l !== 'raw').length,
    validated: levels.filter(l => l === 'validated').length,
    findings: (inv.findings || []).length
  };
}

// ─── Notes, findings, audit ─────────────────────────────────────────────────

export function noteType(n: InvestigationNote): NoteType {
  if (n.type) return n.type;
  return /engine/i.test(n.author || '') ? 'Method' : 'Observation';
}

export function noteTitle(n: InvestigationNote): string {
  if (n.title) return n.title;
  const first = (n.text || '').split(/(?<=[.!?])\s/)[0];
  return first.length > 80 ? `${first.slice(0, 77)}…` : first || 'Untitled note';
}

/** N-01, N-02 … in creation order. */
export function noteIds(notes: InvestigationNote[]): Map<string, string> {
  const sorted = [...notes].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return new Map(sorted.map((n, i) => [n.id, `N-${String(i + 1).padStart(2, '0')}`]));
}

export function nextFindingId(findings: Finding[]): string {
  const max = findings.reduce((m, f) => Math.max(m, Number(f.id.replace(/\D/g, '')) || 0), 0);
  return `F-${String(max + 1).padStart(2, '0')}`;
}

export function currentActor(): string {
  try {
    const u = JSON.parse(localStorage.getItem('osint_user_session') || 'null');
    return u?.displayName || (u?.uid === 'demo-user' ? 'Guest Investigator' : 'Investigator');
  } catch {
    return 'Investigator';
  }
}

export function ownerName(inv: Investigation): string {
  if (inv.createdBy === 'demo-user') return 'Guest Investigator';
  try {
    const u = JSON.parse(localStorage.getItem('osint_user_session') || 'null');
    if (u?.uid && u.uid === inv.createdBy) return u.displayName || 'You';
  } catch { /* ignore */ }
  return 'Investigator';
}

export function newAuditEvent(e: Omit<AuditEvent, 'id' | 'at' | 'by'> & { by?: string }): AuditEvent {
  return {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    by: e.by || currentActor(),
    ...e
  };
}

/** Stored investigator events plus events reconstructed from the record itself (creation, search runs). */
export function allAuditEvents(inv: Investigation): AuditEvent[] {
  const events: AuditEvent[] = [...(inv.auditLog || [])];
  if (inv.createdAt && !events.some(e => e.action === 'Investigation created')) {
    events.push({
      id: 'ev-created',
      at: inv.createdAt,
      action: 'Investigation created',
      object: inv.id,
      by: ownerName(inv),
      detail: `${inv.searchType === 'username' ? 'Username' : 'Person'} investigation`,
      group: 'Investigation',
      kind: 'investigator'
    });
  }
  (inv.searchLog || []).forEach(s => {
    events.push({
      id: `ev-run-${s.run}`,
      at: s.at,
      action: s.status === 'Failed' ? 'Search failed' : 'Search performed',
      object: `run ${String(s.run).padStart(2, '0')}`,
      by: 'System',
      detail: `${s.purpose} · ${s.returned} returned${s.status === 'Cached' ? ' (cached)' : ''}${s.error ? ` · ${s.error}` : ''}`,
      group: 'Searches',
      kind: 'system'
    });
  });
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

// ─── Export ─────────────────────────────────────────────────────────────────

export function downloadFile(name: string, content: string, mime: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function toCsv(rows: Array<Array<string | number>>): string {
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

export const safeFileName = (s: string) => s.replace(/[^\w.-]+/g, '_').slice(0, 60);
