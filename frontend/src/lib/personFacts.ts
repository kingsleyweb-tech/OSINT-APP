import type { AIAnalysis, AIConfidence, AIField, IntelligenceAssociation, Investigation } from '../types/investigation';
import type { FactSummary, FactTier, PersonFact, PersonFactField, PersonRecord } from '../types/person';

/**
 * The person record's facts on the client: reading the strongest value per field, and merging the
 * verified AI findings into the record (same precedence as backend services/nameSearch/personRecord.ts).
 */

export const TIER_RANK: Record<FactTier, number> = { official: 0, institutional: 1, 'own-profile': 2, listing: 3, news: 4, directory: 5, other: 6 };
export const TIER_LABEL: Record<FactTier, string> = {
  official: 'Official site', institutional: 'Institutional record', 'own-profile': 'Own profile', listing: 'Listing',
  news: 'News', directory: 'Directory', other: 'Web'
};
const SINGLE_VALUED: PersonFactField[] = ['location', 'nationality'];

/** AI fields that become person facts (membership is kept as an organisation). */
const AI_FIELD: Partial<Record<AIField, PersonFactField>> = {
  occupation: 'occupation', role: 'role', employer: 'employer', organization: 'organization', membership: 'organization',
  education: 'education', location: 'location', nationality: 'nationality', alias: 'alias'
};
const AI_CONFIDENCE: Partial<Record<AIConfidence, number>> = { Verified: 90, 'Strong evidence': 80, Possible: 60 };

const siteOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return url; }
};
const valueKey = (v: string) => v.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\b(ltd|limited|inc|llc|plc|the)\b/g, '').replace(/\s+/g, ' ').trim();

function compareSummaries(a: FactSummary, b: FactSummary): number {
  return TIER_RANK[a.tier] - TIER_RANK[b.tier]
    || new Set(b.sources.map(s => siteOf(s.sourceUrl))).size - new Set(a.sources.map(s => siteOf(s.sourceUrl))).size
    || b.confidence - a.confidence;
}

/** Groups facts by field and value; the strongest value per field is `best` (a weaker source never wins). */
export function summarizeFacts(facts: PersonFact[]): { summary: FactSummary[]; best: Partial<Record<PersonFactField, FactSummary>> } {
  const groups = new Map<string, FactSummary>();
  facts.forEach(f => {
    const key = `${f.field}:${valueKey(f.value)}`;
    const g = groups.get(key);
    const src = { sourceUrl: f.sourceUrl, sourceTitle: f.sourceTitle, sourceName: f.sourceName, quote: f.quote, tier: f.tier, method: f.method };
    if (!g) {
      groups.set(key, { field: f.field, value: f.value, tier: f.tier, confidence: f.confidence, sources: [src] });
      return;
    }
    if (!g.sources.some(s => s.sourceUrl === f.sourceUrl)) g.sources.push(src);
    if (TIER_RANK[f.tier] < TIER_RANK[g.tier]) {
      g.tier = f.tier;
      g.value = f.value;
    }
    g.confidence = Math.max(g.confidence, f.confidence);
  });
  const summary = Array.from(groups.values());
  summary.forEach(s => {
    const sites = new Set(s.sources.map(x => siteOf(x.sourceUrl))).size;
    s.confidence = Math.min(97, s.confidence + (sites - 1) * 8);
    s.sources.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
  });
  summary.sort(compareSummaries);

  const best: Partial<Record<PersonFactField, FactSummary>> = {};
  summary.forEach(s => {
    const cur = best[s.field];
    if (!cur) {
      best[s.field] = { ...s };
      return;
    }
    if (SINGLE_VALUED.includes(s.field)) cur.conflicts = Array.from(new Set([...(cur.conflicts || []), s.value]));
  });
  return { summary, best };
}

/** The strongest value for a field, or undefined when no source states it. */
export function bestFact(inv: Investigation, field: PersonFactField): FactSummary | undefined {
  return inv.person?.best?.[field];
}

