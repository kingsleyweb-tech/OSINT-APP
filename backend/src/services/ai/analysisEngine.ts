/**
 * AI analysis of an investigation's collected evidence: one model request per analysis, then a
 * deterministic check of everything the model said.
 *
 * The model only proposes. A statement is kept only when its citations hold up:
 *   - the cited evidence exists and the quoted words really appear in it (no invented quotes, no URLs from
 *     the model — sources and links are always taken from the evidence itself);
 *   - a finding's value is written in its quotes (classifications such as the entity type, industry or a
 *     consolidated description must rest on quoted words and are marked "derived"); a dated event's date is
 *     in its quotes; a relationship's two sides are named in the same quote (or the quote is the subject's own
 *     profile); a leader's role, and a location's type (headquarters, branch, campus…), are in the quotes;
 *     a website or account is in the cited evidence.
 * Confidence is then set by rule from how many independent sites support the statement and how strong they
 * are (the organisation's own website, institutional records), never by the model. Values that differ
 * between sites are shown as a conflict; no winner is picked.
 */
import { createHash } from 'crypto';
import { AIError, getProvider } from './provider';
import { hasValue, prepareEvidence, siteOf, type PreparedEvidence } from './evidencePrep';
import type {
  AIAnalysis, AIComparison, AIConfidence, AIEventKind, AIField, AIFinding, AIMetrics, AIMissing, AIRelationship, AIResearchStep,
  AISource, AITimelineEvent, Evidence, SourceTier
} from './types';

const PERSON_FIELDS: AIField[] = [
  'occupation', 'role', 'employer', 'organization', 'membership', 'education', 'skill', 'language', 'location', 'nationality',
  'date_of_birth', 'contact', 'website', 'social_profile', 'alias', 'interest', 'other'
];
const ORG_FIELDS: AIField[] = [
  'official_name', 'alias', 'entity_type', 'industry', 'sector', 'description', 'mission', 'legal_status', 'founded', 'employees',
  'headquarters', 'location', 'parent', 'subsidiary', 'unit', 'affiliate', 'membership', 'product', 'service', 'program', 'project',
  'leadership', 'website', 'social_profile', 'contact', 'other'
];
const FIELDS: AIField[] = Array.from(new Set([...PERSON_FIELDS, ...ORG_FIELDS, 'founded', 'headquarters', 'industry', 'leadership'] as AIField[]));
const TO_TYPES = ['person', 'organization', 'group', 'event', 'location', 'website'] as const;
const EVENT_KINDS: AIEventKind[] = ['announcement', 'appointment', 'partnership', 'launch', 'event', 'project', 'award', 'statement', 'change', 'other'];

export const ENTITY_TYPES = [
  'Company', 'Organization', 'Association', 'University', 'College', 'School', 'Educational Institution', 'Government Agency', 'NGO',
  'Foundation', 'Military Organization', 'Hospital', 'Healthcare Institution', 'Professional Body', 'Research Institution',
  'Religious Organization', 'Sports Organization', 'Media Organization', 'Brand', 'International Organization', 'Other'
];

export const FIELD_LABEL: Record<AIField, string> = {
  occupation: 'Occupation', role: 'Role / job title', employer: 'Employer', organization: 'Organisation', membership: 'Membership / group',
  education: 'Education', skill: 'Skills', language: 'Languages', location: 'Location', nationality: 'Nationality', date_of_birth: 'Date of birth',
  contact: 'Public contact', website: 'Website', social_profile: 'Social profile', alias: 'Alias / other name', interest: 'Public interests',
  founded: 'Founded / established', headquarters: 'Headquarters', industry: 'Industry', leadership: 'Leadership', other: 'Other',
  official_name: 'Official name', entity_type: 'Entity type', sector: 'Sector / field', description: 'Description', mission: 'Mission / purpose',
  legal_status: 'Legal / organisational status', employees: 'Employees', parent: 'Parent organisation', subsidiary: 'Subsidiaries',
  unit: 'Divisions / departments / units', affiliate: 'Affiliates', product: 'Products', service: 'Services', program: 'Programmes', project: 'Projects'
};

/** Fields a subject has one value of at a time: different values from different sites are a conflict. */
const SINGLE_VALUED: AIField[] = ['nationality', 'date_of_birth', 'founded', 'headquarters', 'parent'];
/** A person's location is single-valued; an organisation can have many locations (branches, campuses…). */
const singleValued = (f: AIField, kind: 'person' | 'organization') => SINGLE_VALUED.includes(f) || (f === 'location' && kind === 'person');

const MISSING_FIELDS: Record<'person' | 'organization', AIField[]> = {
  person: ['occupation', 'employer', 'organization', 'education', 'location', 'contact', 'website', 'social_profile', 'alias', 'language', 'skill'],
  organization: [
    'official_name', 'entity_type', 'industry', 'sector', 'description', 'founded', 'headquarters', 'location', 'product', 'service',
    'leadership', 'website', 'social_profile', 'contact', 'parent', 'subsidiary', 'employees'
  ]
};
/** Classifications of the quoted words rather than copies of them. */
const DERIVED: AIField[] = ['entity_type', 'industry', 'sector', 'description', 'mission'];

