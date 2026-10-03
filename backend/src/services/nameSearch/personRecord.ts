/**
 * The canonical person record: one evidence-backed record per identity cluster, built once on the server
 * and carried unchanged into the search card, the stored case and the person page.
 *
 * Every fact keeps the page that states it, the words it is stated in and the tier of that page. When
 * several pages give a field, the strongest source wins (official > institutional > own profile > listing >
 * news > directory > other); a weaker source never replaces a stronger one. Different values for a
 * single-valued field (location, nationality) are listed as conflicts, not resolved.
 */
import { createHash } from 'crypto';
import type { NormalizedResultItem } from '../../types/search';
import type { SourceTier } from '../ai/types';
import { tierOf, siteOf } from '../ai/evidencePrep';
import { extractFacts, type PersonFactField } from './factExtractor';
import { normalizeText } from './identityMatcher';
import type { DiscoveredProfile, IdentityCluster } from './nameSearchEngine';

export type { PersonFactField };

export type FactMethod = 'profile' | 'parser' | 'ai' | 'research';

export interface PersonFact {
  field: PersonFactField;
  value: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceName: string;
  quote?: string;
  tier: SourceTier;
  confidence: number;
  method: FactMethod;
  /** The fact comes from a result that only mentions the name (not linked to this person's accounts). */
  viaMention?: boolean;
  observedAt: string;
}

export interface FactSummary {
  field: PersonFactField;
  value: string;
  tier: SourceTier;
  confidence: number;
  sources: Array<Pick<PersonFact, 'sourceUrl' | 'sourceTitle' | 'sourceName' | 'quote' | 'tier' | 'method'>>;
  /** Other values different sources give for a single-valued field. */
  conflicts?: string[];
}

export type IdentityConfidence = 'High confidence' | 'Strong match' | 'Possible match' | 'Mention only' | 'Uncertain' | 'Not enough evidence';

export type EvidenceType =
  | 'Person Profile' | 'Social Profile' | 'Organization Profile' | 'News' | 'Article' | 'Public Post' | 'Video'
  | 'Image' | 'Event' | 'Website' | 'Mention' | 'Other';

export interface PersonRecord {
  personId: string;
  name: string;
  /** The name typed by the user, when the record is for a spelling the results agree on instead. */
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
  evidenceCounts: Partial<Record<EvidenceType, number>>;
  builtAt: string;
}

export const TIER_RANK: Record<SourceTier, number> = { official: 0, institutional: 1, 'own-profile': 2, listing: 3, news: 4, directory: 5, other: 6 };
const TIER_BASE: Record<SourceTier, number> = { official: 90, institutional: 85, 'own-profile': 80, listing: 70, news: 70, directory: 60, other: 55 };
export const SINGLE_VALUED: PersonFactField[] = ['location', 'nationality'];

/** A stable identifier: the same person found by the same strongest page always gets the same ID. */
export function stablePersonId(name: string, anchor: string): string {
  return `p_${createHash('sha1').update(`${normalizeText(name)}|${anchor.toLowerCase()}`).digest('hex').slice(0, 12)}`;
}

export function evidenceTypeOfProfile(p: DiscoveredProfile): EvidenceType {
  if (p.pageKind === 'organization_page') return 'Organization Profile';
  return p.category === 'Professional' ? 'Person Profile' : 'Social Profile';
}

export function evidenceTypeOfItem(w: NormalizedResultItem): EvidenceType {
  const kind = w.metadata?.pageKind;
  if (w.metadata?.itemType === 'news') return 'News';
  switch (kind) {
    case 'article': return 'Article';
    case 'post': case 'group': case 'community': return 'Public Post';
    case 'video': return 'Video';
    case 'organization_page': return 'Organization Profile';
    case 'website': case 'repository': return 'Website';
    default: return w.metadata?.identityLink === 'name_mention' ? 'Mention' : 'Other';
  }
}

const valueKey = (v: string) => normalizeText(v).replace(/\b(ltd|limited|inc|llc|plc|the)\b/g, '').replace(/\s+/g, ' ').trim();

