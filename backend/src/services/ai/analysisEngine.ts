/**
 * AI analysis of an investigation's collected evidence: one model request per analysis, then a
 * deterministic check of everything the model said.
 *
 * The model only proposes. A statement is kept only when its citations hold up:
 *   - the cited evidence exists and the quoted words really appear in it (no invented quotes, no URLs from
 *     the model — sources and links are always taken from the evidence itself);
 *   - a finding's value is written in its quotes; a dated event's date is in its quotes; a relationship's
 *     two sides are named in the same quote (or the quote is the subject's own profile).
 * Confidence is then set by rule from how many independent sites support the statement, never by the
 * model. Values that differ between sites are shown as a conflict; no winner is picked.
 */
import { createHash } from 'crypto';
import { AIError, getProvider } from './provider';
import { hasValue, prepareEvidence, siteOf, type PreparedEvidence } from './evidencePrep';
import type {
  AIAnalysis, AIComparison, AIConfidence, AIField, AIFinding, AIMetrics, AIMissing, AIRelationship, AISource, AITimelineEvent, Evidence
} from './types';

const FIELDS: AIField[] = [
  'occupation', 'role', 'employer', 'organization', 'membership', 'education', 'skill', 'language', 'location', 'nationality',
  'date_of_birth', 'contact', 'website', 'social_profile', 'alias', 'interest', 'founded', 'headquarters', 'industry', 'leadership', 'other'
];
const TO_TYPES = ['person', 'organization', 'group', 'event', 'location', 'website'] as const;

export const FIELD_LABEL: Record<AIField, string> = {
  occupation: 'Occupation', role: 'Role / job title', employer: 'Employer', organization: 'Organisation', membership: 'Membership / group',
  education: 'Education', skill: 'Skills', language: 'Languages', location: 'Location', nationality: 'Nationality', date_of_birth: 'Date of birth',
  contact: 'Public contact', website: 'Website', social_profile: 'Social profile', alias: 'Alias / other name', interest: 'Public interests',
  founded: 'Founded', headquarters: 'Headquarters', industry: 'Industry / type', leadership: 'Leadership', other: 'Other'
};

/** Fields a subject has one value of at a time: different values from different sites are a conflict. */
const SINGLE_VALUED: AIField[] = ['location', 'nationality', 'date_of_birth', 'founded', 'headquarters'];

const MISSING_FIELDS: Record<'person' | 'organization', AIField[]> = {
  person: ['occupation', 'employer', 'organization', 'education', 'location', 'contact', 'website', 'social_profile', 'language', 'skill'],
  organization: ['industry', 'founded', 'headquarters', 'leadership', 'contact', 'website', 'social_profile', 'membership']
};

// ─── Model request ──────────────────────────────────────────────────────────

const CIT = { type: 'ARRAY', items: { type: 'OBJECT', properties: { e: { type: 'STRING' }, quote: { type: 'STRING' } }, required: ['e', 'quote'] } };
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, citations: CIT }, required: ['text', 'citations'] } },
    findings: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { field: { type: 'STRING', enum: FIELDS }, value: { type: 'STRING' }, citations: CIT, why: { type: 'STRING' } }, required: ['field', 'value', 'citations', 'why'] }
    },
    timeline: { type: 'ARRAY', items: { type: 'OBJECT', properties: { date: { type: 'STRING' }, event: { type: 'STRING' }, citations: CIT }, required: ['date', 'event', 'citations'] } },
    relationships: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { from: { type: 'STRING' }, to: { type: 'STRING' }, toType: { type: 'STRING', enum: [...TO_TYPES] }, relation: { type: 'STRING' }, citations: CIT },
        required: ['from', 'to', 'toType', 'relation', 'citations']
      }
    }
  },
  required: ['summary', 'findings', 'timeline', 'relationships']
};

const SYSTEM = `You are an OSINT evidence analyst. You read numbered evidence (E1, E2…) collected from public sources about one subject and extract only what the evidence states.

Rules — follow all of them:
1. Use only the evidence given. No outside knowledge, no guessing, no assumptions.
2. Every item must cite evidence ids with a quote copied word for word from that evidence's text (a short exact phrase, max 25 words). Never paraphrase inside a quote.
3. A finding's value must be written with the words of its quote (e.g. quote "software developer at Hubtel" → occupation "software developer", employer "Hubtel").
4. Only report facts about the subject. Evidence about a different person or organisation with a similar name must be ignored.
5. Two names appearing on the same page is NOT a relationship. Report a relationship only when a quote states how they are related.
6. Timeline events need a date (year at least) written in the quote.
7. If the evidence does not support something, leave it out. Empty lists are fine.
8. "why": one short sentence stating which evidence supports the item (no hidden reasoning).
9. Summary: 2–6 short, plain sentences of the most important supported facts, each with citations. Each sentence must stand alone: name the subject instead of writing "he", "she" or "it", and write names exactly as the evidence spells them.`;
/** Changing the prompt or rules changes this, so cached analyses from older rules are not reused. */
const PROMPT_VERSION = 4;