// ─── Model request ──────────────────────────────────────────────────────────

const CIT = { type: 'ARRAY', items: { type: 'OBJECT', properties: { e: { type: 'STRING' }, quote: { type: 'STRING' } }, required: ['e', 'quote'] } };
const schemaFor = (fields: AIField[]) => ({
  type: 'OBJECT',
  properties: {
    summary: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, citations: CIT }, required: ['text', 'citations'] } },
    findings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { field: { type: 'STRING', enum: fields }, value: { type: 'STRING' }, detail: { type: 'STRING' }, citations: CIT, why: { type: 'STRING' } },
        required: ['field', 'value', 'citations', 'why']
      }
    },
    timeline: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { date: { type: 'STRING' }, event: { type: 'STRING' }, kind: { type: 'STRING', enum: EVENT_KINDS }, citations: CIT }, required: ['date', 'event', 'citations'] }
    },
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
});

const SYSTEM = `You are an OSINT evidence analyst. You read numbered evidence (E1, E2…) collected from public sources about one subject and extract only what the evidence states.

Rules — follow all of them:
1. Use only the evidence given. No outside knowledge, no guessing, no assumptions. Never invent names, addresses, websites, accounts, dates, products, people or events.
2. Every item must cite evidence ids with a quote copied word for word from that evidence's text (a short exact phrase, max 25 words). Never paraphrase inside a quote.
3. A finding's value must be written with the words of its quote (e.g. quote "software developer at Hubtel" → occupation "software developer", employer "Hubtel"). One value per finding: list products, services, units or leaders as separate findings.
4. Only report facts about the subject. Evidence about a different person or organisation with a similar name must be ignored.
5. Two names appearing on the same page is NOT a relationship. Report a relationship only when a quote states how they are related.
6. Timeline events need a date (year at least) written in the quote. Group articles about the same event into one event with several citations. "kind" says what it is.
7. If the evidence does not support something, leave it out. Empty lists are fine. Do not fill a field just to complete it.
8. "why": one short sentence stating which evidence supports the item (no hidden reasoning).
9. Summary: 2–6 short, plain sentences of the most important supported facts, each with citations. Each sentence must stand alone: name the subject instead of writing "he", "she" or "it", and write names exactly as the evidence spells them.
10. Prefer the strongest sources: the subject's official website, then government / institutional records, the subject's own profiles, business listings, reputable news, directories, other pages.`;

const FIELD_GUIDE: Record<'person' | 'organization', string> = {
  person: `Field guide (person):
- occupation / role: what the person does or their job title. employer: who they work for. organization / membership: bodies they belong to. education: schools and degrees.
- location: places tied to the person; "detail" = Residence, Hometown, Work location, Event location, Profile location or Location mentioned (use a specific type only when the quote says it).
- alias: other names or display names the sources use. contact: public email or phone. website / social_profile: the URL as written in the evidence; "detail" = platform.
- For usernames: profiles of the same handle are only the same person when a quote links them (same name, a bio link, the same website).`,
  organization: `Field guide (organisation):
- official_name: the full official name. alias: abbreviations, former names, other names ("detail": Abbreviation, Former name or Other name).
- entity_type: one of ${ENTITY_TYPES.join(', ')} — the most specific type the quotes support (e.g. membership, members and a council → Association, even without the word in the name).
- industry / sector: a short label (2–4 words) built from the quoted words (e.g. "operates in the electricity distribution sector" → industry "Electricity distribution", sector "Energy").
- description: 1–2 plain sentences on what the organisation is and does, using only facts in the cited quotes; cite every source used. mission: its stated mission or purpose.
- legal_status: e.g. statutory corporation, public limited company, registered charity — only as stated. founded: the year or date founded/established. employees: the number as stated.
- headquarters: only when the quote says headquarters, head office, main office or "based in". location: other places — "detail" = Main office, Branch, Campus, Regional office, Office, Facility, Registered address, Event location or Location mentioned (a specific type only when the quote says it; an address alone is not the headquarters).
- parent, subsidiary, unit (divisions, departments, faculties, schools, arms), affiliate: one per finding.
- product: goods, software or devices it makes or sells. service: what it provides to customers or the public. program: academic programmes, degrees and courses it offers, or an ongoing programme / initiative it runs. project: a specific project it carries out. One per finding — not random keywords.
- leadership: value = the person's name; "detail" = the role exactly as written (CEO, Managing Director, Vice-Chancellor, Commander…). Write "Former …" when the quote says former, ex- or previous. An old article does not make someone the current leader.
- website: the official website URL; social_profile: the URL of an account of the organisation, as written in the evidence ("detail" = platform). contact: a public phone number or email.`
};

/** Changing the prompt or rules changes this, so cached answers from older rules are not reused. */
const PROMPT_VERSION = 7;

