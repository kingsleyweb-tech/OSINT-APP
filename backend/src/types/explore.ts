/**
 * Shared shapes for the Explore capabilities (news, images, videos, social posts, places, trends…).
 * Every item keeps the engine that returned it; fields a source did not provide stay undefined.
 */

export type ExploreCapability =
  | 'news'
  | 'images'
  | 'videos'
  | 'reverseImage'
  | 'social'
  | 'forums'
  | 'places'
  | 'placeReviews'
  | 'events'
  | 'trends'
  | 'trendingNow'
  | 'web'
  | 'placeLookup';

export type ExploreItemKind =
  | 'news'
  | 'image'
  | 'video'
  | 'post'
  | 'profile'
  | 'group'
  | 'forum'
  | 'web'
  | 'visual_match'
  | 'place'
  | 'review'
  | 'event'
  | 'location';

export type RelevanceLabel = 'Strong match' | 'Partial match' | 'Weak match' | 'Visual match' | 'Not scored';

export interface ExploreRelevance {
  score: number;
  label: RelevanceLabel;
  reasons: string[];
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
  /** Date text exactly as the source returned it. */
  publishedText?: string;
  /** ISO date parsed from publishedText when it could be parsed. */
  publishedAt?: string;
  location?: { address?: string; lat?: number; lng?: number };
  rating?: number;
  reviewsCount?: number;
  metadata?: Record<string, unknown>;
  engine: string;
  engines: string[];
  relevance: ExploreRelevance;
}

export type EngineRunStatus = 'ok' | 'cached' | 'empty' | 'error' | 'quota';

export interface EngineRun {
  engine: string;
  label: string;
  status: EngineRunStatus;
  returned: number;
  error?: string;
}

export interface ExploreOptions {
  /** Time window: h = hour, d = day, w = week, m = month, y = year. */
  when?: 'h' | 'd' | 'w' | 'm' | 'y';
  /** Two-letter country code (gl). */
  country?: string;
  /** Two-letter language code (hl). */
  language?: string;
  /** Social search: platform ids to restrict to. */
  platforms?: string[];
  /** Result page (0-based) for engines that support paging. */
  page?: number;
  /** Reverse image: a public http(s) image URL. */
  imageUrl?: string;
  /** Place reviews: SerpApi data_id of a Google Maps place. */
  dataId?: string;
  /** Trends: timeframe such as "today 12-m" or "now 7-d". */
  timeframe?: string;
  /** Run only this engine call of the capability's plan (for per-source progress). */
  callIndex?: number;
}

export interface ExploreRequest {
  capability: ExploreCapability;
  query: string;
  options?: ExploreOptions;
}

export interface ExploreResponse {
  capability: ExploreCapability;
  query: string;
  items: ExploreItem[];
  engines: EngineRun[];
  stats: {
    returned: number;
    kept: number;
    filteredOut: number;
    duplicates: number;
    /** SerpApi calls billed for this request (cached calls are free). */
    searchesUsed: number;
  };
  /** Capability-specific structured data (trend series, related queries, place details). */
  extra?: Record<string, unknown>;
  notices: string[];
}
