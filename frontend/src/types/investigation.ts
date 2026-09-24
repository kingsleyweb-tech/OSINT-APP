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

export type NoteType = 'Observation' | 'Question' | 'Comment' | 'Method';

export interface NoteComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface InvestigationNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  type?: NoteType;
  title?: string;
  /** Linked items: source URL keys (see lib/workspace urlKey) or finding ids such as "F-01". */
  links?: string[];
  comments?: NoteComment[];
  updatedAt?: string;
}

/** Investigator review level of a kept result. Results the search engine kept start as "relevant". */
export type EvidenceLevel = 'raw' | 'relevant' | 'validated';

export type FindingConfidence = 'High' | 'Medium' | 'Low';
export type FindingStatus = 'Confirmed' | 'Needs corroboration';

/** A conclusion recorded by an investigator after reviewing evidence. Never created automatically. */
export interface Finding {
  id: string;
  title: string;
  category: string;
  statement: string;
  confidence: FindingConfidence;
  status: FindingStatus;
  /** Supporting evidence, as source URL keys. */
  sourceKeys: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AuditGroup = 'Searches' | 'Results' | 'Findings' | 'Notes' | 'Investigation';
export type AuditKind = 'system' | 'investigator' | 'finding' | 'removal';

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
  notes: InvestigationNote[];
  findings?: Finding[];
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
