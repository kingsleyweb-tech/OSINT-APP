import { getApiBase } from './searchClient';
import { apiFetch } from './apiAuth';

/** Mirrors backend/src/types/explore.ts. */
export type ExploreCapability =
  | 'news' | 'images' | 'videos' | 'reverseImage' | 'social' | 'forums'
  | 'places' | 'placeReviews' | 'events' | 'trends' | 'trendingNow' | 'web' | 'webBing' | 'placeLookup';

export type ExploreItemKind =
  | 'news' | 'image' | 'video' | 'post' | 'profile' | 'group' | 'forum' | 'web'
  | 'visual_match' | 'place' | 'review' | 'event' | 'location';

/** Engine-specific fields; only those the source returned are present. */
export interface ExploreMetadata {
  dataId?: string;
  placeId?: string;
  type?: string;
  phone?: string;
  website?: string;
  hours?: string;
  linkIsSearch?: boolean;
  publication?: string;
  [key: string]: unknown;
}

export interface ExploreItem {
  id: string;
  kind: ExploreItemKind;
  title: string;
  snippet?: string;
  url: string;
  domain: string;
  platform?: string;
  author?: string;
  authorUrl?: string;
  username?: string;
  image?: string;
  thumbnail?: string;
  publishedText?: string;
  publishedAt?: string;
  location?: { address?: string; lat?: number; lng?: number };
  rating?: number;
  reviewsCount?: number;
  metadata?: ExploreMetadata;
  engine: string;
  engines: string[];
  relevance: { score: number; label: string; reasons: string[] };
}

export interface EngineRun {
  engine: string;
  label: string;
  status: 'ok' | 'cached' | 'empty' | 'error' | 'quota';
  returned: number;
  error?: string;
}

export interface ExploreOptions {
  when?: 'h' | 'd' | 'w' | 'm' | 'y';
  country?: string;
  language?: string;
  platforms?: string[];
  page?: number;
  imageUrl?: string;
  dataId?: string;
  timeframe?: string;
  /** Run only one engine of the plan (used for per-source progress). */
  callIndex?: number;
}

export interface ExploreResponse {
  capability: ExploreCapability;
  query: string;
  items: ExploreItem[];
  engines: EngineRun[];
  stats: { returned: number; kept: number; filteredOut: number; duplicates: number; searchesUsed: number };
  extra?: Record<string, unknown>;
  notices: string[];
}

export interface QuotaStatus {
  configured: boolean;
  plan?: string | null;
  searchesPerMonth?: number | null;
  searchesLeft?: number | null;
  usedThisMonth?: number | null;
  error?: string;
}

export class ExploreError extends Error {}

const TIMEOUT_MS = 150_000;

export async function runExplore(capability: ExploreCapability, query: string, options: ExploreOptions = {}, signal?: AbortSignal): Promise<ExploreResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await apiFetch(`${getApiBase()}/explore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability, query, options }),
      signal: controller.signal
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) throw new ExploreError(data?.error || `The search service returned HTTP ${res.status}.`);
    return data as ExploreResponse;
  } catch (e) {
    if (e instanceof ExploreError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ExploreError(signal?.aborted ? 'Search cancelled.' : 'The search took too long and was stopped. Try again.');
    }
    throw new ExploreError('The search service could not be reached. Check that the backend is running.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface PlannedCall { index: number; engine: string; label: string }

/** The engines a search will call, without running them (no SerpApi search is used). */
export async function planExplore(capability: ExploreCapability, query: string, options: ExploreOptions = {}): Promise<PlannedCall[]> {
  const res = await apiFetch(`${getApiBase()}/explore/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capability, query, options })
  }).catch(() => null);
  const data = res ? await res.json().catch(() => null) : null;
  if (!res || !res.ok || !data) throw new ExploreError(data?.error || 'The search service could not be reached. Check that the backend is running.');
  return data.calls as PlannedCall[];
}

/** Combines the per-engine responses of one search into one response (duplicates by URL merged). */
/** Character-bigram similarity of two titles (0–1). */
function titleSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const nb = b.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const grams = new Map<string, number>();
  for (let i = 0; i < na.length - 1; i++) grams.set(na.slice(i, i + 2), (grams.get(na.slice(i, i + 2)) || 0) + 1);
  let hit = 0;
  for (let i = 0; i < nb.length - 1; i++) {
    const g = nb.slice(i, i + 2);
    const n = grams.get(g) || 0;
    if (n > 0) { hit++; grams.set(g, n - 1); }
  }
  return (2 * hit) / (na.length + nb.length - 2);
}

