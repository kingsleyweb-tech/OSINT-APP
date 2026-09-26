/**
 * Every data source and API the application uses, for the Sources page and its API reference tab.
 * Keep in step with backend/src/services/search/serpApiProvider.ts (SerpApi engines),
 * backend/src/services/explore/engineCatalog.ts (Explore searches),
 * backend/src/services/intelligence/usernameDiscoveryService.ts (free direct checks) and
 * backend/src/routes/searchRoutes.ts (the app's own endpoints).
 */

export type SourceCategory =
  | 'Search engines' | 'News' | 'Images & video' | 'Maps & places' | 'Trends'
  | 'Social platforms' | 'Developer & writing' | 'Account platform';

export type SourceAccess = 'SerpApi' | 'Free public API' | 'Google site: search' | 'Platform service';

export interface DataSource {
  id: string;
  name: string;
  /** Used for the icon (brand icon or favicon). */
  domain: string;
  category: SourceCategory;
  access: SourceAccess;
  description: string;
  /** Where in the app the source is used. */
  usedIn: string[];
  data: string[];
}

export const SOURCE_CATEGORIES: SourceCategory[] = [
  'Search engines', 'News', 'Images & video', 'Maps & places', 'Trends', 'Social platforms', 'Developer & writing', 'Account platform'
];

