export type DiscoveryPlatformStatus = 
  | 'searching'
  | 'found'
  | 'no_match'
  | 'unverified'
  | 'provider_unavailable'
  | 'error';

export type DiscoveryCategory = 
  | 'Social Media'
  | 'Video & Streaming'
  | 'Developer'
  | 'Communities & Publishing'
  | 'Web Search';

export interface DiscoveryResultItem {
  id: string;
  platformId: string;
  platform: string;
  category: DiscoveryCategory;
  username: string;
  displayName?: string;
  profileUrl?: string;
  profileImage?: string;
  status: DiscoveryPlatformStatus;
  source: string;
  confidence: 'confirmed' | 'possible' | 'unconfirmed';
  discoveredAt: string;
  isVariation?: boolean;
  variationLabel?: string;
  metadata?: Record<string, any>;
}

export interface UsernameDiscoverySummary {
  username: string;
  totalSourcesChecked: number;
  totalProfilesFound: number;
  variationsChecked: number;
  variationsFound: number;
  completedAt: string;
}
