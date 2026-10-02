/**
 * Helpers for the AI analysis stored on a case: labels, and the "reviewed" view of an analysis.
 * Only items the investigator accepted leave the case: the view-only share link and the PDF use
 * reviewedAnalysis(), which keeps the summary, accepted findings / events / relationships, the source
 * comparison (sources that agree or disagree — no fact is asserted) and the missing-information list.
 */
import type { AIAnalysis, AIConfidence, AIField, AIReviewState, Investigation } from '../types/investigation';

export const AI_FIELD_LABEL: Record<AIField, string> = {
  occupation: 'Occupation', role: 'Role / job title', employer: 'Employer', organization: 'Organisation', membership: 'Membership / group',
  education: 'Education', skill: 'Skills', language: 'Languages', location: 'Location', nationality: 'Nationality', date_of_birth: 'Date of birth',
  contact: 'Public contact', website: 'Website', social_profile: 'Social profile', alias: 'Alias / other name', interest: 'Public interests',
  founded: 'Founded', headquarters: 'Headquarters', industry: 'Industry / type', leadership: 'Leadership', other: 'Other'
};

/** How each confidence label is earned (shown in the tab and the report). */
export const AI_CONFIDENCE_RULE: Record<AIConfidence, string> = {
  Verified: '3 or more independent sites, or 2 including one you marked Validated',
  'Strong evidence': '2 independent sites',
  Possible: '1 site that names the subject (or is the subject’s own page)',
  'Mention only': '1 site that does not name the subject',
  Uncertain: 'sites disagree on this value'
};

/** CSS tone for a confidence label (reuses the evidence-level colours). */
export const aiTone = (c: AIConfidence): 'validated' | 'relevant' | 'raw' | 'finding' =>
  c === 'Verified' || c === 'Strong evidence' ? 'validated' : c === 'Possible' ? 'relevant' : c === 'Uncertain' ? 'finding' : 'raw';

export const reviewOf = (inv: Investigation, id: string): AIReviewState | undefined => inv.aiReview?.[id];

/** The analysis with only accepted findings, events and relationships (for sharing, the PDF and view-only). */
export function reviewedAnalysis(inv: Investigation): AIAnalysis | null {
  const a = inv.aiAnalysis;
  if (!a) return null;
  const ok = (id: string) => inv.aiReview?.[id] === 'accepted';
  const findings = a.findings.filter(f => ok(f.id));
  return {
    ...a,
    findings,
    timeline: a.timeline.filter(t => ok(t.id)),
    relationships: a.relationships.filter(r => ok(r.id)),
    missing: a.missing.map(m => {
      const ids = m.findingIds.filter(ok);
      return m.status === 'found' ? { ...m, status: ids.length ? 'found' : 'not_found', findingIds: ids, foundIn: ids.length ? m.foundIn : 0 } : { ...m, findingIds: ids };
    })
  };
}

/** The copy of a case that goes to the view-only share link: unreviewed AI output stays private. */
export function shareSafe(inv: Investigation): Investigation {
  const reviewed = reviewedAnalysis(inv);
  return reviewed ? { ...inv, aiAnalysis: reviewed } : inv;
}

/** Items still waiting for a decision. */
export function aiPending(inv: Investigation): number {
  const a = inv.aiAnalysis;
  if (!a) return 0;
  return [...a.findings, ...a.timeline, ...a.relationships].filter(x => !inv.aiReview?.[x.id]).length;
}
