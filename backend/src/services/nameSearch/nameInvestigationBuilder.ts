import { OSINTQuery, NormalizedResultItem } from '../../types/search';
import { IntelligenceAssociation } from '../../types/intelligence';
import { EntityAnalyzer } from '../intelligence/entityAnalyzer';
import { TrackingEngine } from '../intelligence/trackingEngine';
import { IdentityCluster, NameSearchOutput, DiscoveredProfile } from './nameSearchEngine';

/**
 * Converts a name-search identity cluster into the investigation document the frontend stores
 * and renders. Every count is derived from the arrays that are actually sent, so tab counts can
 * never disagree with the lists they label.
 */

function profileAsResultItem(p: DiscoveredProfile): NormalizedResultItem {
  return {
    id: p.id,
    source: p.platform,
    sourceType: p.category === 'Developer' ? 'Developer & Code' : 'Social Media',
    title: p.title || `${p.platform} profile`,
    description: p.snippet,
    url: p.profileUrl,
    username: p.username || undefined,
    possibleName: p.profileName,
    discoveredAt: p.discoveredAt,
    confidence: p.confidence,
    confidenceLevel: p.confidenceLevel,
    metadata: { itemType: 'profile', canonicalUrl: p.canonicalUrl }
  };
}

function profileAssociations(profiles: DiscoveredProfile[]): IntelligenceAssociation[] {
  const out: IntelligenceAssociation[] = [];
  const seen = new Set<string>();
  profiles.forEach((p, i) => {
    const add = (name: string | undefined, category: IntelligenceAssociation['category'], relationship: string, label: string) => {
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      out.push({
        id: `assoc-prof-${i}-${out.length}`,
        name,
        category,
        relationship,
        evidenceState: 'Documented',
        evidenceCitation: `${label} listed on the ${p.platform} result "${p.title}".`,
        sourceName: p.platform,
        sourceUrl: p.profileUrl
      });
    };
    add(p.attributes.organization, 'Companies', 'Experience listed on profile', 'Experience');
    add(p.attributes.education, 'Education', 'Education listed on profile', 'Education');
  });
  return out;
}

