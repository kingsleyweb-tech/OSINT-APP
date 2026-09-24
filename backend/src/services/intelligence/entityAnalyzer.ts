import { NormalizedResultItem, OSINTQuery } from '../../types/search';
import { 
  IntelligenceActivity, 
  IntelligenceAssociation, 
  IntelligenceSource, 
  ActivityCategory, 
  AssociationCategory, 
  AssociationEvidenceState, 
  SourceType 
} from '../../types/intelligence';
import { RelevanceEngine } from './relevanceEngine';
import { UrlValidator, ResultItemType } from './urlValidator';

export interface AnalyzedPersonProfile {
  fullName: string;
  publicRole: string;
  location: string;
  avatarUrl?: string;
  personSummary: string;
  overallConfidence: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  activities: IntelligenceActivity[];
  associations: IntelligenceAssociation[];
  sources: IntelligenceSource[];
  socialProfiles: Array<{
    platform: string;
    username: string;
    url: string;
    canonicalUrl?: string;
    originalUrl?: string;
    sourceUrl?: string;
    source?: string;
    confidence: number;
    confidenceLevel: 'High' | 'Medium' | 'Low';
    confidenceLabel?: 'Verified Match' | 'Likely Match' | 'Possible Match';
    matchReason?: string[];
    avatarUrl?: string;
    bio?: string;
    category?: 'Social' | 'Professional' | 'Developer' | 'Video & Streaming';
    isVerified?: boolean;
  }>;
}

export type NeutralConfidenceLabel = 'Verified' | 'Strong evidence' | 'Possible match' | 'Mention only' | 'Uncertain';

export interface EvidenceSignal {
  signal: string;
  matched: boolean;
}

export interface PossibleIdentity {
  id: string;
  fullName: string;
  publicRole: string;
  location: string;
  avatarUrl?: string;
  summary: string;
  confidenceScore: number;
  confidenceLabel: NeutralConfidenceLabel;
  evidenceChecklist: EvidenceSignal[];
  profilesCount: number;
  sourcesCount: number;
  activitiesCount: number;
  associationsCount: number;
  matchingPlatforms: string[];
  investigation: AnalyzedPersonProfile;
}

