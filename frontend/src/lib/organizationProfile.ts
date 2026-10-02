/**
 * The organisation profile: every fact any source gave about the organisation, cross-checked.
 *
 * Pipeline: search → sources (Google knowledge panel, Wikidata, Google Maps, Google, Google News and DuckDuckGo results, social
 * platforms, the official website) → claims (one fact from one source, with its URL and words) → grouped by
 * field and value → confidence = number of independent sources that agree → conflicts shown, never resolved
 * silently. Nothing is inferred: a field no source gives is simply empty ("Not found").
 */
import type { Investigation, OrgClaim, OrgField } from '../types/investigation';
import { isCountryName } from './locationEvidence';

/** Sections of the Organisation tab (also linked from the Overview). */
export type OrgSection = 'summary' | 'locations' | 'products' | 'people' | 'online' | 'news' | 'activities' | 'sources';

export const ORG_SECTIONS: Array<{ key: OrgSection; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'locations', label: 'Headquarters & locations' },
  { key: 'products', label: 'Products & services' },
  { key: 'people', label: 'Leadership' },
  { key: 'online', label: 'Website & online presence' },
  { key: 'news', label: 'News & media' },
  { key: 'activities', label: 'Activities & events' },
  { key: 'sources', label: 'Sources & verification' }
];

export interface Claim extends OrgClaim {
  /** Independence key: the same site or the same database counts once. */
  family: string;
}

export interface FactGroup {
  field: OrgField;
  value: string;
  claims: Claim[];
  /** Distinct source labels. */
  sources: string[];
  /** Number of independent sources that agree. */
  independent: number;
  roles: string[];
}

export const FIELD_LABEL: Record<OrgField, string> = {
  official_name: 'Official name', alt_name: 'Alternative names', type: 'Organisation type', industry: 'Industry',
  sector: 'Sector / field', description: 'Description', founded: 'Founded / established', headquarters: 'Headquarters',
  country: 'Country', address: 'Address', website: 'Official website', phone: 'Phone', email: 'Email', hours: 'Opening hours',
  coordinates: 'Coordinates', person: 'People', product: 'Products', service: 'Services', social: 'Online accounts',
  parent: 'Parent organisation', subsidiary: 'Subsidiaries', unit: 'Units / divisions', employees: 'Employees',
  mission: 'Mission / purpose', legal_status: 'Legal status', affiliate: 'Affiliates & partners', program: 'Programmes', project: 'Projects'
};

/** Fields where sources should give a single answer; different answers are shown as a conflict. */
const SINGLE: OrgField[] = ['founded', 'headquarters', 'country', 'website'];

const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const compact = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const splitList = (v: string) => v.split(/\s*[,;]\s*|\s+and\s+/).map(x => x.trim()).filter(x => x.length > 1);

/** Maps a knowledge-panel label to a field (and role for people). */
function kgField(label: string): { field: OrgField; role?: string; list?: boolean } | null {
  const l = label.toLowerCase();
  if (/^(headquarters|head office)$/.test(l)) return { field: 'headquarters' };
  if (/^(founded|established|inception|formation|date founded)$/.test(l)) return { field: 'founded' };
  if (/^(founders?|co-?founders?)$/.test(l)) return { field: 'person', role: 'Founder', list: true };
  if (/\b(ceo|cfo|cto|coo|cmo|president|chair(man|woman|person)?|director|commander|chief|managing|principal|vice[- ]chancellor|chancellor|owner|leader|secretary)\b/.test(l)) return { field: 'person', role: label, list: true };
  if (/\b(industry|type of business|sector)\b/.test(l)) return { field: 'industry', list: true };
  if (/^products?$/.test(l)) return { field: 'product', list: true };
  if (/^services?$/.test(l)) return { field: 'service', list: true };
  if (/\b(phone|customer service|telephone)\b/.test(l)) return { field: 'phone' };
  if (/^address$/.test(l)) return { field: 'address' };
  if (/\bparent\b/.test(l)) return { field: 'parent' };
  if (/\bsubsidiar/.test(l)) return { field: 'subsidiary', list: true };
  if (/\bemployees\b/.test(l)) return { field: 'employees' };
  return null;
}

