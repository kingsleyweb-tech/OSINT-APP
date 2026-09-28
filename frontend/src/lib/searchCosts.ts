/**
 * How many SerpApi searches ("tokens") each search uses — one place for the Help page's cost table
 * and the cost notes on the search pages. Keep in step with:
 *   backend/src/services/nameSearch/nameSearchEngine.ts  (buildPlan, confirmCalls, Bing fallback)
 *   backend/src/services/search/deepSearchEngine.ts      (username fast path steps)
 *   backend/src/services/explore/engineCatalog.ts        ('contacts': the Contact tab, 4 steps)
 *   backend/src/services/explore/engineCatalog.ts        (explore capabilities and fallbacks)
 *   lib/locationEvidence.ts                              (locationSearchPlan)
 * Identical requests are served from the 12-hour cache and use nothing.
 */

/** Countries whose Bing News market is used (backend engineCatalog BING_NEWS_COUNTRIES). Other countries search Google News only. */
export const BING_NEWS_MARKETS = ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr'];

/** Social platforms selected by default in Social, Geo and Trends searches. */
export const DEFAULT_SOCIAL_PLATFORM_COUNT = 6;

/** News: Google News + Bing News (Bing only without a country or in a Bing News market). */
export function newsCost(country?: string): number {
  return !country || BING_NEWS_MARKETS.includes(country.toLowerCase()) ? 2 : 1;
}

/** Geo search: Maps + news + social platforms + web + events (+ similar places with Any country). */
export function geoCost(country?: string): number {
  return 1 + newsCost(country) + DEFAULT_SOCIAL_PLATFORM_COUNT + 1 + 1 + (country ? 0 : 1);
}

/** Trends: Google Trends (4 calls for one term, 2 when comparing) + news + social + web + trending now. */
export function trendsCost(country: string | undefined, termCount: number): number {
  const trends = termCount > 1 ? 2 : 4;
  return trends + newsCost(country) + DEFAULT_SOCIAL_PLATFORM_COUNT + 1 + 1;
}

export interface CostRow {
  search: string;
  tokens: string;
  notes: string;
}

export interface CostGroup {
  title: string;
  rows: CostRow[];
}

const SPELLING = '+1 for the spelling check in Intelligent mode (not in Precise mode; cached 12 h)';

