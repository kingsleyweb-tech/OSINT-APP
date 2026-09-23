import { Request, Response } from 'express';
import { SerpApiProvider } from '../services/search/serpApiProvider';
import { GithubProvider } from '../services/search/githubProvider';
import { SocialProvider } from '../services/search/socialProvider';
import { UsernameProvider } from '../services/search/usernameProvider';
import { RssWebFeedProvider } from '../services/search/rssWebFeedProvider';
import { DomainProvider } from '../services/search/domainProvider';
import { WikipediaProvider } from '../services/search/wikipediaProvider';
import { EntityAnalyzer } from '../services/intelligence/entityAnalyzer';
import { RelevanceEngine } from '../services/intelligence/relevanceEngine';
import { UrlValidator } from '../services/intelligence/urlValidator';
import { TrackingEngine } from '../services/intelligence/trackingEngine';
import { DeepSearchEngine } from '../services/search/deepSearchEngine';
import { DomainInvestigationService } from '../services/search/domainInvestigationService';
import { NormalizedResultItem, OSINTQuery } from '../types/search';

export interface SearchCoverageItem {
  provider: string;
  status: 'checked' | 'unavailable' | 'error';
  count: number;
}

export const handleOSINTSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawBody = req.body;
    let query: OSINTQuery = {};
    const searchDepth = rawBody.searchDepth || 'deep';

    if (typeof rawBody === 'string' || rawBody.query) {
      const q = (rawBody.query || rawBody).trim();
      const requestedType = rawBody.type ? rawBody.type.toLowerCase() : undefined;

      if (requestedType === 'username') {
        query.searchType = 'username';
        query.username = q.replace(/^@/, '');
      } else if (requestedType === 'name') {
        query.searchType = 'name';
        query.name = q;
      } else if (q.includes('@')) {
        query.searchType = 'email';
        query.email = q;
        query.username = q.split('@')[0];
      } else if (q.startsWith('http://') || q.startsWith('https://') || q.includes('.com') || q.includes('.org') || q.includes('.dev') || q.includes('/feed')) {
        query.searchType = 'domain';
        query.domain = q.replace(/^https?:\/\//, '').split('/')[0];
        query.website = q;
      } else if (/^\+?[0-9\s-]{7,}$/.test(q)) {
        query.phone = q;
      } else {
        query.searchType = 'name';
        query.name = q;
        query.username = q.replace(/\s+/g, '');
      }
    } else {
      query = rawBody;
    }

    const searchTargetStr = query.domain || query.name || query.username || query.email || query.website || query.phone;

    if (!searchTargetStr) {
      res.status(400).json({ error: 'Please enter a valid search term.' });
      return;
    }

    console.log(`[OSINT Engine] Search requested [Type: ${query.searchType || 'Auto'}, Depth: ${searchDepth}]: "${searchTargetStr}"`);

    let allResults: NormalizedResultItem[] = [];
    let searchCoverage: SearchCoverageItem[] = [];
    let deepStats: any = null;
    let sourcesCheckedList: string[] = [];

    if (query.searchType === 'domain') {
      // 🌐 DEDICATED DOMAIN INVESTIGATION PIPELINE
      const domainResult = await DomainInvestigationService.investigateDomain(searchTargetStr);
      const nowIso = new Date().toISOString();

      const domainInvestigationObj = {
        id: domainResult.id,
        name: domainResult.domain,
        description: `Dedicated OSINT domain intelligence record for ${domainResult.domain}`,
        searchInputs: query,
        searchType: 'domain',
        searchDepth,
        status: 'Completed',
        overallConfidence: domainResult.status === 'Online' ? 95 : 60,
        confidenceLevel: domainResult.status === 'Online' ? 'High' : 'Medium',
        quickSummary: domainResult.summary,
        sourcesChecked: ['DNS Intelligence Provider', 'HTTP Web Server Audit', 'SerpApi Index Search'],
        searchCoverage: [
          { provider: 'DNS Intelligence Provider', status: 'checked' as const, count: domainResult.ipAddresses.length + domainResult.nameservers.length },
          { provider: 'HTTP Web Server Audit', status: 'checked' as const, count: domainResult.technologies.length },
          { provider: 'SerpApi Index Search', status: 'checked' as const, count: domainResult.pages.length + domainResult.newsAndMentions.length }
        ],
        targetProfile: {
          initials: domainResult.domain.substring(0, 2).toUpperCase(),
          fullName: domainResult.domain,
          location: domainResult.ipAddresses.length > 0 ? `IP: ${domainResult.ipAddresses[0]}` : 'Global / Web',
          gender: 'N/A',
          age: 'N/A',
          occupation: domainResult.websiteInfo.detectedCategory,
          avatarUrl: domainResult.websiteInfo.faviconUrl,
          interests: domainResult.technologies.map(t => t.name),
          lastActive: domainResult.status === 'Online' ? 'Online / Operational' : 'Unreachable'
        },
        resultsCount: {
          profiles: 0,
          emails: 0,
          phones: 0,
          websites: domainResult.pages.length,
          other: 0,
          sources: domainResult.sources.length,
          activities: domainResult.newsAndMentions.length,
          associations: domainResult.technologies.length
        },
        domainInvestigationData: domainResult,
        sources: domainResult.sources.map((s, idx) => ({
          id: `src-${idx}`,
          sourceName: s.sourceType,
          title: s.title,
          website: domainResult.domain,
          domain: domainResult.domain,
          sourceType: 'Web Document' as const,
          discoveredDate: nowIso,
          url: s.url,
          usedFor: ['Domain Validation'],
          confidenceScore: 90
        })),
        notes: [
          {
            id: 'note-domain-1',
            text: `Domain scan completed for "${domainResult.domain}". Status: ${domainResult.status}. Discovered ${domainResult.pages.length} indexed pages and ${domainResult.technologies.length} tech stack components.`,
            author: 'OSINT Domain Engine',
            createdAt: nowIso
          }
        ],
        createdBy: (req as any).user?.uid || 'demo-user',
        createdAt: nowIso,
        updatedAt: nowIso
      };

      res.status(200).json({
        success: true,
        query,
        domainInvestigation: domainResult,
        investigation: domainInvestigationObj,
        possibleIdentities: []
      });
      return;
    } else if (query.searchType === 'name' || query.searchType === 'username') {
      // 🚀 USE DEEP SEARCH ENGINE FOR NAME AND USERNAME SEARCHES
      const deepOutput = await DeepSearchEngine.executeDeepSearch(query, { searchDepth });
      allResults = deepOutput.allResults;
      searchCoverage = deepOutput.searchCoverage;
      deepStats = deepOutput.stats;
      sourcesCheckedList = searchCoverage.map(c => c.provider);
    } else {
      // KEEP EXISTING PIPELINE FOR DOMAIN AND EMAIL SEARCHES
      let providers = [
        new SerpApiProvider(),
        new WikipediaProvider(),
        new GithubProvider(),
        new SocialProvider(),
        new UsernameProvider(),
        new RssWebFeedProvider(),
        new DomainProvider()
      ];

      if ((query.searchType as string) === 'domain') {
        providers = [
          new DomainProvider(),
          new SerpApiProvider(),
          new RssWebFeedProvider(),
          new WikipediaProvider()
        ];
      } else if ((query.searchType as string) === 'email') {
        providers = [
          new SerpApiProvider(),
          new SocialProvider(),
          new UsernameProvider(),
          new GithubProvider()
        ];
      }

      sourcesCheckedList = providers.map(p => p.name);
      const providerResultsPromises = providers.map(p => p.search(query));
      const settledResults = await Promise.allSettled(providerResultsPromises);
      const seenUrls = new Set<string>();

      providers.forEach((provider, index) => {
        const resultState = settledResults[index];
        if (resultState.status === 'fulfilled') {
          const providerItems = resultState.value;
          let addedCount = 0;

          providerItems.forEach(item => {
            const canonicalUrl = item.url ? UrlValidator.normalizeUrl(item.url) : '';
            if (!canonicalUrl || seenUrls.has(canonicalUrl)) return;

            const assessment = RelevanceEngine.evaluateItem(query, item);
            if (assessment.accepted) {
              seenUrls.add(canonicalUrl);
              allResults.push({
                ...item,
                url: canonicalUrl,
                confidence: assessment.score,
                metadata: {
                  ...item.metadata,
                  itemType: assessment.itemType,
                  isVerifiedProfileUrl: assessment.isVerifiedProfileUrl,
                  confidenceLabel: assessment.confidenceLabel
                }
              });
              addedCount++;
            }
          });

          searchCoverage.push({
            provider: provider.name,
            status: 'checked',
            count: addedCount
          });
        } else {
          searchCoverage.push({
            provider: provider.name,
            status: 'unavailable',
            count: 0
          });
        }
      });
    }

    console.log(`[OSINT Engine] Search finished. Retained ${allResults.length} clean relevant findings.`);

    // Run Entity Intelligence Analysis Pipeline
    const analyzedProfile = EntityAnalyzer.analyze(query, allResults);
    const possibleIdentities = EntityAnalyzer.analyzeIdentities(query, allResults);

    const targetName = analyzedProfile.fullName;
    const targetInitials = targetName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OS';

    const nowIso = new Date().toISOString();
    const investigationId = `inv-${Date.now()}`;

    const formattedInvestigation = {
      id: investigationId,
      name: targetName,
      description: `Structured OSINT deep investigation record for ${targetName}`,
      searchInputs: query,
      searchType: query.searchType,
      searchDepth,
      status: 'Completed',
      overallConfidence: analyzedProfile.overallConfidence,
      confidenceLevel: analyzedProfile.confidenceLevel,
      quickSummary: analyzedProfile.personSummary,
      sourcesChecked: sourcesCheckedList,
      searchCoverage,
      deepStats,
      targetProfile: {
        initials: targetInitials,
        fullName: targetName,
        location: analyzedProfile.location,
        gender: 'Unverified',
        age: 'Unverified',
        occupation: analyzedProfile.publicRole,
        avatarUrl: analyzedProfile.avatarUrl,
        interests: Array.from(new Set(allResults.map(r => r.sourceType))),
        lastActive: allResults.length > 0 ? 'Recently active' : 'No public activity'
      },
      resultsCount: {
        profiles: analyzedProfile.socialProfiles.length,
        emails: query.email ? 1 : 0,
        phones: query.phone ? 1 : 0,
        websites: analyzedProfile.sources.length,
        other: 0,
        sources: analyzedProfile.sources.length,
        activities: analyzedProfile.activities.length,
        associations: analyzedProfile.associations.length
      },
      webAndNews: allResults.filter(r => r.sourceType === 'Websites & News' || r.sourceType === 'Knowledge & Wikipedia' || !r.sourceType),
      socialProfiles: analyzedProfile.socialProfiles,
      recentActivities: analyzedProfile.activities.map(a => ({
        type: a.category.toLowerCase(),
        title: a.title,
        platform: a.sourceName,
        timestamp: a.date,
        url: a.sourceUrl
      })),
      activities: analyzedProfile.activities,
      associations: analyzedProfile.associations,
      sources: analyzedProfile.sources,
      sourceLinks: analyzedProfile.sources.map(s => ({
        title: `${s.sourceName}: ${s.title}`,
        url: s.url
      })),
      notes: [
        {
          id: 'note-1',
          text: allResults.length > 0 
            ? `Deep OSINT scan completed. Discovered ${allResults.length} verified public findings across platforms, web knowledge, and profiles.` 
            : `No publicly available result found for "${searchTargetStr}". Checked ${searchCoverage.length} connected public OSINT providers.`,
          author: 'OSINT Intelligence Engine',
          createdAt: nowIso
        }
      ],
      scanHistory: [
        {
          scanId: `scan-${Date.now()}`,
          scannedAt: nowIso,
          newFindingsCount: allResults.length,
          totalFindingsCount: allResults.length,
          changesSummary: [`Initial deep scan completed with ${allResults.length} public findings`]
        }
      ],
      lastSearched: nowIso,
      lastUpdated: nowIso,
      isTracked: false,
      createdBy: (req as any).user?.uid || 'demo-user',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    res.status(200).json({
      success: true,
      query,
      possibleIdentities,
      investigation: formattedInvestigation,
      results: allResults,
      searchCoverage,
      deepStats,
      sourcesChecked: sourcesCheckedList
    });

  } catch (error: any) {
    console.error('[OSINT Search Error]:', error);
    res.status(500).json({ error: 'Internal server error while processing OSINT search request.' });
  }
};

