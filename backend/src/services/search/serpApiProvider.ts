import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type SerpEngine =
  | 'google' | 'bing' | 'youtube' | 'facebook_profile' | 'instagram_profile'
  // Explore capabilities (see services/explore/engineCatalog.ts)
  | 'google_news' | 'bing_news' | 'google_images' | 'bing_images' | 'google_videos'
  | 'google_lens' | 'google_reverse_image' | 'google_forums'
  | 'google_maps' | 'google_maps_reviews' | 'google_events'
  | 'google_trends' | 'google_trends_trending_now' | 'google_maps_autocomplete'
  | 'duckduckgo' | 'yahoo';

export interface SerpCallResult {
  engine: SerpEngine;
  params: Record<string, string | number>;
  data: any | null;
  error: string | null;
  fromCache: boolean;
  quotaExhausted: boolean;
}

const memoryCache = new Map<string, { storedAt: number; data: any }>();
const MAX_MEMORY_ENTRIES = 500;

function cacheTtlMs(): number {
  const hours = Number(process.env.SERPAPI_CACHE_TTL_HOURS || 12);
  return (Number.isFinite(hours) && hours >= 0 ? hours : 12) * 3600 * 1000;
}

function buildCacheKey(engine: string, params: Record<string, string | number>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(`${engine}?${sorted}`).digest('hex');
}

function readCache(key: string): any | null {
  const ttl = cacheTtlMs();
  if (ttl === 0) return null;

  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.storedAt < ttl) return mem.data;

  const dir = process.env.SERPAPI_CACHE_DIR;
  if (dir) {
    try {
      const file = path.join(dir, `${key}.json`);
      const stat = fs.statSync(file);
      if (Date.now() - stat.mtimeMs < ttl) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        memoryCache.set(key, { storedAt: stat.mtimeMs, data });
        return data;
      }
    } catch (e) {}
  }
  return null;
}

function writeCache(key: string, data: any): void {
  if (cacheTtlMs() === 0) return;
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { storedAt: Date.now(), data });

  const dir = process.env.SERPAPI_CACHE_DIR;
  if (dir) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(data));
    } catch (e) {}
  }
}

export class SerpApiProvider {
  private getApiKey(): string | null {
    return process.env.SERPAPI_KEY || process.env.SERP_API_KEY || null;
  }

  /**
   * Single entry point for every SerpApi engine call. Adds:
   *  - a response cache (in-memory, optionally mirrored to SERPAPI_CACHE_DIR on disk) so the
   *    same query is not billed twice within SERPAPI_CACHE_TTL_HOURS (default 12h)
   *  - explicit error reporting (quota exhaustion, "no results", HTTP errors) instead of silently returning null
   */
  public async request(engine: SerpEngine, params: Record<string, string | number>): Promise<SerpCallResult> {
    const first = await this.requestOnce(engine, params);
    // SerpApi keeps identical searches cached for an hour and serves them free, so one retry after a
    // timeout usually returns quickly without using another search.
    if (first.error === 'Timed out waiting for SerpApi') return this.requestOnce(engine, params);
    return first;
  }

  private async requestOnce(engine: SerpEngine, params: Record<string, string | number>): Promise<SerpCallResult> {
    const apiKey = this.getApiKey();
    const cacheKey = buildCacheKey(engine, params);

    const cached = readCache(cacheKey);
    if (cached) {
      return { engine, params, data: cached, error: null, fromCache: true, quotaExhausted: false };
    }

    if (!apiKey) {
      return { engine, params, data: null, error: 'SERPAPI_KEY is not configured', fromCache: false, quotaExhausted: false };
    }

    const qs = new URLSearchParams({ engine });
    Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
    qs.set('api_key', apiKey);

    try {
      // A hung request must never stall a whole search: give up after SERPAPI_TIMEOUT_MS (default 30s).
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Number(process.env.SERPAPI_TIMEOUT_MS) || 30_000);
      const res = await fetch(`https://serpapi.com/search.json?${qs.toString()}`, {
        headers: { 'User-Agent': 'OSINT-Platform-Bot/1.0' },
        signal: controller.signal
      }).finally(() => clearTimeout(timer));
      const data: any = await res.json().catch(() => null);
      const apiError: string | null = data?.error || (!res.ok ? `HTTP ${res.status}` : null);
      const quotaExhausted = res.status === 429 || /run out of searches|plan searches|exceeded/i.test(apiError || '');

      // SerpApi reports "no results" as an `error` alongside an otherwise valid payload; that is a valid, cacheable answer.
      const isEmptyResult = Boolean(data && /hasn't returned any results|no results/i.test(apiError || ''));
      if (res.ok && data && (!apiError || isEmptyResult)) {
        writeCache(cacheKey, data);
        return { engine, params, data, error: isEmptyResult ? null : apiError, fromCache: false, quotaExhausted: false };
      }

      console.warn(`[SerpApiProvider] ${engine} error for ${JSON.stringify(params)}: ${apiError}`);
      return { engine, params, data: null, error: apiError || 'Unknown SerpApi error', fromCache: false, quotaExhausted };
    } catch (e: any) {
      console.warn(`[SerpApiProvider] ${engine} fetch error for ${JSON.stringify(params)}:`, e);
      const message = e?.name === 'AbortError' ? 'Timed out waiting for SerpApi' : (e?.message || 'Network error');
      return { engine, params, data: null, error: message, fromCache: false, quotaExhausted: false };
    }
  }

  /**
   * Fetch a Google Search page via SerpApi
   */
  public async fetchSerpPage(queryStr: string, start: number = 0): Promise<any> {
    return (await this.request('google', { q: queryStr, start, num: 10 })).data;
  }

  /**
   * Fetch a Bing Search page via SerpApi
   */
  /** DuckDuckGo web results (organic_results). Matches handles with punctuation well. */
  public async fetchDuckDuckGoPage(queryStr: string): Promise<any> {
    return (await this.request('duckduckgo', { q: queryStr })).data;
  }

  /** Yahoo web results (organic_results); Yahoo's query parameter is "p". */
  public async fetchYahooPage(queryStr: string): Promise<any> {
    return (await this.request('yahoo', { p: queryStr })).data;
  }

  public async fetchBingPage(queryStr: string, first: number = 1): Promise<any> {
    return (await this.request('bing', { q: queryStr, first })).data;
  }

  /**
   * Fetch YouTube Search results via SerpApi YouTube API
   */
  public async fetchYouTubeSearch(queryStr: string): Promise<any> {
    const data = (await this.request('youtube', { search_query: queryStr })).data;
    if (!data) return null;

    const organicItems: any[] = [];

    // Convert channel results into organic-like items
    if (data.channel_results) {
      data.channel_results.forEach((c: any) => {
        organicItems.push({
          title: c.title || c.channel_name,
          link: c.link || c.url,
          snippet: c.description || `YouTube Channel for ${c.title || c.channel_name}`,
          thumbnail: c.thumbnail
        });
      });
    }

    // Convert video results into organic-like items
    if (data.video_results) {
      data.video_results.forEach((v: any) => {
        organicItems.push({
          title: v.title,
          link: v.link,
          snippet: v.description || `YouTube Video: ${v.title}`,
          publication_date: v.published_date
        });
      });
    }

    return { organic_results: organicItems };
  }
}
