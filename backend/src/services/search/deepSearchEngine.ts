import type { ProgressCallback } from '../../types/progress';
import { OSINTQuery, NormalizedResultItem } from '../../types/search';
import { PLATFORM_REGISTRY, PlatformEntry } from './platformRegistry';
import { SerpApiProvider } from './serpApiProvider';
import { RelevanceEngine } from '../intelligence/relevanceEngine';
import { UrlValidator } from '../intelligence/urlValidator';
import { UsernameDiscoveryService } from '../intelligence/usernameDiscoveryService';

export interface DeepSearchOptions {
  searchDepth?: 'quick' | 'standard' | 'deep';
  maxPagesPerQuery?: number;
  apiBudget?: number;
  onProgress?: ProgressCallback;
}

export interface AuditStepInfo {
  stage: number;
  stageName: string;
  query: string;
  platformName: string;
  resultsFound: number;
  newRelevantAccepted: number;
  stoppedEarly?: boolean;
}

export interface DeepSearchOutput {
  allResults: NormalizedResultItem[];
  searchCoverage: Array<{
    provider: string;
    status: 'checked' | 'unavailable' | 'error';
    count: number;
  }>;
  auditTrail: AuditStepInfo[];
  stats: {
    platformsChecked: number;
    queriesExecuted: number;
    pagesReviewed: number;
    potentialProfiles: number;
    exactMatches: number;
    strongMatches: number;
    possibleMatches: number;
    resultsAccepted: number;
    resultsRejected: number;
    searchCoveragePercent: number;
  };
}

export class DeepSearchEngine {
  /**
   * Generates clean username variations for deep username searching
   */
  public static generateUsernameVariations(rawUsername: string): Array<{ username: string; label: string }> {
    const clean = rawUsername.trim().replace(/^@/, '');
    if (!clean) return [];

    const variations: Array<{ username: string; label: string }> = [
      { username: clean, label: 'Exact username' },
      { username: clean.toLowerCase(), label: 'Lowercase exact' }
    ];

    const seen = new Set<string>([clean.toLowerCase()]);

    // CamelCase or space split variation
    const wordParts = clean.split(/(?=[A-Z])|[\s_\-\.]+/).filter(Boolean);
    if (wordParts.length > 1) {
      const underscoreVar = wordParts.join('_').toLowerCase();
      if (!seen.has(underscoreVar)) {
        seen.add(underscoreVar);
        variations.push({ username: underscoreVar, label: 'Underscore variation' });
      }

      const dotVar = wordParts.join('.').toLowerCase();
      if (!seen.has(dotVar)) {
        seen.add(dotVar);
        variations.push({ username: dotVar, label: 'Dot variation' });
      }

      const hyphenVar = wordParts.join('-').toLowerCase();
      if (!seen.has(hyphenVar)) {
        seen.add(hyphenVar);
        variations.push({ username: hyphenVar, label: 'Hyphen variation' });
      }
    }

    // Trailing number variation if no number present
    if (!/\d$/.test(clean)) {
      const numVar = `${clean.toLowerCase()}1`;
      if (!seen.has(numVar)) {
        seen.add(numVar);
        variations.push({ username: numVar, label: 'Common numeric suffix' });
      }
    }

    return variations.slice(0, 6);
  }

