import { getApiBase } from './searchClient';
import { apiFetch } from './apiAuth';
import { BING_NEWS_MARKETS, type CostRange } from './searchCosts';

/** Mirrors backend/src/services/trends/types.ts (POST /api/trends). */

export type TrendSource = 'google' | 'news' | 'x' | 'youtube' | 'reddit' | 'tiktok' | 'facebook' | 'instagram';
export type TrendWindow = 'live' | '1h' | '6h' | '24h' | '7d';
export type SignalKind = 'official_trending' | 'news_coverage' | 'conversation_signal' | 'video_activity' | 'discussion_signal' | 'indexed_mentions';
export type TrendDirection = 'Rising' | 'Stable' | 'Declining' | 'Emerging' | 'Direction unavailable';
export type SourceStatus = 'ok' | 'empty' | 'unavailable' | 'rate_limited' | 'quota' | 'timeout';

export interface TrendEvidence { title: string; url: string; source: string; date?: string; snippet?: string }
export interface TrendMetrics { searchVolume?: number; increasePct?: number; postCount?: number; videoCount?: number; views?: number; articleCount?: number }

export interface TrendItem {
  id: string; topic: string; key: string; platform: TrendSource; signalKind: SignalKind; sourceLabel: string;
  query: string; observedAt: string; firstSeenAt?: string; latestAt?: string; region: string; category?: string;
  metrics: TrendMetrics; direction: TrendDirection; directionBasis: string;
  relatedKeywords: string[]; hashtags: string[]; evidence: TrendEvidence[]; reliability: string;
}

export interface CrossPlatformTrend {
  id: string; topic: string; key: string; platforms: TrendSource[]; items: TrendItem[];
  category?: string; categorySource?: 'google' | 'ai'; about?: string;
  direction: TrendDirection; directionBasis: string; firstSeenAt?: string; latestAt?: string;
  relatedKeywords: string[]; hashtags: string[];
}

export interface SourceReport {
  platform: TrendSource; label: string; signalKind: SignalKind; status: SourceStatus; items: number;
  error?: string; note?: string; searchesUsed: number; fromCache: boolean; queries: string[];
}

export interface TrendsResponse {
  mode: 'discover' | 'topic'; term?: string; window: TrendWindow; country?: string; generatedAt: string;
  sources: SourceReport[]; trends: CrossPlatformTrend[]; ai: { used: boolean; model?: string; note?: string };
  searchesUsed: number; notices: string[];
}

export interface TrendsQuery { mode: 'discover' | 'topic'; term?: string; platforms: TrendSource[]; window: TrendWindow; country?: string }

export const PLATFORM_LABEL: Record<TrendSource, string> = {
  google: 'Google Trends', news: 'News', x: 'X', youtube: 'YouTube', reddit: 'Reddit', tiktok: 'TikTok', facebook: 'Facebook', instagram: 'Instagram'
};

export const PLATFORM_DOMAIN: Record<TrendSource, string> = {
  google: 'trends.google.com', news: 'news.google.com', x: 'x.com', youtube: 'youtube.com', reddit: 'reddit.com',
  tiktok: 'tiktok.com', facebook: 'facebook.com', instagram: 'instagram.com'
};

/** Official list / platform signal / indexed mention, so a chip never reads as more than it is. */
export const KIND_SHORT: Record<string, string> = {
  official_trending: 'Official list', news_coverage: 'News coverage', conversation_signal: 'Conversation signal',
  video_activity: 'Video activity', discussion_signal: 'Discussion signal', indexed_mentions: 'Indexed mentions'
};

/** Filter order: X first (highest priority), then the rest. */
export const PLATFORM_FILTERS: Array<{ value: 'all' | TrendSource; label: string }> = [
  { value: 'all', label: 'All' }, { value: 'x', label: 'X' }, { value: 'google', label: 'Google' }, { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' }, { value: 'reddit', label: 'Reddit' }, { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' }, { value: 'news', label: 'News' }
];

export const WINDOW_OPTIONS: Array<{ value: TrendWindow; label: string }> = [
  { value: 'live', label: 'Live' }, { value: '1h', label: '1h' }, { value: '6h', label: '6h' }, { value: '24h', label: '24h' }, { value: '7d', label: '7d' }
];