export const handleRescanInvestigation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { investigation, searchDepth } = req.body;
    if (!investigation || !investigation.searchInputs) {
      res.status(400).json({ error: 'Investigation data with searchInputs is required for rescan.' });
      return;
    }

    const query: OSINTQuery = investigation.searchInputs;
    let allResults: NormalizedResultItem[] = [];

    if (query.searchType === 'name' || query.searchType === 'username') {
      const deepOutput = await DeepSearchEngine.executeDeepSearch(query, { searchDepth: searchDepth || 'deep' });
      allResults = deepOutput.allResults;
    } else {
      const providers = [
        new SerpApiProvider(),
        new WikipediaProvider(),
        new GithubProvider(),
        new SocialProvider(),
        new UsernameProvider(),
        new RssWebFeedProvider()
      ];

      const providerResultsPromises = providers.map(p => p.search(query));
      const settledResults = await Promise.allSettled(providerResultsPromises);
      const seenUrls = new Set<string>();

      providers.forEach((_, index) => {
        const resultState = settledResults[index];
        if (resultState.status === 'fulfilled') {
          resultState.value.forEach(item => {
            if (!seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              allResults.push(item);
            }
          });
        }
      });
    }

    const previousUrls = (investigation.sources || []).map((s: any) => s.url);
    const { newItemsCount, changesSummary, scanHistoryItem } = TrackingEngine.compareScans(previousUrls, allResults);

    const analyzedProfile = EntityAnalyzer.analyze(query, allResults);
    const nowIso = new Date().toISOString();

    const updatedInvestigation = {
      ...investigation,
      quickSummary: analyzedProfile.personSummary,
      overallConfidence: analyzedProfile.overallConfidence,
      confidenceLevel: analyzedProfile.confidenceLevel,
      targetProfile: {
        ...investigation.targetProfile,
        occupation: analyzedProfile.publicRole,
        location: analyzedProfile.location
      },
      resultsCount: {
        ...investigation.resultsCount,
        profiles: analyzedProfile.socialProfiles.length,
        sources: analyzedProfile.sources.length,
        activities: analyzedProfile.activities.length,
        associations: analyzedProfile.associations.length
      },
      socialProfiles: analyzedProfile.socialProfiles,
      activities: analyzedProfile.activities,
      associations: analyzedProfile.associations,
      sources: analyzedProfile.sources,
      scanHistory: [scanHistoryItem, ...(investigation.scanHistory || [])],
      lastSearched: nowIso,
      lastUpdated: nowIso,
      updatedAt: nowIso
    };

    res.json({
      success: true,
      newFindingsCount: newItemsCount,
      changesSummary,
      scanHistoryItem,
      investigation: updatedInvestigation
    });
  } catch (err: any) {
    console.error('[Rescan Error]:', err);
    res.status(500).json({ error: 'Failed to rescan investigation.' });
  }
};