export const DATA_SOURCES: DataSource[] = [
  // ─── Search engines (SerpApi) ──────────────────────────────────────────────
  {
    id: 'google', name: 'Google Search', domain: 'google.com', category: 'Search engines', access: 'SerpApi',
    description: 'The main web index. Runs the name-search plan (exact name, then one query per platform group with site: filters), social and forum searches, web results, events, and the spelling check in Intelligent mode.',
    usedIn: ['Name search', 'Social search', 'Geo search', 'Trends', 'Search intelligence'],
    data: ['Web pages', 'Profile links', 'Knowledge panel', 'Spelling fixes', 'Related searches', 'Events']
  },
  {
    id: 'bing', name: 'Bing Search', domain: 'bing.com', category: 'Search engines', access: 'SerpApi',
    description: 'Second web index. Used as the fallback when a Google web search fails, so a search still returns results.',
    usedIn: ['Name search', 'Web results'],
    data: ['Web pages', 'Snippets']
  },
  {
    id: 'duckduckgo', name: 'DuckDuckGo', domain: 'duckduckgo.com', category: 'Search engines', access: 'SerpApi',
    description: 'Finds usernames written with different punctuation (dots, underscores, hyphens) that Google often misses, including TikTok accounts.',
    usedIn: ['Username search'],
    data: ['Profile pages', 'Handle spellings', 'TikTok accounts']
  },
  {
    id: 'yahoo', name: 'Yahoo Search', domain: 'yahoo.com', category: 'Search engines', access: 'SerpApi',
    description: 'Extra index for username searches; catches profiles the other engines do not return.',
    usedIn: ['Username search'],
    data: ['Profile pages', 'Snippets']
  },

  // ─── News ──────────────────────────────────────────────────────────────────
  {
    id: 'google-news', name: 'Google News', domain: 'news.google.com', category: 'News', access: 'SerpApi',
    description: 'News articles by keyword, with country editions and time windows. Several words are searched as an exact phrase (matched in the article body); if that finds nothing, a looser search runs.',
    usedIn: ['News search', 'Case News tab', 'Geo search', 'Trends'],
    data: ['Articles', 'Publishers', 'Dates', 'Thumbnails']
  },
  {
    id: 'bing-news', name: 'Bing News', domain: 'bing.com', category: 'News', access: 'SerpApi',
    description: 'Second news source. Only used when no country is chosen or the country is a Bing News market, so country-restricted news stays in that country.',
    usedIn: ['News search', 'Trends'],
    data: ['Articles', 'Publishers', 'Dates']
  },

  // ─── Images & video ────────────────────────────────────────────────────────
  {
    id: 'google-images', name: 'Google Images', domain: 'google.com', category: 'Images & video', access: 'SerpApi',
    description: 'Public images matching a name or keyword. Also gathers the images shown in a case’s Images tab.',
    usedIn: ['Media search', 'Case Images tab'],
    data: ['Images', 'Source pages', 'Thumbnails']
  },
  {
    id: 'bing-images', name: 'Bing Images', domain: 'bing.com', category: 'Images & video', access: 'SerpApi',
    description: 'Second image index, merged with Google Images and de-duplicated.',
    usedIn: ['Media search'],
    data: ['Images', 'Source pages']
  },
  {
    id: 'youtube', name: 'YouTube', domain: 'youtube.com', category: 'Images & video', access: 'SerpApi',
    description: 'Channels and videos. Name searches look for the person’s channel; Media search lists videos.',
    usedIn: ['Name search', 'Username search', 'Media search'],
    data: ['Channels', 'Videos', 'Upload dates', 'Views']
  },
  {
    id: 'google-videos', name: 'Google Videos', domain: 'google.com', category: 'Images & video', access: 'SerpApi',
    description: 'Videos from every video site Google indexes (not only YouTube), with date filters.',
    usedIn: ['Media search'],
    data: ['Videos', 'Platforms', 'Dates']
  },
  {
    id: 'google-lens', name: 'Google Lens', domain: 'lens.google.com', category: 'Images & video', access: 'SerpApi',
    description: 'Reverse image search: pages that show the same or a visually similar image.',
    usedIn: ['Media search · Reverse image'],
    data: ['Visual matches', 'Pages using the image']
  },
  {
    id: 'google-reverse-image', name: 'Google Reverse Image', domain: 'google.com', category: 'Images & video', access: 'SerpApi',
    description: 'Classic reverse image search, run alongside Google Lens for more matches.',
    usedIn: ['Media search · Reverse image'],
    data: ['Matching pages', 'Image guesses']
  },

  // ─── Maps & places ─────────────────────────────────────────────────────────
  {
    id: 'google-maps', name: 'Google Maps', domain: 'maps.google.com', category: 'Maps & places', access: 'SerpApi',
    description: 'Places and businesses in a location, with ratings, addresses and opening details.',
    usedIn: ['Geo search'],
    data: ['Places', 'Addresses', 'Ratings', 'Coordinates']
  },
  {
    id: 'google-maps-reviews', name: 'Google Maps Reviews', domain: 'maps.google.com', category: 'Maps & places', access: 'SerpApi',
    description: 'Public reviews of a place, loaded only when you open a place.',
    usedIn: ['Geo search'],
    data: ['Reviews', 'Reviewer names', 'Dates', 'Ratings']
  },
  {
    id: 'google-maps-autocomplete', name: 'Google Maps Autocomplete', domain: 'maps.google.com', category: 'Maps & places', access: 'SerpApi',
    description: 'Places with the same or a similar name in other countries (e.g. "Osu" in Ghana, Japan and the US), used when “Any country” is chosen.',
    usedIn: ['Geo search · Similar places'],
    data: ['Place names', 'Countries']
  },

  // ─── Trends ────────────────────────────────────────────────────────────────
  {
    id: 'google-trends', name: 'Google Trends', domain: 'trends.google.com', category: 'Trends', access: 'SerpApi',
    description: 'Search interest over time for up to five terms, and the related queries people search.',
    usedIn: ['Trends'],
    data: ['Interest over time', 'Related queries']
  },
  {
    id: 'google-trends-now', name: 'Google Trends · Trending now', domain: 'trends.google.com', category: 'Trends', access: 'SerpApi',
    description: 'What is trending in a country right now.',
    usedIn: ['Trends'],
    data: ['Trending searches', 'Search volume']
  },

  // ─── Social platforms ──────────────────────────────────────────────────────
  {
    id: 'facebook', name: 'Facebook', domain: 'facebook.com', category: 'Social platforms', access: 'SerpApi',
    description: 'Public profiles and pages found through Google (two result pages, as Facebook holds the most public information), then confirmed with SerpApi’s Facebook Profile API.',
    usedIn: ['Name search', 'Username search', 'Social search'],
    data: ['Profiles', 'Pages', 'About details', 'Posts']
  },
  {
    id: 'instagram', name: 'Instagram', domain: 'instagram.com', category: 'Social platforms', access: 'SerpApi',
    description: 'Public accounts found through Google, confirmed with SerpApi’s Instagram Profile API (name, bio, follower counts).',
    usedIn: ['Name search', 'Username search', 'Social search'],
    data: ['Profiles', 'Bios', 'Followers', 'Posts']
  },
  {
    id: 'x', name: 'X (Twitter)', domain: 'x.com', category: 'Social platforms', access: 'Google site: search',
    description: 'Public profiles and posts indexed by Google (x.com and twitter.com). Post links are traced back to the account that posted them.',
    usedIn: ['Name search', 'Username search', 'Social search'],
    data: ['Profiles', 'Posts', 'Handles']
  },
  {
    id: 'tiktok', name: 'TikTok', domain: 'tiktok.com', category: 'Social platforms', access: 'Google site: search',
    description: 'Creator accounts and videos. Video links are traced back to the creator’s account; DuckDuckGo adds accounts Google misses.',
    usedIn: ['Name search', 'Username search', 'Social search'],
    data: ['Accounts', 'Videos', 'Handles']
  },
  {
    id: 'linkedin', name: 'LinkedIn', domain: 'linkedin.com', category: 'Social platforms', access: 'Google site: search',
    description: 'Public professional profiles and posts indexed by Google.',
    usedIn: ['Name search', 'Social search'],
    data: ['Profiles', 'Job titles', 'Employers', 'Locations']
  },
  {
    id: 'threads', name: 'Threads', domain: 'threads.net', category: 'Social platforms', access: 'Google site: search',
    description: 'Public Threads profiles and posts.',
    usedIn: ['Name search', 'Social search'],
    data: ['Profiles', 'Posts']
  },
  {
    id: 'reddit', name: 'Reddit', domain: 'reddit.com', category: 'Social platforms', access: 'Free public API',
    description: 'Username checks use Reddit’s public about.json (account age, karma). Posts and discussions come from Google.',
    usedIn: ['Username search', 'Social search · Forums'],
    data: ['Accounts', 'Karma', 'Posts', 'Comments']
  },
  {
    id: 'telegram', name: 'Telegram', domain: 'telegram.org', category: 'Social platforms', access: 'Free public API',
    description: 'Public channels and usernames, checked with the t.me public preview page and found through Google.',
    usedIn: ['Username search', 'Social search'],
    data: ['Public channels', 'Channel descriptions']
  },
  {
    id: 'whatsapp', name: 'WhatsApp (public group links)', domain: 'whatsapp.com', category: 'Social platforms', access: 'Google site: search',
    description: 'Public group invite links that Google has indexed. Private chats are never reachable.',
    usedIn: ['Social search'],
    data: ['Group invite pages']
  },
  {
    id: 'vk-weibo', name: 'VK & Sina Weibo', domain: 'vk.com', category: 'Social platforms', access: 'Google site: search',
    description: 'Public pages and posts on VK and Weibo, selectable in Social search.',
    usedIn: ['Social search'],
    data: ['Profiles', 'Posts']
  },
  {
    id: 'forums', name: 'Forums (Quora, Stack Exchange, Reddit)', domain: 'quora.com', category: 'Social platforms', access: 'SerpApi',
    description: 'Google’s Forums results filter, with a fallback to forum sites (Reddit, Quora, Stack Exchange, Stack Overflow).',
    usedIn: ['Social search · Forums'],
    data: ['Threads', 'Answers', 'Discussions']
  },
  {
    id: 'mastodon', name: 'Mastodon', domain: 'joinmastodon.org', category: 'Social platforms', access: 'Free public API',
    description: 'Account lookup on mastodon.social through the public Mastodon API.',
    usedIn: ['Username search'],
    data: ['Accounts', 'Display names', 'Followers']
  },
  {
    id: 'bluesky', name: 'Bluesky', domain: 'bsky.app', category: 'Social platforms', access: 'Free public API',
    description: 'Checks whether a handle exists with the public AT Protocol resolveHandle API.',
    usedIn: ['Username search'],
    data: ['Handles', 'Account IDs']
  },
  {
    id: 'twitch', name: 'Twitch', domain: 'twitch.tv', category: 'Social platforms', access: 'Free public API',
    description: 'Checks whether a Twitch username is taken.',
    usedIn: ['Username search'],
    data: ['Usernames']
  },
  {
    id: 'vimeo', name: 'Vimeo', domain: 'vimeo.com', category: 'Social platforms', access: 'Free public API',
    description: 'Checks the public profile page for a username.',
    usedIn: ['Username search'],
    data: ['Profiles']
  },

  // ─── Developer & writing ───────────────────────────────────────────────────
  {
    id: 'github', name: 'GitHub', domain: 'github.com', category: 'Developer & writing', access: 'Free public API',
    description: 'Username checks through the GitHub REST API (name, bio, location, company, repositories). Name searches find profiles through Google.',
    usedIn: ['Username search', 'Name search'],
    data: ['Profiles', 'Bio', 'Location', 'Repositories']
  },
  {
    id: 'dockerhub', name: 'Docker Hub', domain: 'hub.docker.com', category: 'Developer & writing', access: 'Free public API',
    description: 'Checks for a Docker Hub account with the same username.',
    usedIn: ['Username search'],
    data: ['Accounts', 'Join date']
  },
  {
    id: 'npm', name: 'npm', domain: 'npmjs.com', category: 'Developer & writing', access: 'Free public API',
    description: 'Checks the npm registry for a user with the same username.',
    usedIn: ['Username search'],
    data: ['Accounts']
  },
  {
    id: 'devto', name: 'DEV Community', domain: 'dev.to', category: 'Developer & writing', access: 'Free public API',
    description: 'Looks up the user with the DEV (Forem) public API.',
    usedIn: ['Username search'],
    data: ['Profiles', 'Bio', 'Location']
  },
  {
    id: 'medium', name: 'Medium', domain: 'medium.com', category: 'Developer & writing', access: 'Free public API',
    description: 'Checks the public @username page; name searches find writers through Google.',
    usedIn: ['Username search', 'Name search'],
    data: ['Profiles', 'Articles']
  },
  {
    id: 'stackoverflow', name: 'Stack Overflow', domain: 'stackoverflow.com', category: 'Developer & writing', access: 'Google site: search',
    description: 'Developer profiles found through Google in the name search.',
    usedIn: ['Name search'],
    data: ['Profiles', 'Answers']
  },
  {
    id: 'wikipedia', name: 'Wikipedia', domain: 'wikipedia.org', category: 'Developer & writing', access: 'Free public API',
    description: 'Checks for a Wikipedia editor account through the MediaWiki API; the Google knowledge panel (often from Wikipedia) adds summaries for well-known people.',
    usedIn: ['Username search', 'Name search'],
    data: ['Editor accounts', 'Edit counts', 'Summaries']
  },

  // ─── Account platform ──────────────────────────────────────────────────────
  {
    id: 'firebase-auth', name: 'Firebase Authentication', domain: 'firebase.google.com', category: 'Account platform', access: 'Platform service',
    description: 'Sign-in with Google or email and password. Holds all credentials; the app never stores passwords. The backend checks every request’s Firebase sign-in token.',
    usedIn: ['Sign-in', 'Every search'],
    data: ['Accounts', 'Sign-in tokens']
  },
  {
    id: 'firestore', name: 'Cloud Firestore', domain: 'firebase.google.com', category: 'Account platform', access: 'Platform service',
    description: 'Stores your profile, cases, tracked people, notifications and search history. Security rules let each account read only its own data.',
    usedIn: ['Cases', 'History', 'People', 'Settings'],
    data: ['Profiles', 'Cases', 'History']
  },
  {
    id: 'app-check', name: 'Firebase App Check (reCAPTCHA v3)', domain: 'firebase.google.com', category: 'Account platform', access: 'Platform service',
    description: 'Optional bot protection: proves requests come from this app. Active only when a reCAPTCHA site key is configured.',
    usedIn: ['Every search (optional)'],
    data: ['App Check tokens']
  },
  {
    id: 'serpapi-account', name: 'SerpApi Account API', domain: 'serpapi.com', category: 'Account platform', access: 'SerpApi',
    description: 'Reads the remaining monthly searches shown in the quota indicator. Free: it does not use a search.',
    usedIn: ['Quota indicator'],
    data: ['Searches left', 'Plan']
  }
];