  /**
   * Executes the 4-Stage Deep Search Pipeline for Name and Username searches
   */
  public static async executeDeepSearch(
    query: OSINTQuery, 
    options: DeepSearchOptions = {}
  ): Promise<DeepSearchOutput> {
    const searchDepth = options.searchDepth || 'deep';
    const isUsername = query.searchType === 'username';
    const rawTarget = isUsername ? (query.username || query.queryValue) : (query.name || query.queryValue);
    const target = (rawTarget || '').trim();

    if (!target) {
      throw new Error('Search target string is required for DeepSearchEngine.');
    }

    console.log(`[DeepSearchEngine] Initiating ${searchDepth.toUpperCase()} search pipeline for [${isUsername ? 'USERNAME' : 'NAME'}]: "${target}"`);

    const serpApi = new SerpApiProvider();
    const usernameDiscovery = new UsernameDiscoveryService();

    const isNameSearch = !isUsername;
    // Name searches need a higher query budget due to richer Stage 1 coverage
    const maxQueries = isNameSearch
      ? (searchDepth === 'quick' ? 18 : searchDepth === 'standard' ? 30 : 50)
      : (searchDepth === 'quick' ? 8 : searchDepth === 'standard' ? 18 : 35);
    const maxPages = searchDepth === 'quick' ? 1 : searchDepth === 'standard' ? 2 : 3;

    const allResults: NormalizedResultItem[] = [];
    const seenUrls = new Set<string>();
    const seenQueries = new Set<string>();
    const auditTrail: AuditStepInfo[] = [];

    const platformsCheckedSet = new Set<string>();
    let totalQueriesExecuted = 0;
    let totalPagesReviewed = 0;
    let totalRejected = 0;
    let consecutiveZeroYields = 0;

    // Helper to evaluate and ingest raw SerpApi items
    const processOrganicItems = (
      items: any[], 
      platformName: string, 
      category: string, 
      stage: number, 
      queryStr: string
    ): number => {
      let acceptedCount = 0;
      items.forEach((item: any) => {
        const rawLink = item.link || item.url;
        if (!rawLink) return;

        const canonicalUrl = UrlValidator.normalizeUrl(rawLink);
        if (!canonicalUrl || seenUrls.has(canonicalUrl)) return;

        const assessment = RelevanceEngine.evaluateItem(query, item);
        if (!assessment.accepted) {
          totalRejected++;
          return;
        }

        seenUrls.add(canonicalUrl);

        // How the handle relates to the searched username (coverage 100 = exact, 75 = other spelling, 50 = similar).
        const coverage = assessment.matchDetails?.tokenCoveragePercent ?? 0;
        const usernameMatch = !isUsername ? undefined : coverage >= 100 ? 'exact' : coverage >= 75 ? 'spelling' : 'similar';
        const usernameNote = usernameMatch === 'spelling' ? 'Same username with different punctuation. '
          : usernameMatch === 'similar' ? 'Similar username (likely a different account). ' : '';

        let sourceType: any = 'Websites & News';
        if (assessment.itemType === 'profile') {
          if (category === 'developer' || assessment.domain.includes('github.com')) {
            sourceType = 'Developer & Code';
          } else if (category === 'professional' || assessment.domain.includes('linkedin.com')) {
            sourceType = 'Organizations';
          } else {
            sourceType = 'Social Media';
          }
        } else if (assessment.itemType === 'video' || assessment.itemType === 'reel') {
          sourceType = 'Video & Streaming';
        } else if (assessment.itemType === 'article' || assessment.itemType === 'news') {
          sourceType = 'Websites & News';
        } else if (assessment.itemType === 'document') {
          sourceType = 'Knowledge & Wikipedia';
        } else if (assessment.itemType === 'organization') {
          sourceType = 'Organizations';
        }

        const confidenceLevel: any = assessment.score >= 80 ? 'High' : assessment.score >= 60 ? 'Medium' : 'Low';

        allResults.push({
          id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          source: platformName !== 'General Web Search' ? platformName : `SerpApi (${assessment.domain})`,
          sourceType,
          title: item.title || `Public Result for ${target}`,
          description: `${usernameNote}${item.snippet || item.snippet_highlighted_words?.join(' ') || `Public finding for ${target}`}`,
          url: canonicalUrl,
          possibleName: target,
          location: query.location,
          discoveredAt: new Date().toISOString(),
          confidence: assessment.score,
          confidenceLevel,
          metadata: {
            platform: platformName,
            category,
            domain: assessment.domain,
            itemType: assessment.itemType,
            isVerifiedProfileUrl: assessment.isVerifiedProfileUrl,
            confidenceLabel: assessment.confidenceLabel,
            nameMatched: assessment.nameMatched,
            ...(usernameMatch ? { usernameMatch } : {}),
            ...(typeof item.thumbnail === 'string' && /^https?:/.test(item.thumbnail) ? { thumbnail: item.thumbnail } : {})
          }
        });
        acceptedCount++;
      });
      return acceptedCount;
    };

    const getPlatformById = (id: string) => PLATFORM_REGISTRY.find(p => p.id === id);

    // ─── USERNAME SEARCH (fast path) ───
    // A short plan of exact-username queries run in parallel, free direct platform checks, and the
    // SerpApi Facebook/Instagram profile endpoints. quick: 4 queries, standard: 7, deep: 10 (was up to ~71 sequential calls).
    if (isUsername) {
      const u = target.replace(/^@/, '');
      // Handles are often written with other separators (99_name → 99.name_, 99name, name99), so every
      // query covers the common spellings; results with a different spelling are labelled as similar.
      const variants = usernameSpellings(u);
      const q = variants.length > 1 ? `(${variants.map(v => `"${v}"`).join(' OR ')})` : `"${u}"`;
      const gen = getPlatformById('gen-broad') || PLATFORM_REGISTRY[0];
      type Step = { id: string; label: string; run: () => Promise<{ items: any[]; platform: PlatformEntry; queryStr: string } | null> };
      const google = (id: string, label: string, queryStr: string, platformId: string): Step => ({
        id, label,
        run: async () => {
          const data = await serpApi.fetchSerpPage(queryStr, 0);
          totalQueriesExecuted++;
          totalPagesReviewed++;
          return data ? { items: data.organic_results || [], platform: getPlatformById(platformId) || gen, queryStr } : null;
        }
      });
      const profileApi = (id: string, label: string, engine: 'facebook_profile' | 'instagram_profile', platformId: string): Step => ({
        id, label,
        run: async () => {
          const res = await serpApi.request(engine, { profile_id: u });
          totalQueriesExecuted++;
          const p = res.data?.profile_results;
          // An error other than quota means the account does not exist (the endpoint reports "no results").
          if (!res.data) return res.quotaExhausted ? null : { items: [], platform: getPlatformById(platformId) || gen, queryStr: `${engine}:${u}` };
          if (!p) return { items: [], platform: getPlatformById(platformId) || gen, queryStr: `${engine}:${u}` };
          // The endpoint confirms the account exists; its URL is built from the username the API returned.
          const handle = String(p.username || u);
          const url = typeof p.url === 'string' && /^https?:/.test(p.url) ? p.url
            : engine === 'instagram_profile' ? `https://www.instagram.com/${handle}/` : `https://www.facebook.com/${handle}`;
          const name = p.full_name || p.name || handle;
          const facts = [
            p.followers != null ? `${p.followers} followers` : '',
            p.is_private ? 'private account' : '',
            p.biography || p.intro || ''
          ].filter(Boolean).join(' · ');
          return {
            items: [{ title: `${name} (@${handle})`, link: url, snippet: facts || `Account @${handle} exists`, thumbnail: p.profile_picture || p.profile_pic_url || p.serpapi_profile_pic_url }],
            platform: getPlatformById(platformId) || gen,
            queryStr: `${engine}:${u}`
          };
        }
      });

      const steps: Step[] = [
        google('g-broad', 'Google · username and spellings', q, 'gen-broad'),
        {
          // DuckDuckGo matches handles written with other punctuation (it finds @99.humblechild_ for
          // "99_humblechild"); Google and Bing through the API did not.
          id: 'ddg', label: 'DuckDuckGo · username',
          run: async () => {
            const data = await serpApi.fetchDuckDuckGoPage(u);
            totalQueriesExecuted++;
            totalPagesReviewed++;
            return data ? { items: data.organic_results || [], platform: gen, queryStr: `duckduckgo:${u}` } : null;
          }
        },
        google('g-fb', 'Facebook', `site:facebook.com ${q}`, 'soc-facebook'),
        google('g-ig', 'Instagram', `site:instagram.com ${q}`, 'soc-instagram'),
        google('g-x', 'X (Twitter)', `(site:x.com OR site:twitter.com) ${q}`, 'soc-x')
      ];
      if (searchDepth !== 'quick') {
        steps.push(
          {
            id: 'yahoo', label: 'Yahoo · username',
            run: async () => {
              const data = await serpApi.fetchYahooPage(u);
              totalQueriesExecuted++;
              totalPagesReviewed++;
              return data ? { items: data.organic_results || [], platform: gen, queryStr: `yahoo:${u}` } : null;
            }
          },
          google('g-tt', 'TikTok', `site:tiktok.com ${q}`, 'soc-tiktok'),
          {
            // DuckDuckGo finds TikTok handles written with other punctuation (e.g. @.name_) that Google misses.
            id: 'ddg-tt', label: 'TikTok (DuckDuckGo)',
            run: async () => {
              const data = await serpApi.fetchDuckDuckGoPage(`site:tiktok.com ${u}`);
              totalQueriesExecuted++;
              totalPagesReviewed++;
              return data ? { items: data.organic_results || [], platform: getPlatformById('soc-tiktok') || gen, queryStr: `duckduckgo:site:tiktok.com ${u}` } : null;
            }
          },
          google('g-li', 'LinkedIn', `site:linkedin.com ${q}`, 'prof-linkedin'),
          {
            id: 'yt', label: 'YouTube',
            run: async () => {
              const data = await serpApi.fetchYouTubeSearch(u);
              totalQueriesExecuted++;
              return data ? { items: data.organic_results || [], platform: getPlatformById('vid-youtube') || gen, queryStr: `youtube:${u}` } : null;
            }
          }
        );
      }
      if (searchDepth === 'deep') {
        steps.push(
          google('g-dev', 'Threads, GitHub, Reddit & Medium', `(site:threads.net OR site:github.com OR site:reddit.com OR site:medium.com) ${q}`, 'dev-github'),
          profileApi('fbp', 'Facebook profile lookup', 'facebook_profile', 'soc-facebook'),
          profileApi('igp', 'Instagram profile lookup', 'instagram_profile', 'soc-instagram')
        );
      }

      options.onProgress?.({ type: 'plan', steps: [{ id: 'direct', label: 'Direct platform checks (free)' }, ...steps.map(s => ({ id: s.id, label: s.label }))] });

      const direct = (async () => {
        try {
          const finished: any[] = [];
          const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 15000));
          const out: any = await Promise.race([usernameDiscovery.discoverUsernames(u, (item: any) => finished.push(item)), timeout]);
          const items: any[] = out?.items || finished;
          let found = 0;
          items.forEach((it: any) => {
            if (it.status !== 'found' || !it.profileUrl || it.isVariation) return;
            const canonical = UrlValidator.normalizeUrl(it.profileUrl);
            if (!canonical || seenUrls.has(canonical)) return;
            seenUrls.add(canonical);
            found++;
            allResults.push({
              id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              source: it.source || 'Direct Username Discovery',
              sourceType: 'Social Media',
              title: `${it.displayName || u} on ${it.source}`,
              description: `The platform confirms an account with the exact username @${u}. The same username on different platforms does not prove they belong to one person.`,
              url: canonical,
              possibleName: u,
              discoveredAt: new Date().toISOString(),
              confidence: 90,
              confidenceLevel: 'High',
              metadata: {
                platform: it.source, category: it.category || 'social', domain: it.domain || 'social', itemType: 'profile', isVerifiedProfileUrl: true, confidenceLabel: 'Exact Match', nameMatched: true,
                // Fields the platform's API returns for the account (as set by its owner), for the Location tab.
                ...(it.metadata?.location ? { statedLocation: String(it.metadata.location).slice(0, 120) } : {}),
                ...(it.metadata?.bio ? { profileBio: String(it.metadata.bio).slice(0, 500) } : {}),
                ...(it.metadata?.company ? { statedOrganization: String(it.metadata.company).replace(/^@/, '').slice(0, 120) } : {})
              }
            });
            platformsCheckedSet.add(it.source);
          });
          options.onProgress?.({ type: 'step', id: 'direct', status: found ? 'done' : 'empty', count: found, note: `${found} account${found === 1 ? '' : 's'} confirmed` });
        } catch (e) {
          console.warn('[DeepSearchEngine] direct username checks failed:', e);
          options.onProgress?.({ type: 'step', id: 'direct', status: 'failed', note: 'Checks unavailable' });
        }
      })();

