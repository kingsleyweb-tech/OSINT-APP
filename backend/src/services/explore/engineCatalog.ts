import type { SerpEngine } from '../search/serpApiProvider';
import type { ExploreCapability, ExploreOptions } from '../../types/explore';

/**
 * Central map of which SerpApi engines each Explore capability calls, and with which parameters.
 * Engine names and parameters live only here; no other file builds SerpApi requests for Explore.
 */

export interface EngineCall {
  engine: SerpEngine;
  label: string;
  params: Record<string, string | number>;
  /** Run instead when this call fails (error or timeout, not "no results"). */
  fallback?: EngineCall;
}

const FORUM_SITES = ['reddit.com', 'quora.com', 'stackexchange.com', 'stackoverflow.com'];

/** Social platforms the social search can restrict to, as Google `site:` filters. */
export const SOCIAL_PLATFORMS: Record<string, { label: string; sites: string[] }> = {
  x: { label: 'X (Twitter)', sites: ['x.com', 'twitter.com'] },
  facebook: { label: 'Facebook', sites: ['facebook.com'] },
  instagram: { label: 'Instagram', sites: ['instagram.com'] },
  tiktok: { label: 'TikTok', sites: ['tiktok.com'] },
  youtube: { label: 'YouTube', sites: ['youtube.com'] },
  linkedin: { label: 'LinkedIn', sites: ['linkedin.com'] },
  reddit: { label: 'Reddit', sites: ['reddit.com'] },
  threads: { label: 'Threads', sites: ['threads.net'] },
  telegram: { label: 'Telegram (public channels)', sites: ['t.me'] },
  whatsapp: { label: 'WhatsApp (public group links)', sites: ['chat.whatsapp.com'] },
  vk: { label: 'VK', sites: ['vk.com'] },
  weibo: { label: 'Sina Weibo', sites: ['weibo.com'] }
};

export const DEFAULT_SOCIAL_PLATFORMS = ['x', 'facebook', 'instagram', 'tiktok', 'youtube', 'reddit'];

// Bing News rejects country codes outside its markets (e.g. "gh"); other countries search all markets.
const BING_NEWS_COUNTRIES = new Set(['us', 'gb', 'ca', 'au', 'in', 'de', 'fr']);

const GN_WHEN: Record<string, string> = { h: '1h', d: '1d', w: '7d', m: '30d', y: '1y' };

const WHEN_TBS: Record<string, string> = { h: 'qdr:h', d: 'qdr:d', w: 'qdr:w', m: 'qdr:m', y: 'qdr:y' };

/** Country / language params shared by Google-family engines. */
function locale(o: ExploreOptions): Record<string, string> {
  const p: Record<string, string> = {};
  if (o.country) p.gl = o.country;
  if (o.language) p.hl = o.language;
  return p;
}

/**
 * Plain multi-word keywords are sent as an exact phrase. With a list of site: filters Google
 * otherwise drops the keywords and returns unrelated pages from those sites (seen in testing).
 * Queries that already use quotes or operators are sent as written.
 */