// ─── API reference ───────────────────────────────────────────────────────────

export interface AppEndpoint {
  method: 'GET' | 'POST';
  path: string;
  auth: 'Public' | 'Signed in';
  usedBy: string;
  description: string;
  body?: string;
}

/** The app's own backend API (backend/src/routes/searchRoutes.ts). */
export const APP_ENDPOINTS: AppEndpoint[] = [
  { method: 'GET', path: '/api/health', auth: 'Public', usedBy: 'Monitoring', description: 'Backend status check (no sign-in needed, no searches used).' },
  { method: 'POST', path: '/api/search/stream', auth: 'Signed in', usedBy: 'Name & username search', description: 'Runs a name or username search and streams progress lines (NDJSON) followed by the result.', body: '{ query, type: "name" | "username", searchDepth?, location?, organization? }' },
  { method: 'POST', path: '/api/search', auth: 'Signed in', usedBy: 'Name & username search (fallback)', description: 'Same search as the stream, returned in one response.', body: '{ query, type, searchDepth? }' },
  { method: 'POST', path: '/api/investigations/rescan', auth: 'Signed in', usedBy: 'Case → Re-run searches', description: 'Re-runs a saved case’s searches and returns what changed.', body: '{ investigation, searchDepth? }' },
  { method: 'POST', path: '/api/explore', auth: 'Signed in', usedBy: 'Social, News, Media, Geo, Trends, case News/Images tabs', description: 'Runs one Explore capability (news, images, videos, reverseImage, social, forums, places, placeReviews, placeLookup, events, trends, trendingNow, web).', body: '{ capability, query, options?: { country, language, when, platforms, page, imageUrl, dataId, timeframe, callIndex } }' },
  { method: 'POST', path: '/api/explore/plan', auth: 'Signed in', usedBy: 'Search progress loader', description: 'Lists the engine calls a search will make (no searches used), so each step can show its own progress.', body: '{ capability, query, options? }' },
  { method: 'POST', path: '/api/query-intel', auth: 'Signed in', usedBy: 'Intelligent mode (“Did you mean”)', description: 'Checks the spelling of a search with one cached Google probe and returns corrections, alternatives and related searches. Not called in Precise mode.', body: '{ query, kind: "name" | "username" | "topic", mode?, knownNames? }' },
  { method: 'POST', path: '/api/link-health', auth: 'Signed in', usedBy: 'Profile link checks', description: 'Checks whether discovered profile links still open (known platform hosts only).', body: '{ urls: string[] }' },
  { method: 'GET', path: '/api/explore/catalog', auth: 'Signed in', usedBy: 'Explore pages', description: 'Available search capabilities, selectable social platforms and Trends time ranges.' },
  { method: 'GET', path: '/api/quota', auth: 'Signed in', usedBy: 'Quota indicator', description: 'SerpApi searches left this month (from the SerpApi Account API; free).' },
  { method: 'GET', path: '/api/username-discovery', auth: 'Signed in', usedBy: 'API only', description: 'Free direct username checks (GitHub, Reddit, Mastodon, Bluesky…) without SerpApi. ?username=…' },
  { method: 'GET', path: '/api/username-discovery/stream', auth: 'Signed in', usedBy: 'API only', description: 'The same checks streamed one platform at a time. ?username=…' }
];

