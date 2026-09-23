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