function buildPrompt(p: PreparedEvidence): string {
  const lines = p.evidence.map(e => `[${e.id}] ${e.kind}${e.own ? ' (subject\'s own page)' : ''} · ${e.source}${e.date ? ` · ${e.date}` : ''}\nTitle: ${e.title || '—'}\nText: ${e.text}`);
  return `Subject: "${p.subject}" (${p.entityKind}).\nAllowed fields: ${FIELDS.join(', ')}.\n\nEVIDENCE\n\n${lines.join('\n\n')}`;
}

// ─── Validation helpers ─────────────────────────────────────────────────────

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'has', 'have', 'its', 'their', 'his', 'her', 'of', 'at', 'in', 'on', 'a', 'an', 'to', 'as', 'by', 'is']);
const significant = (s: string) => norm(s).split(' ').filter(w => w.length > 1 && !STOP.has(w));
const hash = (...parts: string[]) => createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);

interface RawCitation { e?: unknown; quote?: unknown }

/** Keep only citations whose evidence exists and whose quote (each part around "…") appears in its text. */
function checkCitations(raw: unknown, byId: Map<string, Evidence>): AISource[] {
  if (!Array.isArray(raw)) return [];
  const out: AISource[] = [];
  const seen = new Set<string>();
  raw.slice(0, 8).forEach((c: RawCitation) => {
    const ev = byId.get(String(c?.e || '').trim().toUpperCase());
    const quote = String(c?.quote || '').trim().slice(0, 400);
    if (!ev || norm(quote).length < 3) return;
    const text = norm(`${ev.title} ${ev.text}`);
    const pieces = quote.split(/\.{3}|…/).map(norm).filter(Boolean);
    if (!pieces.length || !pieces.every(p => text.includes(p))) return;
    const key = `${ev.id}|${norm(quote)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ evidenceId: ev.id, title: ev.title || ev.source, source: ev.source, url: ev.url, quote: quote.length > 220 ? `${quote.slice(0, 217)}…` : quote });
  });
  return out;
}

const quotesText = (s: AISource[]) => norm(s.map(x => x.quote).join(' '));
/** Every significant word of `value` is in the quotes (emails/phones compared without punctuation). */
const statedIn = (value: string, sources: AISource[]) => {
  const words = significant(value);
  const q = ` ${quotesText(sources)} `;
  return words.length > 0 && words.every(w => q.includes(` ${w} `) || q.includes(w));
};
/** Numbers and capitalised names in a sentence also appear in its quotes or the subject's name. */
function sentenceSupported(text: string, sources: AISource[], subjectNames: string[]): boolean {
  const q = `${quotesText(sources)} ${norm(sources.map(s => `${s.title} ${s.source}`).join(' '))} ${norm(subjectNames.join(' '))}`;
  const tokens = text.match(/\b\d{2,}\b|(?<!^|[.!?]\s)\b[A-Z][\p{L}'-]{2,}/gu) || [];
  return tokens.every(t => q.includes(norm(t)));
}
const sitesOf = (s: AISource[]) => new Set(s.map(x => (x.url ? siteOf(x.url) : `record:${x.evidenceId}`)));
/** The cited page is the subject's own, or names the subject (full name, or two parts of it). */
const namesSubject = (s: AISource[], byId: Map<string, Evidence>, names: string[]) => s.some(x => {
  const ev = byId.get(x.evidenceId);
  if (!ev) return false;
  if (ev.own) return true;
  const text = ` ${norm(`${ev.title} ${ev.text}`)} `;
  const [full, ...parts] = names.map(norm).filter(Boolean);
  return Boolean(full && text.includes(full)) || parts.filter(p => text.includes(` ${p} `)).length >= 2;
});

/**
 * Confidence by rule:
 *   Verified        — 3+ independent sites, or 2+ with one the investigator marked Validated
 *   Strong evidence — 2 independent sites
 *   Possible        — 1 site whose page names the subject (or is the subject's own page)
 *   Mention only    — 1 site whose page does not name the subject
 *   Uncertain       — sites disagree (set by the comparison step)
 */
export function confidenceOf(sources: AISource[], byId: Map<string, Evidence>, subjectNames: string[]): AIConfidence {
  const sites = sitesOf(sources).size;
  const validated = sources.some(s => byId.get(s.evidenceId)?.level === 'validated');
  if (sites >= 3 || (sites >= 2 && validated)) return 'Verified';
  if (sites >= 2) return 'Strong evidence';
  return namesSubject(sources, byId, subjectNames) ? 'Possible' : 'Mention only';
}

const mergeSources = (a: AISource[], b: AISource[]) => {
  const out = [...a];
  b.forEach(s => { if (!out.some(x => x.evidenceId === s.evidenceId && norm(x.quote) === norm(s.quote))) out.push(s); });
  return out.slice(0, 8);
};
/** "Accra" and "Accra, Ghana" are the same value; "Accra" and "Kumasi" are not. */
const sameValue = (a: string, b: string) => {
  const x = significant(a), y = significant(b);
  if (!x.length || !y.length) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.every(w => long.includes(w));
};

/** Country names (and ISO codes) — a value that is only a country is too broad to conflict with a city in it. */
const COUNTRIES = (() => {
  const set = new Set<string>();
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    for (let i = 65; i <= 90; i++) for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i, j);
      const name = names.of(code);
      if (name && name !== code) { set.add(norm(name)); set.add(code.toLowerCase()); }
    }
  } catch { /* Intl without region names: no country handling */ }
  return set;
})();
const countryOnly = (v: string) => COUNTRIES.has(norm(v));

// ─── Analysis ───────────────────────────────────────────────────────────────

interface ModelOutput {
  summary?: Array<{ text?: string; citations?: unknown }>;
  findings?: Array<{ field?: string; value?: string; citations?: unknown; why?: string }>;
  timeline?: Array<{ date?: string; event?: string; citations?: unknown }>;
  relationships?: Array<{ from?: string; to?: string; toType?: string; relation?: string; citations?: unknown }>;
}

/** Validates the model's output against the evidence and builds the analysis (no model call here). */
export function buildAnalysis(p: PreparedEvidence, out: ModelOutput, meta: { provider: string; model: string }): AIAnalysis {
  const byId = new Map(p.evidence.map(e => [e.id, e] as const));
  let discarded = 0;

  // Findings: checked, then merged per field + value.
  const merged: Array<{ field: AIField; value: string; sources: AISource[]; why: string }> = [];
  (Array.isArray(out.findings) ? out.findings : []).slice(0, 120).forEach(f => {
    const field = FIELDS.includes(f?.field as AIField) ? (f.field as AIField) : null;
    const value = String(f?.value || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const sources = checkCitations(f?.citations, byId);
    if (!field || !value || !sources.length || !statedIn(value, sources)) { discarded++; return; }
    const cur = merged.find(m => m.field === field && norm(m.value) === norm(value));
    if (cur) cur.sources = mergeSources(cur.sources, sources);
    else merged.push({ field, value, sources, why: String(f?.why || '').replace(/\s+/g, ' ').trim().slice(0, 240) });
  });

  // Source comparison for single-valued fields: groups of the same value; 2+ groups from different sites = conflict.
  const comparisons: AIComparison[] = [];
  const conflicted = new Set<string>();
  SINGLE_VALUED.forEach(field => {
    // A value that is only a country ("Ghana") is compatible with any place, so it never creates a conflict.
    const all = merged.filter(m => m.field === field);
    const specific = all.filter(m => !countryOnly(m.value));
    const items = specific.length ? specific : all;
    if (!items.length) return;
    const groups: Array<{ value: string; sources: AISource[] }> = [];
    items.forEach(m => {
      const g = groups.find(x => sameValue(x.value, m.value));
      if (g) { g.sources = mergeSources(g.sources, m.sources); if (m.value.length > g.value.length) g.value = m.value; }
      else groups.push({ value: m.value, sources: [...m.sources] });
    });
    const allSites = new Set(groups.flatMap(g => Array.from(sitesOf(g.sources))));
    if (groups.length >= 2 && allSites.size >= 2) {
      comparisons.push({ id: hash('cmp', field), field, status: 'conflict', values: groups });
      items.forEach(m => conflicted.add(`${m.field}|${norm(m.value)}`));
    } else if (groups.length === 1 && sitesOf(groups[0].sources).size >= 2) {
      comparisons.push({ id: hash('cmp', field), field, status: 'consistent', values: groups });
    }
  });
  // Multi-valued fields: the same value confirmed by 2+ sites is listed as consistent too.
  merged.filter(m => !SINGLE_VALUED.includes(m.field) && sitesOf(m.sources).size >= 2)
    .forEach(m => comparisons.push({ id: hash('cmp', m.field, norm(m.value)), field: m.field, status: 'consistent', values: [{ value: m.value, sources: m.sources }] }));

  const findings: AIFinding[] = merged.slice(0, 60).map(m => {
    const existing = p.known[m.field];
    const inCase: AIFinding['inCase'] = !hasValue(existing) ? 'new' : sameValue(existing, m.value) || norm(existing).includes(norm(m.value)) ? 'same' : 'differs';
    const sites = sitesOf(m.sources).size;
    return {
      id: hash('f', m.field, norm(m.value)), field: m.field, value: m.value,
      confidence: conflicted.has(`${m.field}|${norm(m.value)}`) ? 'Uncertain' : confidenceOf(m.sources, byId, p.subjectNames),
      sources: m.sources, siteCount: sites,
      why: m.why || `Stated in ${sites} independent source${sites === 1 ? '' : 's'}.`,
      inCase, ...(hasValue(existing) && inCase === 'differs' ? { existing } : {})
    };
  });

  const timeline: AITimelineEvent[] = [];
  (Array.isArray(out.timeline) ? out.timeline : []).slice(0, 80).forEach(t => {
    const date = String(t?.date || '').trim().slice(0, 40);
    const event = String(t?.event || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const sources = checkCitations(t?.citations, byId);
    const years = date.match(/\b(1[89]\d{2}|20\d{2})\b/g) || [];
    const q = quotesText(sources);
    if (!date || !event || !sources.length || !years.length || !years.every(y => q.includes(y)) || !sentenceSupported(event, sources, p.subjectNames)) { discarded++; return; }
    const id = hash('t', date, norm(event));
    const cur = timeline.find(x => x.id === id);
    if (cur) { cur.sources = mergeSources(cur.sources, sources); return; }
    timeline.push({ id, date, event, confidence: 'Possible', sources, siteCount: 0 });
  });
  timeline.forEach(t => { t.siteCount = sitesOf(t.sources).size; t.confidence = confidenceOf(t.sources, byId, p.subjectNames); });
  timeline.sort((a, b) => a.date.localeCompare(b.date));

  const relationships: AIRelationship[] = [];
  (Array.isArray(out.relationships) ? out.relationships : []).slice(0, 80).forEach(r => {
    const from = String(r?.from || '').trim().slice(0, 120) || p.subject;
    const to = String(r?.to || '').trim().slice(0, 120);
    const relation = String(r?.relation || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    const toType = (TO_TYPES as readonly string[]).includes(String(r?.toType)) ? (r.toType as AIRelationship['toType']) : 'organization';
    const sources = checkCitations(r?.citations, byId);
    // Both sides must be named in one quote; for the subject, its own page counts as naming it.
    const ok = sources.filter(s => {
      const q = norm(s.quote);
      const fromIsSubject = p.subjectNames.some(n => sameValue(n, from)) || sameValue(from, p.subject);
      const fromNamed = significant(from).every(w => q.includes(w)) || (fromIsSubject && (byId.get(s.evidenceId)?.own || p.subjectNames.some(n => q.includes(norm(n)))));
      return fromNamed && significant(to).length > 0 && significant(to).every(w => q.includes(w));
    });
    if (!to || !relation || !ok.length || norm(to) === norm(from)) { discarded++; return; }
    const id = hash('r', norm(from), norm(to), norm(relation));
    const cur = relationships.find(x => x.id === id);
    if (cur) { cur.sources = mergeSources(cur.sources, ok); return; }
    relationships.push({ id, from, to, toType, relation, confidence: 'Possible', sources: ok, siteCount: 0 });
  });
  relationships.forEach(r => { r.siteCount = sitesOf(r.sources).size; r.confidence = confidenceOf(r.sources, byId, p.subjectNames); });

  // Summary: only sentences whose citations check out and whose names and numbers are in their quotes.
  const sentences: string[] = [];
  let summarySources: AISource[] = [];
  (Array.isArray(out.summary) ? out.summary : []).slice(0, 8).forEach(s => {
    const text = String(s?.text || '').replace(/\s+/g, ' ').trim().slice(0, 400);
    const sources = checkCitations(s?.citations, byId);
    if (!text || !sources.length || !sentenceSupported(text, sources, p.subjectNames)) { if (text) discarded++; return; }
    sentences.push(/[.!?]$/.test(text) ? text : `${text}.`);
    summarySources = mergeSources(summarySources, sources);
  });

  const missing: AIMissing[] = MISSING_FIELDS[p.entityKind].map(field => {
    const fs = findings.filter(f => f.field === field || (field === 'occupation' && f.field === 'role') || (field === 'organization' && f.field === 'membership'));
    const caseValue = p.known[field];
    const foundIn = new Set(fs.flatMap(f => Array.from(sitesOf(f.sources)))).size;
    return {
      field, label: FIELD_LABEL[field],
      status: hasValue(caseValue) ? 'in_case' : fs.length ? 'found' : 'not_found',
      ...(hasValue(caseValue) ? { caseValue } : {}), foundIn, findingIds: fs.map(f => f.id)
    };
  });

  const kinds = new Map<Evidence['kind'], number>();
  p.evidence.forEach(e => kinds.set(e.kind, (kinds.get(e.kind) || 0) + 1));
  const byKind: AIMetrics['byKind'] = Array.from(kinds, ([kind, count]) => ({ kind, count }));
  const metrics: AIMetrics = {
    evidenceReviewed: p.evidence.length, byKind, findings: findings.length,
    newInformation: findings.filter(f => f.inCase === 'new').length,
    conflicts: comparisons.filter(c => c.status === 'conflict').length,
    consistent: comparisons.filter(c => c.status === 'consistent').length,
    timeline: timeline.length, relationships: relationships.length, discarded
  };

  return {
    id: hash('a', meta.model, String(Date.now())), runAt: new Date().toISOString(), provider: meta.provider, model: meta.model,
    subject: p.subject, entityKind: p.entityKind, evidenceCount: p.evidence.length,
    summary: sentences.length ? { text: sentences.join(' '), sources: summarySources } : { text: 'Not enough evidence for a summary.', sources: [] },
    findings, timeline: timeline.slice(0, 40), relationships: relationships.slice(0, 40), comparisons: comparisons.slice(0, 30), missing, metrics
  };
}

// ─── Cost control: cache, one run at a time per case, daily cap per user ─────

const CACHE_TTL = 24 * 3600_000;
const cache = new Map<string, { at: number; analysis: AIAnalysis }>();
const inFlight = new Map<string, Promise<{ analysis: AIAnalysis; cached: boolean }>>();
const usage = new Map<string, { day: string; count: number }>();
const today = () => new Date().toISOString().slice(0, 10);
export const dailyLimit = () => Math.max(1, parseInt(process.env.AI_MAX_ANALYSES_PER_DAY || '20', 10) || 20);
export const usedToday = (uid: string) => (usage.get(uid)?.day === today() ? usage.get(uid)!.count : 0);

export function aiStatus(uid: string) {
  const provider = getProvider();
  return { configured: provider.configured(), provider: provider.name, model: provider.model, usedToday: usedToday(uid), dailyLimit: dailyLimit() };
}

export async function analyzeInvestigation(uid: string, inv: any): Promise<{ analysis: AIAnalysis; cached: boolean }> {
  const provider = getProvider();
  if (!provider.configured()) throw new AIError('not_configured', 'AI analysis is not set up on the server.');
  const prepared = prepareEvidence(inv);
  const caseKey = `${uid}|${String(inv?.id || '')}`;
  const running = inFlight.get(caseKey);
  if (running) return running;

  const key = createHash('sha1').update(JSON.stringify([PROMPT_VERSION, provider.model, prepared.subject, prepared.evidence])).digest('hex');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return { analysis: hit.analysis, cached: true };

  if (!prepared.evidence.length) {
    const analysis = buildAnalysis(prepared, {}, { provider: provider.name, model: 'none (no evidence)' });
    return { analysis, cached: false };
  }
  if (usedToday(uid) >= dailyLimit()) {
    throw new AIError('rate_limited', `Daily AI analysis limit reached (${dailyLimit()} per day). Try again tomorrow.`);
  }

  const run = (async () => {
    const started = Date.now();
    const { data, model } = await provider.generateJson<ModelOutput>(SYSTEM, buildPrompt(prepared), SCHEMA, { budgetMs: 100_000 });
    // Only analyses that produced an answer count towards the daily limit.
    usage.set(uid, { day: today(), count: usedToday(uid) + 1 });
    const analysis = buildAnalysis(prepared, data || {}, { provider: provider.name, model });
    console.log(`[ai] analysed ${prepared.evidence.length} evidence items with ${model} in ${Math.round((Date.now() - started) / 1000)}s: ${analysis.metrics.findings} findings, ${analysis.metrics.discarded} discarded`);
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), analysis });
    return { analysis, cached: false };
  })();
  inFlight.set(caseKey, run);
  try {
    return await run;
  } finally {
    inFlight.delete(caseKey);
  }
}
