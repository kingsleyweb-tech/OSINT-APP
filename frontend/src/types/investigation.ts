export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type SearchType = 'name' | 'username';

export type ResultCategory = 
  | 'Social Media'
  | 'Developer & Code'
  | 'Video & Streaming'
  | 'Communities'
  | 'Websites & News'
  | 'Knowledge & Wikipedia'
  | 'Organizations'
  | 'Public Activity'
  | 'Other';

export type ActivityCategory = 
  | 'Political'
  | 'Professional'
  | 'Business'
  | 'Public Appearance'
  | 'Interview'
  | 'Speech'
  | 'Conference'
  | 'Event'
  | 'Publication'
  | 'Social Media'
  | 'News Mention'
  | 'Organization Activity'
  | 'Other';

export type AssociationCategory = 
  | 'Political'
  | 'Organizations'
  | 'Companies'
  | 'Professional'
  | 'Education'
  | 'Government'
  | 'Nonprofit'
  | 'Community'
  | 'Other';

export type AssociationEvidenceState = 
  | 'Documented'
  | 'Strong evidence'
  | 'Possible association'
  | 'Mention only';

export type SourceType = 
  | 'News Article'
  | 'Social Profile'
  | 'Developer Profile'
  | 'Knowledge Base'
  | 'Web Document'
  | 'Organization Page'
  | 'RSS Feed'
  | 'Government'
  | 'Other';

export interface OSINTResultItem {
  id: string;
  sourceName: string;
  category: ResultCategory;
  targetQueried: string;
  matchedIdentifier: string;
  profileUrl?: string;
  title?: string;
  snippet?: string;
  avatarUrl?: string;
  metadata?: Record<string, any>;
  confidenceScore: number;
  timestamp: string;
}

export interface StreamProgressEvent {
  status: 'searching' | 'completed' | 'failed' | 'progress';
  sourceName: string;
  percentComplete: number;
  totalSourcesChecked: number;
  totalSourcesCount: number;
  result?: OSINTResultItem;
  error?: string;
}

export interface IntelligenceActivity {
  id: string;
  /** "similar": activity of an account whose handle only resembles the searched username (another person). */
  relation?: 'subject' | 'similar';
  title: string;
  briefReport: string;
  date: string;
  category: ActivityCategory;
  location?: string;
  sourceName: string;
  sourceUrl: string;
  /** When the result was discovered (not when the activity happened). */
  foundAt?: string;
}

export interface IntelligenceAssociation {
  id: string;
  name: string;
  category: AssociationCategory;
  relationship: string;
  evidenceState: AssociationEvidenceState;
  evidenceCitation: string;
  sourceUrl?: string;
  sourceName?: string;
}

export interface IntelligenceSource {
  id: string;
  relation?: 'subject' | 'similar';
  sourceName: string;
  title: string;
  website: string;
  domain: string;
  sourceType: SourceType;
  publishedDate?: string;
  discoveredDate: string;
  url: string;
  usedFor: string[];
  confidenceScore: number;
}

export interface ScanHistoryItem {
  scanId: string;
  scannedAt: string;
  newFindingsCount: number;
  totalFindingsCount: number;
  changesSummary: string[];
}

export interface SearchCoverageItem {
  provider: string;
  status: 'checked' | 'unavailable' | 'error';
  count: number;
}

export interface SearchInput {
  searchType?: SearchType;
  queryValue?: string;
  name?: string;
  username?: string;
  location?: string;
  organization?: string;
}

export interface SocialProfile {
  platform: string;
  /** "similar": an account whose handle only resembles the searched username (another person). */
  relation?: 'subject' | 'similar';
  username: string;
  url: string;
  canonicalUrl?: string;
  originalUrl?: string;
  sourceUrl?: string;
  source?: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  confidenceLabel?: 'Verified Match' | 'Likely Match' | 'Possible Match';
  matchReason?: string[];
  avatarUrl?: string;
  bio?: string;
  category?: 'Social' | 'Professional' | 'Developer' | 'Video & Streaming';
  isVerified?: boolean;
  // Name-search profile evidence (absent on older records and username-search results)
  id?: string;
  platformId?: string;
  pageKind?: string;
  pageKindLabel?: string;
  profileName?: string;
  /** Exact destination returned by the search engine; what "View Profile" opens. */
  profileUrl?: string;
  title?: string;
  snippet?: string;
  thumbnail?: string;
  favicon?: string;
  sourceQuery?: string;
  attributes?: {
    headline?: string;
    organization?: string;
    education?: string;
    location?: string;
    details?: string[];
  };
  evidence?: { code: string; text: string }[];
  personId?: string;
  discoveredAt?: string;
  lastCheckedAt?: string;
  linkStatus?: 'unchecked' | 'reachable' | 'unavailable' | 'unverifiable';
  linkStatusReason?: string;
  status?: 'active' | 'previously_discovered';
}