/** Every claim about the organisation, from all sources in the case. */
export function orgClaims(inv: Investigation): Claim[] {
  const org = inv.organization;
  if (inv.entityKind !== 'organization' || !org) return [];
  const out: Claim[] = [];
  const push = (c: OrgClaim, family: string) => { if (c.value && c.value.trim()) out.push({ ...c, value: c.value.trim(), family }); };
  const kgUrl = `https://www.google.com/search?q=${encodeURIComponent(org.name)}`;

  // Google knowledge panel (only used by the name search when its title is the searched name).
  if (org.hasKnowledgePanel) {
    const kg = (field: OrgField, value: string, role?: string) => push({ field, value, source: 'Google knowledge panel', sourceKind: 'knowledge_panel', sourceUrl: kgUrl, ...(role ? { role } : {}) }, 'kg');
    kg('official_name', org.name);
    if (org.type) kg('type', org.type.value);
    if (org.description) push({ field: 'description', value: org.description.value, source: org.description.source, sourceKind: 'knowledge_panel', sourceUrl: org.description.sourceUrl || kgUrl }, 'kg');
    org.facts.forEach(f => {
      const m = kgField(f.label);
      if (!m) return;
      (m.list ? splitList(f.value.replace(/\([^)]*\)/g, '')) : [f.value]).forEach(v => kg(m.field, v, m.role));
    });
    if (org.website?.source === 'Google knowledge panel') kg('website', org.website.url);
  }
  if (org.website && org.website.source !== 'Google knowledge panel') {
    push({ field: 'website', value: org.website.url, source: 'Google search result (address matches the name)', sourceKind: 'search', sourceUrl: org.website.url }, 'detector');
  }
  org.socialProfiles.forEach(s => push({ field: 'social', value: s.url, role: s.platform, source: s.source, sourceKind: 'social', sourceUrl: s.url }, s.source === 'Google knowledge panel' ? 'kg' : `social:${hostOf(s.url)}`));

  // An abbreviation search: the abbreviation is an alternative name, supported by the sites that spell it out.
  const res = inv.entityResolution;
  if (res && res.kind === 'resolved' && compact(res.candidates[0].name) === compact(org.name)) {
    res.candidates[0].sources.forEach(s => push({ field: 'alt_name', value: res.query.toUpperCase(), source: `Search result: ${hostOf(s.url) || s.title}`, sourceKind: 'search', sourceUrl: s.url, quote: s.title }, `search:${hostOf(s.url)}`));
  }

  // Enrichment sources.
  (inv.orgEnrich?.claims || []).forEach(c => {
    const site = c.sourceUrl ? hostOf(c.sourceUrl) : '';
    const family = c.sourceKind === 'wikidata' ? 'wikidata' : c.sourceKind === 'maps' ? 'maps' : `${c.sourceKind}:${site}`;
    push(c, family);
  });

  // The organisation's own website, when confirmed as official.
  const site = inv.websiteIntel;
  if (site?.reachable && site.verification.status !== 'unverified') {
    const self = (field: OrgField, value: string, url: string, role?: string) =>
      push({ field, value, source: 'Official website', sourceKind: 'website', sourceUrl: url, ...(role ? { role } : {}) }, 'website');
    site.structured.forEach(s => {
      const f: Record<string, [OrgField, string?]> = {
        Type: ['type'], Founded: ['founded'], Founders: ['person', 'Founder'], Address: ['address'], Telephone: ['phone'],
        Email: ['email'], Description: ['description'], Name: ['official_name'], 'Legal name': ['official_name']
      };
      const m = f[s.label];
      if (!m) return;
      (m[0] === 'person' ? splitList(s.value) : [s.value]).forEach(v => self(m[0], m[0] === 'email' ? v.replace(/^mailto:/i, '') : v, s.url, m[1]));
    });
    // The verified site confirms itself as the website, and its own title gives the name as it writes it.
    const home = site.finalUrl || site.requestedUrl;
    self('website', home, home);
    const title = String(site.siteName || site.pages[0]?.title || '').split(/\s+[|–—:·-]\s+|\s*\|\s*/)[0].replace(/^(?:the|welcome to( the)?)\s+/i, '').trim();
    if (title && compact(title) === compact(org.name)) self('official_name', title, home);
    // People the organisation's own site names with a role (leadership, about, home pages).
    (site.people || []).forEach(p => push({ field: 'person', value: p.name, role: p.role, source: 'Official website', sourceKind: 'website', sourceUrl: p.url, quote: p.quote }, 'website'));
    site.emails.forEach(e => self('email', e.value, e.foundOn));
    site.phones.forEach(p => self('phone', p.value, p.foundOn));
    site.addresses.forEach(a => self('address', a.value, a.foundOn));
    // Account address only (a LinkedIn link like /school/636196/admin/feed/posts → /school/636196).
    // Units the site lists (its menu's arms of service, faculties, divisions… or its departments page).
    (site.units || []).forEach(u => push({ field: 'unit', value: u.name, source: 'Official website', sourceKind: 'website', sourceUrl: u.url, quote: `Listed under “${u.group}” on ${hostOf(u.foundOn)}` }, 'website'));
    site.socialLinks.forEach(s => self('social', s.url.replace(/(linkedin\.com\/(?:company|school|showcase|in)\/[^/?#]+).*/i, '$1').replace(/[?#].*$/, ''), s.foundOn, s.platform));
  }
  // Facts the investigator accepted from the AI analysis. Each keeps the page it was read from and the
  // page's words; a page already counted (e.g. the official website) is not counted twice.
  const officialHost = site?.reachable && site.verification.status !== 'unverified' ? hostOf(site.finalUrl || site.requestedUrl) : '';
  (inv.aiClaims || []).forEach(c => {
    const h = c.sourceUrl ? hostOf(c.sourceUrl) : '';
    const family = h && h === officialHost ? 'website' : out.find(x => x.sourceUrl && hostOf(x.sourceUrl) === h)?.family || `ai:${h || c.source}`;
    push(c, family);
  });
  // An address that ends in a country is also that source's statement of the country ("…, Accra, Ghana").
  out.filter(c => c.field === 'address').forEach(c => {
    const last = c.value.split(',').pop()?.trim() || '';
    if (isCountryName(last)) out.push({ ...c, field: 'country', value: last, quote: c.quote || `Address: ${c.value}` });
  });
  return out;
}

// ─── Grouping ────────────────────────────────────────────────────────────────

function key(field: OrgField, v: string): string {
  switch (field) {
    case 'founded': return v.match(/\b(1[5-9]|20)\d{2}\b/)?.[0] || compact(v);
    case 'website': return hostOf(v) || compact(v);
    case 'phone': return v.replace(/\D/g, '').slice(-9);
    case 'email': return v.toLowerCase();
    case 'social': {
      try {
        const u = new URL(v);
        return `${u.hostname.replace(/^(www|m|[a-z]{2})\./, '').replace('twitter.com', 'x.com')}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
      } catch { return v.toLowerCase(); }
    }
    case 'headquarters': case 'country': return compact(v.split(',')[0]);
    case 'coordinates': return v.split(',').map(x => Number(x).toFixed(2)).join(',');
    default: return compact(v);
  }
}

/** Two values are the same fact (e.g. "Redmond" and "Redmond, Washington"). */
function same(field: OrgField, a: string, b: string, orgName = ''): boolean {
  // Units: the organisation's own words are dropped before comparing ("Ghana Army" = "ARMY", "Ghana Air Force" = "Airforce").
  const strip = (v: string) => (field === 'unit' && orgName ? v.split(/\s+/).filter(w => !orgName.toLowerCase().split(/\s+/).includes(w.toLowerCase())).join(' ') || v : v);
  const ka = key(field, strip(a));
  const kb = key(field, strip(b));
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  // The same sentence cut at different lengths by different snippets.
  if (field === 'description' && ka.length >= 40 && kb.length >= 40 && ka.slice(0, 40) === kb.slice(0, 40)) return true;
  if (['type', 'industry', 'sector', 'product', 'service', 'official_name', 'alt_name', 'parent', 'subsidiary', 'unit', 'address', 'person', 'affiliate', 'program', 'project', 'legal_status'].includes(field)) {
    const [s, l] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
    return s.length >= 5 && l.includes(s);
  }
  return false;
}

const PRIORITY: Record<string, number> = { website: 0, wikidata: 1, knowledge_panel: 2, maps: 3, social: 4, search: 5, ai: 5, bing: 6 };

export function groupFacts(claims: Claim[], field: OrgField, orgName = ''): FactGroup[] {
  const groups: Array<{ claims: Claim[] }> = [];
  claims.filter(c => c.field === field).forEach(c => {
    const g = groups.find(x => x.claims.some(y => same(field, y.value, c.value, orgName)));
    if (g) g.claims.push(c); else groups.push({ claims: [c] });
  });
  return groups.map(g => {
    // Shown value: the site's root address for websites, the most detailed wording for places and
    // descriptions, otherwise the most authoritative source's wording.
    const pathLen = (u: string) => { try { return new URL(u).pathname.replace(/\/+$/, '').length; } catch { return u.length; } };
    const best = [...g.claims].sort((a, b) =>
      field === 'website' ? pathLen(a.value) - pathLen(b.value)
        : ['headquarters', 'address', 'description', 'mission', 'unit'].includes(field) ? b.value.length - a.value.length
          : (PRIORITY[a.sourceKind] ?? 9) - (PRIORITY[b.sourceKind] ?? 9) || b.value.length - a.value.length)[0];
    return {
      field,
      value: field === 'founded' ? (g.claims.find(c => /^\d{4}-\d{2}-\d{2}$/.test(c.value))?.value || best.value) : best.value,
      claims: g.claims,
      sources: Array.from(new Set(g.claims.map(c => c.source))),
      independent: new Set(g.claims.map(c => c.family)).size,
      roles: Array.from(new Set(g.claims.map(c => c.role).filter((r): r is string => Boolean(r))))
    };
  }).sort((a, b) => b.independent - a.independent || (PRIORITY[a.claims[0].sourceKind] ?? 9) - (PRIORITY[b.claims[0].sourceKind] ?? 9));
}

export interface OrgProfile {
  claims: Claim[];
  facts: Partial<Record<OrgField, FactGroup[]>>;
  /** Single-answer fields where sources give different values. */
  conflicts: OrgField[];
  stats: { confirmed: number; single: number; conflicts: number };
  /** Every source that contributed, with how many facts it gave. */
  sources: Array<{ label: string; url?: string; facts: number }>;
}

export function orgProfile(inv: Investigation): OrgProfile {
  const claims = orgClaims(inv);
  const facts: OrgProfile['facts'] = {};
  (Object.keys(FIELD_LABEL) as OrgField[]).forEach(f => {
    const g = groupFacts(claims, f, inv.organization?.name || '');
    if (g.length) facts[f] = g;
  });
  // A disagreement needs different sources: one source listing several values (e.g. regional websites
  // on Wikidata) is not a conflict.
  const conflicts = SINGLE.filter(f => {
    const g = facts[f] || [];
    if (g.length < 2) return false;
    const top = new Set(g[0].claims.map(c => c.family));
    return g.slice(1).some(x => {
      if (!x.claims.some(c => !top.has(c.family))) return false;
      // A website address found once in search results is a candidate (often a related site), not a
      // disagreement; it needs an authoritative source or two sources to contradict the official one.
      if (f === 'website') return x.independent >= 2 || x.claims.some(c => ['wikidata', 'knowledge_panel', 'maps'].includes(c.sourceKind));
      return true;
    });
  });
  const all = Object.values(facts).flat() as FactGroup[];
  const bySource = new Map<string, { label: string; url?: string; facts: number }>();
  claims.forEach(c => {
    const cur = bySource.get(c.source) || { label: c.source, url: c.sourceUrl, facts: 0 };
    cur.facts++;
    bySource.set(c.source, cur);
  });
  return {
    claims, facts, conflicts,
    stats: { confirmed: all.filter(g => g.independent >= 2).length, single: all.filter(g => g.independent < 2).length, conflicts: conflicts.length },
    sources: Array.from(bySource.values()).sort((a, b) => b.facts - a.facts)
  };
}

export function confidenceText(g: FactGroup): { text: string; cls: 'ok' | 'muted' } {
  return g.independent >= 2
    ? { text: `Confirmed by ${g.independent} independent sources`, cls: 'ok' }
    : { text: 'Single source', cls: 'muted' };
}

/**
 * The website to read: the address the most independent sources list (knowledge panel, Wikidata, Google
 * Maps), else the search-result address that matches the name. listedBy feeds the website verification.
 */
export function bestWebsite(inv: Investigation): { url: string; listedBy: string[] } | null {
  const claims = orgClaims({ ...inv, websiteIntel: undefined }).filter(c => c.field === 'website');
  const groups = groupFacts(claims, 'website');
  if (!groups.length) return null;
  const g = groups[0];
  const listedBy = Array.from(new Set(g.claims.filter(c => c.family !== 'detector').map(c =>
    c.sourceKind === 'knowledge_panel' ? 'Google’s knowledge panel' : c.sourceKind === 'maps' ? 'The Google Maps listing' : c.sourceKind === 'wikidata' ? 'Wikidata' : c.source)));
  const url = (g.claims.find(c => c.sourceKind === 'wikidata' || c.sourceKind === 'knowledge_panel') || g.claims[0]).value;
  return { url, listedBy };
}

// ─── Activities (classified from news and web mentions) ─────────────────────

export type ActivityKind = 'Partnerships' | 'Awards' | 'Events' | 'Projects' | 'Announcements' | 'Publications';

const ACTIVITY_RULES: Array<[ActivityKind, RegExp]> = [
  ['Partnerships', /\b(partner(s|ship|ed|ing)?|mou|memorandum of understanding|collaborat\w*|agreement|signs? (a )?deal|joins forces|teams up)\b/i],
  ['Awards', /\b(award(s|ed)?|wins?|won|honou?r(s|ed)?|prize|recogni[sz](ed|es|ition)|ranked)\b/i],
  ['Events', /\b(event|conference|summit|workshop|forum|webinar|expo|exhibition|ceremony|graduation|festival|parade|seminar|symposium|open day|training)\b/i],
  ['Projects', /\b(project|programme|program|initiative|construction|builds?|deploy(s|ed|ment)?|pilot|rollout|expansion)\b/i],
  ['Announcements', /\b(announce[sd]?|launch(es|ed)?|unveil(s|ed)?|introduc(es|ed)|press release|statement|appoint(s|ed|ment)?|names new)\b/i],
  ['Publications', /\b(report|publication|journal|paper|study|research|white ?paper|book)\b/i]
];

export interface ActivityItem { kind: ActivityKind; title: string; url: string; source: string; date?: string; snippet?: string }

export function orgActivities(items: Array<{ title: string; url: string; source: string; date?: string; snippet?: string }>): ActivityItem[] {
  const seen = new Set<string>();
  const out: ActivityItem[] = [];
  items.forEach(i => {
    if (!i.url || seen.has(i.url)) return;
    const text = `${i.title} ${i.snippet || ''}`;
    const rule = ACTIVITY_RULES.find(([, re]) => re.test(i.title)) || ACTIVITY_RULES.find(([, re]) => re.test(text));
    if (!rule) return;
    seen.add(i.url);
    out.push({ kind: rule[0], ...i });
  });
  return out;
}

const PAGE_NAME: Record<string, string> = { news: 'News', projects: 'Projects', publications: 'Publications', events: 'Events' };

/**
 * What the activity grouping reads: news articles saved in the case (News tab), pages that name the
 * organisation (enrichment searches) and headings of the official website's News/Projects/Publications pages.
 */
export function orgActivityInputs(
  inv: Investigation,
  newsItems: Array<{ title: string; url: string; source: string; description?: string; metadata?: Record<string, unknown> }>
): { news: Array<{ title: string; url: string; source: string; snippet?: string; date?: string }>; mentions: Array<{ title: string; url: string; source: string; snippet?: string; date?: string }>; sitePosts: Array<{ title: string; url: string; source: string }> } {
  const news = newsItems.map(w => ({ title: w.title, url: w.url, source: w.source, snippet: w.description, date: w.metadata?.date as string | undefined }));
  const mentions = (inv.orgEnrich?.mentions || []).map(m => ({ title: m.title, url: m.url, source: m.source, snippet: m.snippet, date: m.date }));
  const site = inv.websiteIntel;
  const official = Boolean(site?.reachable && site.verification.status !== 'unverified');
  const siteName = site ? site.siteName || hostOf(site.finalUrl || site.requestedUrl) : '';
  const sitePosts = official && site
    ? site.pages.filter(p => PAGE_NAME[p.kind]).flatMap(p => p.headings.slice(0, 12).map(h => ({ title: h, url: p.url, source: `${siteName} (${PAGE_NAME[p.kind]} page)` })))
    : [];
  return { news, mentions, sitePosts };
}

// ─── Entity type (category) ──────────────────────────────────────────────────

export type EntityCategory =
  | 'University' | 'College' | 'School' | 'Educational institution' | 'Research institution'
  | 'Company' | 'Brand' | 'Government agency' | 'Military organisation' | 'International organisation'
  | 'NGO / charity' | 'Foundation' | 'Professional body' | 'Association'
  | 'Hospital / health institution' | 'Religious organisation' | 'Media organisation' | 'Sports organisation'
  | 'Organisation' | 'Unknown';

/**
 * What each type looks like in the sources' own words — type statements, descriptions, the website's title,
 * description and About text, the Google Maps category. Not the searched name alone: an association need
 * not be called "association"; membership language, a mission, accreditation or a statute say it instead.
 */
const TYPE_EVIDENCE: Array<[EntityCategory, RegExp]> = [
  ['Military organisation', /\b(military|armed forces?|army|navy|air force|defen[cs]e (force|staff)|marines?|coast guard|arms of service|regiment|battalion)\b/i],
  ['University', /\b(universit(y|ies)|polytechnic|vice[- ]chancellor|undergraduate|postgraduate|bachelor'?s|master'?s degree|doctoral|phd programmes?)\b/i],
  ['College', /\b(college of education|nursing (and midwifery )?(training )?college|university college|community college|(training|technical|teacher) college|college\b(?! of (basic|health|humanities|education|agriculture|engineering|sciences?)))/i],
  ['School', /\b(senior high school|junior high school|high school|secondary school|primary school|basic school|kindergarten|international school|boarding school|day school|shs\b|jhs\b)\b/i],
  ['Educational institution', /\b(educational institution|tertiary (institution|education)|accredit(ed|ation) by|national accreditation board|higher education|admissions?|students|academic (programmes?|calendar|year)|curriculum|faculty|lecturers?|campus(es)?|alumni|graduation)\b/i],
  ['Research institution', /\b(research (institute|institution|centre|center|organi[sz]ation|council)|think[- ]tank|laborator(y|ies)|scientific research|policy research)\b/i],
  ['Hospital / health institution', /\b(hospital|clinic|medical cent(re|er)|health (centre|center|facility|service)|teaching hospital|polyclinic|patients|out-?patient|in-?patient|emergency (care|department))\b/i],
  ['International organisation', /\b(united nations|specialized agency|intergovernmental|international organi[sz]ation|member states|multilateral)\b/i],
  ['Government agency', /\b(government (agency|body|institution|organi[sz]ation|department|office|ministry)|ministry of|state (agency|institution|body)|statutory (body|corporation|agency|authority)|public (institution|body|agency|authority|service)|established (by|under) (an )?act|act of parliament|regulatory (body|authority|agency)|revenue authority|municipal|district assembly|metropolitan assembly|semi-autonomous)\b/i],
  ['Professional body', /\b(professional (body|association|institute|society|membership)|chartered institute|institute of chartered|(institute|society|association|council) of ([a-z]+ ){0,3}(accountants|engineers|surveyors|bankers|architects|planners|pharmacists|physicians|lawyers|nurses|teachers|journalists|management|marketing)|licens(ed|ing) (body|professionals)|regulat(es|ing) the (practice|profession)|continuing professional development|cpd points?|professional (members|membership|qualification))\b/i],
  ['Association', /\b(associations?|federation|society|guild|chamber of|trade union|labou?r union|union of|club|alliance|coalition|network of|membership|our members|member(s)? of the association|become a member|join (us|the association|as a member)|annual general meeting|\bagm\b|national executive council|regional branches|umbrella body)\b/i],
  ['NGO / charity', /\b(ngo|non-?governmental|non-?profit|not-for-profit|charit(y|able)|humanitarian|civil society organi[sz]ation|cso\b|volunteers?|donate|donations)\b/i],
  ['Foundation', /\bfoundation\b(?! (stone|course|year|degree|programme))/i],
  ['Religious organisation', /\b(church|mosque|diocese|parish|ministries|religious|temple|congregation|denomination|pastor|bishop|imam|worship)\b/i],
  ['Media organisation', /\b(newspaper|broadcaster|broadcasting|radio station|television station|tv station|media (company|house|group|organi[sz]ation)|publisher|news agency|news portal|fm\b)\b/i],
  ['Sports organisation', /\b(football club|sports? (club|team|organi[sz]ation|association|federation)|league|athletic|stadium|fc\b)\b/i],
  ['Brand', /\b(brand|product line)\b/i],
  ['Company', /\b(company|corporation|business|enterprise|firm|limited|ltd\.?|plc|inc\.?|llc|startup|start-up|manufacturer|retailer|supplier|provider|conglomerate|bank|airline|operator|multinational|subsidiary of|shareholders|customers|clients|products and services|drone shop|store|distributor)\b/i]
];

/** More specific types win over the general type they belong to when both are supported. */
const PARENT: Partial<Record<EntityCategory, EntityCategory>> = {
  University: 'Educational institution', College: 'Educational institution', School: 'Educational institution',
  'Professional body': 'Association'
};

export interface EntityClass {
  category: EntityCategory;
  /** The broader type it belongs to, when there is one (University → Educational institution). */
  parent?: EntityCategory;
  /** Strong: an authoritative source states it, or several independent sources agree. */
  confidence: 'Strong evidence' | 'Possible match' | 'Not established';
  basis: string[];
  /** Runner-up types with some support (shown so the investigator can judge). */
  alternatives: Array<{ category: EntityCategory; score: number }>;
}

interface Evidence { text: string; weight: number; kind: string; label: string; authoritative: boolean }

/** Everything the sources say about what the organisation is, with how much each source counts. */
function typeEvidence(inv: Investigation, profile: OrgProfile): Evidence[] {
  const out: Evidence[] = [];
  const add = (text: string | undefined, weight: number, kind: string, label: string, authoritative = false) => {
    if (text && text.trim()) out.push({ text, weight, kind, label, authoritative });
  };
  // Type statements and descriptions (knowledge panel, Wikidata, website schema, search snippets).
  for (const field of ['type', 'industry', 'sector', 'description'] as OrgField[]) {
    (profile.facts[field] || []).forEach(g => g.claims.forEach(c => {
      const auth = ['knowledge_panel', 'wikidata', 'website'].includes(c.sourceKind);
      const w = field === 'type' ? (auth ? 6 : 3) : field === 'description' ? (auth ? 4 : 2) : (auth ? 4 : 2);
      add(c.value, w, c.family, c.source, auth && field !== 'description');
    }));
  }
  // The official website's own words: title, description, About page (only when it is the official site).
  const site = inv.websiteIntel;
  if (site?.reachable && site.verification.status !== 'unverified') {
    site.pages.filter(p => ['home', 'about'].includes(p.kind)).forEach(p => {
      add(`${p.title}. ${p.description || ''}`, 3, 'website', 'Official website');
      add(p.text.join(' '), 2, 'website-text', 'Official website (About / home text)');
    });
    site.structured.filter(s => s.label === 'Type' || s.label === 'Description').forEach(s => add(s.value, 4, 'website-schema', 'Official website (structured data)', s.label === 'Type'));
    if (site.pages.some(p => p.kind === 'admissions')) add('admissions', 2, 'website-pages', 'Official website (Admissions page)');
  }
  // Google Maps category of the organisation's own listing(s) — counted once.
  // Its own listing: every word of its name in the listing's name ("Knutsford University College" for
  // "Knutsford University"), or the listing links to the official website.
  const nameWords = (inv.organization?.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1 && !['the', 'of', 'and'].includes(w));
  const siteHost = site?.reachable ? hostOf(site.finalUrl || site.requestedUrl) : '';
  const own = (inv.orgEnrich?.mapsListings || []).filter(l => l.category && (
    (nameWords.length > 0 && nameWords.every(w => l.title.toLowerCase().split(/[^a-z0-9]+/).includes(w)))
    || (siteHost && l.website && hostOf(l.website) === siteHost)));
  if (own.length) add(own.map(l => l.category).join(', '), 3, 'maps', 'Google Maps category');
  // Web domain: .edu / .ac → education, .gov → government, .mil → military (the verified official site only).
  const host = site?.reachable && site.verification.status !== 'unverified' ? hostOf(site.finalUrl || site.requestedUrl) : '';
  if (/\.(edu|ac)(\.[a-z]{2})?$/.test(host)) add('educational institution', 2, 'domain', `Web address ${host}`);
  if (/\.gov(\.[a-z]{2})?$/.test(host)) add('government institution', 2, 'domain', `Web address ${host}`);
  if (/\.mil(\.[a-z]{2})?$/.test(host)) add('military', 2, 'domain', `Web address ${host}`);
  // The name's own words count least.
  add(inv.organization?.name, 1, 'name', 'The organisation’s name');
  return out;
}

/**
 * What kind of organisation it is. Each source that describes it adds weight to the types its words fit
 * (one source counts once per type); the most specific well-supported type is chosen. With too little
 * evidence it stays "Organisation" (or "Unknown") — nothing is guessed.
 */
export function entityClass(inv: Investigation, profile: OrgProfile): EntityClass {
  const ev = typeEvidence(inv, profile);
  const scores = new Map<EntityCategory, { byKind: Map<string, number>; labels: Set<string>; authoritative: boolean }>();
  for (const e of ev) {
    for (const [cat, re] of TYPE_EVIDENCE) {
      if (!re.test(e.text)) continue;
      const s = scores.get(cat) || { byKind: new Map(), labels: new Set(), authoritative: false };
      s.byKind.set(e.kind, Math.max(s.byKind.get(e.kind) || 0, e.weight));
      s.labels.add(e.label);
      if (e.authoritative) s.authoritative = true;
      scores.set(cat, s);
    }
  }
  const total = (cat: EntityCategory) => Array.from(scores.get(cat)?.byKind.values() || []).reduce((a, b) => a + b, 0);
  const ranked = Array.from(scores.keys()).map(cat => ({ category: cat, score: total(cat) })).sort((a, b) => b.score - a.score);
  if (!ranked.length || ranked[0].score < 2) {
    return { category: inv.entityKind === 'organization' ? 'Organisation' : 'Unknown', confidence: 'Not established', basis: [], alternatives: [] };
  }

  // A specific type beats its general parent when it has at least half the parent's support
  // ("University" over "Educational institution"; "Professional body" over "Association").
  let best = ranked[0];
  const child = ranked.find(r => PARENT[r.category] === best.category && r.score >= Math.max(2, best.score / 2));
  if (child) best = child;
  // A type only suggested by the name itself is not enough.
  const s = scores.get(best.category)!;
  const kinds = Array.from(s.byKind.keys()).filter(k => k !== 'name');
  if (!kinds.length) return { category: 'Organisation', confidence: 'Not established', basis: [], alternatives: ranked.slice(0, 3) };

  const parent = PARENT[best.category] && (scores.has(PARENT[best.category]!) || best.category !== 'Professional body') ? PARENT[best.category] : undefined;
  // Independent sources for the broader type also support the specific one ("Private educational
  // institution" on Google Maps + "Knutsford University is a …" in a search result).
  const p = parent ? scores.get(parent) : undefined;
  const allKinds = new Set([...kinds, ...Array.from(p?.byKind.keys() || []).filter(k => k !== 'name')]);
  const labels = new Set([...Array.from(s.labels), ...Array.from(p?.labels || [])]);
  return {
    category: best.category,
    ...(parent ? { parent } : {}),
    confidence: s.authoritative || allKinds.size >= 2 || best.score >= 6 ? 'Strong evidence' : 'Possible match',
    basis: Array.from(labels).filter(l => l !== 'The organisation’s name').slice(0, 5),
    // Only close runners-up (at least 60% of the chosen type's support), e.g. a company that is also a brand.
    alternatives: ranked.filter(r => r.category !== best.category && r.category !== parent && r.score >= Math.max(4, best.score * 0.6)).slice(0, 3)
  };
}

/** Section names that fit the kind of organisation (a university has faculties and programmes, a company products). */
export function sectionLabels(category: EntityCategory): Partial<Record<OrgSection, string>> {
  switch (category) {
    case 'University': case 'College': case 'School': case 'Educational institution':
      return { locations: 'Campuses & locations', products: 'Faculties, departments & programmes', people: 'Leadership & officers' };
    case 'Military organisation':
      return { locations: 'Headquarters & bases', products: 'Units, services & departments', people: 'Command & leadership' };
    case 'Government agency': case 'International organisation':
      return { locations: 'Headquarters & offices', products: 'Services, programmes & departments', people: 'Leadership' };
    case 'Professional body': case 'Association':
      return { locations: 'Secretariat & branches', products: 'Membership, services & programmes', people: 'Executives & council' };
    case 'NGO / charity': case 'Foundation': case 'Religious organisation':
      return { products: 'Mission, programmes & projects', locations: 'Headquarters & offices' };
    case 'Research institution':
      return { products: 'Research areas, centres & programmes', locations: 'Headquarters & offices' };
    case 'Hospital / health institution':
      return { products: 'Services & departments', locations: 'Facilities & locations' };
    default:
      return {};
  }
}

// ─── Websites: official, related, third-party ───────────────────────────────

export interface SiteRef { url: string; host: string; label: string; basis: string }

/**
 * Websites around the organisation: related sites (units, affiliates, portals the official site links to, and
 * addresses carrying the organisation's name or initials) and third-party sites (pages about it elsewhere).
 */
export function websitesAround(inv: Investigation, profile: OrgProfile): { related: SiteRef[]; thirdParty: SiteRef[] } {
  const official = profile.facts.website?.[0] ? hostOf(profile.facts.website[0].value) : '';
  const related = new Map<string, SiteRef>();
  (inv.websiteIntel?.linkedSites || []).forEach(l => {
    if (l.host !== official) related.set(l.host, { url: l.url, host: l.host, label: l.text, basis: 'Linked from the official website' });
  });
  (profile.facts.website || []).slice(1).forEach(g => {
    const h = hostOf(g.value);
    if (h && h !== official && !related.has(h)) related.set(h, { url: g.value, host: h, label: h, basis: `Listed by ${g.sources.join(', ')} — not confirmed as the official website` });
  });
  const third = new Map<string, SiteRef>();
  (inv.orgEnrich?.mentions || []).forEach(m => {
    const h = hostOf(m.url);
    if (!h || h === official || related.has(h) || third.has(h)) return;
    third.set(h, { url: m.url, host: h, label: m.title, basis: m.engine === 'google_news' ? 'News article' : 'Page that mentions it' });
  });
  return { related: Array.from(related.values()), thirdParty: Array.from(third.values()).slice(0, 15) };
}

/** What an organisation's parts are called, by kind (armed forces → arms of service, a university → colleges & faculties). */
export function unitLabel(category: EntityCategory): string {
  switch (category) {
    case 'Military organisation': return 'Units / arms of service';
    case 'University': case 'College': case 'Educational institution': return 'Colleges, faculties & schools';
    case 'Professional body': case 'Association': return 'Branches, chapters & committees';
    case 'Research institution': return 'Institutes, centres & divisions';
    case 'School': return 'Departments & sections';
    case 'Company': case 'Brand': return 'Divisions & business units';
    case 'Government agency': case 'International organisation': return 'Divisions, departments & offices';
    case 'Hospital / health institution': return 'Departments & facilities';
    default: return 'Units & divisions';
  }
}

// ─── What the tab shows (sent to the AI analysis so it compares with the case, not only the raw search) ───

/**
 * The Organisation tab's current value for each AI field (the best cross-checked value), or null when the tab
 * shows "Not found". The AI analysis uses it to tell new information from what the case already holds.
 */
export function orgKnown(inv: Investigation): Record<string, string | null> {
  const profile = orgProfile(inv);
  const top = (f: OrgField) => profile.facts[f]?.[0]?.value || null;
  // List fields: every value the tab shows (" | "-separated), so another product or leader counts as new.
  const all = (...fs: OrgField[]) => fs.flatMap(f => (profile.facts[f] || []).map(g => g.value)).join(' | ').slice(0, 600) || null;
  const cls = entityClass(inv, profile);
  return {
    official_name: top('official_name'), alias: all('alt_name'),
    entity_type: cls.confidence !== 'Not established' ? cls.category : null,
    industry: all('industry'), sector: all('sector'), description: top('description'), mission: top('mission'),
    legal_status: top('legal_status'), founded: top('founded'), headquarters: top('headquarters'), location: all('address'),
    product: all('product'), service: all('service'), program: all('program'), project: all('project'),
    leadership: all('person'), website: top('website'), social_profile: all('social'),
    contact: all('phone', 'email'), parent: top('parent'), subsidiary: all('subsidiary'), unit: all('unit'),
    affiliate: all('affiliate'), employees: top('employees')
  };
}
