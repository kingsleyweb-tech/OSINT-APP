import { OSINTQuery, NormalizedResultItem } from '../../types/search';
import { IntelligenceAssociation } from '../../types/intelligence';
import { EntityAnalyzer } from '../intelligence/entityAnalyzer';
import { TrackingEngine } from '../intelligence/trackingEngine';
import { IdentityCluster, NameSearchOutput, DiscoveredProfile } from './nameSearchEngine';
import { buildPersonRecord, type PersonRecord } from './personRecord';

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

/** Organisations, schools and groups the record's sources state, each with the page that states it. */
function recordAssociations(record: PersonRecord | undefined): IntelligenceAssociation[] {
  if (!record) return [];
  const CATEGORY: Record<string, IntelligenceAssociation['category']> = { employer: 'Companies', organization: 'Organizations', education: 'Education' };
  const RELATION: Record<string, string> = { employer: 'Works or worked at (stated in source)', organization: 'Member / affiliated (stated in source)', education: 'Studied at (stated in source)' };
  return record.summary
    .filter(s => s.field === 'employer' || s.field === 'organization' || s.field === 'education')
    .map((s, i) => {
      const src = s.sources[0];
      return {
        id: `assoc-rec-${i}`,
        name: s.value,
        category: CATEGORY[s.field],
        relationship: RELATION[s.field],
        evidenceState: s.sources.length > 1 || src.tier === 'own-profile' ? 'Strong evidence' : 'Documented',
        evidenceCitation: src.quote ? `"${src.quote}" — ${src.sourceName}` : `Stated on ${src.sourceName}: "${src.sourceTitle}".`,
        sourceName: src.sourceName,
        sourceUrl: src.sourceUrl
      } as IntelligenceAssociation;
    });
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
  const allProfiles = identity?.profiles || [];
  // Similar-name profiles (other people) are listed but never feed the subject's activity, associations or counts.
  const profiles = allProfiles.filter(p => p.relation !== 'similar');
  const similarProfiles = allProfiles.filter(p => p.relation === 'similar');
  const webItems = identity?.webItems || [];

  const analyzed = EntityAnalyzer.analyze(query, [...webItems, ...profiles.map(profileAsResultItem)]);
  const profileUrls = new Set(profiles.map(p => p.profileUrl));
  const activities = analyzed.activities.filter(a => !profileUrls.has(a.sourceUrl));

  // The identity's evidence-backed record (built with the cluster; organisations get one here).
  const record: PersonRecord | undefined = identity?.record || (identity ? buildPersonRecord({
    cluster: identity, names: [identity.fullName, name], searchedName: name, allowMentionFacts: false, nowIso
  }) : undefined);

  const assocMap = new Map<string, IntelligenceAssociation>();
  [...profileAssociations(profiles), ...recordAssociations(record), ...analyzed.associations].forEach(a => {
    if (!assocMap.has(a.name.toLowerCase())) assocMap.set(a.name.toLowerCase(), a);
  });
  const associations = Array.from(assocMap.values());
  const sources = analyzed.sources;
  const fullName = identity?.fullName || name;

  const investigationId = `inv-${Date.now()}-${identity?.id || 'name'}`;
  return {
    id: investigationId,
    name: fullName,
    personId: record?.personId,
    ...(record ? { person: record } : {}),
    ...(output.correctedName ? { correctedName: output.correctedName } : {}),
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
    socialProfiles: [...profiles, ...similarProfiles],
    webAndNews: webItems,
    recentActivities: activities.map(a => ({ type: a.category.toLowerCase(), title: a.title, platform: a.sourceName, timestamp: a.date, url: a.sourceUrl })),
    activities,
    associations,
    sources,
    sourceLinks: sources.map(s => ({ title: `${s.sourceName}: ${s.title}`, url: s.url })),
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

/**
 * When the name search is about an organisation: one card holding the organisation's own profiles
 * and every kept result, with the organisation facts (each with its source).
 */
export function buildOrganizationIdentity(query: OSINTQuery, output: NameSearchOutput): IdentityCluster | null {
  const org = output.entity.profile;
  if (output.entity.kind !== 'organization' || !org) return null;
  const own = new Set(org.socialProfiles.map(s => s.url));
  const profiles = output.profiles.filter(p => p.relation !== 'similar' && (own.has(p.profileUrl) || own.has(p.canonicalUrl || '')));
  const hq = org.facts.find(f => /^(headquarters|address|location)$/i.test(f.label))?.value;
  return {
    id: 'organization-1',
    kind: 'organization',
    fullName: org.name,
    publicRole: org.type?.value || 'Organisation',
    location: hq || 'Not specified',
    avatarUrl: profiles.find(p => p.thumbnail)?.thumbnail,
    summary: org.description?.value || `${output.entity.reason} No description was found in the sources.`,
    confidenceScore: org.hasKnowledgePanel ? 85 : 60,
    confidenceLabel: org.hasKnowledgePanel ? 'Strong evidence' : 'Possible match',
    evidenceChecklist: org.signals,
    profiles,
    webItems: output.webItems.map(w => ({ ...w, metadata: { ...(w.metadata || {}), identityLink: 'linked' } }))
  };
}

export function buildIdentityPayload(query: OSINTQuery, identity: IdentityCluster, output: NameSearchOutput, searchDepth: string): any {
  const investigation = buildNameInvestigation(query, identity, output, searchDepth);
  // An abbreviation search: the full names the results give for it (shown above the results).
  if (output.entity.resolution) investigation.entityResolution = output.entity.resolution;
  if (identity.kind === 'organization' && output.entity.profile) {
    // Organisation case: the organisation's facts and how it was recognised.
    investigation.entityKind = 'organization';
    investigation.organization = { ...output.entity.profile, detectionReason: output.entity.reason };
    investigation.targetProfile = { ...investigation.targetProfile, gender: 'Not applicable', age: 'Not applicable', occupation: output.entity.profile.type?.value || 'Organisation' };
  }
  // Card fields are read from the case it opens, so the two can never disagree.
  const person: PersonRecord | undefined = investigation.person;
  return {
    id: identity.id,
    personId: investigation.personId,
    kind: identity.kind,
    fullName: investigation.targetProfile.fullName,
    publicRole: investigation.targetProfile.occupation,
    location: investigation.targetProfile.location,
    avatarUrl: identity.avatarUrl,
    summary: investigation.quickSummary,
    confidenceScore: identity.confidenceScore,
    confidenceLabel: person?.identityConfidence || identity.confidenceLabel,
    confidenceReason: person?.confidenceReason,
    ...(output.correctedName ? { correctedName: output.correctedName } : {}),
    evidenceChecklist: identity.evidenceChecklist,
    profilesCount: investigation.socialProfiles.filter((p: any) => p.relation !== 'similar').length,
    similarAccountsCount: investigation.socialProfiles.filter((p: any) => p.relation === 'similar').length,
    sourcesCount: investigation.sources.length,
    activitiesCount: investigation.activities.length,
    associationsCount: investigation.associations.length,
    matchingPlatforms: Array.from(new Set(identity.profiles.filter(p => p.relation !== 'similar').map(p => p.platform))),
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

  // Organisation cases stay organisation cases: rebuild from the organisation card, with refreshed facts.
  // A case opened before organisations were recognised becomes one when the search now finds an organisation
  // that owns at least one of the case's profiles.
  const orgOwnsCase = output.entity.kind === 'organization'
    && (output.entity.profile?.socialProfiles || []).some(s => prevKeys.has(s.url) || previous.some(p => (p.profileUrl || p.url) === s.url));
  const orgIdentity = investigation.entityKind === 'organization' || orgOwnsCase ? buildOrganizationIdentity(query, output) : null;
  if (orgIdentity) best = orgIdentity;

  const fresh = buildNameInvestigation(query, best, output, searchDepth, investigation.createdBy);
  if (orgIdentity && output.entity.profile) {
    fresh.entityKind = 'organization';
    fresh.organization = { ...output.entity.profile, detectionReason: output.entity.reason };
  }
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
      // The case keeps following the same person: its ID does not change on a rescan.
      personId: investigation.personId || fresh.personId,
      ...(fresh.person ? { person: { ...fresh.person, personId: investigation.personId || fresh.person.personId } } : {}),
      createdAt: investigation.createdAt,
      isTracked: investigation.isTracked,
      scanHistory: [scanHistoryItem, ...(investigation.scanHistory || [])]
    }
  };
}