export function buildNameInvestigation(
  query: OSINTQuery,
  identity: IdentityCluster | undefined,
  output: NameSearchOutput,
  searchDepth: string,
  createdBy?: string
): any {
  const nowIso = new Date().toISOString();
  const name = (query.name || query.queryValue || '').trim();
  const profiles = identity?.profiles || [];
  const webItems = identity?.webItems || [];

  const analyzed = EntityAnalyzer.analyze(query, [...webItems, ...profiles.map(profileAsResultItem)]);
  const profileUrls = new Set(profiles.map(p => p.profileUrl));
  const activities = analyzed.activities.filter(a => !profileUrls.has(a.sourceUrl));

  const assocMap = new Map<string, IntelligenceAssociation>();
  [...profileAssociations(profiles), ...analyzed.associations].forEach(a => {
    if (!assocMap.has(a.name.toLowerCase())) assocMap.set(a.name.toLowerCase(), a);
  });
  const associations = Array.from(assocMap.values());
  const sources = analyzed.sources;
  const fullName = identity?.fullName || name;

  const investigationId = `inv-${Date.now()}-${identity?.id || 'name'}`;
  return {
    id: investigationId,
    name: fullName,
    description: identity?.summary || `Name search for ${name}`,
    searchInputs: { searchType: 'name', name, queryValue: name, ...(query.location ? { location: query.location } : {}), ...(query.organization ? { organization: query.organization } : {}) },
    searchType: 'name',
    searchDepth,
    selectedIdentityId: identity?.id,
    identityKind: identity?.kind,
    status: 'Completed',
    overallConfidence: identity?.confidenceScore || 0,
    confidenceLevel: (identity?.confidenceScore || 0) >= 75 ? 'High' : (identity?.confidenceScore || 0) >= 55 ? 'Medium' : 'Low',
    quickSummary: identity?.summary || `No public profile could be attributed to "${name}".`,
    sourcesChecked: output.searchCoverage.map(c => c.provider),
    searchCoverage: output.searchCoverage,
    deepStats: output.stats,
    auditTrail: output.auditTrail,
    targetProfile: {
      initials: fullName.split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OS',
      fullName,
      location: identity?.location || 'Not specified',
      gender: 'Unverified',
      age: 'Unverified',
      occupation: identity?.publicRole || 'Not stated in sources',
      avatarUrl: identity?.avatarUrl,
      interests: Array.from(new Set(profiles.map(p => p.platform))),
      lastActive: 'Not established'
    },
    resultsCount: {
      profiles: profiles.length,
      websites: webItems.length,
      other: 0,
      sources: sources.length,
      activities: activities.length,
      associations: associations.length
    },
    socialProfiles: profiles,
    webAndNews: webItems,
    recentActivities: activities.map(a => ({ type: a.category.toLowerCase(), title: a.title, platform: a.sourceName, timestamp: a.date, url: a.sourceUrl })),
    activities,
    associations,
    sources,
    sourceLinks: sources.map(s => ({ title: `${s.sourceName}: ${s.title}`, url: s.url })),
    notes: [
      {
        id: 'note-1',
        text: `Name search for "${name}" ran ${output.stats.queriesExecuted} SerpApi searches (${output.stats.serpApiCallsCached} served from cache), reviewed ${output.stats.rawResultsReviewed} raw results and rejected ${output.stats.resultsRejected} that were not profiles of this name or did not contain the full name.${output.stats.quotaExhausted ? ' The SerpApi monthly quota was exhausted, so some searches did not run.' : ''}`,
        author: 'OSINT Intelligence Engine',
        createdAt: nowIso
      }
    ],
    scanHistory: [
      {
        scanId: `scan-${Date.now()}`,
        scannedAt: nowIso,
        newFindingsCount: profiles.length + webItems.length,
        totalFindingsCount: profiles.length + webItems.length,
        changesSummary: [`Initial scan: ${profiles.length} profile(s), ${webItems.length} web/news result(s)`]
      }
    ],
    lastSearched: nowIso,
    lastUpdated: nowIso,
    isTracked: false,
    createdBy: createdBy || 'demo-user',
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

export function buildIdentityPayload(query: OSINTQuery, identity: IdentityCluster, output: NameSearchOutput, searchDepth: string): any {
  const investigation = buildNameInvestigation(query, identity, output, searchDepth);
  return {
    id: identity.id,
    kind: identity.kind,
    fullName: identity.fullName,
    publicRole: identity.publicRole,
    location: identity.location,
    avatarUrl: identity.avatarUrl,
    summary: identity.summary,
    confidenceScore: identity.confidenceScore,
    confidenceLabel: identity.confidenceLabel,
    evidenceChecklist: identity.evidenceChecklist,
    profilesCount: investigation.socialProfiles.length,
    sourcesCount: investigation.sources.length,
    activitiesCount: investigation.activities.length,
    associationsCount: investigation.associations.length,
    matchingPlatforms: Array.from(new Set(identity.profiles.map(p => p.platform))),
    investigation
  };
}

/**
 * Rescan keeps the identity the user selected: the new cluster with the most profile URLs in
 * common with the saved profiles. Saved profiles not returned again are kept but marked
 * "previously discovered" rather than silently shown as current.
 */
export function rescanNameInvestigation(query: OSINTQuery, investigation: any, output: NameSearchOutput, searchDepth: string): any {
  const previous: any[] = investigation.socialProfiles || [];
  const prevKeys = new Set(previous.map(p => p.canonicalUrl || p.url));

  let best = output.identities[0];
  let bestOverlap = -1;
  output.identities.forEach(i => {
    const overlap = i.profiles.filter(p => prevKeys.has(p.canonicalUrl) || prevKeys.has(p.profileUrl)).length;
    if (overlap > bestOverlap) {
      best = i;
      bestOverlap = overlap;
    }
  });

  const fresh = buildNameInvestigation(query, best, output, searchDepth, investigation.createdBy);
  const freshKeys = new Set<string>(fresh.socialProfiles.map((p: DiscoveredProfile) => p.canonicalUrl));

  fresh.socialProfiles = fresh.socialProfiles.map((p: DiscoveredProfile) => {
    const old = previous.find(o => (o.canonicalUrl || o.url) === p.canonicalUrl);
    return old ? { ...p, discoveredAt: old.discoveredAt || p.discoveredAt, lastCheckedAt: old.lastCheckedAt, linkStatus: old.linkStatus || p.linkStatus } : p;
  });
  const stale = previous
    .filter(o => !freshKeys.has(o.canonicalUrl || o.url))
    .map(o => ({ ...o, status: 'previously_discovered' }));
  fresh.socialProfiles = [...fresh.socialProfiles, ...stale];
  fresh.resultsCount.profiles = fresh.socialProfiles.length;

  const newItems: NormalizedResultItem[] = [
    ...fresh.socialProfiles.filter((p: any) => p.status !== 'previously_discovered').map(profileAsResultItem),
    ...fresh.webAndNews
  ];
  const previousUrls = [...previous.map(p => p.profileUrl || p.url), ...(investigation.webAndNews || []).map((w: any) => w.url)];
  const { newItemsCount, changesSummary, scanHistoryItem } = TrackingEngine.compareScans(previousUrls, newItems);
  if (stale.length > 0) changesSummary.push(`${stale.length} previously discovered profile(s) were not returned by this scan`);

  return {
    success: true,
    newFindingsCount: newItemsCount,
    changesSummary,
    scanHistoryItem,
    investigation: {
      ...investigation,
      ...fresh,
      id: investigation.id,
      name: investigation.name,
      notes: investigation.notes || fresh.notes,
      createdAt: investigation.createdAt,
      isTracked: investigation.isTracked,
      scanHistory: [scanHistoryItem, ...(investigation.scanHistory || [])]
    }
  };
}
