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

// ─── Ranges shown on each search page ───────────────────────────────────────
// min = every engine answers on its first query; max = every possible fallback query also runs
// (e.g. an exact phrase that finds nothing is retried in any word order). A search repeated within
// 12 hours costs 0, because it is answered from the cache.

export interface CostRange { min: number; max: number }

const add = (...r: CostRange[]): CostRange => r.reduce((a, b) => ({ min: a.min + b.min, max: a.max + b.max }), { min: 0, max: 0 });
const fixed = (n: number): CostRange => ({ min: n, max: n });

/** Same rule as the backend's exactPhrase(): plain multi-word text is quoted, so it can fall back to any word order. */
export function canLoosen(query: string): boolean {
  const q = query.trim();
  return /\s/.test(q) && !/["()]|\b(OR|AND)\b|(^|\s)[-+]\S|\b\w+:\S/.test(q);
}

/** The Intelligent-mode spelling check: 1 search at most (not for usernames or quoted queries; free when cached). */
export function spellingCheck(query: string, intelligent: boolean): CostRange {
  return intelligent && query.trim() && !/["]/.test(query) ? { min: 0, max: 1 } : fixed(0);
}

export function newsRange(query: string, country?: string): CostRange {
  const n = newsCost(country);
  return { min: n, max: canLoosen(query) ? n * 2 : n };
}

/** One search per platform; a platform with nothing relevant is retried once (any time when dated, any word order otherwise). */
export function socialRange(query: string, platforms: number, dated: boolean): CostRange {
  return { min: platforms, max: dated || canLoosen(query) ? platforms * 2 : platforms };
}

export const forumsRange = (): CostRange => ({ min: 1, max: 2 });
export const imagesRange = (): CostRange => fixed(2);
export const videosRange = (): CostRange => fixed(2);
/** Google web search; Bing runs instead only when Google finds nothing. */
const webRange = (): CostRange => ({ min: 1, max: 2 });

/** Geo search: Maps 1 + news + social (default platforms, undated) + web + events 1 + similar places 1 (Any country). */
export function geoRange(country?: string): CostRange {
  return add(fixed(1), newsRange('a b', country), socialRange('a b', DEFAULT_SOCIAL_PLATFORM_COUNT, false), webRange(), fixed(1), fixed(country ? 0 : 1));
}

/** Trends: Google Trends (4 for one term, 2 when comparing) + news + social (dated) + web + trending now. */
export function trendsRange(mainTerm: string, country: string | undefined, termCount: number, dated = true): CostRange {
  return add(fixed(termCount > 1 ? 2 : 4), newsRange(mainTerm, country), socialRange(mainTerm, DEFAULT_SOCIAL_PLATFORM_COUNT, dated), webRange(), fixed(1));
}

/** Name search by depth (+1 per location/organisation; Bing replaces Google's broad search only if Google fails). */
export function nameSearchRange(depth: string, contextHints = 0): CostRange {
  const base = depth === 'quick' ? { min: 4, max: 5 } : depth === 'standard' ? { min: 9, max: 11 } : { min: 9, max: 13 };
  return add(base, fixed(contextHints));
}

/** Username search by depth (the looser-variations search runs only when the username can be loosened). */
export function usernameSearchRange(depth: string): CostRange {
  return depth === 'quick' ? fixed(5) : depth === 'standard' ? { min: 11, max: 12 } : { min: 14, max: 15 };
}

export const fmtRange = (r: CostRange): string => (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`);
export { add as addCosts };

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
      { search: 'Username search · Standard', tokens: '11 – 12', notes: 'Quick + Yahoo, TikTok (Google and DuckDuckGo), Snapchat, LinkedIn, YouTube, + 1 for looser variations (number removed or shortened, e.g. humblechild for humblechild_99) when the username has a number.' },
      { search: 'Username search · Deep (default)', tokens: '14 – 15', notes: 'Standard + Threads/GitHub/Reddit/Medium, Facebook profile lookup, Instagram profile lookup (the looser-variations search included).' },
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
      { search: 'Contact tab (automatic)', tokens: '4', notes: 'Runs once when first opened: Google, Bing, DuckDuckGo and social profiles, for public emails and phone numbers of the person. Contact details already on the case’s profiles cost nothing.' },
      { search: 'Organisation sources (automatic, organisation cases)', tokens: '6 – 7', notes: 'Runs once when an organisation case opens (and again if it failed or after “Re-run searches”): Google Maps, Google pages 1–2, Google News, DuckDuckGo, social platforms and YouTube. Google page 1 reuses the name search’s own query, so it is usually free from the 12-hour cache. News is limited to the last 12 months and videos to this year. Wikidata and the official website are read at no cost. “Search again” in Sources & verification runs it again.' }
    ]
  },
  {
    title: 'Alerts',
    rows: [
      { search: 'One alert check', tokens: 'Per keyword: news 1–4 + 1–2 per social platform', notes: 'News is Google News (+ Bing News without a country or in a Bing News country), doubled at most when a phrase is retried in any word order; each social platform is retried once over any time when nothing recent matches. The form shows the exact range before you save. The first check looks back 7 days, later checks 1 day.' },
      { search: 'Daily alert limit', tokens: 'Set on the server (ALERTS_MAX_SEARCHES_PER_DAY)', notes: 'Alerts stop for the day at this limit and pause when few searches are left this month (ALERTS_QUOTA_RESERVE), so the rest of the app keeps working.' },
      { search: 'Alert emails, test email, alert pages', tokens: '0', notes: 'Sending emails and viewing an alert’s results use no searches.' }
    ]
  },
  {
    title: 'Free (0 tokens)',
    rows: [
      { search: 'Repeating a search within 12 hours', tokens: '0', notes: 'Identical requests are answered from the server cache.' },
      { search: 'Search history · View results', tokens: '0', notes: 'Shows the saved results from your account.' },
      { search: 'Direct username checks', tokens: '0', notes: 'GitHub, Reddit, Docker Hub, npm, DEV, Mastodon, Bluesky, Telegram, Twitch, Vimeo, YouTube, Wikipedia, TikTok and Snapchat profile pages.' },
      { search: 'Organisation detection', tokens: '0', notes: 'Deciding that a name search is about an organisation (and its knowledge-panel facts) uses the name search’s own results.' },
      { search: 'Organisation tab · website reading', tokens: '0', notes: 'The organisation’s own website is read directly by the server (up to 12 public pages), not through SerpApi. Wikidata is also free.' },
      { search: 'Analysis & records', tokens: '0', notes: 'Content analysis, Network, profile link checks, the quota indicator, maps (map/satellite view) and the Sources page.' }
    ]
  }
];