export interface ExternalApi {
  provider: string;
  name: string;
  /** SerpApi engine name or the request made. */
  endpoint: string;
  usedFor: string;
  docs: string;
  cost: 'SerpApi search' | 'Free' | 'Free (Firebase)';
}

const SERP = 'https://serpapi.com/search.json?engine=';

export const EXTERNAL_APIS: ExternalApi[] = [
  { provider: 'SerpApi', name: 'Google Search API', endpoint: `${SERP}google`, usedFor: 'Name search, social & forum search, web, events, spelling probe', docs: 'https://serpapi.com/search-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Bing Search API', endpoint: `${SERP}bing`, usedFor: 'Web fallback', docs: 'https://serpapi.com/bing-search-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'DuckDuckGo Search API', endpoint: `${SERP}duckduckgo`, usedFor: 'Username search, TikTok accounts', docs: 'https://serpapi.com/duckduckgo-search-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Yahoo Search API', endpoint: `${SERP}yahoo`, usedFor: 'Username search', docs: 'https://serpapi.com/yahoo-search-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'YouTube Search API', endpoint: `${SERP}youtube`, usedFor: 'Channels and videos', docs: 'https://serpapi.com/youtube-search-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google News API', endpoint: `${SERP}google_news`, usedFor: 'News search, case News tab', docs: 'https://serpapi.com/google-news-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Bing News API', endpoint: `${SERP}bing_news`, usedFor: 'News search', docs: 'https://serpapi.com/bing-news-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google Images API', endpoint: `${SERP}google_images`, usedFor: 'Media search, case Images tab', docs: 'https://serpapi.com/google-images-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Bing Images API', endpoint: `${SERP}bing_images`, usedFor: 'Media search', docs: 'https://serpapi.com/bing-images-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google Videos API', endpoint: `${SERP}google_videos`, usedFor: 'Media search', docs: 'https://serpapi.com/google-videos-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google Lens API', endpoint: `${SERP}google_lens`, usedFor: 'Reverse image search', docs: 'https://serpapi.com/google-lens-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google Reverse Image API', endpoint: `${SERP}google_reverse_image`, usedFor: 'Reverse image search', docs: 'https://serpapi.com/google-reverse-image', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google Maps API', endpoint: `${SERP}google_maps`, usedFor: 'Geo search · places', docs: 'https://serpapi.com/google-maps-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google Maps Reviews API', endpoint: `${SERP}google_maps_reviews`, usedFor: 'Geo search · reviews', docs: 'https://serpapi.com/google-maps-reviews-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google Maps Autocomplete API', endpoint: `${SERP}google_maps_autocomplete`, usedFor: 'Geo search · similar places', docs: 'https://serpapi.com/google-maps-autocomplete-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google Trends API', endpoint: `${SERP}google_trends`, usedFor: 'Trends · interest and related queries', docs: 'https://serpapi.com/google-trends-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Google Trends Trending Now API', endpoint: `${SERP}google_trends_trending_now`, usedFor: 'Trends · trending now', docs: 'https://serpapi.com/google-trends-trending-now', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Facebook Profile API', endpoint: `${SERP}facebook_profile`, usedFor: 'Confirm Facebook profiles', docs: 'https://serpapi.com/facebook-profile-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Instagram Profile API', endpoint: `${SERP}instagram_profile`, usedFor: 'Confirm Instagram profiles', docs: 'https://serpapi.com/instagram-profile-api', cost: 'SerpApi search' },
  { provider: 'SerpApi', name: 'Account API', endpoint: 'https://serpapi.com/account.json', usedFor: 'Searches left this month', docs: 'https://serpapi.com/account-api', cost: 'Free' },
  { provider: 'GitHub', name: 'REST API · Users', endpoint: 'GET https://api.github.com/users/{username}', usedFor: 'Username checks', docs: 'https://docs.github.com/en/rest/users/users', cost: 'Free' },
  { provider: 'Docker', name: 'Docker Hub API', endpoint: 'GET https://hub.docker.com/v2/users/{username}', usedFor: 'Username checks', docs: 'https://docs.docker.com/reference/api/hub/latest/', cost: 'Free' },
  { provider: 'npm', name: 'Registry API', endpoint: 'GET https://registry.npmjs.org/-/user/org.couchdb.user:{username}', usedFor: 'Username checks', docs: 'https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md', cost: 'Free' },
  { provider: 'Reddit', name: 'User about.json', endpoint: 'GET https://www.reddit.com/user/{username}/about.json', usedFor: 'Username checks', docs: 'https://www.reddit.com/dev/api/', cost: 'Free' },
  { provider: 'DEV (Forem)', name: 'Users API', endpoint: 'GET https://dev.to/api/users/by_username?url={username}', usedFor: 'Username checks', docs: 'https://developers.forem.com/api', cost: 'Free' },
  { provider: 'Wikimedia', name: 'MediaWiki API · list=users', endpoint: 'GET https://en.wikipedia.org/w/api.php?action=query&list=users', usedFor: 'Username checks', docs: 'https://www.mediawiki.org/wiki/API:Users', cost: 'Free' },
  { provider: 'Mastodon', name: 'Accounts lookup', endpoint: 'GET https://mastodon.social/api/v1/accounts/lookup?acct={username}', usedFor: 'Username checks', docs: 'https://docs.joinmastodon.org/methods/accounts/', cost: 'Free' },
  { provider: 'Bluesky', name: 'com.atproto.identity.resolveHandle', endpoint: 'GET https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle', usedFor: 'Username checks', docs: 'https://docs.bsky.app/docs/api/com-atproto-identity-resolve-handle', cost: 'Free' },
  { provider: 'Telegram', name: 'Public channel preview', endpoint: 'GET https://t.me/s/{username}', usedFor: 'Username checks', docs: 'https://core.telegram.org/widgets', cost: 'Free' },
  { provider: 'Public pages', name: 'Medium, YouTube, Vimeo, Twitch', endpoint: 'GET https://medium.com/@{u} · youtube.com/@{u} · vimeo.com/{u} · passport.twitch.tv/usernames/{u}', usedFor: 'Username checks (page exists or not)', docs: '', cost: 'Free' },
  { provider: 'DuckDuckGo', name: 'HTML search', endpoint: 'GET https://html.duckduckgo.com/html/?q=site:{domain} "{username}"', usedFor: 'Free username checks on sites without an API', docs: '', cost: 'Free' },
  { provider: 'Firebase', name: 'Authentication · Google sign-in', endpoint: 'Firebase JS SDK: signInWithPopup / signInWithRedirect', usedFor: 'Sign-in', docs: 'https://firebase.google.com/docs/auth/web/google-signin', cost: 'Free (Firebase)' },
  { provider: 'Firebase', name: 'ID token verification', endpoint: 'Google public keys (securetoken@system.gserviceaccount.com)', usedFor: 'Backend checks every request’s sign-in', docs: 'https://firebase.google.com/docs/auth/admin/verify-id-tokens', cost: 'Free (Firebase)' },
  { provider: 'Firebase', name: 'Cloud Firestore', endpoint: 'Firebase JS SDK', usedFor: 'Profiles, cases, history, notifications', docs: 'https://firebase.google.com/docs/firestore', cost: 'Free (Firebase)' },
  { provider: 'Firebase', name: 'App Check · reCAPTCHA v3', endpoint: 'Firebase JS SDK (X-Firebase-AppCheck header)', usedFor: 'Optional bot protection', docs: 'https://firebase.google.com/docs/app-check/web/recaptcha-provider', cost: 'Free (Firebase)' }
];
