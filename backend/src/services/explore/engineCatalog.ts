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

    case 'reverseImage': {
      const url = o.imageUrl || '';
      if (!/^https?:\/\/\S+$/i.test(url)) throw new Error('Paste a public image link starting with http:// or https://.');
      return [
        { engine: 'google_lens', label: 'Google Lens · visual matches', params: { url, type: 'visual_matches', ...(o.country ? { country: o.country } : {}) } },
        { engine: 'google_reverse_image', label: 'Google Reverse Image', params: { image_url: url } }
      ];
    }

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
        ...(query.includes(',') ? [] : [{ engine: 'google_trends' as SerpEngine, label: 'Google Trends · related queries', params: { ...common, data_type: 'RELATED_QUERIES' } }])
      ];
    }

    case 'web':
      return [{
        engine: 'google', label: 'Google Search', params: { q: query, num: 20, start: page * 20, ...(tbs ? { tbs } : {}), ...locale(o) },
        fallback: { engine: 'bing', label: 'Bing Search', params: { q: query, first: page * 20 + 1 } }
      }];

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
export const SCORED_CAPABILITIES: ExploreCapability[] = ['news', 'images', 'videos', 'social', 'forums', 'web'];

/** Capabilities that do not take a text query. */
export const QUERYLESS_CAPABILITIES: ExploreCapability[] = ['reverseImage', 'placeReviews', 'trendingNow'];

/** Labels of a capability's engine calls, without running them (for the progress list). */
export function planLabels(capability: ExploreCapability, query: string, o: ExploreOptions = {}): Array<{ index: number; engine: string; label: string }> {
  return planCalls(capability, query, o).map((c, index) => ({ index, engine: c.engine, label: c.label }));
}