export function mergeResponses(capability: ExploreCapability, query: string, parts: ExploreResponse[]): ExploreResponse {
  const byUrl = new Map<string, ExploreItem>();
  let duplicates = 0;
  parts.forEach(p => p.items.forEach(i => {
    let k = i.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
    // The same page under another URL (tracking/mobile copies from another engine): same site, near-identical title.
    if (!byUrl.has(k) && i.title.length > 12) {
      for (const [key, v] of byUrl) {
        if (v.domain === i.domain && titleSimilarity(v.title, i.title) >= 0.92) { k = key; break; }
      }
    }
    const cur = byUrl.get(k);
    if (cur) {
      duplicates++;
      i.engines.forEach(e => { if (!cur.engines.includes(e)) cur.engines.push(e); });
      if (i.relevance.score > cur.relevance.score) cur.relevance = i.relevance;
      return;
    }
    byUrl.set(k, { ...i, engines: [...i.engines] });
  }));
  const items = Array.from(byUrl.values());
  if (items.some(i => i.relevance.score > 0)) items.sort((a, b) => b.relevance.score - a.relevance.score);
  const sum = (f: keyof ExploreResponse['stats']) => parts.reduce((n, p) => n + (p.stats[f] || 0), 0);
  return {
    capability,
    query,
    items,
    engines: parts.flatMap(p => p.engines),
    stats: { returned: sum('returned'), kept: items.length, filteredOut: sum('filteredOut'), duplicates: sum('duplicates') + duplicates, searchesUsed: sum('searchesUsed') },
    extra: Object.assign({}, ...parts.map(p => p.extra || {})),
    notices: Array.from(new Set(parts.flatMap(p => p.notices)))
  };
}

export async function getQuota(): Promise<QuotaStatus | null> {
  try {
    const res = await apiFetch(`${getApiBase()}/quota`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export const SOCIAL_PLATFORM_OPTIONS: Array<{ id: string; label: string; default?: boolean }> = [
  { id: 'x', label: 'X (Twitter)', default: true },
  { id: 'facebook', label: 'Facebook', default: true },
  { id: 'instagram', label: 'Instagram', default: true },
  { id: 'tiktok', label: 'TikTok', default: true },
  { id: 'youtube', label: 'YouTube', default: true },
  { id: 'reddit', label: 'Reddit', default: true },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'threads', label: 'Threads' },
  { id: 'telegram', label: 'Telegram channels' },
  { id: 'whatsapp', label: 'WhatsApp group links' },
  { id: 'vk', label: 'VK' },
  { id: 'weibo', label: 'Sina Weibo' }
];

export const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: '', label: 'Any country' },
  { code: 'gh', label: 'Ghana' },
  { code: 'ng', label: 'Nigeria' },
  { code: 'ke', label: 'Kenya' },
  { code: 'za', label: 'South Africa' },
  { code: 'us', label: 'United States' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'ca', label: 'Canada' },
  { code: 'au', label: 'Australia' },
  { code: 'in', label: 'India' },
  { code: 'de', label: 'Germany' },
  { code: 'fr', label: 'France' }
];

export const LANGUAGE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: '', label: 'Any language' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' }
];

export const WHEN_OPTIONS: Array<{ code: ExploreOptions['when'] | ''; label: string }> = [
  { code: '', label: 'Any time' },
  { code: 'h', label: 'Past hour' },
  { code: 'd', label: 'Past 24 hours' },
  { code: 'w', label: 'Past week' },
  { code: 'm', label: 'Past month' },
  { code: 'y', label: 'Past year' }
];

export const KIND_LABEL: Record<ExploreItemKind, string> = {
  news: 'News', image: 'Image', video: 'Video', post: 'Post', profile: 'Profile', group: 'Group / channel',
  forum: 'Forum', web: 'Web page', visual_match: 'Visual match', place: 'Place', review: 'Review', event: 'Event', location: 'Location'
};