export function exactPhrase(query: string): string {
  const q = query.trim();
  if (!/\s/.test(q) || /["()]|\b(OR|AND)\b|(^|\s)[-+]\S|\b\w+:\S/.test(q)) return q;
  return `"${q}"`;
}

export function socialQuery(query: string, platforms: string[], exact = true): string {
  const sites = platforms.flatMap(id => SOCIAL_PLATFORMS[id]?.sites || []);
  const q = exact ? exactPhrase(query) : query;
  if (sites.length === 0) return q;
  return `${q} (${sites.map(s => `site:${s}`).join(' OR ')})`;
}

/**
 * Returns the engine calls for a capability. Throws an Error with a user-facing message when the
 * request is missing something the capability needs.
 */
export function planCalls(capability: ExploreCapability, query: string, o: ExploreOptions = {}): EngineCall[] {
  const page = Math.max(0, Math.min(4, Math.floor(o.page || 0)));
  const tbs = o.when ? WHEN_TBS[o.when] : undefined;

  switch (capability) {
    case 'news': {
      // Google News with a country uses that country's edition (gl), and its own when: operator for
      // the time window so results stay in the edition. Bing News can only be limited to its own
      // markets; for other countries it is left out so the list stays country-specific.
      const when = o.when ? ` when:${GN_WHEN[o.when]}` : '';
      const edition = o.country ? ` · ${o.country.toUpperCase()} edition` : '';
      // Several words are sent as an exact phrase: news engines match it in the article body, so every
      // returned article names it even when the headline does not. If the phrase finds nothing, a looser query runs.
      const exact = exactPhrase(query);
      const gParams = { ...(o.country ? { gl: o.country } : {}), hl: o.language || 'en' };
      const calls: EngineCall[] = [{
        engine: 'google_news', label: `Google News${edition}`, params: { q: `${exact}${when}`, ...gParams },
        ...(exact !== query ? { fallback: { engine: 'google_news' as SerpEngine, label: `Google News${edition} (any word order)`, params: { q: `${query}${when}`, ...gParams } } } : {})
      }];
      if (!o.country || BING_NEWS_COUNTRIES.has(o.country)) {
        const bParams = { first: page * 10 + 1, ...(o.country ? { cc: o.country } : {}) };
        calls.push({
          engine: 'bing_news', label: `Bing News${edition}`, params: { q: exact, ...bParams },
          ...(exact !== query ? { fallback: { engine: 'bing_news' as SerpEngine, label: `Bing News${edition} (any word order)`, params: { q: query, ...bParams } } } : {})
        });
      }
      return calls;
    }

    case 'images':
      return [
        { engine: 'google_images', label: 'Google Images', params: { q: query, ijn: page, ...locale(o) } },
        { engine: 'bing_images', label: 'Bing Images', params: { q: query, first: page * 35 + 1 } }
      ];

    case 'videos':
      return [
        { engine: 'youtube', label: 'YouTube', params: { search_query: query } },
        { engine: 'google_videos', label: 'Google Videos', params: { q: query, start: page * 10, ...(tbs ? { tbs } : {}), ...locale(o) } }
      ];

    case 'social': {
      // One query per platform, site filter first (like the name search). A single query with many
      // site: filters made Google ignore the keywords and return unrelated pages.
      const platforms = (o.platforms || []).filter(p => SOCIAL_PLATFORMS[p]);
      const chosen = platforms.length ? platforms : DEFAULT_SOCIAL_PLATFORMS;
      const params = { num: 10, start: page * 10, ...locale(o) };
      return chosen.map(id => {
        const { label, sites } = SOCIAL_PLATFORMS[id];
        const filter = sites.length === 1 ? `site:${sites[0]}` : `(${sites.map(x => `site:${x}`).join(' OR ')})`;
        const exact = `${filter} ${exactPhrase(query)}`;
        const loose = `${filter} ${query}`;
        return {
          engine: 'google' as SerpEngine, label, params: { q: exact, ...params, ...(tbs ? { tbs } : {}) },
          // Nothing relevant: with a date filter, retry over any time (the page says so); otherwise retry without quotes.
          ...(tbs
            ? { fallback: { engine: 'google' as SerpEngine, label: `${label} (any time)`, params: { q: exact, ...params } } }
            : exact !== loose ? { fallback: { engine: 'google' as SerpEngine, label: `${label} (any word order)`, params: { q: loose, ...params } } } : {})
        };
      });
    }

    case 'forums':
      // Google's own "Forums" results filter (udm=18). The separate google_forums engine timed out in every test.
      return [{
        engine: 'google', label: 'Google · Forums', params: { q: query, udm: 18, num: 20, ...locale(o) },
        fallback: { engine: 'google', label: 'Google (forum sites)', params: { q: `${exactPhrase(query)} (${FORUM_SITES.map(f => `site:${f}`).join(' OR ')})`, num: 20, ...locale(o) } }
      }];

    case 'places':
      // The caller puts the country in the query text; the world view stops Google Maps favouring US results.
      return [{ engine: 'google_maps', label: 'Google Maps', params: { q: query, type: 'search', ll: '@20,0,3z', hl: o.language || 'en' } }];

    case 'placeReviews':
      if (!o.dataId) throw new Error('A Google Maps place is required to load reviews.');
      return [{ engine: 'google_maps_reviews', label: 'Google Maps Reviews', params: { data_id: o.dataId, ...(o.language ? { hl: o.language } : {}) } }];

    case 'events':
      // SerpApi serves events through Google Search's events block (the separate events engine is not available).
      return [{ engine: 'google', label: 'Google Search · events', params: { q: query, events: 1, ...locale(o) } }];

    case 'trends': {
      const common = { q: query, date: o.timeframe || 'today 12-m', ...(o.country ? { geo: o.country.toUpperCase() } : {}) };
      return [
        { engine: 'google_trends', label: 'Google Trends · interest over time', params: { ...common, data_type: 'TIMESERIES' } },
        // Related queries only accept a single term.
        ...(query.includes(',') ? [] : [{ engine: 'google_trends' as SerpEngine, label: 'Google Trends · related queries', params: { ...common, data_type: 'RELATED_QUERIES' } }]),
        // Where interest is highest: regions of the chosen country, or countries worldwide. Several terms are compared per region.
        { engine: 'google_trends' as SerpEngine, label: 'Google Trends · interest by region', params: { ...common, data_type: query.includes(',') ? 'GEO_MAP' : 'GEO_MAP_0' } },
        // Related topics (entities such as people, places, organisations): single term only.
        ...(query.includes(',') ? [] : [{ engine: 'google_trends' as SerpEngine, label: 'Google Trends · related topics', params: { ...common, data_type: 'RELATED_TOPICS' } }])
      ];
    }

    case 'web':
      return [{
        engine: 'google', label: 'Google Search', params: { q: query, num: 20, start: page * 20, ...(tbs ? { tbs } : {}), ...locale(o) },
        fallback: { engine: 'bing', label: 'Bing Search', params: { q: query, first: page * 20 + 1 } }
      }];

    case 'webBing':
      // Bing's own web index (independent of Google), e.g. to check a person's location across more of the open web.
      return [{ engine: 'bing', label: 'Bing Search', params: { q: query, first: page * 20 + 1, count: 20 } }];

    case 'contacts': {
      // Public contact details of a person: the name/handle (query, already quoted by the caller) with
      // contact words, across Google, Bing, DuckDuckGo and social profiles. Results are scored against
      // the name/handle only, so pages must name the person to be kept.
      const words = '(email OR "e-mail" OR contact OR phone OR tel OR call OR whatsapp OR "@gmail.com")';
      const social = '(site:facebook.com OR site:instagram.com OR site:linkedin.com OR site:x.com OR site:tiktok.com)';
      return [
        { engine: 'google', label: 'Google · contact details', params: { q: `${query} ${words}`, num: 20, ...locale(o) } },
        { engine: 'bing', label: 'Bing · contact details', params: { q: `${query} ${words}`, count: 20 } },
        { engine: 'duckduckgo', label: 'DuckDuckGo · contact details', params: { q: `${query} ${words}` } },
        { engine: 'google', label: 'Social profiles · contact details', params: { q: `${social} ${query} ${words}`, num: 20, ...locale(o) } }
      ];
    }

    case 'placeLookup':
      // Place names that match the text, worldwide (e.g. "Osu" in Ghana, Japan, the US…).
      // Needs a map position; a zoomed-out world view keeps the suggestions worldwide.
      return [{ engine: 'google_maps_autocomplete', label: 'Google Maps · similar place names', params: { q: query, ll: '@20,0,3z', hl: o.language || 'en' } }];

    case 'trendingNow':
      return [{ engine: 'google_trends_trending_now', label: 'Google Trends · trending now', params: { geo: (o.country || 'US').toUpperCase(), ...(o.language ? { hl: o.language } : {}) } }];

    default:
      throw new Error('Unsupported search capability.');
  }
}

/** Capabilities whose results are scored against the query text (others are shown as returned). */
export const SCORED_CAPABILITIES: ExploreCapability[] = ['news', 'images', 'videos', 'social', 'forums', 'web', 'webBing', 'contacts'];

/** Capabilities that do not take a text query. */
export const QUERYLESS_CAPABILITIES: ExploreCapability[] = ['placeReviews', 'trendingNow'];

/** Labels of a capability's engine calls, without running them (for the progress list). */
export function planLabels(capability: ExploreCapability, query: string, o: ExploreOptions = {}): Array<{ index: number; engine: string; label: string }> {
  return planCalls(capability, query, o).map((c, index) => ({ index, engine: c.engine, label: c.label }));
}

// ─── Trends (POST /api/trends) ───────────────────────────────────────────────

export type TrendWindow = 'live' | '1h' | '6h' | '24h' | '7d';
export type TrendSource = 'google' | 'news' | 'x' | 'youtube' | 'reddit' | 'tiktok' | 'facebook' | 'instagram';

/**
 * How each time window maps onto the engines: Google Trends "trending now" only offers 4 / 24 / 48 / 168 hours,
 * Google Search only past hour / day / week, YouTube only last hour / today / this week. Results are then
 * filtered to the exact window by their own dates.
 */
export const TREND_WINDOWS: Record<TrendWindow, { label: string; ms: number; hours: number; when: 'h' | 'd' | 'w'; ytSp: string }> = {
  live: { label: 'Live', ms: 3600_000, hours: 4, when: 'h', ytSp: 'EgIIAQ==' },
  '1h': { label: 'Past hour', ms: 3600_000, hours: 4, when: 'h', ytSp: 'EgIIAQ==' },
  '6h': { label: 'Past 6 hours', ms: 6 * 3600_000, hours: 24, when: 'd', ytSp: 'EgIIAg==' },
  '24h': { label: 'Past 24 hours', ms: 24 * 3600_000, hours: 24, when: 'd', ytSp: 'EgIIAg==' },
  '7d': { label: 'Past 7 days', ms: 7 * 24 * 3600_000, hours: 168, when: 'w', ytSp: 'EgIIAw==' }
};

/**
 * Engine calls for one trend source. `term` is the topic checked on that platform (required for every
 * source except Google Trends and News, which list what is trending / in the news without one).
 * Social sources reuse the Social search's exact requests, so a topic already searched there is served from cache.
 * `xPosts`: 'add' runs Google's X posts carousel search as well as the site:x.com search; 'only' runs just the carousel.
 */
export function trendCalls(source: TrendSource, term: string | undefined, o: { window: TrendWindow; country?: string; language?: string; xPosts?: 'add' | 'only' }): EngineCall[] {
  const w = TREND_WINDOWS[o.window];
  const strip = (calls: EngineCall[]) => calls.map(({ fallback: _f, ...c }) => c);
  switch (source) {
    case 'google':
      if (!o.country) return [];
      return [{
        engine: 'google_trends_trending_now', label: 'Google Trends · trending now',
        params: { geo: o.country.toUpperCase(), hours: w.hours, ...(o.language ? { hl: o.language } : {}) }
      }];
    case 'news':
      if (term) return strip(planCalls('news', term, { when: w.when, country: o.country, language: o.language }));
      // No topic: the edition's top stories (Google groups them into story clusters).
      return [{ engine: 'google_news', label: `Google News · top stories${o.country ? ` · ${o.country.toUpperCase()} edition` : ''}`, params: { ...(o.country ? { gl: o.country } : {}), hl: o.language || 'en' } }];
    case 'youtube':
      if (!term) return [];
      return [{ engine: 'youtube', label: 'YouTube · uploads in the window', params: { search_query: term, sp: w.ytSp, ...(o.country ? { gl: o.country } : {}) } }];
    case 'x': {
      if (!term) return [];
      const site = strip(planCalls('social', term, { platforms: ['x'], when: w.when, country: o.country, language: o.language }));
      if (!o.xPosts) return site;
      const carousel: EngineCall = { engine: 'google', label: 'Google · X posts carousel', params: { q: term, tbs: WHEN_TBS[w.when], ...locale(o) } };
      return o.xPosts === 'only' ? [carousel] : [carousel, ...site];
    }
    default:
      if (!term) return [];
      return strip(planCalls('social', term, { platforms: [source], when: w.when, country: o.country, language: o.language }));
  }
}
