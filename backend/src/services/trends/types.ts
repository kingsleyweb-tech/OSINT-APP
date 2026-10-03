import type { TrendSource, TrendWindow } from '../explore/engineCatalog';

/**
 * Trend intelligence shapes (POST /api/trends). Every item says which platform and which kind of signal it is:
 * only Google Trends' own list is an official trending list; the rest are signals measured from search results.
 * A metric a source did not provide stays undefined (shown as "Not available"), never estimated.
 */

export type { TrendSource, TrendWindow };

export type SignalKind =
  | 'official_trending'     // Google Trends "trending now" (Google's own list)
  | 'news_coverage'         // Google News / Bing News articles
  | 'conversation_signal'   // X posts found through Google (not X's trending list)
  | 'video_activity'        // YouTube uploads in the window
  | 'discussion_signal'     // Reddit threads found through Google
  | 'indexed_mentions';     // TikTok / Facebook / Instagram pages indexed by Google

export type TrendDirection = 'Rising' | 'Stable' | 'Declining' | 'Emerging' | 'Direction unavailable';

export type SourceStatus = 'ok' | 'empty' | 'unavailable' | 'rate_limited' | 'quota' | 'timeout';

export interface TrendEvidence {
  title: string;
  url: string;
  source: string;
  date?: string;
  snippet?: string;
}

export interface TrendMetrics {
  /** Google Trends search volume (Google's own rounded figure). */
  searchVolume?: number;
  /** Google Trends increase in searches, %. */
  increasePct?: number;
  /** Distinct posts / threads / pages found in the window. */
  postCount?: number;
  /** Videos uploaded in the window. */
  videoCount?: number;
  /** Total views of those videos, where YouTube returned them. */
  views?: number;
  /** News articles in the window. */
  articleCount?: number;
}

export interface TrendItem {
  id: string;
  topic: string;
  /** Normalised topic key used to group the same topic across platforms. */
  key: string;
  platform: TrendSource;
  signalKind: SignalKind;
  /** e.g. "Official trending list", "X Public Conversation Signal". */
  sourceLabel: string;
  /** The exact query sent for this item (empty for lists that need none). */
  query: string;
  observedAt: string;
  /** When the source says the trend started (Google Trends), or the oldest dated result. */
  firstSeenAt?: string;
  /** Newest dated result. */
  latestAt?: string;
  region: string;
  category?: string;
  metrics: TrendMetrics;
  direction: TrendDirection;
  directionBasis: string;
  relatedKeywords: string[];
  hashtags: string[];
  evidence: TrendEvidence[];
  /** Why this counts as a signal and how far it can be trusted. */
  reliability: string;
}

export interface CrossPlatformTrend {
  id: string;
  topic: string;
  key: string;
  platforms: TrendSource[];
  items: TrendItem[];
  category?: string;
  categorySource?: 'google' | 'ai';
  /** One-line AI summary of the listed headlines (only when AI grouping ran). */
  about?: string;
  direction: TrendDirection;
  directionBasis: string;
  firstSeenAt?: string;
  latestAt?: string;
  relatedKeywords: string[];
  hashtags: string[];
}

export interface SourceReport {
  platform: TrendSource;
  label: string;
  signalKind: SignalKind;
  status: SourceStatus;
  items: number;
  error?: string;
  note?: string;
  searchesUsed: number;
  fromCache: boolean;
  queries: string[];
}

export interface TrendsRequest {
  mode: 'discover' | 'topic';
  term?: string;
  platforms: TrendSource[];
  window: TrendWindow;
  country?: string;
  language?: string;
  ai?: boolean;
}

export interface TrendsResponse {
  mode: 'discover' | 'topic';
  term?: string;
  window: TrendWindow;
  country?: string;
  generatedAt: string;
  sources: SourceReport[];
  trends: CrossPlatformTrend[];
  ai: { used: boolean; model?: string; note?: string };
  searchesUsed: number;
  notices: string[];
}
