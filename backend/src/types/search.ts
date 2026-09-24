export type SearchType = 'name' | 'username';

export interface OSINTQuery {
  searchType?: SearchType;
  queryValue?: string;
  name?: string;
  username?: string;
  location?: string;
  organization?: string;
}

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

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface NormalizedResultItem {
  id: string;
  source: string;
  sourceType: ResultCategory;
  title: string;
  description: string;
  url: string;
  username?: string;
  possibleName?: string;
  location?: string;
  discoveredAt: string;
  confidence: number; // 0 - 100
  confidenceLevel: ConfidenceLevel;
  metadata?: Record<string, any>;
}
