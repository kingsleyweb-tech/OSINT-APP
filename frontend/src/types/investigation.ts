export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type SearchType = 'name' | 'username' | 'email' | 'phone';

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
  email?: string;
  phone?: string;
}

export interface SocialProfile {
  platform: string;
  /** "similar": an account whose handle only resembles the searched username (another person). */
  relation?: 'subject' | 'similar';
  /** Username searches: exact / variation / possibly related / other person, with the reasons. */
  usernameMatch?: 'exact' | 'variation' | 'related' | 'similar';
  matchExplanation?: string[];
  matchedHandle?: string;
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
    /** Public email / website the platform shows for the account (e.g. GitHub's public email). */
    email?: string;
    website?: string;
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

/** A fact about an organisation, always with where it came from. */
export interface OrgFact {
  label: string;
  value: string;
  source: string;
  sourceUrl?: string;
}

/** What the name search established about an organisation (backend organizationDetector). */
export interface OrganizationInfo {
  name: string;
  type?: OrgFact;
  description?: OrgFact;
  facts: OrgFact[];
  website?: { url: string; basis: string; source: string };
  socialProfiles: Array<{ platform: string; url: string; source: string }>;
  signals: Array<{ signal: string; matched: boolean }>;
  hasKnowledgePanel: boolean;
  detectionReason: string;
}

export interface EntityResolution {
  query: string;
  kind: 'resolved' | 'ambiguous' | 'possible';
  candidates: Array<{ name: string; support: number; sources: Array<{ title: string; url: string }> }>;
}

export type WebsitePageKind =
  | 'home' | 'about' | 'contact' | 'services' | 'products' | 'programs' | 'leadership' | 'departments'
  | 'locations' | 'news' | 'projects' | 'publications' | 'events' | 'admissions' | 'careers';

export type OrgField =
  | 'official_name' | 'alt_name' | 'type' | 'industry' | 'sector' | 'description' | 'founded'
  | 'headquarters' | 'country' | 'address' | 'website' | 'phone' | 'email' | 'hours' | 'coordinates'
  | 'person' | 'product' | 'service' | 'social' | 'parent' | 'subsidiary' | 'unit' | 'employees';

/** One fact from one source (backend orgEnrichment). */
export interface OrgClaim {
  field: OrgField;
  value: string;
  role?: string;
  source: string;
  sourceKind: string;
  sourceUrl?: string;
  quote?: string;
}

export interface OrgMention { title: string; url: string; snippet?: string; source: string; date?: string; thumbnail?: string; engine: string }

/** The organisation sources searched by the enrichment step (Maps, Google, Bing, social, YouTube, Wikidata). */
export interface OrgEnrichment {
  version?: number;
  name: string;
  checkedAt: string;
  claims: OrgClaim[];
  mapsListings: Array<{
    title: string; category?: string; address?: string; phone?: string; website?: string; hours?: string;
    rating?: number; reviews?: number; latitude?: number; longitude?: number; mapsUrl: string; matchedBy: string;
  }>;
  wikidata?: { id: string; url: string; label: string; description?: string; wikipediaUrl?: string }
    | { ambiguous: Array<{ id: string; label: string; description?: string; url: string }> };
  mentions: OrgMention[];
  videos: OrgMention[];
  sources: Array<{ label: string; status: 'ok' | 'empty' | 'failed'; results: number; used: number; error?: string }>;
  /** Set when the enrichment could not be run at all. */
  error?: string;
}

/** The organisation's website as read by the Organisation tab (backend websiteIntel). */
export interface WebsiteIntel {
  requestedUrl: string;
  finalUrl?: string;
  reachable: boolean;
  error?: string;
  verification: { status: 'verified' | 'probable' | 'unverified'; reasons: string[] };
  siteName?: string;
  pages: Array<{ kind: WebsitePageKind; url: string; title: string; description?: string; text: string[]; headings: string[]; emails: string[]; phones: string[]; addresses: string[] }>;
  structured: Array<{ label: string; value: string; url: string }>;
  socialLinks: Array<{ platform: string; url: string; foundOn: string }>;
  emails: Array<{ value: string; foundOn: string }>;
  phones: Array<{ value: string; foundOn: string }>;
  addresses: Array<{ value: string; foundOn: string }>;
  people?: Array<{ name: string; role: string; url: string; quote: string }>;
  linkedSites?: Array<{ url: string; host: string; text: string }>;
  units?: Array<{ name: string; url: string; group: string; foundOn: string }>;
  fetchedAt: string;
}

// ─── AI analysis (backend services/ai; every item is checked against the case's own evidence) ───

/** Set by rule from the number of independent sites, never chosen by the model. */
export type AIConfidence = 'Verified' | 'Strong evidence' | 'Possible' | 'Mention only' | 'Uncertain';
export type AIField =
  | 'occupation' | 'role' | 'employer' | 'organization' | 'membership' | 'education' | 'skill' | 'language'
  | 'location' | 'nationality' | 'date_of_birth' | 'contact' | 'website' | 'social_profile' | 'alias' | 'interest'
  | 'founded' | 'headquarters' | 'industry' | 'leadership' | 'other';
export type AIEvidenceKind = 'profile' | 'web' | 'news' | 'activity' | 'association' | 'org-fact' | 'org-claim' | 'location' | 'contact' | 'image' | 'website';

export interface AISource { evidenceId: string; title: string; source: string; url: string; quote: string }
export interface AIFinding {
  id: string; field: AIField; value: string; confidence: AIConfidence; sources: AISource[]; siteCount: number; why: string;
  inCase: 'new' | 'same' | 'differs'; existing?: string;
}
export interface AITimelineEvent { id: string; date: string; event: string; confidence: AIConfidence; sources: AISource[]; siteCount: number }
export interface AIRelationship {
  id: string; from: string; to: string; toType: 'person' | 'organization' | 'group' | 'event' | 'location' | 'website';
  relation: string; confidence: AIConfidence; sources: AISource[]; siteCount: number;
}
export interface AIComparison { id: string; field: AIField; status: 'consistent' | 'conflict'; values: Array<{ value: string; sources: AISource[] }> }
export interface AIMissing { field: AIField; label: string; status: 'in_case' | 'found' | 'not_found'; caseValue?: string; foundIn: number; findingIds: string[] }
export interface AIMetrics {
  evidenceReviewed: number; byKind: Array<{ kind: AIEvidenceKind; count: number }>; findings: number; newInformation: number;
  conflicts: number; consistent: number; timeline: number; relationships: number; discarded: number;
}
export interface AIAnalysis {
  id: string; runAt: string; provider: string; model: string; subject: string; entityKind: 'person' | 'organization'; evidenceCount: number;
  summary: { text: string; sources: AISource[] };
  findings: AIFinding[]; timeline: AITimelineEvent[]; relationships: AIRelationship[]; comparisons: AIComparison[]; missing: AIMissing[]; metrics: AIMetrics;
}
/** Investigator's decision on an AI finding, timeline event or relationship (keyed by its id). */
export type AIReviewState = 'accepted' | 'ignored';

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
  /** Token of the view-only share link (sharedCases/{token}); absent when the case is not shared. */
  shareToken?: string;
  /** Pictures found by the Images tab (image search on the subject's exact name). */
  imageResults?: CaseImage[];
  imagesCheckedAt?: string;
  /** When the News tab last searched the news engines for the subject. */
  newsCheckedAt?: string;
  /** The Contact tab's search for public email addresses and phone numbers of the person. */
  contactScan?: {
    checkedAt: string;
    query: string;
    resultsChecked: number;
    sources: Array<{ label: string; status: 'ok' | 'empty' | 'failed'; results: number; error?: string }>;
    error?: string;
    refs: import('../lib/contactEvidence').ContactRef[];
    results?: Array<{ source?: string; title: string; url: string; snippet?: string; values: string[]; linked: boolean; note: string }>;
  };
  /** 'organization' when the name search recognised a company, institution, association… (missing = person). */
  entityKind?: 'person' | 'organization';
  organization?: OrganizationInfo;
  /** The Organisation tab's reading of the organisation's website (no SerpApi searches). */
  websiteIntel?: WebsiteIntel;
  /** Facts about the organisation from Google Maps, Google, Bing, social platforms, YouTube and Wikidata. */
  orgEnrich?: OrgEnrichment;
  /** Abbreviation searches ("UPSA"): the full names the results give for it, with support. */
  entityResolution?: EntityResolution;
  /** Username searches: the variations searched, with what changed. */
  usernameVariations?: Array<{ value: string; kind: string }>;
  /** Email searches: usernames the address suggests (shown as suggestions, never attributed). */
  derivedUsernames?: string[];
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
      /** Every result the sources returned, with what was found in it (shown under "Results checked"). */
      results?: import('../lib/locationEvidence').CheckedResult[];
    }>>;
  };
  /** Latest AI analysis of the case's evidence (Run AI Analysis in the AI Analysis tab). */
  aiAnalysis?: AIAnalysis;
  /** Accept / ignore decisions on AI items; only accepted items reach the share link and the PDF. */
  aiReview?: Record<string, AIReviewState>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
