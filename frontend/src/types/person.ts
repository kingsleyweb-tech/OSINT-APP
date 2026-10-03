/**
 * The canonical person record built by the name search (backend services/nameSearch/personRecord.ts).
 * One record per person found; the search card, the stored case and the person page all read it.
 */

export type PersonFactField =
  | 'occupation' | 'role' | 'employer' | 'organization' | 'education' | 'location' | 'nationality' | 'alias';

export type FactTier = 'official' | 'institutional' | 'own-profile' | 'listing' | 'news' | 'directory' | 'other';
export type FactMethod = 'profile' | 'parser' | 'ai' | 'research';

export interface PersonFact {
  field: PersonFactField;
  value: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceName: string;
  quote?: string;
  tier: FactTier;
  confidence: number;
  method: FactMethod;
  viaMention?: boolean;
  observedAt: string;
}

export interface FactSummary {
  field: PersonFactField;
  value: string;
  tier: FactTier;
  confidence: number;
  sources: Array<Pick<PersonFact, 'sourceUrl' | 'sourceTitle' | 'sourceName' | 'quote' | 'tier' | 'method'>>;
  conflicts?: string[];
}

export type IdentityConfidence = 'High confidence' | 'Strong match' | 'Possible match' | 'Mention only' | 'Uncertain' | 'Not enough evidence';

export interface PersonRecord {
  personId: string;
  name: string;
  searchedName?: string;
  aliases: string[];
  usernames: string[];
  platforms: string[];
  canonicalProfileUrl?: string;
  facts: PersonFact[];
  summary: FactSummary[];
  best: Partial<Record<PersonFactField, FactSummary>>;
  identityConfidence: IdentityConfidence;
  confidenceReason: string;
  evidenceCounts: Partial<Record<string, number>>;
  builtAt: string;
}