/** Key fields still missing from the record (what the automatic research looks for). */
export function missingKeyFields(inv: Investigation): Array<'occupation' | 'location' | 'social_profile'> {
  const out: Array<'occupation' | 'location' | 'social_profile'> = [];
  if (!bestFact(inv, 'occupation') && !bestFact(inv, 'role')) out.push('occupation');
  if (!bestFact(inv, 'location')) out.push('location');
  if (!(inv.socialProfiles || []).some(p => p.relation !== 'similar')) out.push('social_profile');
  return out;
}

const NOT_STATED = /not stated|not specified|no public role|public individual|^unknown$/i;

/**
 * Adds the AI analysis's quote-verified findings to the person record as facts (method "ai", tier of the
 * cited source). An earlier AI run's facts are replaced; facts from profiles, the parser and research stay.
 * Stronger sources keep precedence, different single values are kept as conflicts, and nothing is added
 * without a cited source. Employer / organisation / education findings also become associations.
 */
export function mergeAiFindings(inv: Investigation, analysis: AIAnalysis): Investigation {
  if (analysis.entityKind !== 'person') return inv;
  const now = analysis.runAt || new Date().toISOString();
  const aiFacts: PersonFact[] = [];
  analysis.findings.forEach(f => {
    const field = AI_FIELD[f.field];
    const base = AI_CONFIDENCE[f.confidence];
    if (!field || base === undefined || f.derived || !f.value?.trim()) return;
    f.sources.forEach(s => {
      if (!s.url) return;
      aiFacts.push({
        field, value: f.value.trim(), sourceUrl: s.url, sourceTitle: s.title, sourceName: s.source,
        quote: s.quote || undefined, tier: s.tier || 'other', confidence: base, method: 'ai', observedAt: now
      });
    });
  });
  if (!aiFacts.length) return inv;

  const prev: PersonRecord = inv.person || {
    personId: inv.personId || inv.id, name: inv.targetProfile?.fullName || inv.name, aliases: [], usernames: [], platforms: [],
    facts: [], summary: [], best: {}, identityConfidence: 'Uncertain',
    confidenceReason: 'No person record was built by the search; facts below come from the AI review of the case evidence.',
    evidenceCounts: {}, builtAt: now
  };
  const facts = [...prev.facts.filter(f => f.method !== 'ai'), ...aiFacts];
  const { summary, best } = summarizeFacts(facts);
  const person: PersonRecord = { ...prev, facts, summary, best };

  // Card fields follow the record only where the search had nothing.
  const tp = { ...inv.targetProfile };
  const occ = best.occupation || best.role;
  if (occ && (!tp.occupation || NOT_STATED.test(tp.occupation))) tp.occupation = occ.value;
  if (best.location && (!tp.location || NOT_STATED.test(tp.location))) tp.location = best.location.value;

  const CATEGORY: Partial<Record<PersonFactField, IntelligenceAssociation['category']>> = { employer: 'Companies', organization: 'Organizations', education: 'Education' };
  const RELATION: Partial<Record<PersonFactField, string>> = {
    employer: 'Works or worked at (AI-reviewed source)', organization: 'Member / affiliated (AI-reviewed source)', education: 'Studied at (AI-reviewed source)'
  };
  const assoc = [...(inv.associations || [])];
  const known = new Set(assoc.map(a => valueKey(a.name)));
  summary.filter(s => CATEGORY[s.field] && s.sources.some(x => x.method === 'ai')).forEach(s => {
    if (known.has(valueKey(s.value))) return;
    known.add(valueKey(s.value));
    const src = s.sources[0];
    assoc.push({
      id: `assoc-ai-${assoc.length}`,
      name: s.value,
      category: CATEGORY[s.field]!,
      relationship: RELATION[s.field]!,
      evidenceState: s.sources.length > 1 ? 'Strong evidence' : 'Documented',
      evidenceCitation: src.quote ? `"${src.quote}" — ${src.sourceName}` : `Stated on ${src.sourceName}: "${src.sourceTitle}".`,
      sourceName: src.sourceName,
      sourceUrl: src.sourceUrl
    });
  });

  return { ...inv, person, personId: inv.personId || person.personId, targetProfile: tp as Investigation['targetProfile'], associations: assoc };
}
