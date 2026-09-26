import type {
  Investigation, IntelligenceActivity, IntelligenceSource, SocialProfile, ActivityCategory, SourceType
} from '../types/investigation';
import type { ExploreItem } from './exploreClient';
import { getInvestigationFromDb, saveInvestigationToDb } from '../firebase/firestore';
import { auth } from '../firebase/config';
import { newAuditEvent, urlKey, type WebItem } from './workspace';

/**
 * Saves Explore results into an existing case, placing each result where the case workspace
 * already looks for it (News, Web, Activity, Sources, Profiles, Audit). Existing data is kept;
 * results already in the case (same URL) are skipped.
 */

const PAGE_KIND: Partial<Record<ExploreItem['kind'], string>> = {
  post: 'post', video: 'video', group: 'group', forum: 'community', profile: 'person_profile', news: 'article'
};

const ACTIVITY_CATEGORY: Partial<Record<ExploreItem['kind'], ActivityCategory>> = {
  news: 'News Mention', post: 'Social Media', video: 'Social Media', forum: 'Social Media', event: 'Event', review: 'Other'
};

function sourceType(item: ExploreItem): SourceType {
  if (item.kind === 'news') return 'News Article';
  if (item.kind === 'profile') return 'Social Profile';
  if (/\.gov(\.|$)/.test(item.domain)) return 'Government';
  return 'Web Document';
}

function toWebItem(item: ExploreItem, savedFrom: string, now: string): WebItem {
  return {
    id: `web-${item.id}`,
    source: item.platform || item.domain,
    sourceType: item.kind === 'news' ? 'Websites & News' : item.platform ? 'Social Media' : 'Websites & News',
    title: item.title,
    description: item.snippet || '',
    url: item.url,
    discoveredAt: now,
    confidence: item.relevance.score || undefined,
    metadata: {
      itemType: item.kind === 'news' ? 'news' : item.kind,
      ...(PAGE_KIND[item.kind] ? { pageKind: PAGE_KIND[item.kind] } : {}),
      savedFrom,
      engine: item.engine,
      engines: item.engines,
      relevance: item.relevance.label,
      ...(item.metadata?.feedback ? { feedback: item.metadata.feedback } : {}),
      ...(item.author ? { author: item.author } : {}),
      ...(item.username ? { username: item.username } : {}),
      ...(item.publishedText ? { date: item.publishedText } : {}),
      ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
      ...(item.thumbnail ? { thumbnail: item.thumbnail } : {}),
      ...(item.image ? { image: item.image } : {}),
      ...(item.location ? { location: item.location } : {}),
      ...(item.rating != null ? { rating: item.rating } : {})
    }
  };
}

function toSource(item: ExploreItem, savedFrom: string, now: string): IntelligenceSource {
  return {
    id: `src-${item.id}`,
    sourceName: item.platform || item.author || item.domain,
    title: item.title,
    website: item.domain,
    domain: item.domain,
    sourceType: sourceType(item),
    ...(item.publishedAt ? { publishedDate: item.publishedAt } : {}),
    discoveredDate: now,
    url: item.url,
    usedFor: [savedFrom],
    confidenceScore: item.relevance.score || 0
  };
}

function toActivity(item: ExploreItem, now: string): IntelligenceActivity | null {
  const category = ACTIVITY_CATEGORY[item.kind];
  const date = item.publishedAt || item.publishedText;
  if (!category || !date) return null;
  return {
    id: `act-${item.id}`,
    title: item.title,
    briefReport: item.snippet || '',
    date,
    category,
    ...(item.location?.address ? { location: item.location.address } : {}),
    sourceName: item.platform || item.author || item.domain,
    sourceUrl: item.url,
    foundAt: now
  };
}

/** A profile link is saved as a possible match only; it is never presented as confirmed. */
function toProfile(item: ExploreItem, savedFrom: string, now: string): SocialProfile | null {
  if (item.kind !== 'profile' || !item.platform) return null;
  return {
    platform: item.platform,
    username: item.username || '',
    url: item.url,
    profileUrl: item.url,
    source: savedFrom,
    confidence: Math.min(40, item.relevance.score || 0),
    confidenceLevel: 'Low',
    confidenceLabel: 'Possible Match',
    matchReason: [`Saved by the investigator from ${savedFrom}; requires verification`],
    title: item.title,
    snippet: item.snippet,
    thumbnail: item.thumbnail,
    discoveredAt: now
  };
}

export interface SaveOutcome {
  added: number;
  skipped: number;
  caseName: string;
}

/**
 * Pure merge: returns the case with the new results added (duplicates by URL skipped) and an
 * audit event appended. Used by the workspace (through its own save) and by saveItemsToCase.
 */
