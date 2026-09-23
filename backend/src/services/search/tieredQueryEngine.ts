import { OSINTQuery } from '../../types/search';
import { PLATFORM_REGISTRY, PlatformEntry } from './platformRegistry';

export interface GeneratedQueryBatch {
  query: string;
  platform: PlatformEntry;
}

export class TieredQueryEngine {
  /**
   * Programmatically generate deduplicated queries from platform registry based on search inputs
   */
  public static generateQueries(osintQuery: OSINTQuery, maxQueries: number = 9): GeneratedQueryBatch[] {
    const rawTarget = (osintQuery.name || osintQuery.queryValue || osintQuery.username || osintQuery.email || osintQuery.domain || '').trim();
    if (!rawTarget) return [];

    // Strip existing quotes to ensure clean double-quoted exact queries
    const target = rawTarget.replace(/^["']|["']$/g, '').trim();
    if (!target) return [];

    const searchType = osintQuery.searchType || 'name';
    const batches: GeneratedQueryBatch[] = [];
    const seenQueries = new Set<string>();

    // Helper to add query if unique
    const addQuery = (platform: PlatformEntry) => {
      if (!platform.searchPattern) return;
      const q = platform.searchPattern(target);
      if (!seenQueries.has(q)) {
        seenQueries.add(q);
        batches.push({ query: q, platform });
      }
    };

    // 1. Tier 1 Core Queries (Broad, Profiles, LinkedIn, X, Facebook, Instagram, TikTok, YouTube, GitHub, News)
    const tier1Entries = PLATFORM_REGISTRY.filter(p => p.tier === 1);
    tier1Entries.forEach(addQuery);

    // If query limit already satisfied or search type is specific, return
    if (batches.length >= maxQueries) {
      return batches.slice(0, maxQueries);
    }

    // 2. Tier 2 Targeted Platform Queries based on searchType
    let tier2PriorityCategories: string[] = ['social', 'professional', 'developer'];
    if (searchType === 'username') {
      tier2PriorityCategories = ['developer', 'social', 'community', 'publishing', 'video'];
    } else if (searchType === 'email') {
      tier2PriorityCategories = ['social', 'developer', 'community', 'messaging'];
    } else if (searchType === 'domain') {
      tier2PriorityCategories = ['business', 'developer', 'publishing'];
    } else {
      tier2PriorityCategories = ['social', 'professional', 'video', 'publishing', 'academic'];
    }

    const tier2Entries = PLATFORM_REGISTRY.filter(p => p.tier === 2 && tier2PriorityCategories.includes(p.category));
    tier2Entries.forEach(p => {
      if (batches.length < maxQueries) {
        addQuery(p);
      }
    });

    // 3. Tier 3 Extended Queries if budget permits (Academic, Creative, Music, Documents)
    if (batches.length < maxQueries) {
      const tier3Entries = PLATFORM_REGISTRY.filter(p => p.tier === 3);
      tier3Entries.forEach(p => {
        if (batches.length < maxQueries) {
          addQuery(p);
        }
      });
    }

    return batches.slice(0, maxQueries);
  }
}