/** What "All" checks (the server's defaults); other platforms are opt-in. */
export const ALL_PLATFORMS: Record<'discover' | 'topic', TrendSource[]> = {
  discover: ['google', 'news', 'x'],
  topic: ['google', 'news', 'x', 'youtube', 'reddit']
};

export const STATUS_TEXT: Record<SourceStatus, string> = {
  ok: 'OK', empty: 'Nothing found', unavailable: 'Temporarily unavailable', rate_limited: 'Rate limited', quota: 'Search quota used up', timeout: 'Timed out'
};

export class TrendsError extends Error {}

export async function fetchTrends(q: TrendsQuery, signal?: AbortSignal): Promise<TrendsResponse> {
  let res: Response;
  try {
    res = await apiFetch(`${getApiBase()}/trends`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q), signal
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw new TrendsError('The trend search was cancelled.');
    throw new TrendsError('The trends service could not be reached. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new TrendsError(data.error || `The trends could not be loaded (HTTP ${res.status}).`);
  return data as TrendsResponse;
}

/** Most searches a trends request can use (cached answers are free). */
export function trendsSignalCost(q: Pick<TrendsQuery, 'mode' | 'platforms' | 'country'>): CostRange {
  const list = q.platforms.length ? q.platforms : ALL_PLATFORMS[q.mode];
  const news = q.mode === 'topic' && (!q.country || BING_NEWS_MARKETS.includes(q.country)) ? 2 : 1;
  const topics = q.mode === 'discover' ? 3 : 1;
  let max = 0;
  // Discover always reads Google's list (with a country) and the news top stories to pick topics.
  if (q.mode === 'discover') max += (q.country ? 1 : 0) + 1;
  list.forEach(p => {
    if (p === 'google') max += q.mode === 'topic' && q.country ? 1 : 0;
    else if (p === 'news') max += q.mode === 'topic' ? news : 0;
    else if (p === 'x') max += q.mode === 'topic' ? 2 : topics;
    else max += topics;
  });
  return { min: 0, max };
}

const fmtNum = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

/** The strongest metric an item has, as text ("Not available" when the source gives none). */
export function metricText(m: TrendMetrics): string {
  if (m.searchVolume != null) return `${fmtNum(m.searchVolume)}+ searches${m.increasePct != null ? ` · +${m.increasePct}%` : ''}`;
  if (m.increasePct != null) return `+${m.increasePct}% searches`;
  if (m.videoCount != null) return `${m.videoCount} video${m.videoCount === 1 ? '' : 's'}${m.views != null ? ` · ${fmtNum(m.views)} views` : ''}`;
  if (m.postCount != null) return `${m.postCount} post${m.postCount === 1 ? '' : 's'} found`;
  if (m.articleCount != null) return `${m.articleCount} article${m.articleCount === 1 ? '' : 's'}`;
  return 'Not available';
}

export const DIRECTION_CLASS: Record<TrendDirection, string> = {
  Rising: 'up', Emerging: 'new', Stable: 'flat', Declining: 'down', 'Direction unavailable': 'none'
};

/** Direction from a Google Trends interest-over-time series: the last third compared with the middle third. */
export function timelineDirection(values: number[]): { direction: TrendDirection; basis: string } {
  if (values.length < 6) return { direction: 'Direction unavailable', basis: 'Too few points in the interest chart.' };
  const third = Math.floor(values.length / 3);
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const mid = avg(values.slice(third, 2 * third));
  const last = avg(values.slice(2 * third));
  if (mid === 0 && last === 0) return { direction: 'Direction unavailable', basis: 'No measurable search interest in the period.' };
  if (mid === 0) return { direction: 'Emerging', basis: 'Search interest appeared only in the last third of the period.' };
  const change = (last - mid) / mid;
  const basis = `Google Trends interest: last third of the period ${change >= 0 ? '+' : ''}${Math.round(change * 100)}% vs the middle third.`;
  if (change > 0.2) return { direction: 'Rising', basis };
  if (change < -0.2) return { direction: 'Declining', basis };
  return { direction: 'Stable', basis };
}