const DEGREE = /\b(b\.?sc|b\.?a|m\.?sc|mba|m\.?phil|ph\.?d|bachelor|master'?s?|diploma|degree|certificate (course|programme)|programmes?|programs?|courses?|hnd)\b/i;
const COPYRIGHT = /copyright|©|all rights reserved/i;

function buildPrompt(p: PreparedEvidence): string {
  const lines = p.evidence.map(e => `[${e.id}] ${e.kind}${e.own ? ' (subject\'s own page)' : ''} · ${e.source}${e.date ? ` · ${e.date}` : ''}\nTitle: ${e.title || '—'}\nText: ${e.text}`);
  const fields = p.entityKind === 'organization' ? ORG_FIELDS : PERSON_FIELDS;
  const also = p.aliases.length > 1 ? ` Also written as: ${p.aliases.slice(1).map(a => `"${a}"`).join(', ')}.` : '';
  return `Subject: "${p.subject}" (${p.entityKind}).${also}\nAllowed fields: ${fields.join(', ')}.\n${FIELD_GUIDE[p.entityKind]}\n\nEVIDENCE\n\n${lines.join('\n\n')}`;
}

// ─── Validation helpers ─────────────────────────────────────────────────────

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'has', 'have', 'its', 'their', 'his', 'her', 'of', 'at', 'in', 'on', 'a', 'an', 'to', 'as', 'by', 'is', 'or']);
const significant = (s: string) => norm(s).split(' ').filter(w => w.length > 1 && !STOP.has(w));
const hash = (...parts: string[]) => createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);
const TIER_RANK: Record<SourceTier, number> = { official: 0, institutional: 1, 'own-profile': 2, listing: 3, news: 4, directory: 5, other: 6 };

interface RawCitation { e?: unknown; quote?: unknown }