      const outcomes = await Promise.all(steps.map(async s => {
        try {
          const r = await s.run();
          return { s, r };
        } catch (e) {
          console.warn(`[DeepSearchEngine] ${s.label} failed:`, e);
          return { s, r: null };
        }
      }));
      await direct;

      outcomes.forEach(({ s, r }) => {
        if (!r) {
          options.onProgress?.({ type: 'step', id: s.id, status: 'failed', note: 'Search failed' });
          return;
        }
        platformsCheckedSet.add(r.platform.name);
        const accepted = r.items.length ? processOrganicItems(r.items, r.platform.name, r.platform.category, 1, r.queryStr) : 0;
        auditTrail.push({ stage: 1, stageName: 'Exact Username Discovery', query: r.queryStr, platformName: r.platform.name, resultsFound: r.items.length, newRelevantAccepted: accepted });
        options.onProgress?.({ type: 'step', id: s.id, status: accepted ? 'done' : 'empty', count: accepted, note: `${accepted} kept of ${r.items.length}` });
      });
    } else {
    // ─── STAGE 1: EXACT IDENTITY DISCOVERY ───
    console.log(`[DeepSearchEngine] Executing STAGE 1: Exact Identity Discovery...`);
    const stage1Queries: Array<{ queryStr: string; platform: PlatformEntry }> = [];

    const getPlatform = (id: string) => PLATFORM_REGISTRY.find(p => p.id === id) || PLATFORM_REGISTRY[0];

    if (isUsername) {
      const variations = this.generateUsernameVariations(target);
      variations.forEach(v => {
        const qStr = `"${v.username}"`;
        const genPlatform = getPlatform('gen-broad');
        stage1Queries.push({ queryStr: qStr, platform: genPlatform });
        stage1Queries.push({ queryStr: `"${v.username}" profile OR "${v.username}" account`, platform: genPlatform });
        stage1Queries.push({ queryStr: `site:facebook.com "${v.username}"`, platform: getPlatform('soc-facebook') });
        stage1Queries.push({ queryStr: `site:instagram.com "${v.username}"`, platform: getPlatform('soc-instagram') });
      });
    } else {
      // ── NAME SEARCH: Rich multi-strategy Stage 1 ──
      const genPlatform = getPlatform('gen-broad');

      // 1. Core identity queries
      stage1Queries.push({ queryStr: `"${target}"`, platform: genPlatform });
      stage1Queries.push({ queryStr: `"${target}" profile OR biography`, platform: getPlatform('gen-profile') });
      stage1Queries.push({ queryStr: `"${target}" site:linkedin.com/in/`, platform: getPlatform('prof-linkedin') });

      // 2. Key social platforms — searched directly in Stage 1 (site search + platform keyword search)
      stage1Queries.push({ queryStr: `site:facebook.com "${target}"`, platform: getPlatform('soc-facebook') });
      stage1Queries.push({ queryStr: `"${target}" facebook`, platform: getPlatform('soc-facebook') });
      stage1Queries.push({ queryStr: `site:instagram.com "${target}"`, platform: getPlatform('soc-instagram') });
      stage1Queries.push({ queryStr: `"${target}" instagram`, platform: getPlatform('soc-instagram') });
      stage1Queries.push({ queryStr: `site:youtube.com "${target}"`, platform: getPlatform('vid-youtube') });
      stage1Queries.push({ queryStr: `site:x.com "${target}" OR site:twitter.com "${target}"`, platform: getPlatform('soc-x') });
      stage1Queries.push({ queryStr: `site:tiktok.com "${target}"`, platform: getPlatform('soc-tiktok') });

      // 3. News & interview discovery
      stage1Queries.push({ queryStr: `"${target}" news OR interview`, platform: getPlatform('news-main') });
      stage1Queries.push({ queryStr: `"${target}" announcement OR speech OR conference`, platform: getPlatform('news-events') });

      // 4. Location-specific (if provided)
      if (query.location) {
        stage1Queries.push({ queryStr: `"${target}" "${query.location}"`, platform: genPlatform });
      }

      // 5. Organization/profession hints
      if (query.organization) {
        stage1Queries.push({ queryStr: `"${target}" "${query.organization}"`, platform: genPlatform });
      }

      // 6. Professional & portfolio presence
      stage1Queries.push({ queryStr: `"${target}" site:github.com OR site:medium.com OR site:reddit.com`, platform: genPlatform });
    }

    for (const qObj of stage1Queries) {
      if (totalQueriesExecuted >= maxQueries) break;
      if (seenQueries.has(qObj.queryStr)) continue;

      seenQueries.add(qObj.queryStr);
      totalQueriesExecuted++;
      platformsCheckedSet.add(qObj.platform.name);

      const [gData, bData, ytData] = await Promise.all([
        serpApi.fetchSerpPage(qObj.queryStr, 0),
        serpApi.fetchBingPage(qObj.queryStr, 1),
        qObj.queryStr.includes('youtube') ? serpApi.fetchYouTubeSearch(qObj.queryStr) : Promise.resolve(null)
      ]);
      totalPagesReviewed += 2;

      const organicResults = [
        ...(gData?.organic_results || []),
        ...(bData?.organic_results || []),
        ...(ytData?.organic_results || [])
      ];

      let newCount = 0;
      if (organicResults.length > 0) {
        newCount = processOrganicItems(organicResults, qObj.platform.name, qObj.platform.category, 1, qObj.queryStr);
      }

      auditTrail.push({
        stage: 1,
        stageName: 'Exact Identity Discovery',
        query: qObj.queryStr,
        platformName: qObj.platform.name,
        resultsFound: organicResults.length,
        newRelevantAccepted: newCount
      });

      if (newCount === 0) consecutiveZeroYields++;
      else consecutiveZeroYields = 0;
    }

    // ─── STAGE 2: PLATFORM-SPECIFIC SWEEPS ───
    console.log(`[DeepSearchEngine] Executing STAGE 2: Platform-Specific Sweeps...`);
    let platformEntries = PLATFORM_REGISTRY.filter(p => p.tier === 1);
    if (searchDepth === 'standard' || searchDepth === 'deep') {
      platformEntries = PLATFORM_REGISTRY.filter(p => p.tier <= 2);
    }
    if (searchDepth === 'deep') {
      platformEntries = PLATFORM_REGISTRY;
    }

    // Also trigger direct API username availability sweep if username search
    let directUsernameResults: NormalizedResultItem[] = [];
    if (isUsername) {
      try {
        // The direct platform checks take 8-20s in total. Wait up to 15s and keep every check that
        // finished by then (reported through the progress callback) instead of discarding them all.
        const finishedChecks: any[] = [];
        const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 15000));
        const uDiscovery: any = await Promise.race([
          usernameDiscovery.discoverUsernames(target, item => finishedChecks.push(item)),
          timeoutPromise
        ]);
        const discoveredItems: any[] = uDiscovery?.items || finishedChecks;
        if (discoveredItems.length > 0) {
          discoveredItems.forEach((uItem: any) => {
            // Variation hits (e.g. "name123") are a different username, not an exact match.
            if (uItem.status === 'found' && uItem.profileUrl && !uItem.isVariation) {
              const canonical = UrlValidator.normalizeUrl(uItem.profileUrl);
              if (!seenUrls.has(canonical)) {
                seenUrls.add(canonical);
                allResults.push({
                  id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  source: uItem.source || 'Direct Username Discovery',
                  sourceType: 'Social Media',
                  title: `${uItem.displayName || target} on ${uItem.source}`,
                  description: `Confirmed public profile match for exact username @${target} on ${uItem.source}.`,
                  url: canonical,
                  possibleName: target,
                  discoveredAt: new Date().toISOString(),
                  confidence: 95,
                  confidenceLevel: 'High',
                  metadata: {
                    platform: uItem.source,
                    category: uItem.category || 'social',
                    domain: uItem.domain || 'social',
                    itemType: 'profile',
                    isVerifiedProfileUrl: true,
                    confidenceLabel: 'Exact Match',
                    nameMatched: true
                  }
                });
                platformsCheckedSet.add(uItem.source);
              }
            }
          });
        }
      } catch (e) {
        console.warn(`[DeepSearchEngine] UsernameDiscoveryService check error:`, e);
      }
    }

    for (const p of platformEntries) {
      if (totalQueriesExecuted >= maxQueries) break;

      // For name searches: never early-stop on tier-1 platforms (Facebook, IG, YouTube, LinkedIn, X, TikTok)
      const isTier1Social = p.tier === 1 && ['social', 'professional', 'video'].includes(p.category);
      const allowEarlyStop = isUsername ? true : !isTier1Social;

      if (allowEarlyStop && consecutiveZeroYields >= 4 && searchDepth !== 'deep') {
        console.log(`[DeepSearchEngine] Early stopping Stage 2 due to diminishing returns.`);
        break;
      }

      const patternFn = isUsername ? (p.usernameSearchPattern || p.searchPattern) : p.searchPattern;
      if (!patternFn) continue;

      const qStr = patternFn(target);
      if (seenQueries.has(qStr)) continue;

      seenQueries.add(qStr);
      totalQueriesExecuted++;
      platformsCheckedSet.add(p.name);

      const [gData, bData, ytData] = await Promise.all([
        serpApi.fetchSerpPage(qStr, 0),
        serpApi.fetchBingPage(qStr, 1),
        p.id === 'vid-youtube' ? serpApi.fetchYouTubeSearch(qStr) : Promise.resolve(null)
      ]);
      totalPagesReviewed += 2;

      const organicResults = [
        ...(gData?.organic_results || []),
        ...(bData?.organic_results || []),
        ...(ytData?.organic_results || [])
      ];

      let newCount = 0;
      if (organicResults.length > 0) {
        newCount = processOrganicItems(organicResults, p.name, p.category, 2, qStr);
      }

      auditTrail.push({
        stage: 2,
        stageName: 'Platform Discovery',
        query: qStr,
        platformName: p.name,
        resultsFound: organicResults.length,
        newRelevantAccepted: newCount
      });

      if (newCount === 0) consecutiveZeroYields++;
      else consecutiveZeroYields = 0;
    }

    // ─── STAGE 3: QUERY EXPANSION & CROSS-PLATFORM DISCOVERY ───
    console.log(`[DeepSearchEngine] Executing STAGE 3: Query Expansion & Cross-Platform Discovery...`);
    const discoveredHandles = new Set<string>();
    allResults.forEach(r => {
      if (r.metadata?.isVerifiedProfileUrl && r.url) {
        const classified = UrlValidator.validateAndClassify(r.url);
        if (classified.extractedHandle && classified.extractedHandle.length > 2) {
          discoveredHandles.add(classified.extractedHandle);
        }
      }
    });

    for (const handle of discoveredHandles) {
      if (totalQueriesExecuted >= maxQueries) break;
      if (handle.toLowerCase() === target.toLowerCase()) continue;

      const crossPlatforms = ['soc-instagram', 'soc-x', 'soc-tiktok', 'dev-github', 'vid-youtube'];
      for (const pId of crossPlatforms) {
        if (totalQueriesExecuted >= maxQueries) break;
        const p = PLATFORM_REGISTRY.find(pl => pl.id === pId);
        if (!p || !p.usernameSearchPattern) continue;

        const qStr = p.usernameSearchPattern(handle);
        if (seenQueries.has(qStr)) continue;

        seenQueries.add(qStr);
        totalQueriesExecuted++;
        platformsCheckedSet.add(p.name);

        const serpData = await serpApi.fetchSerpPage(qStr, 0);
        totalPagesReviewed++;

        let newCount = 0;
        if (serpData && serpData.organic_results) {
          newCount = processOrganicItems(serpData.organic_results, p.name, p.category, 3, qStr);
        }

        auditTrail.push({
          stage: 3,
          stageName: 'Cross-Platform Discovery',
          query: qStr,
          platformName: p.name,
          resultsFound: serpData?.organic_results?.length || 0,
          newRelevantAccepted: newCount
        });
      }
    }

    // ─── STAGE 4: PAGINATED SWEEPS ───
    console.log(`[DeepSearchEngine] Executing STAGE 4: Paginated Sweeps (up to page ${maxPages})...`);
    if (maxPages > 1) {
      const topQueries = Array.from(seenQueries).slice(0, 3);
      for (const topQ of topQueries) {
        if (totalQueriesExecuted >= maxQueries) break;

        for (let page = 1; page < maxPages; page++) {
          if (totalQueriesExecuted >= maxQueries) break;

          totalQueriesExecuted++;
          totalPagesReviewed++;
          const serpData = await serpApi.fetchSerpPage(topQ, page * 10);

          let newCount = 0;
          if (serpData && serpData.organic_results && serpData.organic_results.length > 0) {
            newCount = processOrganicItems(serpData.organic_results, 'Deep Web Sweep', 'general', 4, `${topQ} [Page ${page + 1}]`);
          } else {
            break; // Stop paginating if no organic results returned
          }

          auditTrail.push({
            stage: 4,
            stageName: 'Paginated Sweeps',
            query: `${topQ} (start=${page * 10})`,
            platformName: 'Google Search Engine',
            resultsFound: serpData?.organic_results?.length || 0,
            newRelevantAccepted: newCount
          });

          if (newCount === 0) break;
        }
      }
    }

    } // end of the non-username stages

    // Sort all results: Exact Match -> Strong Match -> Possible Match -> Related
    allResults.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    // Stats calculations
    let exactMatches = 0;
    let strongMatches = 0;
    let possibleMatches = 0;
    let potentialProfiles = 0;

    allResults.forEach(r => {
      const label = r.metadata?.confidenceLabel || 'Possible Match';
      if (label === 'Exact Match') exactMatches++;
      else if (label === 'Strong Match') strongMatches++;
      else if (label === 'Possible Match') possibleMatches++;

      if (r.metadata?.itemType === 'profile' || r.metadata?.isVerifiedProfileUrl) {
        potentialProfiles++;
      }
    });

    const searchCoverageList = Array.from(platformsCheckedSet).map(pName => {
      const countForPlatform = allResults.filter(r => r.metadata?.platform === pName || r.source.includes(pName)).length;
      return {
        provider: pName,
        status: 'checked' as const,
        count: countForPlatform
      };
    });

    const totalTargetPlatforms = PLATFORM_REGISTRY.length;
    const searchCoveragePercent = Math.min(100, Math.round((platformsCheckedSet.size / totalTargetPlatforms) * 100));

    console.log(`[DeepSearchEngine] Deep search complete for "${target}". Total Executed: ${totalQueriesExecuted} queries across ${platformsCheckedSet.size} platforms. Accepted: ${allResults.length}, Rejected: ${totalRejected}.`);

    return {
      allResults,
      searchCoverage: searchCoverageList,
      auditTrail,
      stats: {
        platformsChecked: platformsCheckedSet.size,
        queriesExecuted: totalQueriesExecuted,
        pagesReviewed: totalPagesReviewed,
        potentialProfiles,
        exactMatches,
        strongMatches,
        possibleMatches,
        resultsAccepted: allResults.length,
        resultsRejected: totalRejected,
        searchCoveragePercent
      }
    };
  }
}

/**
 * Common spellings of a username: the same letters and digits with "_", "." or nothing between
 * the parts, and a leading number moved to the end (99_name → name99). At most 5, original first.
 */
export function usernameSpellings(username: string): string[] {
  const u = username.trim().replace(/^@/, '').toLowerCase();
  const parts = u.split(/[._-]+/).filter(Boolean);
  const out = new Set<string>([u]);
  if (parts.length > 1) {
    out.add(parts.join('_'));
    out.add(parts.join('.'));
  }
  out.add(parts.join(''));
  const m = parts.join('').match(/^(\d+)([a-z].*)$/) || parts.join('').match(/^([a-z].*?)(\d+)$/);
  if (m) out.add(/^\d/.test(m[1]) ? `${m[2]}${m[1]}` : `${m[2]}${m[1]}`);
  return Array.from(out).filter(v => v.length >= 3).slice(0, 5);
}
