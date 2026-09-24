export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type SearchType = 'name' | 'username' | 'email' | 'domain';

export type TargetType = 'name' | 'username' | 'email' | 'domain' | 'phone';

export type ResultCategory = 
  | 'Social Media'
  | 'Developer & Code'
  | 'Video & Streaming'
  | 'Communities'
  | 'Websites & News'
  | 'Knowledge & Wikipedia'
  | 'Domain Intelligence'
  | 'Email Intelligence'
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
  email?: string;
  phone?: string;
  location?: string;
  organization?: string;
  website?: string;
  domain?: string;
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

export interface InvestigationNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
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
    emails: number;
    phones: number;
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
  scanHistory?: ScanHistoryItem[];
  lastSearched?: string;
  lastUpdated?: string;
  isTracked?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