/** Keep only citations whose evidence exists and whose quote (each part around "…") appears in its text. */
function checkCitations(raw: unknown, byId: Map<string, Evidence>): AISource[] {
  if (!Array.isArray(raw)) return [];
  const out: AISource[] = [];
  const seen = new Set<string>();
  raw.slice(0, 10).forEach((c: RawCitation) => {
    const ev = byId.get(String(c?.e || '').trim().toUpperCase());
    const quote = String(c?.quote || '').trim().slice(0, 400);
    if (!ev || norm(quote).length < 3) return;
    const text = norm(`${ev.title} ${ev.text}`);
    const pieces = quote.split(/\.{3}|…/).map(norm).filter(Boolean);
    if (!pieces.length || !pieces.every(p => text.includes(p))) return;
    const key = `${ev.id}|${norm(quote)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      evidenceId: ev.id, title: ev.title || ev.source, source: ev.source, url: ev.url, tier: ev.tier,
      quote: quote.length > 220 ? `${quote.slice(0, 217)}…` : quote, ...(ev.date ? { date: ev.date } : {})
    });
  });
  // Strongest sources first.
  return out.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
}

const quotesText = (s: AISource[]) => norm(s.map(x => x.quote).join(' '));
/** Every significant word of `value` is in the quotes (emails/phones compared without punctuation). */
const statedIn = (value: string, sources: AISource[]) => {
  const words = significant(value);
  const q = ` ${quotesText(sources)} `;
  return words.length > 0 && words.every(w => q.includes(` ${w} `) || q.includes(w));
};
/** Share of the value's significant words found in the quotes. */
const shareIn = (value: string, sources: AISource[]) => {
  const words = significant(value);
  const q = ` ${quotesText(sources)} `;
  return words.length ? words.filter(w => q.includes(` ${w} `) || (w.length > 4 && q.includes(w.slice(0, -2)))).length / words.length : 0;
};
/** Numbers and capitalised names in a sentence also appear in its quotes or the subject's name. */
function sentenceSupported(text: string, sources: AISource[], subjectNames: string[]): boolean {
  const q = `${quotesText(sources)} ${norm(sources.map(s => `${s.title} ${s.source}`).join(' '))} ${norm(subjectNames.join(' '))}`;
  const tokens = text.match(/\b\d{2,}\b|(?<!^|[.!?]\s)\b[A-Z][\p{L}'-]{2,}/gu) || [];
  return tokens.every(t => q.includes(norm(t)));
}
const sitesOf = (s: AISource[]) => new Set(s.map(x => (x.url ? siteOf(x.url) : `record:${x.evidenceId}`)));

/** The cited page is the subject's own, or names the subject (a full name / alias, or two parts of the name). */
/**
 * Organisation facts that belong to one organisation (its parent, leaders, offices, founding…): a search snippet
 * often lists several organisations, so the quote itself or the page's title must name the subject, unless the
 * page is the organisation's own.
 */
const ABOUT_FIELDS: AIField[] = ['parent', 'subsidiary', 'affiliate', 'unit', 'leadership', 'founded', 'headquarters', 'location', 'legal_status',
  'employees', 'official_name', 'product', 'service', 'program', 'project', 'contact', 'website', 'social_profile'];
function aboutSubject(s: AISource, byId: Map<string, Evidence>, p: Pick<PreparedEvidence, 'subjectNames' | 'aliases'>): boolean {
  const ev = byId.get(s.evidenceId);
  if (!ev) return false;
  if (ev.own || ev.tier === 'official') return true;
  const parts = p.subjectNames.slice(1).map(norm).filter(Boolean);
  return [s.quote, ev.title].some(t => {
    const text = ` ${norm(t)} `;
    return p.aliases.some(a => norm(a).length >= 2 && text.includes(` ${norm(a)} `)) || (parts.length > 0 && parts.filter(w => text.includes(` ${w} `)).length >= Math.min(2, parts.length));
  });
}

function namesSubject(s: AISource[], byId: Map<string, Evidence>, p: Pick<PreparedEvidence, 'subjectNames' | 'aliases'>): boolean {
  return s.some(x => {
    const ev = byId.get(x.evidenceId);
    if (!ev) return false;
    if (ev.own) return true;
    const text = ` ${norm(`${ev.title} ${ev.text}`)} `;
    if (p.aliases.some(a => norm(a).length >= 2 && text.includes(` ${norm(a)} `))) return true;
    const parts = p.subjectNames.slice(1).map(norm).filter(Boolean);
    return parts.filter(w => text.includes(` ${w} `)).length >= 2;
  });
}

/**
 * Confidence by rule:
 *   Verified        — 3+ independent sites, or 2+ including one marked Validated or a strong source
 *   Strong evidence — 2 independent sites, or the organisation's own website / an institutional record
 *                     (government, education, Wikidata, Google's knowledge panel) that names the subject
 *   Possible        — 1 site whose page names the subject (or is the subject's own page)
 *   Mention only    — 1 site whose page does not name the subject
 *   Uncertain       — sites disagree (set by the comparison step)
 */
export function confidenceOf(sources: AISource[], byId: Map<string, Evidence>, p: Pick<PreparedEvidence, 'subjectNames' | 'aliases'>): AIConfidence {
  const sites = sitesOf(sources).size;
  const validated = sources.some(s => byId.get(s.evidenceId)?.level === 'validated');
  const strong = sources.some(s => s.tier === 'official' || (s.tier === 'institutional' && namesSubject([s], byId, p)));
  if (sites >= 3 || (sites >= 2 && (validated || strong))) return 'Verified';
  if (sites >= 2 || strong) return 'Strong evidence';
  return namesSubject(sources, byId, p) ? 'Possible' : 'Mention only';
}

const mergeSources = (a: AISource[], b: AISource[]) => {
  const out = [...a];
  b.forEach(s => { if (!out.some(x => x.evidenceId === s.evidenceId && norm(x.quote) === norm(s.quote))) out.push(s); });
  return out.sort((x, y) => TIER_RANK[x.tier] - TIER_RANK[y.tier]).slice(0, 8);
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

/** Location types, each with the words a quote must contain for it (otherwise "Location mentioned"). */
const LOCATION_TYPES: Array<[string, RegExp]> = [
  ['Headquarters', /\b(head ?quarter(s|ed)?|hq|head office|headoffice)\b/],
  ['Main office', /\bmain (office|campus|branch)\b/],
  ['Registered address', /\bregistered (office|address)\b/],
  ['Regional office', /\bregional (office|branch|headquarters|directorate)\b/],
  ['Branch', /\bbranch(es)?\b/],
  ['Campus', /\bcampus(es)?\b/],
  ['Office', /\boffices?\b/],
  ['Facility', /\b(facilit(y|ies)|plant|factory|warehouse|depot|station|base|barracks|hospital|clinic|centre|center)\b/],
  ['Event location', /\b(held|hosted|took place|venue|conference|ceremony|summit|event|launch(ed)?)\b/],
  ['Residence', /\b(lives|living|resides|resident|based in|based at|based)\b/],
  ['Hometown', /\b(hometown|native of|hails from|born in|comes from|is from)\b/],
  ['Work location', /\b(works|working|employed|work)\b/],
  ['Profile location', /\blocation\b/]
];
const HQ_WORDS = /\b(head ?quarter(s|ed)?|hq|head office|headoffice|main office|based in|based at|secretariat)\b/;
const FORMER = /\b(former|ex|erstwhile|previous|previously|past|retired|outgoing|late)\b/;
const ROLE_WORDS = /\b(ceo|chief executive|managing director|md|director[- ]general|director|president|vice[- ]president|chair(man|woman|person)?|founder|co-?founder|rector|vice[- ]chancellor|chancellor|principal|head|registrar|dean|commander|chief of (the )?\w+ staff|chief|secretary[- ]general|general secretary|executive secretary|commissioner|minister|governor|board member|trustee|manager|owner|partner|pastor|bishop|imam|coach|editor|publisher|lead)\b/;

const PLATFORMS: Array<[RegExp, string]> = [
  [/linkedin\.com/, 'LinkedIn'], [/facebook\.com|fb\.com/, 'Facebook'], [/(^|\.)x\.com|twitter\.com/, 'X'], [/instagram\.com/, 'Instagram'],
  [/youtube\.com|youtu\.be/, 'YouTube'], [/tiktok\.com/, 'TikTok'], [/github\.com/, 'GitHub'], [/threads\.net/, 'Threads'], [/t\.me|telegram/, 'Telegram'],
  [/reddit\.com/, 'Reddit'], [/medium\.com/, 'Medium'], [/wa\.me|whatsapp/, 'WhatsApp']
];
const hostOf = (u: string) => { try { return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const looksLikeUrl = (v: string) => /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v.trim());

interface Checked { field: AIField; value: string; detail?: string; derived?: boolean }

/** Field-specific checks on top of the citation check. Returns null when the value is not supported. */
function checkFinding(field: AIField, value: string, detail: string, sources: AISource[], byId: Map<string, Evidence>, p: PreparedEvidence): Checked | null {
  const q = ` ${quotesText(sources)} `;
  switch (field) {
    case 'entity_type': {
      const type = ENTITY_TYPES.find(t => norm(t) === norm(value));
      return type ? { field, value: type, derived: true } : null;
    }
    case 'industry': case 'sector':
      return shareIn(value, sources) > 0 ? { field, value, derived: !statedIn(value, sources) } : null;
    case 'description': case 'mission':
      return shareIn(value, sources) >= 0.5 && sentenceSupported(value, sources, p.subjectNames) ? { field, value, derived: true } : null;
    case 'website': case 'social_profile': {
      if (!looksLikeUrl(value)) return null;
      const host = hostOf(value);
      const path = norm(value.replace(/^https?:\/\/(www\.)?/i, '').replace(/[?#].*$/, ''));
      // The address must be in the cited evidence itself (its link or its text): never a URL the model made up.
      const inEvidence = sources.some(s => {
        const ev = byId.get(s.evidenceId);
        return ev && (norm(`${ev.text} ${ev.url}`).includes(path) || (field === 'website' && hostOf(ev.url) === host));
      });
      if (!host || !inEvidence) return null;
      const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      const platform = PLATFORMS.find(([re]) => re.test(host))?.[1];
      if (field === 'social_profile' && !platform) return null;
      const official = sources.some(s => s.tier === 'official');
      const ownProfile = sources.some(s => s.tier === 'own-profile' && hostOf(s.url) === host);
      const basis = official ? 'linked from the official website' : ownProfile ? 'the account’s own page' : 'mentioned by a source — not confirmed as official';
      return { field, value: url, detail: field === 'social_profile' ? `${platform} · ${basis}` : basis[0].toUpperCase() + basis.slice(1) };
    }
    case 'leadership': {
      if (!statedIn(value, sources)) return null;
      const role = detail.replace(/^former\s+/i, '').trim();
      let stated = role && statedIn(role, sources) ? role : '';
      if (!stated) stated = (q.match(ROLE_WORDS)?.[0] || '').trim();
      if (!stated) return null;
      stated = stated.replace(/\b\w/g, c => c.toUpperCase()).replace(/\bCeo\b/, 'CEO').replace(/\bMd\b/, 'MD');
      return { field, value, detail: FORMER.test(q) ? `Former ${stated}` : stated };
    }
    case 'headquarters':
      if (!statedIn(value, sources)) return null;
      if (HQ_WORDS.test(q)) return { field, value, detail: 'Headquarters' };
      // An address that the quote does not call the headquarters is only a location.
      return { field: 'location', value, detail: 'Location mentioned' };
    case 'location': {
      if (!statedIn(value, sources)) return null;
      const type = locationType(detail, q, p);
      if (type === 'Headquarters' && p.entityKind === 'organization') return { field: 'headquarters', value, detail: type };
      return { field, value, detail: type };
    }
    default:
      return statedIn(value, sources) ? { field, value, ...(detail && statedIn(detail, sources) ? { detail } : {}) } : null;
  }
}

/** The location type the model gave, if its words are in the quotes; otherwise "Location mentioned". */
function locationType(detail: string, q: string, p: PreparedEvidence): string {
  const person = ['Residence', 'Hometown', 'Work location', 'Profile location'];
  const allowed = LOCATION_TYPES.filter(([t]) => (p.entityKind === 'person') === person.includes(t) || t === 'Event location' || t === 'Office');
  const asked = allowed.find(([t]) => norm(t) === norm(detail));
  if (asked && asked[1].test(q)) return asked[0];
  return 'Location mentioned';
}

// ─── Targeted searches for missing fields ───────────────────────────────────

/** The one search that best covers each missing field (shared searches are merged; run only on request). */
const RESEARCH: Record<'person' | 'organization', Array<{ fields: AIField[]; label: string; engine: AIResearchStep['engine']; q: (n: string) => string }>> = {
  organization: [
    { fields: ['headquarters', 'location', 'contact'], label: 'Headquarters, offices and contact', engine: 'google', q: n => `"${n}" (headquarters OR "head office" OR address OR contact)` },
    { fields: ['leadership'], label: 'Leadership', engine: 'google', q: n => `"${n}" (CEO OR "managing director" OR director OR president OR chairman OR founder OR "vice-chancellor" OR rector OR principal OR commander)` },
    { fields: ['product', 'service'], label: 'Products and services', engine: 'google', q: n => `"${n}" (products OR services OR programmes OR solutions)` },
    { fields: ['official_name', 'entity_type', 'industry', 'sector', 'description', 'founded', 'employees'], label: 'What it is, founding and size', engine: 'google', q: n => `"${n}" (about OR founded OR established OR "is a" OR employees)` },
    { fields: ['parent', 'subsidiary'], label: 'Parent and subsidiaries', engine: 'google', q: n => `"${n}" (subsidiary OR "parent company" OR "owned by" OR "a division of")` },
    { fields: ['website', 'social_profile'], label: 'Official website and accounts', engine: 'google', q: n => `"${n}" official website` }
  ],
  person: [
    { fields: ['occupation', 'employer', 'organization'], label: 'Work and organisations', engine: 'google', q: n => `"${n}" (works OR CEO OR director OR manager OR lecturer OR engineer OR officer OR founder)` },
    { fields: ['education'], label: 'Education', engine: 'google', q: n => `"${n}" (university OR college OR graduated OR alumni OR school)` },
    { fields: ['location'], label: 'Location', engine: 'google', q: n => `"${n}" (lives OR based OR "from" OR hometown)` },
    { fields: ['website', 'social_profile', 'contact', 'alias'], label: 'Website, accounts and contact', engine: 'google', q: n => `"${n}" (profile OR website OR contact)` }
  ]
};
const NEWS_STEP = { label: 'Recent activities (news)', engine: 'bing_news' as const, q: (n: string) => `"${n}"` };

export function researchSteps(p: Pick<PreparedEvidence, 'subject' | 'entityKind'>, fields: AIField[], wantNews: boolean): AIResearchStep[] {
  const steps: AIResearchStep[] = RESEARCH[p.entityKind]
    .filter(r => r.fields.some(f => fields.includes(f)))
    .map(r => ({ id: hash('rs', r.label), fields: r.fields.filter(f => fields.includes(f)), label: r.label, engine: r.engine, query: r.q(p.subject) }));
  if (wantNews) steps.push({ id: hash('rs', NEWS_STEP.label), fields: [], label: NEWS_STEP.label, engine: NEWS_STEP.engine, query: NEWS_STEP.q(p.subject) });
  return steps;
}

// ─── Analysis ───────────────────────────────────────────────────────────────

interface ModelOutput {
  summary?: Array<{ text?: string; citations?: unknown }>;
  findings?: Array<{ field?: string; value?: string; detail?: string; citations?: unknown; why?: string }>;
  timeline?: Array<{ date?: string; event?: string; kind?: string; citations?: unknown }>;
  relationships?: Array<{ from?: string; to?: string; toType?: string; relation?: string; citations?: unknown }>;
}

const newestDate = (s: AISource[]) => s.map(x => x.date).filter((d): d is string => Boolean(d))
  .sort((a, b) => (Date.parse(b) || 0) - (Date.parse(a) || 0))[0];

/** Validates the model's output against the evidence and builds the analysis (no model call here). */
export function buildAnalysis(p: PreparedEvidence, out: ModelOutput, meta: { provider: string; model: string }): AIAnalysis {
  const byId = new Map(p.evidence.map(e => [e.id, e] as const));
  const allowed = p.entityKind === 'organization' ? ORG_FIELDS : PERSON_FIELDS;
  let discarded = 0;

  // Findings: checked, then merged per field + value (a phone number written differently is the same value).
  const valueKey = (field: AIField, v: string) => {
    const digits = v.replace(/\D/g, '');
    return field === 'contact' && !/@/.test(v) && digits.length >= 7 ? `tel:${digits.slice(-9)}` : norm(v);
  };
  const merged: Array<{ field: AIField; value: string; detail?: string; derived?: boolean; sources: AISource[]; why: string }> = [];
  (Array.isArray(out.findings) ? out.findings : []).slice(0, 160).forEach(f => {
    const asked = (allowed.includes(f?.field as AIField) ? f.field : null) as AIField | null;
    const value = String(f?.value || '').replace(/\s+/g, ' ').trim().slice(0, asked === 'description' || asked === 'mission' ? 420 : 160);
    const detail = String(f?.detail || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const cited = checkCitations(f?.citations, byId);
    const sources = p.entityKind === 'organization' && asked && ABOUT_FIELDS.includes(asked) ? cited.filter(s => aboutSubject(s, byId, p)) : cited;
    const checked = asked && value && sources.length ? checkFinding(asked, value, detail, sources, byId, p) : null;
    if (!checked) { discarded++; return; }
    // A degree or course is a programme, not a product.
    if (checked.field === 'product' && DEGREE.test(checked.value)) checked.field = 'program';
    const cur = merged.find(m => m.field === checked.field && valueKey(m.field, m.value) === valueKey(checked.field, checked.value));
    if (cur) { cur.sources = mergeSources(cur.sources, sources); if (!cur.detail && checked.detail) cur.detail = checked.detail; return; }
    merged.push({ ...checked, sources, why: String(f?.why || '').replace(/\s+/g, ' ').trim().slice(0, 240) });
  });

  // Source comparison for single-valued fields: groups of the same value; 2+ groups from different sites = conflict.
  const comparisons: AIComparison[] = [];
  const conflicted = new Set<string>();
  FIELDS.filter(f => singleValued(f, p.entityKind)).forEach(field => {
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
  merged.filter(m => !singleValued(m.field, p.entityKind) && sitesOf(m.sources).size >= 2)
    .forEach(m => comparisons.push({ id: hash('cmp', m.field, norm(m.value)), field: m.field, status: 'consistent', values: [{ value: m.value, sources: m.sources }] }));

  const findings: AIFinding[] = merged.slice(0, 90).map(m => {
    const existing = p.known[m.field];
    // The app may send several values for a field, separated by " | " (an organisation's products, leaders…).
    const held = hasValue(existing) ? String(existing).split(' | ').filter(Boolean) : [];
    const matches = held.some(x => sameValue(x, m.value) || norm(x).includes(norm(m.value)) || (m.field === 'website' && norm(x).includes(norm(hostOf(m.value)))));
    // An organisation's list fields take more values: a value not yet listed is new, not a disagreement.
    const inCase: AIFinding['inCase'] = !held.length ? 'new' : matches ? 'same'
      : p.entityKind === 'organization' && !singleValued(m.field, p.entityKind) ? 'new' : 'differs';
    const sites = sitesOf(m.sources).size;
    const asOf = newestDate(m.sources);
    return {
      id: hash('f', m.field, norm(m.value)), field: m.field, value: m.value,
      ...(m.detail ? { detail: m.detail } : {}), ...(m.derived ? { derived: true } : {}), ...(asOf ? { asOf } : {}),
      confidence: conflicted.has(`${m.field}|${norm(m.value)}`) ? 'Uncertain' : confidenceOf(m.sources, byId, p),
      sources: m.sources, siteCount: sites,
      why: m.why || `Stated in ${sites} independent source${sites === 1 ? '' : 's'}.`,
      inCase, ...(hasValue(existing) && inCase === 'differs' ? { existing } : {})
    };
  });

  const timeline: AITimelineEvent[] = [];
  (Array.isArray(out.timeline) ? out.timeline : []).slice(0, 80).forEach(t => {
    const date = String(t?.date || '').trim().slice(0, 40);
    const event = String(t?.event || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const kind = EVENT_KINDS.includes(t?.kind as AIEventKind) ? (t.kind as AIEventKind) : 'other';
    const sources = checkCitations(t?.citations, byId);
    const years = date.match(/\b(1[89]\d{2}|20\d{2})\b/g) || [];
    const q = quotesText(sources);
    if (!date || !event || !sources.length || !years.length || !years.every(y => q.includes(y)) || !sentenceSupported(event, sources, p.subjectNames)) { discarded++; return; }
    // A page footer ("© 2025 … All rights reserved") is not an event.
    if (COPYRIGHT.test(event) || sources.every(s => COPYRIGHT.test(s.quote))) { discarded++; return; }
    // The same event reported by several articles is one event (same year and mostly the same words).
    const cur = timeline.find(x => x.date.slice(0, 4) === date.slice(0, 4) && overlap(x.event, event) >= 0.6);
    if (cur) { cur.sources = mergeSources(cur.sources, sources); return; }
    timeline.push({ id: hash('t', date, norm(event)), date, event, kind, confidence: 'Possible', sources, siteCount: 0 });
  });
  timeline.forEach(t => { t.siteCount = sitesOf(t.sources).size; t.confidence = confidenceOf(t.sources, byId, p); });
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
      const fromIsSubject = p.subjectNames.some(n => sameValue(n, from)) || p.aliases.some(a => sameValue(a, from)) || sameValue(from, p.subject);
      const fromNamed = significant(from).every(w => q.includes(w))
        || (fromIsSubject && (byId.get(s.evidenceId)?.own || [...p.aliases, ...p.subjectNames].some(n => q.includes(norm(n)))));
      return fromNamed && significant(to).length > 0 && significant(to).every(w => q.includes(w));
    });
    if (!to || !relation || !ok.length || norm(to) === norm(from)) { discarded++; return; }
    const id = hash('r', norm(from), norm(to), norm(relation));
    const cur = relationships.find(x => x.id === id);
    if (cur) { cur.sources = mergeSources(cur.sources, ok); return; }
    relationships.push({ id, from, to, toType, relation, confidence: 'Possible', sources: ok, siteCount: 0 });
  });
  relationships.forEach(r => { r.siteCount = sitesOf(r.sources).size; r.confidence = confidenceOf(r.sources, byId, p); });

  // Summary: only sentences whose citations check out and whose names and numbers are in their quotes.
  const sentences: string[] = [];
  let summarySources: AISource[] = [];
  (Array.isArray(out.summary) ? out.summary : []).slice(0, 8).forEach(s => {
    const text = String(s?.text || '').replace(/\s+/g, ' ').trim().slice(0, 400);
    const sources = checkCitations(s?.citations, byId);
    if (!text || !sources.length || !sentenceSupported(text, sources, [...p.subjectNames, ...p.aliases])) { if (text) discarded++; return; }
    sentences.push(/[.!?]$/.test(text) ? text : `${text}.`);
    summarySources = mergeSources(summarySources, sources);
  });

  const related = (field: AIField, f: AIField) => f === field || (field === 'occupation' && f === 'role') || (field === 'organization' && f === 'membership');
  const missing: AIMissing[] = MISSING_FIELDS[p.entityKind].map(field => {
    const fs = findings.filter(f => related(field, f.field));
    const caseValue = p.known[field];
    const foundIn = new Set(fs.flatMap(f => Array.from(sitesOf(f.sources)))).size;
    return {
      field, label: FIELD_LABEL[field],
      status: hasValue(caseValue) ? 'in_case' : fs.length ? 'found' : 'not_found',
      ...(hasValue(caseValue) ? { caseValue } : {}), foundIn, findingIds: fs.map(f => f.id)
    };
  });
  const research = researchSteps(p, missing.filter(m => m.status === 'not_found').map(m => m.field), timeline.length === 0);

  const kinds = new Map<Evidence['kind'], number>();
  p.evidence.forEach(e => kinds.set(e.kind, (kinds.get(e.kind) || 0) + 1));
  const byKind: AIMetrics['byKind'] = Array.from(kinds, ([kind, count]) => ({ kind, count }));
  const tiers = new Map<SourceTier, { count: number; sites: Set<string> }>();
  p.evidence.forEach(e => {
    const t = tiers.get(e.tier) || { count: 0, sites: new Set<string>() };
    t.count++;
    if (e.url) t.sites.add(siteOf(e.url));
    tiers.set(e.tier, t);
  });
  const coverage = Array.from(tiers, ([tier, t]) => ({ tier, count: t.count, sites: t.sites.size })).sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
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
    findings, timeline: timeline.slice(0, 40), relationships: relationships.slice(0, 40), comparisons: comparisons.slice(0, 40), missing,
    research, coverage, metrics
  };
}

/** Share of the shorter text's significant words that the other contains. */
function overlap(a: string, b: string): number {
  const x = new Set(significant(a)), y = new Set(significant(b));
  const [s, l] = x.size <= y.size ? [x, y] : [y, x];
  if (!s.size) return 0;
  let n = 0;
  s.forEach(w => { if (l.has(w)) n++; });
  return n / s.size;
}

// ─── Cost control: cache, one run at a time per case, daily cap per user ─────

const CACHE_TTL = 24 * 3600_000;
/** The model's (unchecked) answer per evidence set; the analysis is rebuilt from it with the case's current state. */
const cache = new Map<string, { at: number; data: ModelOutput; model: string }>();
const inFlight = new Map<string, Promise<{ analysis: AIAnalysis; cached: boolean }>>();
const usage = new Map<string, { day: string; count: number }>();
const today = () => new Date().toISOString().slice(0, 10);
export const dailyLimit = () => Math.max(1, parseInt(process.env.AI_MAX_ANALYSES_PER_DAY || '20', 10) || 20);
export const usedToday = (uid: string) => (usage.get(uid)?.day === today() ? usage.get(uid)!.count : 0);

export function aiStatus(uid: string) {
  const provider = getProvider();
  return { configured: provider.configured(), provider: provider.name, model: provider.model, usedToday: usedToday(uid), dailyLimit: dailyLimit() };
}

export async function analyzeInvestigation(uid: string, inv: any, known?: Record<string, string | null>): Promise<{ analysis: AIAnalysis; cached: boolean }> {
  const provider = getProvider();
  if (!provider.configured()) throw new AIError('not_configured', 'AI analysis is not set up on the server.');
  const prepared = prepareEvidence(inv, known);
  const caseKey = `${uid}|${String(inv?.id || '')}`;
  const running = inFlight.get(caseKey);
  if (running) return running;

  const key = createHash('sha1').update(JSON.stringify([PROMPT_VERSION, provider.model, prepared.subject, prepared.aliases, prepared.evidence])).digest('hex');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return { analysis: buildAnalysis(prepared, hit.data, { provider: provider.name, model: hit.model }), cached: true };
  }

  if (!prepared.evidence.length) {
    const analysis = buildAnalysis(prepared, {}, { provider: provider.name, model: 'none (no evidence)' });
    return { analysis, cached: false };
  }
  if (usedToday(uid) >= dailyLimit()) {
    throw new AIError('rate_limited', `Daily AI analysis limit reached (${dailyLimit()} per day). Try again tomorrow.`);
  }

  const run = (async () => {
    const started = Date.now();
    const fields = prepared.entityKind === 'organization' ? ORG_FIELDS : PERSON_FIELDS;
    const { data, model } = await provider.generateJson<ModelOutput>(SYSTEM, buildPrompt(prepared), schemaFor(fields), { budgetMs: 110_000 });
    // Only analyses that produced an answer count towards the daily limit.
    usage.set(uid, { day: today(), count: usedToday(uid) + 1 });
    const analysis = buildAnalysis(prepared, data || {}, { provider: provider.name, model });
    console.log(`[ai] analysed ${prepared.evidence.length} evidence items with ${model} in ${Math.round((Date.now() - started) / 1000)}s: ${analysis.metrics.findings} findings, ${analysis.metrics.discarded} discarded`);
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), data: data || {}, model });
    return { analysis, cached: false };
  })();
  inFlight.set(caseKey, run);
  try {
    return await run;
  } finally {
    inFlight.delete(caseKey);
  }
}