export function mergeItemsIntoCase(inv: Investigation, items: ExploreItem[], savedFrom: string, query?: string): { updated: Investigation; added: number; skipped: number } {
  const now = new Date().toISOString();
  const existing = new Set<string>([
    ...(inv.webAndNews || []).map(w => urlKey(w.url)),
    ...(inv.socialProfiles || []).map(p => urlKey(p.profileUrl || p.url))
  ]);
  const fresh = items.filter(i => {
    const k = urlKey(i.url);
    if (!k || existing.has(k)) return false;
    existing.add(k);
    return true;
  });
  if (fresh.length === 0) return { updated: inv, added: 0, skipped: items.length };

  const profiles = fresh.map(i => toProfile(i, savedFrom, now)).filter(Boolean) as SocialProfile[];
  const profileIds = new Set(profiles.map(p => p.url));
  const web = fresh.filter(i => !profileIds.has(i.url)).map(i => toWebItem(i, savedFrom, now));
  const sourceKeys = new Set((inv.sources || []).map(s => urlKey(s.url)));
  const sources = fresh.filter(i => !sourceKeys.has(urlKey(i.url))).map(i => toSource(i, savedFrom, now));
  const activities = fresh.map(i => toActivity(i, now)).filter(Boolean) as IntelligenceActivity[];

  const updated: Investigation = {
    ...inv,
    webAndNews: [...(inv.webAndNews || []), ...web],
    socialProfiles: [...(inv.socialProfiles || []), ...profiles],
    sources: [...(inv.sources || []), ...sources],
    activities: [...(inv.activities || []), ...activities],
    resultsCount: {
      ...inv.resultsCount,
      profiles: (inv.socialProfiles || []).length + profiles.length,
      websites: (inv.webAndNews || []).length + web.length,
      sources: (inv.sources || []).length + sources.length,
      activities: (inv.activities || []).length + activities.length
    },
    auditLog: [
      ...(inv.auditLog || []),
      newAuditEvent({
        action: 'Results saved',
        object: `${fresh.length} result${fresh.length === 1 ? '' : 's'}`,
        detail: `From ${savedFrom}${query ? ` · "${query}"` : ''}${items.length > fresh.length ? ` · ${items.length - fresh.length} already in the case` : ''}`,
        group: 'Results',
        kind: 'investigator'
      })
    ],
    lastUpdated: now
  };
  return { updated, added: fresh.length, skipped: items.length - fresh.length };
}

export async function saveItemsToCase(caseId: string, items: ExploreItem[], savedFrom: string, query?: string): Promise<SaveOutcome> {
  const inv = await getInvestigationFromDb(caseId);
  if (!inv) throw new Error('That case could not be opened. It may have been deleted.');
  const { updated, added, skipped } = mergeItemsIntoCase(inv, items, savedFrom, query);
  if (added > 0) {
    await saveInvestigationToDb(updated);
    sessionStorage.removeItem(`osint_inv_${caseId}`);
  }
  return { added, skipped, caseName: inv.name };
}

/** Creates an empty case for results saved from a search (no Profiler search needed). */
export async function createCaseFromSearch(name: string, savedFrom: string, query?: string): Promise<Investigation> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in (or continue as a guest) to save cases.');
  const now = new Date().toISOString();
  const clean = name.trim().slice(0, 120) || 'Untitled case';
  const initials = clean.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || 'CS';
  const inv: Investigation = {
    id: `inv-${Date.now()}-case`,
    name: clean,
    description: `Case created from ${savedFrom}`,
    searchInputs: { queryValue: query || clean },
    status: 'In Progress',
    overallConfidence: 0,
    confidenceLevel: 'Low',
    quickSummary: `Case created from ${savedFrom}${query ? ` for "${query}"` : ''}. Results saved to it are listed in its tabs.`,
    targetProfile: {
      initials, fullName: clean, location: 'Not specified', gender: 'Unverified', age: 'Unverified',
      occupation: 'Not stated', interests: [], lastActive: 'Not applicable'
    },
    resultsCount: { profiles: 0, websites: 0, other: 0, sources: 0, activities: 0, associations: 0 },
    socialProfiles: [],
    webAndNews: [],
    recentActivities: [],
    activities: [],
    associations: [],
    sources: [],
    sourceLinks: [],
    auditLog: [newAuditEvent({ action: 'Investigation created', object: clean, detail: `Created from ${savedFrom}`, group: 'Investigation', kind: 'investigator' })],
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
    lastUpdated: now
  };
  await saveInvestigationToDb(inv);
  return inv;
}

/** Exact query for the case subject: the full name in quotes, or the username. */
export function subjectQuery(inv: { searchType?: string; name: string; searchInputs?: { name?: string; username?: string; queryValue?: string } }): string {
  if (inv.searchType === 'username') return inv.searchInputs?.username || inv.name;
  const name = (inv.searchInputs?.name || inv.searchInputs?.queryValue || inv.name).replace(/"/g, '').trim();
  return `"${name}"`;
}

