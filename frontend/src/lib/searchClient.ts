import type { Investigation } from '../types/investigation';
import type { DiscoveredIdentity } from '../components/search/PossibleIdentitiesView';
import { searchLogFromTrail, urlKey } from './workspace';


const SEARCH_TIMEOUT_MS = 120_000;

export const getApiBase = (): string => import.meta.env.VITE_API_URL || '/api';

export class SearchError extends Error {
  readonly title: string;
  constructor(message: string, title: string) {
    super(message);
    this.title = title;
  }
}

/**
 * Runs a search against the backend. Never fabricates results: on failure it throws a
 * SearchError describing what went wrong so the page can tell the user.
 */
export async function runSearch(query: string, searchType: 'Name' | 'Username', searchDepth?: 'quick' | 'standard' | 'deep'): Promise<DiscoveredIdentity[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  let data: any;
  try {
    const response = await fetch(`${getApiBase()}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, type: searchType.toLowerCase(), ...(searchDepth ? { searchDepth } : {}) }),
      signal: controller.signal
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new SearchError(errData.error || `The search service returned HTTP ${response.status}.`, 'Search failed');
    }
    data = await response.json();
  } catch (err: any) {
    if (err instanceof SearchError) throw err;
    if (err?.name === 'AbortError') {
      throw new SearchError('The search took longer than 2 minutes and was stopped. Please try again.', 'Search timed out');
    }
    throw new SearchError('The search service could not be reached. Check that the backend is running.', 'Search unavailable');
  } finally {
    clearTimeout(timeoutId);
  }

  const stats = data.deepStats || {};
  const identities: DiscoveredIdentity[] = data.possibleIdentities || data.identities || [];
  const hasFindings = identities.some(i => (i.investigation?.socialProfiles?.length || 0) + (i.investigation?.webAndNews?.length || 0) > 0);

  if (stats.quotaExhausted && !hasFindings) {
    throw new SearchError('The SerpApi monthly search quota is exhausted, so no searches could run. Results will be available again when the quota renews.', 'Search quota exhausted');
  }
  // Name searches report per-call errors; when none of the calls returned data the empty result is a failure, not "no results".
  if (stats.pagesReviewed === 0 && Array.isArray(stats.errors) && stats.errors.length > 0 && !hasFindings) {
    throw new SearchError(`No search could be completed: ${stats.errors[0]}`, 'Search failed');
  }
  if (identities.length === 0 && !data.investigation) {
    throw new SearchError(`No public results were returned for "${query}".`, 'No results');
  }
  if (identities.length > 0) {
    // Username identities carry only their analysed results; give each the search-level record
    // (coverage, stats, per-query log) and the web results that belong to its sources.
    const top = data.investigation || {};
    identities.forEach(identity => {
      const inv = identity.investigation;
      if (!inv) return;
      inv.searchCoverage = inv.searchCoverage || data.searchCoverage;
      inv.deepStats = inv.deepStats || data.deepStats;
      inv.auditTrail = inv.auditTrail || data.auditTrail;
      if (!Array.isArray(inv.webAndNews) && Array.isArray(top.webAndNews)) {
        const keys = new Set((inv.sources || []).map((s: any) => urlKey(s.url)));
        inv.webAndNews = top.webAndNews.filter((w: any) => keys.has(urlKey(w.url)));
      }
    });
    return identities;
  }

  // Legacy single-investigation response: counts come from the arrays that were returned.
  const inv = data.investigation;
  return [{
    id: inv.id || 'identity-1',
    fullName: inv.name || query,
    publicRole: inv.targetProfile?.occupation || 'Not stated in sources',
    location: inv.targetProfile?.location || 'Not specified',
    avatarUrl: inv.targetProfile?.avatarUrl,
    summary: inv.quickSummary || '',
    confidenceScore: inv.overallConfidence || 0,
    confidenceLabel: 'Uncertain',
    profilesCount: (inv.socialProfiles || []).length,
    sourcesCount: (inv.sources || []).length,
    activitiesCount: (inv.activities || []).length,
    associationsCount: (inv.associations || []).length,
    matchingPlatforms: Array.from(new Set((inv.socialProfiles || []).map((p: any) => p.platform))) as string[],
    investigation: inv
  }];
}

/**
 * Builds the stored investigation for the identity the user selected. Everything person-specific
 * (profiles, web results, sources) comes from that identity only, and every count is the length
 * of the list it labels.
 */
export function identityToInvestigation(
  identity: DiscoveredIdentity,
  opts: { activeQuery: string; searchType: 'Name' | 'Username'; userId: string; searchDepth?: string }
): Investigation {
  const inv = identity.investigation || {};
  const nowIso = new Date().toISOString();
  const type = opts.searchType.toLowerCase() as 'name' | 'username';

  const socialProfiles = Array.isArray(inv.socialProfiles) ? inv.socialProfiles : [];
  const webAndNews = Array.isArray(inv.webAndNews)
    ? inv.webAndNews
    : Array.isArray(inv.activities)
      ? inv.activities.map((a: any) => ({
        id: a.id || `act-${Math.random()}`,
        source: a.sourceName || 'Web',
        sourceType: a.category || 'News Mention',
        title: a.title || 'Public Finding',
        description: a.briefReport || '',
        url: a.sourceUrl,
        discoveredAt: a.date
      })).filter((w: any) => Boolean(w.url))
      : [];
  const activities = Array.isArray(inv.activities) ? inv.activities : [];
  const associations = Array.isArray(inv.associations) ? inv.associations : [];
  const sources = Array.isArray(inv.sources) ? inv.sources : [];

  const searchInputs = inv.searchInputs && inv.searchInputs.searchType
    ? inv.searchInputs
    : type === 'username'
      ? { searchType: type, username: opts.activeQuery.replace(/^@/, ''), queryValue: opts.activeQuery }
      : { searchType: type, name: opts.activeQuery, queryValue: opts.activeQuery };

  return {
    ...(inv.id && inv.searchInputs ? inv : {}),
    id: inv.id || `inv-${identity.id}-${Date.now()}`,
    name: identity.fullName || opts.activeQuery,
    description: identity.summary || identity.publicRole || '',
    status: 'Completed',
    searchInputs,
    searchType: type,
    searchDepth: opts.searchDepth || inv.searchDepth || 'deep',
    lastSearched: inv.lastSearched || nowIso,
    overallConfidence: identity.confidenceScore || 0,
    confidenceLevel: identity.confidenceScore >= 75 ? 'High' : identity.confidenceScore >= 55 ? 'Medium' : 'Low',
    quickSummary: identity.summary || '',
    searchCoverage: Array.isArray(inv.searchCoverage) ? inv.searchCoverage : [],
    deepStats: inv.deepStats || undefined,
    auditTrail: Array.isArray(inv.auditTrail) ? inv.auditTrail : [],
    searchLog: searchLogFromTrail(inv.auditTrail, { firstRun: 1, batch: 1, at: inv.lastSearched || nowIso, coverage: inv.searchCoverage }),
    review: {},
    auditLog: [],
    targetProfile: {
      initials: (identity.fullName || 'OS').split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OS',
      fullName: identity.fullName || opts.activeQuery,
      location: identity.location || 'Not specified',
      gender: 'Unverified',
      age: 'Unverified',
      occupation: identity.publicRole || 'Not stated in sources',
      avatarUrl: identity.avatarUrl,
      interests: identity.matchingPlatforms || [],
      lastActive: inv.targetProfile?.lastActive || 'Not established'
    },
    resultsCount: {
      profiles: socialProfiles.length,
      websites: webAndNews.length,
      other: 0,
      sources: sources.length,
      activities: activities.length,
      associations: associations.length
    },
    socialProfiles,
    webAndNews,
    activities,
    recentActivities: activities.map((a: any) => ({
      type: String(a.category || 'web').toLowerCase(),
      title: a.title || '',
      platform: a.sourceName || 'Web',
      timestamp: a.date || '',
      url: a.sourceUrl
    })),
    associations,
    sources,
    sourceLinks: sources.map((s: any) => ({ title: `${s.sourceName || 'Source'}: ${s.title || 'Record'}`, url: s.url })),
    scanHistory: Array.isArray(inv.scanHistory) ? inv.scanHistory : undefined,
    createdBy: opts.userId,
    createdAt: inv.createdAt || nowIso,
    updatedAt: nowIso
  } as Investigation;
}

export interface LinkHealthResult {
  url: string;
  status: 'reachable' | 'unavailable' | 'unverifiable';
  httpStatus?: number;
  reason: string;
  checkedAt: string;
}

export async function checkLinkHealth(urls: string[]): Promise<LinkHealthResult[]> {
  if (urls.length === 0) return [];
  const res = await fetch(`${getApiBase()}/link-health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls })
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

/** The exact URL the search engine returned for a profile. Never reconstructed from a name or handle. */
export function profileDestination(p: { profileUrl?: string; url?: string }): string | null {
  const url = p.profileUrl || p.url;
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (/^(www\.)?(google\.[a-z.]+|bing\.com|serpapi\.com)$/i.test(u.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}
