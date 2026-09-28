/**
 * The organisation profile: every fact any source gave about the organisation, cross-checked.
 *
 * Pipeline: search → sources (Google knowledge panel, Wikidata, Google Maps, Google, Google News and DuckDuckGo results, social
 * platforms, the official website) → claims (one fact from one source, with its URL and words) → grouped by
 * field and value → confidence = number of independent sources that agree → conflicts shown, never resolved
 * silently. Nothing is inferred: a field no source gives is simply empty ("Not found").
 */
import type { Investigation, OrgClaim, OrgField } from '../types/investigation';

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
  parent: 'Parent organisation', subsidiary: 'Subsidiaries / units', employees: 'Employees'
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
    site.socialLinks.forEach(s => self('social', s.url.replace(/(linkedin\.com\/(?:company|school|showcase|in)\/[^/?#]+).*/i, '$1').replace(/[?#].*$/, ''), s.foundOn, s.platform));
  }
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
function same(field: OrgField, a: string, b: string): boolean {
  const ka = key(field, a);
  const kb = key(field, b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  // The same sentence cut at different lengths by different snippets.
  if (field === 'description' && ka.length >= 40 && kb.length >= 40 && ka.slice(0, 40) === kb.slice(0, 40)) return true;
  if (['type', 'industry', 'sector', 'product', 'service', 'official_name', 'alt_name', 'parent', 'subsidiary', 'address', 'person'].includes(field)) {
    const [s, l] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
    return s.length >= 5 && l.includes(s);
  }
  return false;
}

const PRIORITY: Record<string, number> = { website: 0, wikidata: 1, knowledge_panel: 2, maps: 3, social: 4, search: 5, bing: 6 };

export function groupFacts(claims: Claim[], field: OrgField): FactGroup[] {
  const groups: Array<{ claims: Claim[] }> = [];
  claims.filter(c => c.field === field).forEach(c => {
    const g = groups.find(x => x.claims.some(y => same(field, y.value, c.value)));
    if (g) g.claims.push(c); else groups.push({ claims: [c] });
  });
  return groups.map(g => {
    // Shown value: the site's root address for websites, the most detailed wording for places and
    // descriptions, otherwise the most authoritative source's wording.
    const pathLen = (u: string) => { try { return new URL(u).pathname.replace(/\/+$/, '').length; } catch { return u.length; } };
    const best = [...g.claims].sort((a, b) =>
      field === 'website' ? pathLen(a.value) - pathLen(b.value)
        : ['headquarters', 'address', 'description'].includes(field) ? b.value.length - a.value.length
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
    const g = groupFacts(claims, f);
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
  | 'University' | 'College' | 'School' | 'Company' | 'Government agency' | 'Military organisation' | 'NGO / charity'
  | 'Foundation' | 'Association' | 'Hospital / health institution' | 'Religious organisation' | 'Media organisation'
  | 'Sports organisation' | 'International organisation' | 'Brand' | 'Institution' | 'Organisation';

const CATEGORY_RULES: Array<[EntityCategory, RegExp]> = [
  ['Military organisation', /\b(military|armed forces?|army|navy|air force|defen[cs]e force|marines?|coast guard)\b/i],
  ['University', /\b(university|universit[äé]|polytechnic)\b/i],
  ['College', /\b(college|institute of technology|academy)\b/i],
  ['School', /\b(school|high school|secondary|primary|kindergarten|basic school)\b/i],
  ['Hospital / health institution', /\b(hospital|clinic|health (centre|center|service)|medical cent(re|er)|teaching hospital)\b/i],
  ['International organisation', /\b(united nations|specialized agency|intergovernmental|international organi[sz]ation)\b/i],
  ['Government agency', /\b(government|ministry|agency|authority|commission|department of|public body|regulator|parliament|municipal|district assembly|state-owned|revenue)\b/i],
  ['NGO / charity', /\b(ngo|non-?governmental|non-?profit|charit(y|able)|humanitarian)\b/i],
  ['Foundation', /\bfoundation\b/i],
  ['Association', /\b(association|federation|society|union|chamber|guild|club|council)\b/i],
  ['Religious organisation', /\b(church|mosque|diocese|ministries|religious|temple|parish)\b/i],
  ['Media organisation', /\b(newspaper|broadcaster|radio|television|tv station|media (company|organi[sz]ation)|publisher|news agency)\b/i],
  ['Sports organisation', /\b(football club|sports? (club|team|organi[sz]ation)|league|athletic)\b/i],
  ['Brand', /\bbrand\b/i],
  ['Company', /\b(company|corporation|business|enterprise|firm|limited|ltd|plc|inc|llc|startup|manufacturer|retailer|provider|conglomerate|bank|airline|operator|drone shop|store)\b/i],
  ['Institution', /\b(institution|institute|centre|center)\b/i]
];

export interface EntityClass {
  category: EntityCategory;
  /** Strong: the type comes from the knowledge panel, Wikidata or the official website, or 2+ sources agree. */
  confidence: 'Strong evidence' | 'Possible match' | 'Not established';
  basis: string[];
}

/** What kind of organisation it is, from the type statements of the sources (and, last, the name's own words). */
export function entityClass(inv: Investigation, profile: OrgProfile): EntityClass {
  const typeGroups = [...(profile.facts.type || []), ...(profile.facts.industry || []), ...(profile.facts.description || [])];
  for (const [category, re] of CATEGORY_RULES) {
    const hits = typeGroups.filter(g => re.test(g.value));
    if (!hits.length) continue;
    const claims = hits.flatMap(g => g.claims);
    const families = new Set(claims.map(c => c.family));
    const authoritative = claims.some(c => ['knowledge_panel', 'wikidata', 'website'].includes(c.sourceKind));
    return {
      category,
      confidence: authoritative || families.size >= 2 ? 'Strong evidence' : 'Possible match',
      basis: Array.from(new Set(claims.map(c => c.source))).slice(0, 4)
    };
  }
  const name = inv.organization?.name || '';
  const byName = CATEGORY_RULES.find(([, re]) => re.test(name));
  if (byName) return { category: byName[0], confidence: 'Possible match', basis: [`The name contains “${name.match(byName[1])?.[0]}”`] };
  return { category: 'Organisation', confidence: 'Not established', basis: [] };
}

/** Section names that fit the kind of organisation (a university has faculties and programmes, a company products). */
export function sectionLabels(category: EntityCategory): Partial<Record<OrgSection, string>> {
  switch (category) {
    case 'University': case 'College': case 'School':
      return { locations: 'Campuses & locations', products: 'Faculties, departments & programmes', people: 'Leadership & officers' };
    case 'Military organisation':
      return { locations: 'Headquarters & bases', products: 'Units, services & departments', people: 'Command & leadership' };
    case 'Government agency': case 'International organisation':
      return { locations: 'Headquarters & offices', products: 'Services, programmes & departments', people: 'Leadership' };
    case 'NGO / charity': case 'Foundation': case 'Association': case 'Religious organisation':
      return { products: 'Mission, programmes & projects', locations: 'Headquarters & offices' };
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