export interface PublicActivity {
  type: string;
  title: string;
  platform: string;
  timestamp: string;
  url?: string;
}

export interface Association {
  name: string;
  type: 'Organization' | 'Group' | 'Colleague' | 'Location' | 'Other';
  details?: string;
}

/** Investigator review level of a kept result. Results the search engine kept start as "relevant". */
export type EvidenceLevel = 'raw' | 'relevant' | 'validated';

export type AuditGroup = 'Searches' | 'Results' | 'Investigation';
export type AuditKind = 'system' | 'investigator' | 'removal';

export interface AuditEvent {
  id: string;
  at: string;
  action: string;
  object: string;
  by: string;
  detail: string;
  group: AuditGroup;
  kind: AuditKind;
}

/** One SerpApi query of one search run. */
export interface SearchLogEntry {
  /** Sequential query number across every search of this investigation. */
  run: number;
  /** Which search (initial search = 1, each re-run adds one). */
  batch: number;
  at: string;
  purpose: string;
  query: string;
  returned: number;
  kept: number | null;
  status: 'Completed' | 'Cached' | 'Failed' | 'No results';
  error?: string;
}

/** A picture of the subject found by image search: only the image, its page and its source. */
export interface CaseImage {
  id: string;
  /** Page the image appears on. */
  pageUrl: string;
  imageUrl?: string;
  thumbnail?: string;
  title: string;
  source: string;
  engine: string;
  foundAt: string;
}

export interface Investigation {
  id: string;
  name: string;
  searchType?: SearchType;
  description?: string;
  searchInputs: SearchInput;
  status: 'In Progress' | 'Completed' | 'Archived';
  overallConfidence: number;
  confidenceLevel: ConfidenceLevel;
  quickSummary: string;
  sourcesChecked?: string[];
  searchCoverage?: SearchCoverageItem[];
  targetProfile: {
    initials: string;
    fullName: string;
    location: string;
    gender: string;
    age: string;
    occupation: string;
    avatarUrl?: string;
    interests: string[];
    lastActive: string;
  };
  resultsCount: {
    profiles: number;
    websites: number;
    other: number;
    sources: number;
    activities: number;
    associations: number;
  };
  socialProfiles: SocialProfile[];
  webAndNews?: {
    id: string;
    source: string;
    sourceType: string;
    title: string;
    description: string;
    url: string;
    discoveredAt?: string;
    confidence?: number;
    metadata?: Record<string, any>;
  }[];
  recentActivities: PublicActivity[];
  activities?: IntelligenceActivity[];
  associationsList?: IntelligenceAssociation[];
  associations?: IntelligenceAssociation[];
  sources?: IntelligenceSource[];
  sourceLinks: {
    title: string;
    url: string;
  }[];
  /** Investigator review level per result, keyed by URL key. Missing = "relevant". */
  review?: Record<string, EvidenceLevel>;
  auditLog?: AuditEvent[];
  searchLog?: SearchLogEntry[];
  /** Per-query log returned by the most recent search (raw backend shape). */
  auditTrail?: any[];
  deepStats?: Record<string, any>;
  searchDepth?: string;
  scanHistory?: ScanHistoryItem[];
  lastSearched?: string;
  lastUpdated?: string;
  isTracked?: boolean;
  /** Pictures found by the Images tab (image search on the subject's exact name). */
  imageResults?: CaseImage[];
  imagesCheckedAt?: string;
  /** When the News tab last searched the news engines for the subject. */
  newsCheckedAt?: string;
  /**
   * The Location tab's searches across the open web: "core" (web, Bing, news, Maps; run on first open)
   * and "more" (videos, images, social posts; on request). Each keeps how every source did and the
   * location references found. Legacy fields (refs, engines…) come from the first version of the tab.
   */
  locationScan?: {
    checkedAt?: string;
    query?: string;
    refs?: import('../lib/locationEvidence').LocationRef[];
    runs?: Partial<Record<'core' | 'more', {
      at: string;
      resultsChecked: number;
      sources: Array<{ label: string; status: 'ok' | 'empty' | 'failed'; results: number; error?: string }>;
      /** Set when the search could not be run at all (network, rate limit, sign-in). */
      error?: string;
      refs: import('../lib/locationEvidence').LocationRef[];
    }>>;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
