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

    const maxQueries = searchDepth === 'quick' ? 8 : searchDepth === 'standard' ? 18 : 35;
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
          description: item.snippet || item.snippet_highlighted_words?.join(' ') || `Public finding for ${target}`,
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
            nameMatched: assessment.nameMatched
          }
        });
        acceptedCount++;
      });
      return acceptedCount;
    };

    // ─── STAGE 1: EXACT IDENTITY DISCOVERY ───
    console.log(`[DeepSearchEngine] Executing STAGE 1: Exact Identity Discovery...`);
    const stage1Queries: Array<{ queryStr: string; platform: PlatformEntry }> = [];

    if (isUsername) {
      const variations = this.generateUsernameVariations(target);
      variations.forEach(v => {
        const qStr = `"${v.username}"`;
        const genPlatform = PLATFORM_REGISTRY.find(p => p.id === 'gen-broad') || PLATFORM_REGISTRY[0];
        stage1Queries.push({ queryStr: qStr, platform: genPlatform });
        stage1Queries.push({ queryStr: `"${v.username}" profile OR "${v.username}" account`, platform: genPlatform });
      });
    } else {
      const genPlatforms = PLATFORM_REGISTRY.filter(p => p.category === 'general' || p.category === 'news');
      genPlatforms.forEach(p => {
        if (p.searchPattern) {
          stage1Queries.push({ queryStr: p.searchPattern(target), platform: p });
        }
      });
    }

    for (const qObj of stage1Queries) {
      if (totalQueriesExecuted >= maxQueries) break;
      if (seenQueries.has(qObj.queryStr)) continue;

      seenQueries.add(qObj.queryStr);
      totalQueriesExecuted++;
      platformsCheckedSet.add(qObj.platform.name);

      const serpData = await serpApi.fetchSerpPage(qObj.queryStr, 0);
      totalPagesReviewed++;

      let newCount = 0;
      if (serpData && serpData.organic_results) {
        newCount = processOrganicItems(serpData.organic_results, qObj.platform.name, qObj.platform.category, 1, qObj.queryStr);
      }

      auditTrail.push({
        stage: 1,
        stageName: 'Exact Identity Discovery',
        query: qObj.queryStr,
        platformName: qObj.platform.name,
        resultsFound: serpData?.organic_results?.length || 0,
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
        const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
        const uDiscovery: any = await Promise.race([
          usernameDiscovery.discoverUsernames(target, () => {}),
          timeoutPromise
        ]);
        if (uDiscovery && uDiscovery.items) {
          uDiscovery.items.forEach((uItem: any) => {
            if (uItem.status === 'found' && uItem.profileUrl) {
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
      if (consecutiveZeroYields >= 4 && searchDepth !== 'deep') {
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

      const serpData = await serpApi.fetchSerpPage(qStr, 0);
      totalPagesReviewed++;

      let newCount = 0;
      if (serpData && serpData.organic_results) {
        newCount = processOrganicItems(serpData.organic_results, p.name, p.category, 2, qStr);
      }

      auditTrail.push({
        stage: 2,
        stageName: 'Platform Discovery',
        query: qStr,
        platformName: p.name,
        resultsFound: serpData?.organic_results?.length || 0,
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
