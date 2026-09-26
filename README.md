# CyberMonitor GH — OSINT Investigation Platform

A web application for **public-source (OSINT) research on a person's name or a username**. It sends search queries to public search engines through **SerpApi**, checks a few free public platform APIs, filters and classifies the results, and saves each investigation to **Firebase Firestore** so it can be reviewed later.

This README describes the application **as it is implemented today**. Where something is not implemented, it says so.

---

## Contents

1. [Overview](#1-overview)
2. [Purpose](#2-purpose)
3. [Current Scope](#3-current-scope)
4. [Technology Stack](#4-technology-stack)
5. [Architecture](#5-architecture)
6. [Complete Search Flow](#6-complete-search-flow)
7. [Name Search](#7-name-search)
8. [Username Search](#8-username-search)
9. [Query Generator](#9-query-generator)
10. [SerpApi Integration](#10-serpapi-integration)
11. [SerpApi Request Limits](#11-serpapi-request-limits)
12. [Result Normalization](#12-result-normalization)
13. [Relevance Filtering](#13-relevance-filtering)
14. [Identity Matching](#14-identity-matching)
15. [Profile Validation](#15-profile-validation)
16. [Deduplication](#16-deduplication)
17. [Result Classification](#17-result-classification)
18. [Tab Generation](#18-tab-generation)
19. [Overview / Person Summary](#19-overview--person-summary)
20. [Firestore](#20-firestore)
21. [Authentication](#21-authentication)
22. [Investigation Lifecycle](#22-investigation-lifecycle)
23. [Public Information and OSINT Scope](#23-public-information-and-osint-scope)
24. [API Failure Handling](#24-api-failure-handling)
25. [Security](#25-security)
26. [Project Structure](#26-project-structure)
27. [Important Files](#27-important-files)
28. [Data Flow](#28-data-flow)
29. [Request Usage Example](#29-request-usage-example)
30. [Limitations](#30-limitations)
31. [Troubleshooting](#31-troubleshooting)
32. [Development](#32-development)
33. [Environment Variables](#33-environment-variables)
34. [Cleanup Performed](#34-cleanup-performed)

---

## 1. Overview

A user signs in, types a **name** (e.g. `Satya Nadella`) or a **username** (e.g. `torvalds`) and presses Search.

1. The **frontend** (React) sends the text and the search type to the **backend** (Express/Node.js).
2. The backend builds a set of **search queries** and sends them to **SerpApi**. SerpApi runs them on Google, Bing or YouTube and returns the result pages as JSON.
3. For username searches the backend also asks a number of **free public platform APIs** (GitHub, Mastodon, Bluesky and others) whether that exact username exists.
4. The backend **cleans, filters, classifies, de-duplicates and groups** the results into one or more possible identities.
5. The frontend shows the possible identities. When the user picks one, it becomes an **investigation** that is saved to **Firestore** and shown in tabs (Overview, Profiles, Activity, Associations, Sources, Web, News, Metrics, Audit). Investigations can be **tracked**, which lists the person on the **People** page.

No AI or LLM service is used anywhere. Every label, score and summary is produced by fixed rules in the backend code.

## 2. Purpose

The application helps an investigator find **publicly indexed** information about a person or a username: social and professional profiles, news articles, web pages, videos and posts. It shows *why* each result was kept (the evidence) and keeps investigations for later review and rescanning.

## 3. Current Scope

Supported:

| Search type | What you enter | Backend engine |
|---|---|---|
| **Name / Person search** | A person's full name | `NameSearchEngine` (`backend/src/services/nameSearch/`) |
| **Username search** | A handle, with or without `@` | `DeepSearchEngine` (`backend/src/services/search/deepSearchEngine.ts`) |

**Not part of the application:** email search, domain search, domain/WHOIS/DNS lookups, phone search. The code for these was removed (see [Cleanup Performed](#34-cleanup-performed)). If the API receives any other search type, it answers `400 Only name and username searches are supported.`

### Explore and analysis pages

Besides the name and username investigations, the sidebar has these pages. They call `POST /api/explore` (backend `services/explore/`), never SerpApi directly, and they only run when the user presses a button.

| Page | Route | SerpApi engines | Searches per run |
|---|---|---|---|
| Social search: social platforms | `/search/social` | `google`, one query per selected platform with the site filter first (`site:facebook.com "…"`), like the name search. A single query with many `site:` filters made Google ignore the keywords and return unrelated pages, so only one name ("Adjoa Tee") happened to work. Plain multi-word keywords are sent as an exact phrase; if a platform returns nothing relevant, it retries over any time (with a date filter) or without quotes | 1 per platform (default 6), +1 per platform that needs a retry |
| Social search: forums | `/search/social` | `google` with Google's Forums filter (`udm=18`); if it fails or is empty, `google` restricted to Reddit, Quora, Stack Exchange and Stack Overflow. (The separate `google_forums` engine timed out in every test, so it is not used.) | 1–2 |
| News | `/search/news` | `google_news`; with a country selected it uses that country's Google News edition (`gl`), and the time filter is Google News's own `when:` operator so results stay in the edition. `bing_news` is added when no country is selected or the country is one of Bing's markets (US, GB, CA, AU, IN, DE, FR); for other countries (e.g. Ghana) it is left out so the list stays country-specific | 1–2 |
| Media: images | `/search/media` | `google_images` + `bing_images` | 2 |
| Media: videos | `/search/media` | `youtube` + `google_videos` | 2 |
| Media: reverse image | `/search/media` | `google_lens` (`type=visual_matches`) + `google_reverse_image`; needs a public image URL | 2 |
| Web (used by Geo and Trends) | — | `google` web search; `bing` if Google returns nothing | 1–2 |
| Media: facial recognition | `/search/media` | none. Shown as "Coming soon — API required"; no requests are sent | 0 |
| Geo search | `/search/geo` | Runs together: `google_maps` (places; the selected country is written into the query, because Google Maps has no country filter and "osu" alone matched Ohio State University), `google_news` + `bing_news`, `google` on social sites, `google` web search, and the events block of `google` search (the separate `google_events` engine is rejected by SerpApi as unsupported). With **Any country**, `google_maps_autocomplete` (world view) also lists places with the same or a similar name in other countries. Reviews load on request with `google_maps_reviews` | 6 (7 with Any country; +1 per place's reviews) |
| Trends | `/search/trends` | `google_trends` (interest over time; related queries for a single term) together with news, social and web searches for the first term, so a topic with too little Trends data still returns information, and `google_trends_trending_now` for the selected country (the page says whether the topic is among the searches trending there now) | about 11 (Trends 2, News 1–2, Social 6, Web 1, Trending now 1) |
| Network | `/analyse/network` | none. Built from the user's saved cases | 0 |
| Content analysis | `/analyse/content` | none. Built from the user's saved cases | 0 |

The case workspace's News tab also has **Find more news** (2 searches), and the workspace menu has **Export CSV**.

How Explore results are handled:

- **Engine catalogue.** `engineCatalog.ts` is the only place that decides which engines and parameters each capability uses.
- **Normalisation.** Each engine's JSON is converted into one `ExploreItem` shape (`normalize.ts`). Every item keeps the engine that returned it. Fields the engine did not return stay empty.
- **De-duplication.** Results are de-duplicated by URL, with host and tracking parameters normalised.
- **Relevance scoring.** News, images, videos, social and forum results are scored against the query text (`relevance.ts`). Results whose returned text contains none of the query terms, or fewer than 60% of them for multi-word searches, are hidden, and the count of hidden results is shown. Labels are "Strong match", "Partial match" and "Weak match", and describe only how well the text matches.
- **Reverse image results.** These are labelled "Visual match" and are never presented as identifying a person.
- **Engine isolation.** Engines run concurrently with a 40-second timeout each. One failing engine never fails the request; each engine's status (ok, cached, empty, error, quota) is shown on the page.
- **Saving to a case.** Results can be saved to any of the user's cases (`frontend/src/lib/caseSave.ts`):
  - news goes to the News tab;
  - posts and videos go to the Activity tab;
  - other pages go to the Web tab;
  - everything is also listed in Sources, and a "Results saved" event is added to Audit;
  - a profile link is saved only as a "Possible Match" that requires verification.
- **Quota.** `GET /api/quota` reads the free SerpApi account endpoint and does not use a search. Identical requests within `SERPAPI_CACHE_TTL_HOURS` are served from cache.
- **Rate limit.** `POST /api/explore` allows 40 requests per 5 minutes per client.


### Search intelligence (typo-tolerant search)

Every search page and the Profiler have a **Search mode** switch (default in Settings → Search defaults):

- **Intelligent** (default) — before searching, `POST /api/query-intel` (`backend/src/services/queryIntel/`) runs one Google "probe" for the query as typed (1 SerpApi search, cached 12 h; repeats are free). It learns the likely intended spelling from **Google's own "Did you mean"** (`search_information.spelling_fix` / `showing_results_for`) and from **how the top results spell each word** (Damerau-Levenshtein, Jaro-Winkler, repeated-letter collapse, sound-alike key). Each suggestion has a confidence:
  - **High** — Google's suggestion, or ≥3 results agreeing with high similarity → the corrected query is searched and the page says *"Showing results for X · Search instead for Y"*. The original's top results stay viewable under **Search path**.
  - **Medium / Low** — only *"Did you mean X?"* buttons; nothing is searched until the investigator clicks. Competing spellings are shown as choices, never picked automatically.
- **Precise** — searches exactly what is typed; no probe, no extra search.
- **Never corrected:** usernames, quoted phrases, queries with operators (`site:`, `OR`), styled handles (`xX_Kingsley_Xx`), words with digits/`_`/`.`, acronyms, words under 3 letters.
- **Result-based learning (no extra search):** after a search, if the results consistently spell the words another way (e.g. searched "Kingsley Anab", profiles say "Kingsley Anaab"; searched "galemsey", news says "galamsey"; username "adjoate_", results show "@_adjoatee"), the banner offers it as a suggestion.
- **Similar ≠ same:** name search keeps profiles whose name is only *spelled similarly* (e.g. "Kingsley Anaaba") as **Similar Match** (`relation: "similar"`) in a separate "other people" section; username search does the same for handles 1–2 characters away and for posts/videos by such handles. They never feed the subject's counts, activity or associations.
- **News by exact phrase:** multi-word news searches are sent as an exact phrase. News engines match it in the article body, so an article whose headline does not name it is still kept ("Named in the article, not in the headline", ranked below headline matches) instead of being hidden as unrelated. If the phrase finds nothing, a looser query runs.
- **No dead ends:** when a search's own sources return nothing relevant, the banner lists the Google web results the spelling check already fetched (no extra search).
- **Fuzzy relevance:** Explore results that use a close spelling of a search word count at reduced weight ("Similar spelling of …"). Duplicates are merged by URL and, on the same site, by near-identical title.
- **Investigation memory:** a Profiler search for a name/username already searched in the last 24 h offers to open that case instead (no searches used). The banner also points to one of your own cases with the same or a similar name (only your own cases are compared).
- **Feedback & grouping:** result lists have *Relevant / Possible match / Not relevant* buttons (ordering and hiding within the list; saved with a result when it is saved to a case) and *Group by account*.
- **History:** entries record the corrected query, its confidence, suggested spellings, sources and mode.
- **Failure-safe:** if the probe fails or the quota is exhausted, the banner says so and the original query is searched as before.

### Search progress, history and cases

- **One loader for every search.** Name and username searches use `POST /api/search/stream`, which streams a progress event as each query finishes and then the same response as `POST /api/search`. Explore searches run each engine as its own request (`POST /api/explore/plan` lists them, then `POST /api/explore` with `callIndex`). The loader's percentage only moves when a source really finishes. Every search can be cancelled. Each SerpApi request gives up after 30 seconds (`SERPAPI_TIMEOUT_MS`) and is retried once (SerpApi serves the repeat from its own cache without using a search), so a search never hangs.
- **Search history.** Every search (name, username, social, forums, news, images, videos, reverse image, geo, trends) is saved to `users/{uid}.searchHistory` in Firestore: newest first, capped at 100, with its settings, result count and top results. The **Search history** page groups them by kind and can run a search again or open the case made from it. Stored in the user's own document, it needs no Firestore rule change.
- **Saving results.** "Save to case" works without a Profiler search. With no case chosen, a new case named after the search is created in Firestore and the results are saved into it.
- **Case Images and News tabs.** On first open, the Images tab searches Google Images and Bing Images for the subject's exact name, and the News tab searches Google News and Bing News. Only items whose title or summary names the subject are kept automatically; other news articles are listed for review. Results are stored in the case (`imageResults`, `imagesCheckedAt`, `newsCheckedAt`), so later visits use no searches.
- **Opening a person** from the search results opens the case at once; saving it to Firestore continues in the background.

## 4. Technology Stack

| Layer | Technology (from `package.json` files) |
|---|---|
| Frontend | React 19, React Router 7, TypeScript 6, Vite 8, `lucide-react` icons, plain CSS |
| Authentication & database | Firebase 12 (Firebase Authentication with email/password, Cloud Firestore), used **from the browser** |
| Backend | Node.js, Express 5, TypeScript 7, `tsx` (dev runner), `cors`, `dotenv` |
| Search provider | SerpApi (`https://serpapi.com/search.json`) with engines `google`, `bing`, `youtube`, `facebook_profile`, `instagram_profile` |
| Other public sources (username search only) | GitHub API, Docker Hub API, npm registry, Reddit, Dev.to API, Wikipedia API, Mastodon API, Bluesky API, Twitch, public pages on Medium / Telegram / YouTube / Vimeo, DuckDuckGo HTML search |
| Hosting config | `vercel.json`: builds the frontend and serves the Express app as a serverless function via `api/index.ts` |

A separate marketing site also exists in `landing-page/` (its own Vite app). The same landing pages are also built into the main frontend under `frontend/src/landing/`.

## 5. Architecture

```
┌──────────────────────────── Browser ─────────────────────────────┐
│  React frontend (frontend/)                                        │
│   • Pages: Dashboard, New Investigation, Investigation detail…     │
│   • lib/searchClient.ts  ──HTTP──►  Backend /api/search            │
│   • firebase/auth.ts     ──────────► Firebase Authentication       │
│   • firebase/firestore.ts ─────────► Cloud Firestore               │
└───────────────────────────────────────────────────────────────────┘
                                   │ POST /api/search, /api/investigations/rescan,
                                   │ /api/link-health
                                   ▼
┌──────────────────────── Backend (backend/) ───────────────────────┐
│  Express server (server.ts) → routes/searchRoutes.ts               │
│  controllers/searchController.ts                                  │
│    ├─ name     → services/nameSearch/*  (NameSearchEngine)          │
│    └─ username → services/search/deepSearchEngine.ts                │
│                   + services/intelligence/usernameDiscoveryService  │
│  services/search/serpApiProvider.ts  ──HTTPS──►  SerpApi            │
└───────────────────────────────────────────────────────────────────┘
```

Key points:

- **The backend never talks to Firestore.** The browser saves and reads investigations directly with the Firebase SDK.
- **The backend has no database of its own.** The only thing it keeps between requests is an in-memory SerpApi response cache (see [§10](#10-serpapi-integration)).
- **SerpApi is the only search provider for name searches.** Username searches also use the free platform APIs listed above.

## 6. Complete Search Flow

These are the real stages, in order.

**Name search**

```
User types a name → Dashboard / New Investigation page
 → lib/searchClient.runSearch()            POST /api/search {query, type:"name"}
 → searchController.handleOSINTSearch
 → NameSearchEngine.execute
    1. buildPlan            fixed list of 8 SerpApi calls (default depth "deep")
    2. SerpApiProvider.request × 8, in parallel (cached for 12 h)
    3. Bing fallback        1 extra call, only if the broad Google call failed (not for quota)
    4. extractHits          organic results, knowledge-panel links, top stories, YouTube channels/videos
    5. resolveResultUrl     unwrap redirects, strip tracking, build a canonical de-duplication key
    6. classifyUrl          platform + page kind (profile, channel, post, video, article, website…)
    7. merge by canonical URL (deduplication)
    8. scoreProfile         profile pages: name/username evidence → score + label, or rejection
       full-name filter     non-profile pages: kept only if the full name appears
    9. confirmProfiles      up to 2 extra SerpApi calls (Facebook/Instagram profile endpoints)
   10. linkOwnContent       posts published by a found profile add evidence to it
   11. clusterIdentities    group profiles into possible distinct people
 → nameInvestigationBuilder (per identity): EntityAnalyzer → activities, associations, sources
 → JSON response: possibleIdentities[] (each with a full investigation object)
 → PossibleIdentitiesView  user chooses an identity
 → identityToInvestigation → Firestore investigations/{id} → Investigation page tabs
```

**Username search**

```
User types a username → POST /api/search {query, type:"username"}
 → DeepSearchEngine.executeDeepSearch   (default depth "deep", cap 35 queries)
    Stage 1  exact-username queries (and a few variations) on Google + Bing
    Direct   UsernameDiscoveryService: free platform APIs + DuckDuckGo (waits up to 15 s)
    Stage 2  one site-restricted query per platform in the registry, Google + Bing
    Stage 3  cross-platform queries for handles found in Stage 1–2 (if budget remains)
    Stage 4  pages 2–3 of the first 3 queries (if budget remains)
    Every search-engine result → RelevanceEngine.evaluateItem (score ≥ 50 to keep)
 → EntityAnalyzer.analyze / analyzeIdentities → profiles, activities, associations, sources, summary
 → same frontend path as above (identity → Firestore → tabs)
```

## 7. Name Search

### What happens when a user enters a name

1. The name is trimmed. Surrounding quotes are removed. Honorifics (`Dr`, `Mr`, `Prof`, `Nana`, `Engr`…) are ignored when matching.
2. The backend builds a **fixed query plan** (below). The frontend does not send a depth, so the backend default **`deep`** is used.
3. All planned calls go to SerpApi **at the same time**.

### Queries generated (exact-phrase search)

Every query puts the full name in double quotes, so the search engine matches the exact phrase.

| # | Engine | Query (for `Jane Doe`) | Purpose |
|---|---|---|---|
| 1 | google | `"Jane Doe"` | Broad web, knowledge panel, top stories |
| 2 | google | `(site:linkedin.com/in OR site:linkedin.com/pub) "Jane Doe"` | LinkedIn profiles |
| 3 | google | `site:facebook.com "Jane Doe"` | Facebook profiles |
| 4 | google | `site:instagram.com "Jane Doe"` | Instagram profiles |
| 5 | google | `(site:x.com OR site:twitter.com) "Jane Doe"` | X (Twitter) profiles |
| 6 | google | `(site:tiktok.com OR site:threads.net) "Jane Doe"` | TikTok & Threads |
| 7 | youtube | `Jane Doe` | YouTube channels (and uploaders of matching videos) |
| 8 | google | `(site:github.com OR site:medium.com OR site:reddit.com OR site:stackoverflow.com) "Jane Doe"` | Developer & writing profiles |

- **Depth `quick`** uses 4 calls: #1, LinkedIn, Facebook+Instagram combined, and X+TikTok+GitHub combined.
- **Location / organization hints:** the engine adds one query per hint (`"Jane Doe" "Accra"`). The current UI has no field for these, so this only happens when the API is called directly.
- **No name variations** (initials, nicknames, reordered names) are searched. Only the exact phrase is sent. Reordered names are still *accepted* when they appear in results.
- Each Google call asks for one page of 10 results (`num=10`). There is no pagination.

**Calls per name search:** 8 (deep, default) + 0–2 profile confirmations + 0–1 Bing fallback = **8 to 11 SerpApi requests**. Quick: 4–5. Standard: 8–10.

### How irrelevant results are filtered

The engine first works out *what kind of page* each result is (see [§15](#15-profile-validation)). Then:

- **Search pages, platform pages and unclassifiable platform URLs** (e.g. `facebook.com/search`, `instagram.com/explore`, `linkedin.com/jobs`) are rejected.
- **Profile / channel pages** must carry the searched name *as the account's own name* (see [§14](#14-identity-matching)). Otherwise they are rejected with a reason such as *"Profile name 'Jane Smith' only partly matches 'Jane Doe'"*.
- **Everything else** (articles, news, posts, videos, websites) is kept **only if the full name appears as a phrase** in the title or snippet. For two-word names the reversed order also counts. One shared word is never enough, so "King" does not match "Kingsley".

Every rejection is recorded with its reason (`rejected[]` in the API response). The per-query returned/kept counts are stored in the investigation's search log and shown in the Metrics tab.

### Multiple people with the same name

The engine does **not** assume that all results belong to one person. Profiles are grouped into **possible identities** (`clusterIdentities`):

- Two profiles are linked only if they share the **same username** (at least 4 characters) or the **same organization** extracted from the result.
- A group becomes a **distinct identity** if it has 2 or more linked profiles, or at least one profile that lists facts (headline, organization, education or location). At most 5 distinct identities are kept.
- Profiles that cannot be linked to anything go into one **"unlinked"** group. Its summary says they *"may belong to different people"*. It is labelled `Uncertain` when it holds more than one profile.
- Web results are attached to an identity if they mention its organization or `@username`, or were published by one of its profiles. The remaining web results only *mention the name*. They are marked `name_mention` and attached to **every** identity.

Example from a live test: `Satya Nadella` produced 6 identities. One was the Microsoft CEO (X + LinkedIn, linked by the shared username `@satyanadella`); the other five were different LinkedIn users with the same name.

### Profiles vs posts, reels, videos, organizations, articles

This is decided from the **URL structure**, per platform (`pageClassifier.ts`). For example:

| URL | Classified as |
|---|---|
| `facebook.com/jane.doe` | profile |
| `facebook.com/groups/…`, `facebook.com/pages/…` | group / organization page |
| `facebook.com/…/posts/…`, `facebook.com/reel/…` | post / video |
| `instagram.com/janedoe` | profile |
| `instagram.com/p/…`, `instagram.com/reel/…` | post / video |
| `linkedin.com/in/jane-doe` | profile |
| `linkedin.com/company/…` | organization page |
| `linkedin.com/pulse/…` | article |
| `youtube.com/@handle`, `/channel/…` | channel |
| `youtube.com/watch?v=…` | video |
| `x.com/janedoe` | profile |
| `x.com/janedoe/status/…` | post |
| `github.com/janedoe` | profile |
| `github.com/janedoe/repo` | repository |

Only `profile` and `channel` pages can appear in the Profiles tab. Unknown websites become `website`. Wikipedia and news-style paths (`/news/`, `/2024/05/…`) become `article`.

### Confidence

Each accepted profile gets a score from its evidence:

| Evidence | Points |
|---|---|
| Profile name is exactly the searched name | +40 (reordered +36, contains the full name +30) |
| Username in the URL matches the name (`janedoe`, `doejane`) | +15 (initial + surname: +5) |
| The result snippet also contains the full name | +10 |
| Location / organization hint appears in the result | +15 each |
| Listed in Google's knowledge panel for the name | +25 |
| Returned by 2 or more separate searches | +5 |
| Posts by this account also appear in the results | +10 |
| SerpApi Facebook/Instagram profile endpoint confirms the account name | +25 |
| Same username found on another platform in the same identity, or linked from the Instagram bio | +20 |

The label is set from the score:

- **Verified Match:** score ≥ 75, *and* there is corroboration (knowledge panel, profile endpoint, or cross-platform link), *and* the name is an exact or reordered match.
- **Likely Match:** score ≥ 55.
- **Possible Match:** anything lower.

The score is capped at 99. The UI shows the labels as "Profile match / Likely match / Possible match". An identity's confidence is the score of its best profile.

## 8. Username Search

### Exact username searches

The `@` is removed. **Stage 1** builds these queries for the username and each variation:

```
"torvalds"
"torvalds" profile OR "torvalds" account
site:facebook.com "torvalds"
site:instagram.com "torvalds"
```

Each query is sent to **Google and Bing** at the same time (2 SerpApi requests).

### Variations

`DeepSearchEngine.generateUsernameVariations` produces up to 6 variations:

- the exact username
- a lowercase copy
- if the name splits into parts (camelCase or `_ . -`): underscore, dot and hyphen joins
- a `1` suffix, if the name does not already end in a digit

Duplicate query strings are skipped.

### Platform-specific searches

**Stage 2** walks the platform registry (`platformRegistry.ts`, 55 entries) and sends each platform's username pattern:

- `site:github.com "torvalds"`
- `site:youtube.com "@torvalds" OR site:youtube.com "torvalds"`
- `site:reddit.com/user/ "torvalds" OR site:reddit.com "torvalds"`
- …and so on

Which platforms are included depends on depth: tier 1 only for quick, tiers 1–2 for standard, all tiers for deep. **Stages 3 and 4** (cross-platform searches for other handles found, and pages 2–3 of the first queries) run only if the query budget is not used up. At the default depth it usually is used up.

**Query budget:** quick 8, standard 18, deep 35 queries. A query costs 2 SerpApi requests in stages 1–2 (3 for the YouTube platform query) and 1 in stages 3–4.

### Direct platform checks (free, not SerpApi)

`UsernameDiscoveryService` checks the **exact username** directly:

- **Platform APIs:** GitHub, Docker Hub, npm, Reddit, Dev.to, Wikipedia (user account), Mastodon (`mastodon.social`), Bluesky, Twitch.
- **Public pages:** Medium, Telegram, YouTube, Vimeo.
- **DuckDuckGo HTML search** (`site:<platform> "<username>"`) for Instagram, TikTok, X, Snapchat, LinkedIn, Threads, Pinterest and Facebook.

The engine waits up to **15 seconds** and uses every check that has finished by then. The service also tries a few username variations on GitHub. Those hits are **not** added to the results because they are a different username.

### Exact vs similar usernames

`RelevanceEngine.matchUsername` compares the username with the handle in the URL, the title, the snippet and the URL:

- **Exact:** the handle equals the username, or the username text appears in the title, snippet or URL. Note that this is a *substring* check, so `john` also matches `johnson` in text.
- **Variation:** equal after removing `_ . -` separators. This gets a lower score.
- Results with neither are penalised and usually rejected.

### Same username ≠ same person — current behaviour

The username search **does not** try to establish that accounts with the same username belong to one person:

- Every exact-handle hit from the direct checks is labelled *"Confirmed public profile match for exact username"* (confidence 95, "Verified Match").
- All results are presented together as one identity.
- When there are more than 3 results, `EntityAnalyzer.analyzeIdentities` splits them into up to 3 "identities" **by result category** (e.g. Social Media vs Websites & News), not by person.

The investigator must judge whether the accounts belong to the same person. (The name search, by contrast, keeps unlinked accounts apart; see [§7](#7-name-search).)

### How profile URLs are obtained and validated

- **From search results:** the URL is the link the search engine returned. It is normalised (redirects unwrapped, tracking removed) and classified by `UrlValidator.validateAndClassify`. That function knows the profile URL patterns of about 20 platforms (Instagram, YouTube, TikTok, X, LinkedIn, GitHub, Reddit, Facebook, Medium, Substack, Dev.to, Behance, Dribbble, Pinterest, Spotify, SoundCloud, Twitch, Quora…). Only URLs matching a profile pattern become profiles.
- **From direct checks:** the URL returned by the platform API, or the platform's standard profile URL for a username the API confirmed exists (e.g. `https://github.com/<login>` from the GitHub API's `html_url`).
- **Duplicates:** removed by normalised URL (see [§16](#16-deduplication)).
- **How results reach the frontend:** the controller returns `possibleIdentities[]`. Each identity carries the analysed results for its group: profiles, activities, associations, sources and summary. When the user selects one, the frontend (`runSearch` + `identityToInvestigation`) builds the saved investigation from it and adds the search-level record: coverage, stats, the per-query search log, and the web results that belong to the identity's sources.

## 9. Query Generator

**In plain words:** a search engine only answers the question you ask it. The *query generator* is the part of the backend that decides **which questions to ask** for a given name or username. It turns one input (e.g. `Jane Doe`) into a short list of targeted searches, such as "pages with the exact phrase *Jane Doe* on linkedin.com". The results then come back already focused on profiles and relevant pages.

**Why it is needed.** A single plain search mostly returns the best-known pages. Asking separately for LinkedIn, Facebook, Instagram, X and so on finds profiles that would otherwise be buried.

**Where it is:**

| Search | Generator | Input | Output |
|---|---|---|---|
| Name | `buildPlan()` in `nameSearch/nameSearchEngine.ts` | name, depth, optional location/organization | a fixed list of 4 (quick) or 8 (standard/deep) planned calls, each with engine, query text and purpose |
| Username | Stage 1 list + `platformRegistry.ts` patterns in `search/deepSearchEngine.ts` | username, depth | up to 8 / 18 / 35 query strings, sent to Google + Bing |

**How it avoids unnecessary queries:**

- **Name:** the plan is fixed and small. Related sites are combined into one query with `OR` (e.g. TikTok + Threads). A Bing retry happens only if the main Google query failed for a reason other than quota. Profile confirmation calls happen only when there is a Facebook/Instagram candidate.
- **Username:** a `seenQueries` set stops the same query text being sent twice. A hard cap limits the total. At quick/standard depth, Stage 2 stops early after 4 queries in a row that add nothing.
- **Both:** identical calls within 12 hours are answered from the backend cache and are not billed again (see [§10](#10-serpapi-integration)).

**Exact-match first.** Every query wraps the name or username in quotes, so the search engine must match the exact phrase.

**Effect on SerpApi usage.** The query generator decides the cost of a search: one planned query = one SerpApi request. A name search costs 4 (quick) or 9 (standard/deep) requests, plus 1 per location or organisation hint, up to 2 profile confirmations (deep) and 1 spelling probe in Intelligent mode. A username search costs 5 / 10 / up to 13 requests (quick / standard / deep: Google broad and per-platform searches, DuckDuckGo, Yahoo, YouTube, and Facebook/Instagram profile lookups); its direct platform checks are free ([§11](#11-serpapi-request-limits)).

## 10. SerpApi Integration

### What SerpApi does

SerpApi is a paid API that **runs a search on a search engine for us and returns the results page as structured JSON**. It does **not** give access to Facebook, Instagram, LinkedIn or any platform's internal data. The application only sees what Google, Bing or YouTube show publicly in their results, plus what SerpApi's Facebook/Instagram *profile* endpoints return about a public profile page.

### Where it is called

All SerpApi traffic goes through one method: `SerpApiProvider.request(engine, params)` in `backend/src/services/search/serpApiProvider.ts`.

**In-app reference.** The **Sources** page (`frontend/src/pages/Sources/Sources.tsx`) lists every data source, and its **API endpoints** tab documents the backend's own endpoints and every external API called (the 19 SerpApi engines, the free platform APIs and Firebase), each with a link to the provider's documentation. The data lives in `frontend/src/lib/sourceCatalog.ts`; update it when an engine, platform check or route is added.

- **Endpoint:** `GET https://serpapi.com/search.json?engine=<engine>&…&api_key=<SERPAPI_KEY>`

| Engine | Parameters sent | Used by |
|---|---|---|
| `google` | `q`, `num=10` (name) · `q`, `start`, `num=10` (username) | name + username |
| `bing` | `q` (name fallback) · `q`, `first=1` (username) | name fallback, username |
| `youtube` | `search_query` | name (1 call), username (YouTube platform query) |
| `facebook_profile` | `profile_id` (the username from the URL) | name search, deep: confirmation |
| `instagram_profile` | `profile_id` | name search, deep: confirmation |

### What is extracted from the response

- **google / bing:** `organic_results[]` (position, title, link, redirect_link, displayed_link, source, snippet, favicon, thumbnail, date, rich-snippet extensions), `knowledge_graph.profiles[]` (social links Google shows for the entity), `top_stories[]`.
- **youtube:** `channel_results[]` and `video_results[]` (including the uploading channel's name and link).
- **facebook_profile / instagram_profile:** `profile_results`: account name, profile picture, "about" details (work, education, location), biography, external/bio links, private flag.

For name searches, the raw fields of every hit are kept on the result (`raw[]`), so the evidence can be audited.

### Pagination

- **Name search:** none. Only the first page (10 results) per query.
- **Username search:** Stage 4 requests pages 2–3 (`start=10`, `start=20`) of the first 3 queries, but only if the query budget has not been used up.

### Parallel or sequential

- **Name search:** all 8 planned calls are sent **in parallel**, so up to 8 requests are in flight at once. The Bing fallback and the (up to 2) profile confirmations run afterwards, one at a time.
- **Username search:** queries run **one after another**. For each query, Google, Bing (and YouTube for the YouTube query) are called in parallel, so at most 3 requests are in flight at once.

### Caching and duplicate prevention

- **Backend cache:** every successful response, including valid "no results" responses, is cached **in memory** for `SERPAPI_CACHE_TTL_HOURS` (default **12 hours**, max 500 entries). The key is the engine plus the parameters; the API key is not part of the key. A repeated search within that time costs **0** requests. Verified in testing: a repeated name search reported 4 of 4 calls "cached" and SerpApi usage did not change.
- **Optional disk cache:** if `SERPAPI_CACHE_DIR` is set, responses are also written there and survive restarts.
- **Limits of the cache:** it is not shared between server instances. On Vercel's serverless functions the memory cache lasts only as long as a function instance stays warm.
- Errors (quota, bad key, network) are never cached.

### Errors

`request()` never throws. It returns `{ data, error, fromCache, quotaExhausted }`:

| Situation | What `request()` returns |
|---|---|
| `SERPAPI_KEY` missing | error `"SERPAPI_KEY is not configured"`; no network call is made |
| HTTP 429, or an error message matching "run out of searches" / "plan searches" / "exceeded" | `quotaExhausted: true` |
| "Google hasn't returned any results" | treated as a valid, empty answer |
| Network failure | error message, `data: null` |

## 11. SerpApi Request Limits

Three different limits apply. Keep them separate:

| Concept | Value in this application |
|---|---|
| **Requests per search** | Name search (default): **9–12**. Username search (default): **13**. See the table below. |
| **Concurrent requests** | Name search: up to **8** at once. Username search: up to **3** at once. The app sets no global concurrency limit across users. |
| **Monthly quota** | Set by the SerpApi plan. The current plan is the **Free Plan: 250 searches per month**. The account endpoint also reports an hourly limit of 250 searches. |

| Search | Depth | SerpApi requests (nothing cached) |
|---|---|---|
| Name | quick | 4 (+1 if the Bing fallback runs) |
| Name | standard | 8 + up to 1 confirmation (+1 fallback) |
| **Name** | **deep (what the UI uses)** | **9 (includes a second page of Facebook results) + up to 3 profile checks (2 Facebook, 1 Instagram) (+1 fallback) = 9–13** |
| Username | quick | 5 (+ free direct platform checks) |
| Username | standard | 10 (+ free direct platform checks) |
| **Username** | **deep (what the UI uses)** | **13**: Google queries covering the username and its common spellings (`99_name` also searched as `99.name`, `99name`, `name99`) for the web, Facebook, Instagram, X, TikTok, LinkedIn and Threads/GitHub/Reddit/Medium; DuckDuckGo restricted to TikTok (it finds TikTok handles with other punctuation that Google misses); DuckDuckGo and Yahoo with the plain username (through the API they find handles written with other punctuation, e.g. `@99.humblechild_` for `99_humblechild`, which Google and Bing did not); YouTube; and the SerpApi Facebook and Instagram profile endpoints — all in parallel, plus free direct platform checks. Results are labelled: exact handle, same handle with different punctuation ("Likely Match"), or similar handle on a real profile page — containing the username's main word, or, for usernames with a number, the same number and the word's first 6+ letters ("Possible Match", "Similar username (likely a different account)") |
| Re-run searches on an investigation | deep | same as a new search of that type |
| Explore pages (news, media, social, geo, trends) | — | 1–2 per run; see [Current Scope](#3-current-scope) |

**What 250 per month means in practice:** about **19–27 name searches**, *or* about **25 username searches**, *or* a mix. The application itself does **not** limit users, count usage, or warn before a search that would use up the quota.

SerpApi's own documentation says that only successful searches count toward the quota, and that searches served from SerpApi's own short-lived cache are free. Check the current terms on serpapi.com; the application does not depend on this.

### When the 250 requests are used up

SerpApi then rejects every new request with an error (typically HTTP 429, "Your account has run out of searches") until the plan renews. **There is no fallback search provider.** The Bing fallback is also SerpApi and is skipped on quota errors.

| Scenario | What happens (from the code) |
|---|---|
| **A. The app is open when the quota runs out** | Nothing changes by itself. There is no background polling and no quota indicator. Browsing dashboards and saved investigations keeps working. |
| **B. A new name search** | Every SerpApi call fails. `quotaExhausted` is set, and the frontend shows **"Search quota exhausted: The SerpApi monthly search quota is exhausted…"**. No new results are produced. *Exception:* an identical search made in the last 12 hours on the same running backend is answered from the cache and still works. |
| **C. A new username search** | All Google/Bing calls fail, but the username engine does not report this. The **free direct platform checks still run** (GitHub, Mastodon, Bluesky, etc.), so the search can still return profiles from those sources, but nothing from Google/Bing. No quota message is shown for username searches. |
| **D. Existing investigations in Firestore** | **Yes, they can still be viewed.** They are read from Firestore (and the browser's session cache) and need no SerpApi calls. The Profiles tab's link check does not use SerpApi either. |
| **E. Any new live search after exhaustion** | SerpApi returns an error, so no new search-engine results are produced. Name search shows the quota message. Username search returns only the direct-check results. There is no other provider. **Refresh** on a *name* investigation now returns an error and leaves the saved investigation unchanged. **Refresh** on a *username* investigation replaces the saved results with the reduced direct-check results (see [§30](#30-limitations)). |

## 12. Result Normalization

Raw SerpApi items become application items as follows.

**Name search** (`nameSearchEngine.ts`, `urlResolution.ts`)

1. `extractHits` turns each organic result, knowledge-panel profile link, top story, YouTube channel, YouTube video and video uploader into a `RawHit` that keeps the original SerpApi fields.
2. `resolveResultUrl`:
   - unwraps Google `/url?q=` and Bing `/ck/a?u=a1…` redirects
   - rejects links that point to search engines or SerpApi itself
   - removes tracking parameters (`utm_*`, `fbclid`, `gclid`, `igshid`, `si`, `trk`…) and the `#fragment`
   - The result is the **URL the user will open**, i.e. the search engine's link without tracking. It is never rebuilt from a name.
   - It also builds a separate **canonical key**, used only for de-duplication.
3. Profiles become `DiscoveredProfile` objects: platform, page kind, profile name, username, `profileUrl`, `canonicalUrl`, title, snippet, extracted attributes, evidence list, confidence, label and raw evidence.
4. Other pages become `NormalizedResultItem` objects: source, type, title, description, URL, and metadata (page kind, date, "found via").

**Username search** (`deepSearchEngine.ts`, `urlValidator.ts`)

`UrlValidator.normalizeUrl` unwraps Google redirects, strips tracking parameters and trailing slashes. Each accepted item becomes a `NormalizedResultItem` with a `sourceType` such as `Social Media`, `Developer & Code`, `Video & Streaming`, `Websites & News`, `Knowledge & Wikipedia` or `Organizations`.

## 13. Relevance Filtering

| Name search | Username search |
|---|---|
| Search/platform pages rejected by URL rules | `RelevanceEngine.evaluateItem` rejects search pages, hashtag pages and login pages |
| Profiles: the account's own name must match (§14) | Title/snippet/URL/handle scoring (§8). The item is kept only if score **≥ 50** |
| Other pages: the full name must appear as a phrase | Location/organization hints add +12 each (API only) |
| Optional profile-endpoint check can reject a profile whose account name differs | Verified profile URL with a matching title: +20 |

Rejected name-search items are listed with a reason in the API response (`rejected[]`). Username search only counts its rejections.

## 14. Identity Matching

**Name search** (`identityMatcher.ts`, whole-word matching only):

- `compareName` compares the searched name with each candidate name taken from the result title (e.g. "Jane Doe - Engineer - Acme | LinkedIn" → "Jane Doe"), the YouTube channel name, or the name in the URL (`facebook.com/people/Jane-Doe/123`):
  - `exact`: same words, same order
  - `reordered`: same words, different order
  - `contains_full`: all searched words plus at most 2 extra, e.g. a middle name
  - `partial` / `none`: not accepted as a profile
- A profile is accepted if its name is exact, reordered or contains_full, **or** if its username equals the joined name (`janedoe`) *and* the snippet contains the full name.
- `extractAttributes` pulls only facts the result states literally: LinkedIn headline and organization from the title; `Experience:`, `Education:`, `Location:` from the snippet; Google's rich-snippet details.
- Identities are formed by shared username or shared organization ([§7](#multiple-people-with-the-same-name)).

**Username search:** identity is the exact username only ([§8](#same-username--same-person--current-behaviour)).

## 15. Profile Validation

A result is shown as a profile only if all applicable checks pass:

1. **Valid destination:** an `http(s)` URL that is not a search engine or SerpApi page (backend `resolveResultUrl`; frontend `profileDestination` checks again before opening).
2. **Platform URL structure:** the path must be a profile/channel path for that platform:
   - **Name search:** `pageClassifier.ts` has rules for 47 platforms, including Facebook, Instagram, X, LinkedIn, TikTok, YouTube, GitHub, Reddit, Medium, Threads, Mastodon, Bluesky, Telegram, Pinterest, Snapchat, Tumblr, Twitch, Kick, Vimeo, GitLab, Stack Overflow, Google Scholar, ResearchGate, ORCID, Behance, Spotify, SoundCloud and Quora.
   - **Username search:** `urlValidator.ts` has rules for about 20 platforms.
3. **Name evidence** (name search), see [§14](#14-identity-matching).
4. **Optional API confirmation** (name search, deep): for the best Facebook and best Instagram candidate, SerpApi's profile endpoint is asked for the account name. A match adds evidence; a different name **removes** the profile.
5. **Link health** (after saving): when the Profiles tab opens, profiles not checked in the last 24 hours are sent to `POST /api/link-health`.
   - The backend fetches **only** URLs on known platform hosts, with an 8-second timeout.
   - It reports `reachable`, `unavailable` (404/410 or a "page isn't available" body) or `unverifiable` (login walls, bot blocks such as LinkedIn's HTTP 999, timeouts).
   - This checks reachability only, **not identity**, and never changes the URL.

**View Profile** opens exactly the stored `profileUrl`. If the link is known to be unavailable, or not a valid destination, the UI shows *"This profile is no longer available or could not be verified."* and does not guess another URL.

**No profile URL is ever invented.** Platforms with no matching result simply have no profile.

## 16. Deduplication

- **Name search, results:** all hits are merged by **canonical key**, and their evidence accumulates on one candidate. The canonical key:
  - lowercases the host and drops `www.`, `m.`, `mobile.`
  - maps LinkedIn country subdomains (`gh.linkedin.com`) to `linkedin.com` and `twitter.com` to `x.com`
  - lowercases the path on platforms with case-insensitive handles
  - keeps only identity parameters (Facebook `id`, Scholar `user`, YouTube `v`/`list`)
  - removes the trailing slash

  YouTube channel tab pages (`/videos`, `/about`…) are merged into the channel. When two returned URLs merge, the shorter one is used for opening.
- **Name search, associations:** de-duplicated by lowercase name.
- **Username search:** `seenUrls` holds normalised URLs, so the first accepted occurrence wins. `seenQueries` prevents repeated query text.
- **Sources:** one source per unique normalised URL (`EntityAnalyzer.buildSourcesLayer`).
- **Rescans:** profiles are matched to saved ones by canonical URL. New/old is decided by comparing URLs ([§22](#22-investigation-lifecycle)).

## 17. Result Classification

| Final category | Name search: how it is decided | Username search: how it is decided |
|---|---|---|
| **Profiles** | Page kind `person_profile` or `channel` + name evidence. Category from the platform registry: Social / Professional (LinkedIn, business, academic) / Developer / Video & Streaming | `UrlValidator` profile pattern, or a direct platform-check hit |
| **Web / News** | Every accepted non-profile page: article, news (Google Top Stories or news-style path), website, post, video, repository, group, organization page. Labelled by page kind ("Article", "News", "Post", "Mention in a post"…) | Items whose `sourceType` is `Websites & News`, `Knowledge & Wikipedia` or empty |
| **Activity** | Built by `EntityAnalyzer.extractActivities` from the identity's web items (profile URLs excluded). Category from keywords in title/snippet: speech, interview, conference, political, professional, publication, else "News Mention" | Same function over **all** accepted items, profiles included |
| **Associations** | Organization and education listed on profiles, plus `EntityAnalyzer.extractAssociations`: phrases ending in University/College/Institute/School/Academy; a fixed list of organizations (NDC, NPP, African Union, United Nations, Parliament of Ghana, ECOWAS); a `company` field if present | `EntityAnalyzer.extractAssociations` only |
| **Sources** | One entry per unique URL among the identity's web items and profiles, with a type (News Article, Social Profile, Developer Profile, Knowledge Base, Web Document) and "used for" (Activity Report / Association Evidence / Identity Verification) | Same |
| **Organizations** | Not a separate tab. Organization pages and groups appear in Profiles; organizations named on profiles appear in Associations | LinkedIn/"professional" profiles get the `Organizations` source type |

**One result can appear in several tabs.** For example, a news article is a News item, an Activity entry and a Source, and it can produce an Association if it names a university. Duplicates *within* a tab are prevented as described in [§16](#16-deduplication).

## 18. Tab Generation

The investigation page (`pages/Investigation/InvestigationDetail.tsx`) renders these tabs from the saved investigation object. Every web result is placed in exactly one of Profiles (organization pages and groups), Activity (posts and videos), News or Web, using `bucketOf()` in `frontend/src/lib/workspace.ts`.

| Tab | Data shown | Count in the tab label |
|---|---|---|
| Overview | `quickSummary`, key info, search inputs, top 3 profiles, recent dated activity, associations, strongest sources; side panel with the evidence levels, search coverage and timeline | none |
| Profiles | `socialProfiles` plus organization pages / groups from `webAndNews`, in one table with a detail panel. Posts and videos returned by profile searches are listed below for reference (not counted) | profiles + pages/groups |
| Activity | `activities` as a month-grouped timeline (undated items under "Date not stated"), with type, platform, evidence-level and date filters | `activities.length` |
| Associations | `associations`: documented ones in a table, others under "Appears in results, not documented" with Document / Dismiss | `associations.length` |
| Sources | `sources`, numbered S-01…, with type / level / link-status filters, CSV export and "Add source" | number of sources |
| Web | `webAndNews` items that are web pages (not news, posts or organization pages) | web items |
| News | `webAndNews` items from Google Top Stories or with a news-article path | news items |
| Metrics | result counts, returned vs kept per search, kept results per tab, and the full search log | none |
| Audit | every search run (from the search log) and every change made in the workspace, exportable as CSV | number of events |

**Evidence levels.** Every source, profile and association has a level: *Raw result*, *Relevant* or *Validated*. Everything the searches kept starts as Relevant; the investigator can raise it to Validated or lower it to Raw result. Levels are stored in the investigation's `review` map and every change is written to the audit log.

**Source logos.** Each row shows the logo of the site the result came from: the platform's brand mark for known platforms, otherwise the site's favicon (fetched from Google's favicon service). A letter is shown only if no logo can be loaded.

**Tab counts are accurate:** each number is the length of the **same array the tab renders**, with its default "All" filter. The summary cards, key-info panel and Metrics tab also use array lengths. Identity cards use `profilesCount` etc., which the backend computes from the arrays it sends. A count is omitted when it would be 0.

## 19. Overview / Person Summary

The summary is **built by fixed rules from the search results. No AI model is used.**

- **Name search:** `clusterIdentities` in `nameSearchEngine.ts` builds `identity.summary`:
  - Up to two profile descriptions, e.g. *"A LinkedIn profile for Satya Nadella lists headline 'Chairman and CEO at Microsoft'."*
  - If profiles were grouped, a line saying why, e.g. *"…grouped because they share the username @satyanadella"*.
  - For unlinked profiles: *"N profiles on … use the name … but share no username or organization with each other, so they may belong to different people."*
  - With no profiles: *"No profile page could be attributed to …"*.
  - Role and location come from the first profile that states them, otherwise "Not stated in sources" / "Not specified".
- **Username search:** `EntityAnalyzer.generatePersonSummary`:
  - uses the text of a Wikipedia result if there is one
  - otherwise *"<name> is documented in public records as a <role>…"* followed by the first two result snippets
  - The role comes from keywords (e.g. "developer" → Software Engineer), the location from a short keyword list (Ghana, Nigeria, United States, United Kingdom).
- **Conflicting information:** not reconciled. The first stated value wins. In name search, conflicting people are kept as separate identities instead of being merged.
- **Stored:** yes, as `quickSummary` and `description` on the Firestore investigation.
- **After Re-run searches:** the summary is rebuilt from the new results and replaces the old one.

## 20. Firestore

The browser reads and writes Firestore directly (`frontend/src/firebase/firestore.ts`). Every document belongs to exactly one user:

| Collection | Document | Contents |
|---|---|---|
| `users/{uid}` | one per user | `uid`, `email`, `displayName`, `role`, `organisation`, `photoURL` (small resized image or the Google photo), `timeZone`, `dateFormat`, `searchDefaults`, `notificationPrefs`, `createdAt`, `updatedAt`, `lastLoginAt` |
| `users/{uid}/notifications/{id}` | one per notification | `type`, `title`, `message`, `createdAt`, `read`, `targetInvestigationId` |
| `investigations/{id}` | one per selected identity | the whole investigation (below); `createdBy` = owner uid |
| `trackedPeople/{uid}_{investigationId}` | one per tracked person | `userId`, `investigationId`, `name`, `searchType`, `location`, `occupation`, `avatarUrl`, `profilesCount`, `sourcesCount`, `lastSearched`, `trackedAt` |

**Passwords are never stored in Firestore.** Firebase Authentication holds credentials; Firestore only holds the profile and data.

Notifications are live (`onSnapshot`): marking one read, deleting one, or "Clear all" changes Firestore immediately, so the bell shows the same list after a refresh or on another device. Tracking a person writes its `trackedPeople` record; untracking or deleting the investigation removes it.

An investigation document holds:

- `name`, `searchType`, `searchInputs`, `quickSummary`, `targetProfile`, `overallConfidence`
- the arrays shown in the tabs: `socialProfiles`, `webAndNews`, `activities`, `recentActivities`, `associations`, `sources`, `sourceLinks`
- `review` (evidence level per result), `auditLog` (workspace changes), `searchLog` (every SerpApi query of every run), `auditTrail`
- `scanHistory`, `searchCoverage`, `deepStats`, `resultsCount`, `isTracked`
- `createdBy` (the user's uid), `createdAt`, `updatedAt`

Everything is stored **inside** the investigation document; there are no sub-collections. Documents are written with `setDoc(..., { merge: true })` after `undefined` values are removed.

Writes happen when:

- an identity is selected
- the user tracks/untracks the person
- an evidence level is changed, an association is documented or dismissed, or a source is added
- link-health results arrive
- a rescan completes

Deleting from the Investigations list deletes the document. A user's list is loaded with `where('createdBy', '==', uid)` and sorted in the browser. The last opened investigation is also cached in `sessionStorage` for that browser tab.

The raw search results that were *not* selected (other identities, rejected items) are **not stored**.

## 21. Authentication

- **Firebase Authentication** is the only record of who is signed in (`firebase/auth.ts`, `context/SessionContext.tsx`). Nothing about the session is kept in `localStorage`; Firebase restores the session itself after a refresh.
- **Create account** (`pages/Auth/AuthPages.tsx`): full name, phone number (validated, with country code), email and password. Firebase Authentication stores the credentials; the profile and settings are saved to `users/{uid}`. The user can sign in with the same email and password at any time.
- **Sign in:** email and password. **Keep me signed in on this device** keeps the session after the browser closes; without it the session lasts until the tab or browser is closed (a refresh never signs the user out).
- **Forgot password:** sends Firebase's password reset email.
- **Continue with Google** (login page and the homepage "Sign in required" notice): Firebase Google sign-in (`signInWithGoogle` in `firebase/auth.ts`). It opens Google's sign-in window; if the browser blocks pop-ups, the whole page goes to Google and comes back (`getRedirectResult` is handled in `SessionContext`). The session is kept on the device (local persistence) until the user signs out. Cancelling, blocked pop-ups, network problems, disabled accounts and unauthorised domains show short friendly messages; raw Firebase errors are never shown.
  - The first Google sign-in creates the `users/{uid}` profile from the Google account (name, email, photo, account creation time, last sign-in time). Later sign-ins only update `lastLoginAt` and the email, and fill a missing name or photo; they never overwrite what the user changed in Settings.
  - Google accounts have no password in this app. **Settings → Security** links to the Google Account security page, and **Delete account** confirms in Google's sign-in window instead of asking for a password.
- **No guest access.** Guest (anonymous) sign-in has been removed. A guest session still saved in a browser is signed out on load with the notice "Guest access is no longer available". Data created by old guest accounts is no longer reachable.
- **Protected pages:** every app page (dashboard, investigations, people, settings, …) is wrapped in `ProtectedRoute`. While Firebase restores the session a loading screen is shown, so a signed-in user is never bounced to the login page on refresh. A signed-out visitor who opens an app page, even by typing the URL, is sent to the homepage, which shows **"Sign in required"** with *Sign in* and *Continue with Google*. Signed-in users who open `/auth` go straight to the dashboard.
- **Session checks:** on load the app confirms the saved sign-in is still valid. If the account was disabled or deleted, or the backend rejects the session, the user is signed out and sees "Your session has expired. Please sign in again." (or the disabled-account message).
- **Separate data per user:** every query filters by the signed-in uid (`createdBy` / `userId`), an investigation that belongs to someone else is never loaded, and the Firestore security rules (below) enforce the same on the server.
- **Sign out** (sidebar, mobile menu or Settings) signs out of Firebase and clears cached search state in the browser, so the next person on the same browser starts clean.
- **Backend protection** (`backend/src/middleware/requireAuth.ts`): every `/api/*` request except `/api/health` must send the user's Firebase ID token (`Authorization: Bearer …`, added by `frontend/src/lib/apiAuth.ts`). The backend checks the token's signature against Google's public keys, that it was issued for this Firebase project, that it has not expired, and that it is not an anonymous sign-in. Missing or invalid tokens get `401`. No service-account key is needed.
  - **Rate limit:** each account can run at most `SEARCHES_PER_10_MIN` (default 30) name/username searches and re-runs per 10 minutes (`429` after that); the explore endpoints keep their own per-user limit.
  - **App Check (optional bot protection):** register the web app with reCAPTCHA v3 in Firebase console → App Check, put the site key in `VITE_RECAPTCHA_SITE_KEY` (frontend), redeploy, then set `APP_CHECK_ENFORCE=true` in `backend/.env`. Without the site key, App Check stays off and nothing changes.
  - Backend settings: `FIREBASE_PROJECT_ID` and `FIREBASE_PROJECT_NUMBER` (default to this project), `AUTH_REQUIRED=false` turns the check off for local testing only.
- **Firebase console setup:** Authentication → Sign-in method → enable **Google** (and keep Email/Password); disable **Anonymous**. Authentication → Settings → Authorized domains → add the deployed domain (e.g. the Vercel domain). Publish `firestore.rules`, which also refuse anonymous sign-ins.

## 22. Investigation Lifecycle

```
Search ─► Possible identities ─► Select identity ─► Investigation (saved) ─► Re-run searches ─► Updated investigation (saved)
```

1. **Initial search:** runs the live queries and returns *possible identities* (name search: up to 5 distinct people + an unlinked group; username search: 1–3 groups). Nothing is saved yet.
2. **Investigation:** selecting an identity turns *that identity's* profiles and results into an investigation. `identityToInvestigation` builds it, it is saved to Firestore, and the tab view opens. Other identities are discarded. For a username search split into several category groups, only the chosen group's items are kept.
3. **Re-run searches:** the investigation page has a **Re-run searches** button. It calls `POST /api/investigations/rescan` at depth `deep` and runs the **same queries again**; there are no additional "deeper" queries. The new queries are appended to the search log as a new run.
4. **Merging (name investigations):**
   - The new identity with the most profile URLs in common with the saved ones is chosen, so the selected person is kept.
   - Profiles found again keep their original `discoveredAt` and link status.
   - Saved profiles **not** found again are kept and marked **"Previously discovered · not returned by the latest scan"**.
   - Web and news results, Activity, Associations and Sources are **replaced** by the new results.
   - Evidence levels, audit log, name, id, creation date and tracking flag are kept.
5. **Merging (username investigations):** all result arrays are replaced by the new results; evidence levels, audit log and tracking flag are kept.
6. **New findings:** `TrackingEngine.compareScans` compares URLs with the previous scan. It adds a **scan history** entry ("+ 2 new public profile(s) discovered…") shown in the Audit tab and in a toast/notification. Individual new items are **not** separately labelled in the tabs.
7. The updated investigation is saved back to Firestore.
8. **Tracking:** **Track person** on the investigation page sets `isTracked`. The **People** page (`pages/People/People.tsx`) subscribes to the user's investigations and lists every tracked one live; **Untrack** there or on the investigation removes it.

## 23. Public Information and OSINT Scope

The application works only with **publicly available information**:

- results that public search engines (Google, Bing, YouTube) return through SerpApi
- public profile data returned by SerpApi's Facebook/Instagram profile endpoints
- public, unauthenticated platform APIs and public web pages for username checks

It does **not**:

- access private accounts or read private messages
- obtain passwords or bypass authentication, login walls or access restrictions
- hack accounts or break platform security
- query private or breached databases
- bypass paywalls
- retrieve private subscriber information or IP information

If a platform hides a page behind a login, the link check reports it as "unverifiable" and nothing further is attempted. Private Instagram accounts are marked as private; only their public header is used.

Users are responsible for lawful and ethical use. See the Responsible Use and Terms pages in the app.

## 24. API Failure Handling

| Failure | What happens |
|---|---|
| **`SERPAPI_KEY` missing** | No SerpApi call is made. **Name search:** the UI shows *"Search failed: No search could be completed: … SERPAPI_KEY is not configured"*. **Username search:** only the free direct checks run; there is no error message. |
| **SerpApi request fails** (HTTP error, network) | That call is marked `error` in the audit trail and coverage list. The other calls still count. If the broad Google call fails for a non-quota reason, one Bing retry is made (name search). If *every* name-search call fails, the UI shows "Search failed". |
| **Quota exhausted** | See [§11](#when-the-250-requests-are-used-up). |
| **Search returns no results** | Name search: an identity card saying *"No profile page could be attributed to …"* (not an error). Username search: *"No verified public records found for …"*. If the backend returns no identities and no investigation at all, the UI shows *"No public results were returned for …"*. |
| **Invalid source URL** | Rejected during resolution (not http(s), search-engine or SerpApi URL). At click time, the UI refuses to open an invalid or known-unavailable profile and shows *"This profile is no longer available or could not be verified."* |
| **Backend error** | The API returns HTTP 500 and the UI shows "Search failed" with the message. |
| **Backend unreachable / network down** | The UI shows *"The search service could not be reached. Check that the backend is running."* |
| **Search takes > 2 minutes** | The frontend aborts and shows *"Search timed out"*. |
| **Rescan when nothing could be searched** (name) | HTTP 503; the saved investigation is **not** changed; the UI shows "Rescan Failed". |
| **Firestore write fails** | Logged to the browser console. The investigation still opens from memory/session storage. |
| **Unsupported search type** | HTTP 400 *"Only name and username searches are supported."* |

## 25. Security

What exists today:

- **Secrets in environment files:** `SERPAPI_KEY` and `GITHUB_TOKEN` are read from `backend/.env`. That file and `frontend/.env` are git-ignored, and a check found no secret in any tracked file or in git history. The SerpApi key is only sent to serpapi.com.
- **Firebase web config:** read from `VITE_FIREBASE_*` variables. `frontend/src/firebase/config.ts` also contains **hard-coded fallback values** for the project's web config. Firebase treats these as public client identifiers, not secrets; data is protected by the security rules, not by hiding this config.
- **Credentials:** held by Firebase Authentication; never written to Firestore.
- **User data isolation:** `firestore.rules` gives every user access to their own documents only:
  - `users/{uid}` and `users/{uid}/notifications` — only that uid;
  - `investigations` — only where `createdBy` is the signed-in uid, and `createdBy` cannot be changed;
  - `trackedPeople` — only where `userId` is the signed-in uid;
  - everything else is closed.
  - **These rules only take effect once they are published** (Firebase console → Firestore → Rules, or `firebase deploy --only firestore:rules` using the included `firebase.json` / `.firebaserc`). Before publishing, the project's live rules allowed anyone to read the database (an unauthenticated read returned HTTP 200 during the audit).
  - Investigations saved earlier under the old shared `demo-user` id are not owned by any real account, so after the rules are published nobody can open them.
- **Backend API:** no authentication, no rate limiting, CORS allows all origins (`*`). Anyone who can reach the backend can spend the SerpApi quota.
- **Link-health check:** only fetches URLs on known platform hosts (never arbitrary or internal hosts) and caps a request at 25 URLs.
- **Public-source limitation:** see [§23](#23-public-information-and-osint-scope).

## 26. Project Structure

```
osint-app/
├── api/index.ts                     Vercel serverless entry (re-exports the Express app)
├── vercel.json                      Build + rewrite rules (/api/* → backend)
├── package.json                     Root scripts (dev/build for all apps), npm workspaces
├── backend/
│   ├── .env.example
│   ├── package.json, tsconfig.json
│   └── src/
│       ├── server.ts                Express app, /api/health, mounts routes
│       ├── routes/searchRoutes.ts   /search, /investigations/rescan, /link-health, /username-discovery
│       ├── controllers/
│       │   ├── searchController.ts           search + rescan (name → NameSearchEngine, username → DeepSearchEngine)
│       │   └── usernameDiscoveryController.ts direct username checks (JSON and SSE stream)
│       ├── services/
│       │   ├── nameSearch/
│       │   │   ├── nameSearchEngine.ts        query plan, extraction, scoring, clustering
│       │   │   ├── nameInvestigationBuilder.ts identity → investigation; rescan merge
│       │   │   ├── pageClassifier.ts          per-platform URL → page kind
│       │   │   ├── identityMatcher.ts         name/handle matching, attribute extraction
│       │   │   ├── urlResolution.ts           redirect unwrapping, tracking removal, canonical key
│       │   │   ├── linkHealth.ts              reachability check for profile URLs
│       │   │   └── __offline_check.ts, __live_check.ts, __probe_profile_apis.ts   developer scripts
│       │   ├── search/
│       │   │   ├── serpApiProvider.ts         the only SerpApi client (+ cache)
│       │   │   ├── deepSearchEngine.ts        username search stages
│       │   │   └── platformRegistry.ts        55 platform/query entries: domains, tiers, patterns, host detection
│       │   └── intelligence/
│       │       ├── entityAnalyzer.ts          activities, associations, sources, summary, username profiles
│       │       ├── relevanceEngine.ts         username-search relevance scoring
│       │       ├── urlValidator.ts            username-search URL normalisation/classification
│       │       ├── usernameDiscoveryService.ts free direct platform checks
│       │       └── trackingEngine.ts          new-vs-previous comparison for rescans
│       └── types/  search.ts, intelligence.ts, discovery.ts
├── frontend/
│   ├── .env.example, index.html, vite.config.ts, eslint.config.js, tsconfig*.json
│   └── src/
│       ├── main.tsx, App.tsx          routes (landing, auth, protected app)
│       ├── lib/searchClient.ts        calls /api/search, builds the saved investigation
│       ├── lib/profileDisplay.ts      profile labels, "View Profile" opening rules
│       ├── firebase/                  config.ts, auth.ts, firestore.ts
│       ├── pages/                     Dashboard, NewInvestigation, Investigation, Investigations,
│       │                              People, Sources, Settings, Help, Auth
│       ├── components/
│       │   ├── investigations/        ProfileHeader, KeyInfoPanel, SocialProfilesList,
│       │   │   └── tabs/              RecentActivityList, ProfileDetailModal + the 8 tabs
│       │   ├── search/                PossibleIdentitiesView, CoilingSnakeLoader
│       │   ├── layout/                Layout, Sidebar, Topbar, MobileNav, NotificationDropdown
│       │   └── ui/                    PlatformIcon, Toast
│       ├── context/                   Theme, Notification
│       ├── routes/ProtectedRoute.tsx
│       ├── landing/                   public marketing pages inside the app
│       ├── styles/                    CSS per component/page
│       └── types/                     investigation.ts, user.ts
└── landing-page/                    stand-alone copy of the marketing site (separate Vite app)
```

## 27. Important Files

| File | Why it matters |
|---|---|
| `backend/src/controllers/searchController.ts` | Entry point for every search and rescan; decides name vs username; rejects other types |
| `backend/src/services/nameSearch/nameSearchEngine.ts` | The whole name-search pipeline, including the query plan (`buildPlan`) |
| `backend/src/services/nameSearch/pageClassifier.ts` | Decides profile vs post/video/group/article for each platform |
| `backend/src/services/nameSearch/identityMatcher.ts` | Name/username matching rules |
| `backend/src/services/nameSearch/nameInvestigationBuilder.ts` | Builds the investigation object; keeps tab counts equal to array lengths; rescan merge |
| `backend/src/services/search/serpApiProvider.ts` | The only place SerpApi is called; cache; quota/error detection |
| `backend/src/services/search/deepSearchEngine.ts` | Username search stages and query budget |
| `backend/src/services/search/platformRegistry.ts` | Supported platforms, their domains and query patterns |
| `backend/src/services/intelligence/entityAnalyzer.ts` | Activities, associations, sources, username summary |
| `backend/src/services/intelligence/usernameDiscoveryService.ts` | Free direct platform checks |
| `frontend/src/lib/searchClient.ts` | Frontend ↔ backend search contract, error messages, saved investigation shape |
| `frontend/src/pages/Investigation/InvestigationDetail.tsx` | Workspace header, tabs, tab counts, Re-run searches, tracking |
| `frontend/src/firebase/firestore.ts` | All Firestore reads/writes |

## 28. Data Flow

```
Search engines (Google / Bing / YouTube)          Public platform APIs (username only)
          │  public result pages                            │ exists? profile URL
          ▼                                                 │
      SerpApi  ── JSON (organic results, knowledge panel,    │
          │          top stories, channels, videos)          │
          ▼                                                 ▼
  Backend: query plan → requests → hits → URL resolution → classification
           → filtering/scoring → de-duplication → identities → tab arrays + summary
          │  JSON: possibleIdentities[] (each with a complete investigation)
          ▼
  Frontend: identity cards → user selects one → investigation object
          │  setDoc
          ▼
  Firestore investigations/{id} ──► Investigation page tabs (read back on later visits)
```

**Who does what:**

- **SerpApi** fetches search-engine result pages.
- **Search engines** decide which public pages exist in their index and what title and snippet they show.
- **The backend** decides what is relevant, what is a profile, what belongs to which identity, and what goes in each tab.
- **Firestore** stores the chosen investigation.
- **The frontend** displays it and lets the user annotate, refresh and export it (JSON download).

## 29. Request Usage Example

```
User searches the name "Jane Doe" (default depth: deep)
  ↓
Query generator builds 8 queries (1 broad + 6 site-restricted Google + 1 YouTube)
  ↓
8 requests sent to SerpApi in parallel                       → 8 billed (0 if cached < 12 h)
  ↓
SerpApi returns up to 10 results per Google query, plus YouTube channels/videos
  ↓
Backend: resolve URLs → classify → reject non-matching → merge duplicates
  ↓
Up to 2 profile confirmations (Facebook / Instagram)          → 0–2 billed
  ↓
Identities built (e.g. 3 possible people + 1 unlinked group)
  ↓
User picks one → saved to Firestore → tabs displayed           → 0 billed
Total: 8–10 requests (11 if the Bing fallback runs)
```

A **username** search for `torvalds` at default depth sends 35 queries × (Google + Bing), plus 1 YouTube request: **about 71 requests**. It also makes about 21 free direct platform checks.

Measured during the cleanup: two live name searches at `quick` depth used **exactly 4 requests each**, and repeating one of them used **0** (served from cache).

## 30. Limitations

- **Only what search engines index.** A profile that Google/Bing/YouTube do not index, or that is not in the first 10 results of a query, is not found. The app has no access to any platform's internal database.
- **Exact-phrase only.** Nicknames, misspellings, initials and other-language spellings of a name are not searched.
- **Quota.** 250 searches/month allows only about 3 default username searches. There is no usage counter, per-user limit or fallback provider.
- **Username identity.** Accounts with the same username are presented as one person and labelled "Verified Match" ([§8](#same-username--same-person--current-behaviour)). The username "exact match" check is a substring check. "Identities" in username search are result-category groups, not people.
- **Username search does not report SerpApi errors.** A missing key or exhausted quota looks like "no results" apart from the direct-check hits.
- **Username rescan overwrites.** Refreshing a username investigation while SerpApi is unavailable replaces saved results with the reduced set.
- **Re-run searches repeats the same queries** at depth `deep`; there is no separate "deeper" search.
- **Activity in username investigations** also lists the profiles themselves.
- **Rule-based extraction.** Roles, locations and associations come from keyword lists (the organization list is Ghana-focused), so they can be missing or wrong.
- **Summaries are overwritten** on rescan, including manual edits.
- **The cache is per server instance** and not persistent unless `SERPAPI_CACHE_DIR` is set.
- **Security gaps** listed in [§25](#25-security): open backend API; Firestore isolation depends on publishing `firestore.rules`.
- **The static "Sources" page and the marketing/landing pages** describe the product in general terms; they are not generated from the search pipeline.
- **No location/organization fields in the UI**, although the backend supports them.

## 31. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| "Search unavailable – The search service could not be reached" | Backend not running, or `VITE_API_URL` points to the wrong place. Start the backend (`npm run dev:backend`) and check `frontend/.env`. |
| "Search failed: No search could be completed: … SERPAPI_KEY is not configured" | Add `SERPAPI_KEY` to `backend/.env` and restart the backend. |
| "Search quota exhausted" | The SerpApi monthly quota is used up. Wait for renewal or upgrade the plan. Saved investigations still open. |
| Username search returns only GitHub/Mastodon/… results | SerpApi calls failing (quota or key). Check the backend console for `[SerpApiProvider] … error` lines. |
| "Search timed out" | A search took more than 2 minutes, usually a slow username search. Try again. |
| A profile shows "currently unavailable" | The link check got 404/410 or a "page not available" page. The profile was found earlier but may have been deleted or renamed. |
| LinkedIn / Facebook profiles show no link status | Those sites block automated checks; they are reported as "unverifiable". This is expected. |
| Investigations list is empty after login | Each account has its own investigations. Investigations made by old guest accounts are no longer reachable. |
| "Google sign-in is not enabled for this web address yet" | Add the site's domain in Firebase console → Authentication → Settings → Authorized domains. |
| "This sign-in method is not enabled" | Enable Google in Firebase console → Authentication → Sign-in method. |
| Every search says "Please sign in to continue" / session expired | The backend could not verify the sign-in. Sign out and in again; check that the backend's `FIREBASE_PROJECT_ID` matches the frontend's Firebase project. |
| "Missing or insufficient permissions" in the console | The published Firestore rules do not match the app. Publish `firestore.rules`. |
| Rescan says "Rescan Failed" | For name investigations this is returned when no SerpApi call succeeded (quota/key/network). The saved data was not changed. |
| How much quota is left? | Open `https://serpapi.com/account.json?api_key=<your key>` (this call is free) or the SerpApi dashboard. |

## 32. Development

Requirements: Node.js 20+ and npm.

```bash
# install (root workspace installs frontend + backend)
npm install
cd landing-page && npm install && cd ..   # only if you run the stand-alone landing site

# configure
cp backend/.env.example backend/.env       # set SERPAPI_KEY
cp frontend/.env.example frontend/.env     # set VITE_FIREBASE_* and VITE_API_URL

# run everything (backend :5000, frontend and landing via Vite)
npm run dev

# or individually
npm run dev:backend      # tsx watch backend/src/server.ts  → http://localhost:5000/api/health
npm run dev:frontend     # vite → http://localhost:5173

# builds
npm run build:backend    # tsc → backend/dist
npm run build:frontend   # tsc -b && vite build → frontend/dist

# offline self-test of URL resolution, classification and name matching (no API calls)
cd backend && npx tsx src/services/nameSearch/__offline_check.ts

# live name-search check from the command line (uses SerpApi quota!)
cd backend && npx tsx src/services/nameSearch/__live_check.ts "Jane Doe" quick
```

API endpoints:

| Method | Path | Body / query | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | liveness |
| POST | `/api/search` | `{ "query": "...", "type": "name" \| "username", "searchDepth"?: "quick" \| "standard" \| "deep" }` | run a search |
| POST | `/api/investigations/rescan` | `{ "investigation": {...}, "searchDepth"?: ... }` | re-run a saved investigation |
| POST | `/api/link-health` | `{ "urls": [...] }` | reachability of profile URLs |
| GET | `/api/username-discovery?username=` | — | direct username checks as JSON (not used by the current UI) |
| GET | `/api/username-discovery/stream?username=` | — | same, as Server-Sent Events (not used by the current UI) |

## 33. Environment Variables

**Backend (`backend/.env`)**

| Variable | Required | Purpose |
|---|---|---|
| `SERPAPI_KEY` | yes | SerpApi API key (`SERP_API_KEY` is also accepted) |
| `PORT` | no | Backend port (default 5000) |
| `NODE_ENV` | no | `production` stops the server from calling `listen()` (used for Vercel) |
| `GITHUB_TOKEN` | no | Raises GitHub API rate limits for username checks |
| `SERPAPI_CACHE_TTL_HOURS` | no | Cache lifetime in hours (default 12; 0 disables) |
| `SERPAPI_CACHE_DIR` | no | Directory for a persistent copy of the cache |
| `FIREBASE_PROJECT_ID` | no | Listed in `.env.example` but **not read by the backend code** |

**Frontend (`frontend/.env`)**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL, e.g. `http://localhost:5000/api` (defaults to `/api`) |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` | Firebase web app configuration |

Example (placeholders only):

```
SERPAPI_KEY=your_api_key_here
VITE_API_URL=http://localhost:5000/api
```

## 34. Cleanup Performed

The application was audited end to end. Only code proven unreachable, or specific to email/domain investigation, was removed. Every deletion was checked for imports, routes and dynamic use first.

**Email / domain functionality removed**

- `backend/src/services/search/domainProvider.ts`: DNS A/MX/TXT/NS lookups and HTTP header inspection. Imported nowhere.
- The **email/domain/phone "fallback pipeline"** in `searchController.ts`. It was the only path for non-name, non-username queries. The API now rejects those types with HTTP 400.
- Providers used only by that pipeline:
  - `socialProvider.ts` (Gravatar email lookup, plus Dev.to/Reddit checks duplicated in `usernameDiscoveryService`)
  - `rssWebFeedProvider.ts` (website/feed fetching, "Domain Intelligence" results)
  - `githubProvider.ts`, `usernameProvider.ts` (duplicates of `usernameDiscoveryService`)
  - `wikipediaProvider.ts`
  - their base class `baseProvider.ts`
  - `tieredQueryEngine.ts`, plus the `search()` method of `SerpApiProvider` that used it
- `backend/src/services/intelligence/queryNormalizer.ts` (email/phone detection and hashing), `queryGenerator.ts`, `confidenceScorer.ts`: imported nowhere.
- `frontend/src/components/search/NewInvestigationForm.tsx` (+ CSS): the only UI with Email / Domain options. Rendered nowhere.
- Types: `'email' | 'domain' | 'phone'` search types, `email/phone/domain/website` query fields, the `Domain Intelligence` / `Email Intelligence` categories, and the always-zero `emails` / `phones` counts (backend and frontend).
- UI remnants: the Domain/WHOIS/DNS icon branch in `PlatformIcon.tsx` and the Gravatar row in `SocialProfilesList.tsx`. Help-page text that mentioned "domain lookup protocols" and the deleted `TieredQueryEngine` was corrected.

**Other unused code removed** (no importers)

- `frontend/src/components/search/UsernameDiscoveryDropdown.tsx` (+ CSS), `frontend/src/hooks/useUsernameDiscovery.ts`, `frontend/src/types/discovery.ts`. They were used only by the deleted form. The backend `/api/username-discovery` endpoints remain.
- `frontend/src/components/dashboard/DashboardCards.tsx` (+ CSS), including the email/phone metric cards.
- `frontend/src/components/investigations/SourceLinks.tsx` (+ CSS).
- `frontend/src/styles/App.css`, `frontend/src/styles/Help.css`: never imported. The Help page uses `pages/Help/Help.css`.
- The empty `server/` folder.
- A duplicate copy of `detectPlatform` and its host alias table in `pageClassifier.ts`. It now uses the one in `platformRegistry.ts`.

**Kept on purpose**

- The newer `backend/src/services/nameSearch/` folder: it *is* the live name-search pipeline.
- `frontend/src/lib/`: the search client and profile display rules used by the Dashboard, New Investigation and Profiles tab.
- The developer scripts in `nameSearch/__*.ts`.
- The `landing-page/` app.
- The git-ignored `scratch/` and root `dist/` folders (local files, not part of the app).
- No npm dependency was removed: every listed package is still imported.

**Fixes made during the cleanup**

- **Tab counts:** the Metrics tab and key-info panel now use the displayed arrays' lengths instead of stored counts. Invented fallback numbers were removed (85 % coverage, 28 platforms, 35 queries, 3 pages, "Possible identities: 3", and a hard-coded list of five "completed" providers). The coverage footer now reports failed searches, and mislabelled cards were renamed ("Public Documents" → Associations, "News & Articles" → Activity).
- **Username rescan** now also refreshes Web & News, Overview activity, source links, coverage and stats. Before, those stayed stale.
- **Username search** now keeps the direct platform checks that finish within 15 seconds. Before, a 5-second limit discarded all of them. Hits on *variant* usernames are excluded from the results.
- **Name search with no working SerpApi call** shows "Search failed" with the reason instead of an empty "no profile" result. A name **rescan** in that state returns HTTP 503 and no longer wipes the saved results.