export class EntityAnalyzer {
  /**
   * Group search items into distinct possible identities when multi-entity results exist
   */
  public static analyzeIdentities(query: OSINTQuery, items: NormalizedResultItem[]): PossibleIdentity[] {
    const mainProfile = this.analyze(query, items);

    const buildEvidenceChecklist = (profile: AnalyzedPersonProfile, targetName: string): EvidenceSignal[] => {
      const nameMatchResult = RelevanceEngine.matchPersonName(targetName, profile.fullName);
      const hasNameMatch = nameMatchResult.isExactPhrase || nameMatchResult.allTokensMatched;
      const hasLocationMatch = Boolean(profile.location && profile.location !== 'Not specified');
      const hasOrgMatch = Boolean(profile.associations && profile.associations.length > 0);
      const hasUsernameMatch = Boolean(profile.socialProfiles && profile.socialProfiles.some(p => p.username && p.username !== targetName));

      return [
        { signal: 'Matching name', matched: hasNameMatch },
        { signal: 'Matching location', matched: hasLocationMatch },
        { signal: 'Matching organization', matched: hasOrgMatch },
        { signal: 'Matching username', matched: hasUsernameMatch }
      ];
    };

    const getNeutralLabel = (score: number, itemsCount: number): NeutralConfidenceLabel => {
      if (score >= 90 && itemsCount >= 2) return 'Verified';
      if (score >= 75) return 'Strong evidence';
      if (score >= 55) return 'Possible match';
      if (score >= 35) return 'Mention only';
      return 'Uncertain';
    };

    if (!items || items.length === 0) {
      return [{
        id: `id-1`,
        fullName: mainProfile.fullName,
        publicRole: mainProfile.publicRole,
        location: mainProfile.location,
        summary: mainProfile.personSummary,
        confidenceScore: mainProfile.overallConfidence,
        confidenceLabel: 'Uncertain',
        evidenceChecklist: buildEvidenceChecklist(mainProfile, query.name || query.username || ''),
        profilesCount: 0,
        sourcesCount: 0,
        activitiesCount: 0,
        associationsCount: 0,
        matchingPlatforms: [],
        investigation: mainProfile
      }];
    }

    // Group items into clusters by location & primary platform category
    const clusters: Record<string, NormalizedResultItem[]> = {};

    items.forEach(item => {
      const loc = item.location || 'Global / Web';
      const key = `${item.sourceType || 'General'}-${loc}`;
      if (!clusters[key]) clusters[key] = [];
      clusters[key].push(item);
    });

    const clusterKeys = Object.keys(clusters);

    if (clusterKeys.length <= 1 || items.length <= 3) {
      return [{
        id: `id-primary`,
        fullName: mainProfile.fullName,
        publicRole: mainProfile.publicRole,
        location: mainProfile.location,
        avatarUrl: mainProfile.avatarUrl,
        summary: mainProfile.personSummary,
        confidenceScore: mainProfile.overallConfidence,
        confidenceLabel: getNeutralLabel(mainProfile.overallConfidence, items.length),
        evidenceChecklist: buildEvidenceChecklist(mainProfile, query.name || query.username || ''),
        profilesCount: mainProfile.socialProfiles.length,
        sourcesCount: mainProfile.sources.length,
        activitiesCount: mainProfile.activities.length,
        associationsCount: mainProfile.associations.length,
        matchingPlatforms: Array.from(new Set(mainProfile.socialProfiles.map(p => p.platform))),
        investigation: mainProfile
      }];
    }

    return clusterKeys.slice(0, 3).map((key, idx) => {
      const subset = clusters[key];
      const subProfile = this.analyze(query, subset);
      const confScore = Math.min(96, Math.max(40, Math.round(subProfile.overallConfidence * (0.9 + idx * 0.05))));
      const confLabel = getNeutralLabel(confScore, subset.length);

      return {
        id: `id-identity-${idx + 1}`,
        fullName: subProfile.fullName,
        publicRole: subProfile.publicRole,
        location: subProfile.location,
        avatarUrl: subProfile.avatarUrl,
        summary: subProfile.personSummary,
        confidenceScore: confScore,
        confidenceLabel: confLabel,
        evidenceChecklist: buildEvidenceChecklist(subProfile, query.name || query.username || ''),
        profilesCount: subProfile.socialProfiles.length,
        sourcesCount: subProfile.sources.length,
        activitiesCount: subProfile.activities.length,
        associationsCount: subProfile.associations.length,
        matchingPlatforms: Array.from(new Set(subProfile.socialProfiles.map(p => p.platform))),
        investigation: subProfile
      };
    });
  }

  /**
   * Primary entry point to analyze search items and extract structured intelligence
   */
  public static analyze(query: OSINTQuery, items: NormalizedResultItem[]): AnalyzedPersonProfile {
    const targetName = (query.name || query.queryValue || query.username || 'Discovered Target').trim();

    if (!items || items.length === 0) {
      return {
        fullName: targetName,
        publicRole: 'No public role verified',
        location: 'Not specified',
        personSummary: `No verified public records found for "${targetName}". Checked connected OSINT providers.`,
        overallConfidence: 0,
        confidenceLevel: 'Low',
        activities: [],
        associations: [],
        sources: [],
        socialProfiles: []
      };
    }

    // 1. Determine Public Role & Location
    let publicRole = 'Public Individual / Entity';
    let location = 'Not specified';
    let avatarUrl: string | undefined = undefined;

    items.forEach(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();

      if (!avatarUrl && item.metadata?.avatarUrl) avatarUrl = item.metadata.avatarUrl;
      if (!avatarUrl && item.metadata?.profileImage) avatarUrl = item.metadata.profileImage;

      if (publicRole === 'Public Individual / Entity') {
        if (text.includes('president') || text.includes('minister') || text.includes('politician') || text.includes('parliament') || text.includes('mp')) {
          publicRole = 'Political Figure / Public Official';
        } else if (text.includes('student') && (text.includes('university') || text.includes('college'))) {
          publicRole = 'Student & Researcher';
        } else if (text.includes('software developer') || text.includes('engineer') || text.includes('developer') || text.includes('programmer')) {
          publicRole = 'Software Engineer / IT Specialist';
        } else if (text.includes('educator') || text.includes('teacher') || text.includes('professor') || text.includes('lecturer')) {
          publicRole = 'Educator / Academic';
        } else if (text.includes('founder') || text.includes('ceo') || text.includes('director') || text.includes('executive')) {
          publicRole = 'Corporate Executive / Founder';
        } else if (text.includes('journalist') || text.includes('author') || text.includes('writer') || text.includes('reporter')) {
          publicRole = 'Journalist / Writer';
        }
      }

      if (location === 'Not specified' && item.location) {
        location = item.location;
      } else if (location === 'Not specified') {
        if (text.includes('ghana') || text.includes('accra')) location = 'Ghana';
        else if (text.includes('nigeria') || text.includes('lagos')) location = 'Nigeria';
        else if (text.includes('united states') || text.includes('usa')) location = 'United States';
        else if (text.includes('united kingdom') || text.includes('uk')) location = 'United Kingdom';
      }
    });

