export type SearchType = 'name' | 'username' | 'email' | 'domain' | 'phone';

export interface OSINTQuery {
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

export interface ISearchProvider {
  name: string;
  search(query: OSINTQuery): Promise<NormalizedResultItem[]>;
}