/** The cost table shown in Help & docs. */
export const COST_GROUPS: CostGroup[] = [
  {
    title: 'Profiler (people)',
    rows: [
      { search: 'Name search · Quick', tokens: '4', notes: `Google: exact name, LinkedIn, Facebook & Instagram, X/TikTok/GitHub. +1 per location or organisation you add. ${SPELLING}.` },
      { search: 'Name search · Standard', tokens: '9 – 10', notes: `9 searches (exact name, LinkedIn, Facebook ×2, Instagram, X, TikTok & Threads, YouTube, developer & writing sites) + up to 1 Facebook/Instagram profile confirmation. +1 per location or organisation. ${SPELLING}.` },
      { search: 'Name search · Deep (default)', tokens: '9 – 12', notes: `The same 9 searches + up to 3 Facebook/Instagram profile confirmations. +1 per location or organisation. ${SPELLING}.` },
      { search: 'Name search · if Google fails', tokens: '+1', notes: 'A Bing search replaces the broad Google search only when Google could not be reached.' },
      { search: 'Username search · Quick', tokens: '5', notes: 'Google, DuckDuckGo, Facebook, Instagram, X. The direct platform checks (GitHub, Reddit, TikTok, Snapchat, Mastodon, Bluesky…) are free.' },
      { search: 'Username search · Standard', tokens: '11', notes: 'Quick + Yahoo, TikTok (Google and DuckDuckGo), Snapchat, LinkedIn, YouTube.' },
      { search: 'Username search · Deep (default)', tokens: '14', notes: 'Standard + Threads/GitHub/Reddit/Medium, Facebook profile lookup, Instagram profile lookup.' },
      { search: 'Re-run a case’s searches', tokens: 'Same as the original search', notes: 'Runs the case’s name or username search again at its depth.' }
    ]
  },
  {
    title: 'Search pages',
    rows: [
      { search: 'Social search', tokens: '1 per platform (6 by default)', notes: `One search per selected platform. A platform that finds nothing relevant is retried once more broadly (+1 for that platform). ${SPELLING}.` },
      { search: 'Social search · More results', tokens: '1 per platform', notes: 'The next page of every selected platform.' },
      { search: 'Forums & discussions', tokens: '1', notes: '+1 only if Google’s forum filter finds nothing (a forum-site search is tried instead).' },
      { search: 'News', tokens: '2', notes: `Google News + Bing News. 1 when the country is outside Bing News markets (only US, UK, Canada, Australia, India, Germany, France use Bing). +1 per engine if the exact phrase finds nothing and a looser search runs. ${SPELLING}.` },
      { search: 'Media · Images', tokens: '2', notes: `Google Images + Bing Images. ${SPELLING}.` },
      { search: 'Media · Videos', tokens: '2', notes: `YouTube + Google Videos. ${SPELLING}.` },
      { search: 'Geo search · with a country', tokens: `${geoCost('gh')} (${geoCost('us')} in a Bing News country)`, notes: `Google Maps, news, ${DEFAULT_SOCIAL_PLATFORM_COUNT} social platforms, web and events. ${SPELLING}.` },
      { search: 'Geo search · Any country', tokens: `${geoCost()}`, notes: 'As above + places with the same name in other countries.' },
      { search: 'Geo search · Load public reviews', tokens: '1', notes: 'Per place, only when you click it.' },
      { search: 'Trends · one term', tokens: `${trendsCost('gh', 1)} (${trendsCost(undefined, 1)} worldwide or in a Bing News country)`, notes: `Google Trends (interest over time, related queries, interest by region, related topics), news, ${DEFAULT_SOCIAL_PLATFORM_COUNT} social platforms, web, trending now. ${SPELLING}.` },
      { search: 'Trends · comparing 2–5 terms', tokens: `${trendsCost('gh', 2)} (${trendsCost(undefined, 2)} worldwide or in a Bing News country)`, notes: 'Related queries and topics only work for one term, so they are skipped. No spelling check.' },
      { search: 'Trends · Trending now (Load)', tokens: '1', notes: 'Only when you click Load for a country.' }
    ]
  },
  {
    title: 'Inside a case',
    rows: [
      { search: 'News tab', tokens: '2', notes: 'Runs once automatically the first time the tab is opened; again only when you click “Check for new articles”.' },
      { search: 'Images tab', tokens: '2', notes: 'Runs once automatically the first time the tab is opened; again only on request.' },
      { search: 'Location tab (automatic)', tokens: '9 – 11', notes: 'Runs once when first opened: Google web, Bing web, news (2), Google Maps, 4 social platforms, + 1 Google Maps lookup per organisation of the person (up to 2).' },
      { search: 'Location tab · Search more sources', tokens: '8', notes: 'LinkedIn/Threads/YouTube/Reddit (4), videos (2), images (2).' },
      { search: 'Contact tab (automatic)', tokens: '4', notes: 'Runs once when first opened: Google, Bing, DuckDuckGo and social profiles, for public emails and phone numbers of the person. Contact details already on the case’s profiles cost nothing.' }
    ]
  },
  {
    title: 'Free (0 tokens)',
    rows: [
      { search: 'Repeating a search within 12 hours', tokens: '0', notes: 'Identical requests are answered from the server cache.' },
      { search: 'Search history · View results', tokens: '0', notes: 'Shows the saved results from your account.' },
      { search: 'Direct username checks', tokens: '0', notes: 'GitHub, Reddit, Docker Hub, npm, DEV, Mastodon, Bluesky, Telegram, Twitch, Vimeo, YouTube, Wikipedia, TikTok and Snapchat profile pages.' },
      { search: 'Analysis & records', tokens: '0', notes: 'Content analysis, Network, profile link checks, the quota indicator, maps (map/satellite view) and the Sources page.' }
    ]
  }
];