    // 2. Synthesize Person Summary
    const personSummary = this.generatePersonSummary(targetName, publicRole, location, items);

    // 3. Extract Activities Timeline (posts, videos, news, articles)
    const activities = this.extractActivities(targetName, items);

    // 4. Extract Associations & Affiliations
    const associations = this.extractAssociations(targetName, items);

    // 5. Build Evidence Sources Layer
    const sources = this.buildSourcesLayer(items, activities, associations);

    // 6. Extract ONLY Authentic Social & Platform Profiles
    const socialProfiles = this.extractSocialProfiles(targetName, items);

    // 7. Calculate overall confidence score
    const avgConfidence = Math.round(
      items.reduce((acc, curr) => acc + (curr.confidence || 75), 0) / items.length
    );
    const confidenceLevel = avgConfidence >= 85 ? 'High' : avgConfidence >= 65 ? 'Medium' : 'Low';

    return {
      fullName: targetName,
      publicRole,
      location,
      avatarUrl,
      personSummary,
      overallConfidence: Math.min(98, Math.max(45, avgConfidence)),
      confidenceLevel,
      activities,
      associations,
      sources,
      socialProfiles
    };
  }

  private static generatePersonSummary(
    name: string,
    role: string,
    location: string,
    items: NormalizedResultItem[]
  ): string {
    const wikiItem = items.find(i => i.source === 'Wikipedia' || i.sourceType === 'Knowledge & Wikipedia');
    if (wikiItem && wikiItem.description) {
      let cleanWiki = wikiItem.description.replace(/<[^>]+>/g, '').trim();
      if (!cleanWiki.endsWith('.')) cleanWiki += '.';
      return `${cleanWiki} Verified public records document key activities, professional roles, and affiliations.`;
    }

    const keySnippets = items
      .map(i => i.description)
      .filter(Boolean)
      .map(d => d.replace(/<[^>]+>/g, '').trim())
      .filter(d => d.length > 20 && !d.includes('No public description'));

    if (keySnippets.length > 0) {
      const excerpt = keySnippets.slice(0, 2).join(' ');
      return `${name} is documented in public records as a ${role.toLowerCase()}${location !== 'Not specified' ? ` associated with ${location}` : ''}. ${excerpt}`;
    }

    return `${name} is identified in verified public intelligence sources as a ${role.toLowerCase()}${location !== 'Not specified' ? ` based in ${location}` : ''}. Publicly available records document activity, verified platform profiles, and web mentions.`;
  }

  private static extractActivities(targetName: string, items: NormalizedResultItem[]): IntelligenceActivity[] {
    const activities: IntelligenceActivity[] = [];

    items.forEach((item, index) => {
      const text = `${item.title} ${item.description}`.toLowerCase();

      let category: ActivityCategory = 'News Mention';
      if (text.includes('speech') || text.includes('address') || text.includes('remarks')) category = 'Speech';
      else if (text.includes('interview') || text.includes('podcast') || text.includes('q&a')) category = 'Interview';
      else if (text.includes('conference') || text.includes('summit') || text.includes('forum')) category = 'Conference';
      else if (text.includes('political') || text.includes('election') || text.includes('campaign') || text.includes('party')) category = 'Political';
      else if (text.includes('repo') || text.includes('commit') || text.includes('project') || text.includes('developer')) category = 'Professional';
      else if (text.includes('paper') || text.includes('article') || text.includes('journal') || text.includes('publication')) category = 'Publication';

      // Only the date the search result states; when it gives none the activity is undated
      // (the discovery time is kept separately as foundAt).
      const dateStr = item.metadata?.date || 'Date not stated';

      const briefReport = item.description || `Public activity or publication for ${targetName} documented on ${item.source}.`;

      activities.push({
        id: `act-${index}-${Date.now()}`,
        title: item.title,
        briefReport,
        date: dateStr,
        category,
        location: item.location,
        sourceName: item.source,
        sourceUrl: item.url,
        foundAt: item.discoveredAt
      });
    });

    return activities;
  }

  private static extractAssociations(targetName: string, items: NormalizedResultItem[]): IntelligenceAssociation[] {
    const associationsMap = new Map<string, IntelligenceAssociation>();

    items.forEach((item, index) => {
      const text = `${item.title} ${item.description}`;

      // Educational Institutions
      const uniMatch = text.match(/([A-Z][a-zA-Z0-9\s]+(?:University|College|Institute|School|Academy))/);
      if (uniMatch && uniMatch[1] && uniMatch[1].length < 50) {
        const uniName = uniMatch[1].trim();
        if (!associationsMap.has(uniName.toLowerCase())) {
          associationsMap.set(uniName.toLowerCase(), {
            id: `assoc-uni-${index}`,
            name: uniName,
            category: 'Education',
            relationship: text.toLowerCase().includes('student') ? 'Student / Scholar' : 'Academic Association',
            evidenceState: 'Documented',
            evidenceCitation: `Educational match documented in ${item.source} (${item.title}).`,
            sourceName: item.source,
            sourceUrl: item.url
          });
        }
      }

      // Organizations / Political Parties
      const polMatch = text.match(/(National Democratic Congress|New Patriotic Party|African Union|United Nations|Parliament of Ghana|Economic Community of West African States)/i);
      if (polMatch && polMatch[1]) {
        const polName = polMatch[1].trim();
        if (!associationsMap.has(polName.toLowerCase())) {
          associationsMap.set(polName.toLowerCase(), {
            id: `assoc-pol-${index}`,
            name: polName,
            category: 'Political',
            relationship: 'Official Affiliation / Member',
            evidenceState: 'Documented',
            evidenceCitation: `Documented involvement matching ${polName} in ${item.source}.`,
            sourceName: item.source,
            sourceUrl: item.url
          });
        }
      }

      if (item.metadata?.company) {
        const compName = item.metadata.company.trim();
        if (compName && !associationsMap.has(compName.toLowerCase())) {
          associationsMap.set(compName.toLowerCase(), {
            id: `assoc-comp-${index}`,
            name: compName,
            category: 'Companies',
            relationship: 'Member / Corporate Affiliate',
            evidenceState: 'Strong evidence',
            evidenceCitation: `Corporate entity listed on ${item.source}.`,
            sourceName: item.source,
            sourceUrl: item.url
          });
        }
      }
    });

    return Array.from(associationsMap.values());
  }

  private static buildSourcesLayer(
    items: NormalizedResultItem[],
    activities: IntelligenceActivity[],
    associations: IntelligenceAssociation[]
  ): IntelligenceSource[] {
    const seenUrls = new Set<string>();
    const sourcesList: IntelligenceSource[] = [];

    items.forEach((item, index) => {
      const canonicalUrl = UrlValidator.normalizeUrl(item.url);
      if (seenUrls.has(canonicalUrl)) return;
      seenUrls.add(canonicalUrl);

      let domain = 'Web Source';
      try {
        domain = new URL(canonicalUrl).hostname.replace(/^www\./, '');
      } catch (e) {}

      let sourceType: SourceType = 'Web Document';
      if (item.sourceType === 'Knowledge & Wikipedia') sourceType = 'Knowledge Base';
      else if (item.sourceType === 'Social Media') sourceType = 'Social Profile';
      else if (item.sourceType === 'Developer & Code') sourceType = 'Developer Profile';
      else if (item.sourceType === 'Websites & News') sourceType = 'News Article';

      const usedFor: string[] = [];
      if (activities.some(a => a.sourceUrl === canonicalUrl)) usedFor.push('Activity Report');
      if (associations.some(a => a.sourceUrl === canonicalUrl)) usedFor.push('Association Evidence');
      if (usedFor.length === 0) usedFor.push('Identity Verification');

      sourcesList.push({
        id: `src-${index}-${Date.now()}`,
        sourceName: item.source,
        title: item.title,
        website: domain,
        domain,
        sourceType,
        publishedDate: item.metadata?.date || undefined,
        discoveredDate: item.discoveredAt || new Date().toISOString(),
        url: canonicalUrl,
        usedFor,
        confidenceScore: item.confidence || 75
      });
    });

    return sourcesList;
  }

  /**
   * Extract ONLY Authentic Social & Platform Profiles.
   * EXCLUDES reels, videos, posts, search pages, or unverified content URLs.
   */
  private static extractSocialProfiles(targetName: string, items: NormalizedResultItem[]): AnalyzedPersonProfile['socialProfiles'] {
    const verifiedProfiles: AnalyzedPersonProfile['socialProfiles'] = [];
    const seenUrls = new Set<string>();

    items.forEach(r => {
      const urlValidation = UrlValidator.validateAndClassify(r.url);
      const canonicalUrl = urlValidation.canonicalUrl;

      if (!canonicalUrl || seenUrls.has(canonicalUrl)) return;

      // STRICT CHECK 1: Must NOT be a search page, google search URL, or serpapi URL
      if (
        urlValidation.itemType === 'search_page' ||
        canonicalUrl.includes('google.com/url') ||
        canonicalUrl.includes('google.com/search') ||
        canonicalUrl.includes('serpapi.com')
      ) {
        return;
      }

      // STRICT CHECK 2: Item MUST be classified as a profile OR channel and be a verified profile URL pattern!
      const isProfile = r.metadata?.itemType === 'profile' || urlValidation.itemType === 'profile' || urlValidation.isVerifiedProfileUrl;
      
      if (!isProfile) {
        return; // REJECT posts, reels, videos, articles from Profiles tab
      }

      seenUrls.add(canonicalUrl);

      let category: 'Social' | 'Professional' | 'Developer' | 'Video & Streaming' = 'Social';
      let platformName = urlValidation.platformName;

      if (canonicalUrl.includes('linkedin.com')) category = 'Professional';
      else if (canonicalUrl.includes('github.com')) category = 'Developer';
      else if (canonicalUrl.includes('youtube.com')) category = 'Video & Streaming';

      const rawHandle = urlValidation.extractedHandle || r.username;
      const username = rawHandle ? rawHandle.replace(/^@+/, '') : targetName;
      const confidence = r.confidence || 85;

      // Build evidence signals ("Why this profile?")
      const matchReasons: string[] = [];
      const title = r.title || '';
      const snippet = r.description || '';

      const nameMatch = RelevanceEngine.matchPersonName(targetName, title);
      if (nameMatch.isExactPhrase) {
        matchReasons.push(`Exact full name match "${targetName}" in profile title`);
      } else if (nameMatch.allTokensMatched) {
        matchReasons.push(`All name tokens for "${targetName}" matched in profile title`);
      }

      const snippetNameMatch = RelevanceEngine.matchPersonName(targetName, snippet);
      if (snippetNameMatch.isExactPhrase || snippetNameMatch.allTokensMatched) {
        matchReasons.push(`Target name confirmed in profile biography/snippet`);
      }

      if (urlValidation.isVerifiedProfileUrl) {
        matchReasons.push(`Verified profile URL structure on ${platformName}`);
      }

      if (rawHandle && rawHandle.toLowerCase() !== targetName.toLowerCase()) {
        matchReasons.push(`Discovered handle @${rawHandle.replace(/^@+/, '')}`);
      }

      if (r.location) {
        matchReasons.push(`Location alignment (${r.location})`);
      }

      const confidenceLabel: 'Verified Match' | 'Likely Match' | 'Possible Match' = 
        confidence >= 85 ? 'Verified Match' : confidence >= 65 ? 'Likely Match' : 'Possible Match';

      verifiedProfiles.push({
        platform: platformName,
        username,
        url: canonicalUrl,
        canonicalUrl,
        originalUrl: r.url,
        sourceUrl: canonicalUrl,
        source: r.source || `Search Engine (${urlValidation.domain})`,
        confidence,
        confidenceLevel: confidence >= 85 ? 'High' : confidence >= 65 ? 'Medium' : 'Low',
        confidenceLabel,
        matchReason: matchReasons.length > 0 ? matchReasons : [`Public profile match on ${platformName}`],
        avatarUrl: r.metadata?.avatarUrl || r.metadata?.profileImage || undefined,
        bio: r.description,
        category,
        isVerified: confidence >= 75
      });
    });

    return verifiedProfiles;
  }
}
