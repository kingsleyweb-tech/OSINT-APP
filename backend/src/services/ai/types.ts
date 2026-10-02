/** Shapes of the AI analysis. Mirrored in frontend/src/types/investigation.ts (AIAnalysis). */

/** Set by rule from the evidence (see analysisEngine.confidenceOf), never chosen by the model. */
export type AIConfidence = 'Verified' | 'Strong evidence' | 'Possible' | 'Mention only' | 'Uncertain';

export type EvidenceKind = 'profile' | 'web' | 'news' | 'activity' | 'association' | 'org-fact' | 'org-claim' | 'location' | 'contact' | 'image' | 'website';

/** One piece of collected evidence as sent to the model (E1, E2…). */
export interface Evidence {
  id: string;
  kind: EvidenceKind;
  /** Site or platform name. */
  source: string;
  url: string;
  title: string;
  /** The text the model reads, and that every quote is checked against. */
  text: string;
  date?: string;
  /** Investigator's review level of the result. */
  level: 'relevant' | 'validated';
  /** The subject's own profile or website (its statements are about the subject even without naming it). */
  own?: boolean;
}

export type AIField =
  | 'occupation' | 'role' | 'employer' | 'organization' | 'membership' | 'education' | 'skill' | 'language'
  | 'location' | 'nationality' | 'date_of_birth' | 'contact' | 'website' | 'social_profile' | 'alias' | 'interest'
  | 'founded' | 'headquarters' | 'industry' | 'leadership' | 'other';

export interface AISource {
  evidenceId: string;
  title: string;
  source: string;
  url: string;
  /** The source's exact words (checked to appear in the collected evidence). */
  quote: string;
}

export interface AIFinding {
  id: string;
  field: AIField;
  value: string;
  confidence: AIConfidence;
  sources: AISource[];
  /** Independent sites supporting it. */
  siteCount: number;
  /** Short evidence-based explanation (no hidden reasoning). */
  why: string;
  /** Compared with what the case already holds. */
  inCase: 'new' | 'same' | 'differs';
  existing?: string;
}

export interface AITimelineEvent {
  id: string;
  date: string;
  event: string;
  confidence: AIConfidence;
  sources: AISource[];
  siteCount: number;
}

export interface AIRelationship {
  id: string;
  from: string;
  to: string;
  toType: 'person' | 'organization' | 'group' | 'event' | 'location' | 'website';
  relation: string;
  confidence: AIConfidence;
  sources: AISource[];
  siteCount: number;
}

export interface AIComparison {
  id: string;
  field: AIField;
  status: 'consistent' | 'conflict';
  values: Array<{ value: string; sources: AISource[] }>;
}

export interface AIMissing {
  field: AIField;
  label: string;
  status: 'in_case' | 'found' | 'not_found';
  caseValue?: string;
  /** Independent sites the AI findings for this field come from. */
  foundIn: number;
  findingIds: string[];
}

export interface AIMetrics {
  evidenceReviewed: number;
  /** A list, not a map: Firestore merges maps on save, which would keep counts from an older run. */
  byKind: Array<{ kind: EvidenceKind; count: number }>;
  findings: number;
  newInformation: number;
  conflicts: number;
  consistent: number;
  timeline: number;
  relationships: number;
  /** Model statements dropped because the evidence did not support them. */
  discarded: number;
}

export interface AIAnalysis {
  id: string;
  runAt: string;
  provider: string;
  model: string;
  subject: string;
  entityKind: 'person' | 'organization';
  evidenceCount: number;
  summary: { text: string; sources: AISource[] };
  findings: AIFinding[];
  timeline: AITimelineEvent[];
  relationships: AIRelationship[];
  comparisons: AIComparison[];
  missing: AIMissing[];
  metrics: AIMetrics;
}