/** Strongest first: tier, then how many independent sites give it, then confidence. */
export function compareSummaries(a: FactSummary, b: FactSummary): number {
  return TIER_RANK[a.tier] - TIER_RANK[b.tier]
    || new Set(b.sources.map(s => siteOf(s.sourceUrl))).size - new Set(a.sources.map(s => siteOf(s.sourceUrl))).size
    || b.confidence - a.confidence;
}

/** Groups facts by field and value; the strongest value per field is `best`. */
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
  // More independent sites, more confidence (never above 97).
  summary.forEach(s => {
    const sites = new Set(s.sources.map(x => siteOf(x.sourceUrl) || x.sourceUrl)).size;
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

function profileFacts(p: DiscoveredProfile, name: string, nowIso: string): PersonFact[] {
  const out: PersonFact[] = [];
  const base = { sourceUrl: p.profileUrl, sourceTitle: p.title || `${p.platform} profile`, sourceName: p.platform, tier: 'own-profile' as SourceTier, observedAt: nowIso };
  const conf = Math.round((TIER_BASE['own-profile'] + Math.min(p.confidence, 95)) / 2);
  const add = (field: PersonFactField, value: string | undefined, quote: string) => {
    if (value && value.trim().length >= 2) out.push({ ...base, field, value: value.trim(), quote, confidence: conf, method: 'profile' });
  };
  add('role', p.attributes.headline, p.title);
  add('employer', p.attributes.organization, p.snippet || p.title);
  add('education', p.attributes.education, p.snippet || p.title);
  add('location', p.attributes.location, p.snippet || p.title);
  // The profile's own words about its owner ("Prince Ayaata is a musician…" in a bio).
  extractFacts(p.profileName || name, `${p.title}. ${p.bio || p.snippet || ''}`)
    .forEach(f => out.push({ ...base, field: f.field, value: f.value, quote: f.quote, confidence: conf - 5, method: 'parser' }));
  return out;
}

function itemFacts(w: NormalizedResultItem, names: string[], viaMention: boolean, nowIso: string): PersonFact[] {
  const kind = w.metadata?.itemType === 'news' ? 'news' : 'web';
  const tier = tierOf(kind, w.url);
  const text = `${w.title || ''}. ${w.description || ''}`;
  const seen = new Set<string>();
  const out: PersonFact[] = [];
  names.forEach(n => extractFacts(n, text).forEach(f => {
    const k = `${f.field}:${valueKey(f.value)}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({
      field: f.field, value: f.value, quote: f.quote, sourceUrl: w.url, sourceTitle: w.title, sourceName: w.source,
      tier, confidence: TIER_BASE[tier] - (viaMention ? 15 : 0), method: 'parser', viaMention: viaMention || undefined, observedAt: nowIso
    });
  }));
  return out;
}

/** Facts stated in a cluster's own profiles and results (and, when allowed, in results that only mention the name). */
export function clusterFacts(cluster: Pick<IdentityCluster, 'profiles' | 'webItems'>, names: string[], allowMentionFacts: boolean, nowIso: string): PersonFact[] {
  const own = cluster.profiles.filter(p => p.relation !== 'similar');
  return [
    ...own.flatMap(p => profileFacts(p, names[0], nowIso)),
    ...cluster.webItems.flatMap(w => {
      const mention = w.metadata?.identityLink === 'name_mention';
      if (mention && !allowMentionFacts) return [];
      return itemFacts(w, names, mention, nowIso);
    })
  ];
}

const CONFIDENCE_FROM_LABEL: Record<IdentityCluster['confidenceLabel'], IdentityConfidence> = {
  Verified: 'High confidence',
  'Strong evidence': 'Strong match',
  'Possible match': 'Possible match',
  'Mention only': 'Mention only',
  Uncertain: 'Uncertain'
};

export interface BuildRecordInput {
  cluster: IdentityCluster;
  /** Names the subject is written as in the results: the record's name first, then the searched one. */
  names: string[];
  searchedName?: string;
  /** Facts from name-only mentions are used only when no other person in the search could be meant. */
  allowMentionFacts: boolean;
  linkReasons?: string[];
  nowIso: string;
}

export function buildPersonRecord(input: BuildRecordInput): PersonRecord {
  const { cluster, names, nowIso } = input;
  const own = cluster.profiles.filter(p => p.relation !== 'similar').sort((a, b) => b.confidence - a.confidence);
  const facts = clusterFacts(cluster, names, input.allowMentionFacts, nowIso);
  const { summary, best } = summarizeFacts(facts);

  const evidenceCounts: PersonRecord['evidenceCounts'] = {};
  const count = (t: EvidenceType) => (evidenceCounts[t] = (evidenceCounts[t] || 0) + 1);
  own.forEach(p => count(evidenceTypeOfProfile(p)));
  cluster.webItems.forEach(w => count(evidenceTypeOfItem(w)));

  const aliases = Array.from(new Set([
    ...summary.filter(s => s.field === 'alias').map(s => s.value),
    ...own.map(p => p.profileName).filter((n): n is string => Boolean(n) && normalizeText(n!) !== normalizeText(cluster.fullName))
  ]));

  let identityConfidence: IdentityConfidence = cluster.kind === 'organization' ? 'Strong match' : CONFIDENCE_FROM_LABEL[cluster.confidenceLabel] || 'Uncertain';
  if (own.length === 0 && cluster.webItems.length === 0) identityConfidence = 'Not enough evidence';

  // A short reason built only from what was found.
  const reasons: string[] = [];
  if (own.some(p => p.evidence.some(e => e.code === 'name' && /is exactly|different word order/.test(e.text)))) reasons.push('exact name on profile');
  if (own.some(p => p.evidence.some(e => e.code === 'knowledge_panel'))) reasons.push("listed in Google's knowledge panel");
  if (own.some(p => p.evidence.some(e => e.code === 'api_confirmed'))) reasons.push('account name confirmed by the platform');
  if (own.some(p => p.evidence.some(e => e.code === 'cross_source'))) reasons.push('accounts link to each other');
  const occ = best.occupation || best.role;
  if (occ) reasons.push(`${best.occupation ? 'occupation' : 'role'} "${occ.value}" stated in ${occ.sources.length} source${occ.sources.length === 1 ? '' : 's'}`);
  if (best.employer) reasons.push(`organisation "${best.employer.value}"`);
  if (best.location) reasons.push(`location "${best.location.value}"`);
  (input.linkReasons || []).forEach(r => reasons.push(`grouped by ${r}`));
  const platforms = Array.from(new Set(own.map(p => p.platform)));
  if (platforms.length) reasons.push(`profiles on ${platforms.join(', ')}`);
  const newsCount = (evidenceCounts.News || 0) + (evidenceCounts.Article || 0);
  if (newsCount) reasons.push(`${newsCount} news/article result${newsCount === 1 ? '' : 's'}`);
  const confidenceReason = reasons.length
    ? `${identityConfidence} — ${reasons.slice(0, 5).join(', ')}.`
    : `${identityConfidence} — no identifying details were found beyond the name.`;

  const anchor = own[0]?.canonicalUrl || cluster.webItems.find(w => w.metadata?.identityLink !== 'name_mention')?.metadata?.canonicalUrl || `${cluster.kind}`;
  return {
    personId: stablePersonId(cluster.fullName, anchor),
    name: cluster.fullName,
    ...(input.searchedName && normalizeText(input.searchedName) !== normalizeText(cluster.fullName) ? { searchedName: input.searchedName } : {}),
    aliases,
    usernames: Array.from(new Set(own.map(p => p.username).filter(Boolean))),
    platforms,
    canonicalProfileUrl: own[0]?.profileUrl,
    facts,
    summary,
    best,
    identityConfidence,
    confidenceReason,
    evidenceCounts,
    builtAt: nowIso
  };
}

/** Plain text for a best fact, or undefined. */
export const bestValue = (r: PersonRecord, f: PersonFactField): string | undefined => r.best[f]?.value;
