import { Request, Response } from 'express';
import { EntityAnalyzer } from '../services/intelligence/entityAnalyzer';
import { TrackingEngine } from '../services/intelligence/trackingEngine';
import { DeepSearchEngine } from '../services/search/deepSearchEngine';
import { NormalizedResultItem, OSINTQuery } from '../types/search';
import { NameSearchEngine } from '../services/nameSearch/nameSearchEngine';
import { buildIdentityPayload, buildNameInvestigation, rescanNameInvestigation } from '../services/nameSearch/nameInvestigationBuilder';

const UNSUPPORTED_TYPE_ERROR = 'Only name and username searches are supported.';

/**
 * Accepts `{ query, type }` (what the frontend sends) or a raw OSINTQuery. Only name and
 * username searches exist; anything else returns null so the caller can reject it.
 */
function parseSearchRequest(rawBody: any): OSINTQuery | null {
  if (typeof rawBody === 'string' || rawBody?.query) {
    const q = String(rawBody.query || rawBody).trim();
    const requestedType = rawBody.type ? String(rawBody.type).toLowerCase() : 'name';
    if (requestedType === 'username') return { searchType: 'username', username: q.replace(/^@/, '') };
    if (requestedType === 'name') return { searchType: 'name', name: q };
    return null;
  }

  const query: OSINTQuery = { ...rawBody };
  if (!query.searchType) query.searchType = query.name ? 'name' : query.username ? 'username' : undefined;
  return query.searchType === 'name' || query.searchType === 'username' ? query : null;
}

/** Web & news items shown in the Web & News tab of a username investigation. */
function isWebItem(r: NormalizedResultItem): boolean {
  return r.sourceType === 'Websites & News' || r.sourceType === 'Knowledge & Wikipedia' || !r.sourceType;
}

export const handleOSINTSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchDepth = req.body?.searchDepth || 'deep';
    const query = parseSearchRequest(req.body);

    if (!query) {
      res.status(400).json({ error: UNSUPPORTED_TYPE_ERROR });
      return;
    }

    const searchTargetStr = query.searchType === 'name' ? query.name : query.username;
    if (!searchTargetStr) {
      res.status(400).json({ error: 'Please enter a valid search term.' });
      return;
    }

    console.log(`[OSINT Engine] Search requested [Type: ${query.searchType}, Depth: ${searchDepth}]: "${searchTargetStr}"`);

    if (query.searchType === 'name') {
      const nameOutput = await NameSearchEngine.execute(query, { searchDepth });
      const identities = nameOutput.identities.map(identity => buildIdentityPayload(query, identity, nameOutput, searchDepth));
      const primary = identities[0];
      const investigation = buildNameInvestigation(query, nameOutput.identities[0], nameOutput, searchDepth, (req as any).user?.uid);

      res.status(200).json({
        success: true,
        query,
        possibleIdentities: identities,
        investigation: primary ? investigation : null,
        results: [...nameOutput.webItems],
        profiles: nameOutput.profiles,
        searchCoverage: nameOutput.searchCoverage,
        deepStats: nameOutput.stats,
        auditTrail: nameOutput.auditTrail,
        sourcesChecked: nameOutput.searchCoverage.map(c => c.provider)
      });
      return;
    }

    // Username search
    const deepOutput = await DeepSearchEngine.executeDeepSearch(query, { searchDepth });
    const allResults = deepOutput.allResults;
    const searchCoverage = deepOutput.searchCoverage;
    const deepStats = deepOutput.stats;
    const sourcesCheckedList = searchCoverage.map(c => c.provider);

    console.log(`[OSINT Engine] Search finished. Retained ${allResults.length} clean relevant findings.`);

    // Run Entity Intelligence Analysis Pipeline
    const analyzedProfile = EntityAnalyzer.analyze(query, allResults);
    const possibleIdentities = EntityAnalyzer.analyzeIdentities(query, allResults);

    const targetName = analyzedProfile.fullName;
    const targetInitials = targetName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OS';

    const nowIso = new Date().toISOString();
    const investigationId = `inv-${Date.now()}`;
    const webAndNews = allResults.filter(isWebItem);

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
      auditTrail: deepOutput.auditTrail,
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
        websites: webAndNews.length,
        other: 0,
        sources: analyzedProfile.sources.length,
        activities: analyzedProfile.activities.length,
        associations: analyzedProfile.associations.length
      },
      webAndNews,
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
      auditTrail: deepOutput.auditTrail,
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

    if (query.searchType === 'name') {
      const nameOutput = await NameSearchEngine.execute(query, { searchDepth: searchDepth || 'deep' });
      // No SerpApi call returned data (quota exhausted, missing key, network error): keep the saved results untouched.
      if (nameOutput.stats.pagesReviewed === 0) {
        res.status(503).json({
          error: nameOutput.stats.quotaExhausted
            ? 'The SerpApi monthly search quota is exhausted. The saved investigation was not changed.'
            : `No search could be completed (${nameOutput.stats.errors[0] || 'unknown error'}). The saved investigation was not changed.`
        });
        return;
      }
      const updated = rescanNameInvestigation(query, investigation, nameOutput, searchDepth || 'deep');
      res.json(updated);
      return;
    }

    if (query.searchType !== 'username') {
      res.status(400).json({ error: UNSUPPORTED_TYPE_ERROR });
      return;
    }

    const deepOutput = await DeepSearchEngine.executeDeepSearch(query, { searchDepth: searchDepth || 'deep' });
    const allResults = deepOutput.allResults;

    const previousUrls = (investigation.sources || []).map((s: any) => s.url);
    const { newItemsCount, changesSummary, scanHistoryItem } = TrackingEngine.compareScans(previousUrls, allResults);

    const analyzedProfile = EntityAnalyzer.analyze(query, allResults);
    const webAndNews = allResults.filter(isWebItem);
    const nowIso = new Date().toISOString();

    const updatedInvestigation = {
      ...investigation,
      quickSummary: analyzedProfile.personSummary,
      overallConfidence: analyzedProfile.overallConfidence,
      confidenceLevel: analyzedProfile.confidenceLevel,
      searchCoverage: deepOutput.searchCoverage,
      deepStats: deepOutput.stats,
      auditTrail: deepOutput.auditTrail,
      targetProfile: {
        ...investigation.targetProfile,
        occupation: analyzedProfile.publicRole,
        location: analyzedProfile.location
      },
      resultsCount: {
        ...investigation.resultsCount,
        profiles: analyzedProfile.socialProfiles.length,
        websites: webAndNews.length,
        sources: analyzedProfile.sources.length,
        activities: analyzedProfile.activities.length,
        associations: analyzedProfile.associations.length
      },
      webAndNews,
      socialProfiles: analyzedProfile.socialProfiles,
      activities: analyzedProfile.activities,
      recentActivities: analyzedProfile.activities.map(a => ({
        type: a.category.toLowerCase(),
        title: a.title,
        platform: a.sourceName,
        timestamp: a.date,
        url: a.sourceUrl
      })),
      associations: analyzedProfile.associations,
      sources: analyzedProfile.sources,
      sourceLinks: analyzedProfile.sources.map(s => ({
        title: `${s.sourceName}: ${s.title}`,
        url: s.url
      })),
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
