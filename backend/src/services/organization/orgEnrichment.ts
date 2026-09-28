/**
 * Organisation enrichment: gathers facts about an organisation from several independent public sources,
 * run concurrently, so the Organisation page does not depend on a single result:
 *   - Google Maps (listings: address, phone, website, hours, coordinates, category)   1 SerpApi search
 *   - Google web search on the exact name, pages 1–2 (snippets: founded, based in…)   1–2 (page 1 has the
 *     name search's own parameters, so it usually comes from the 12-hour cache)
 *   - DuckDuckGo web search on the exact name (independent index and snippets)          1
 *   - Google search restricted to social platforms (official accounts)                 1
 *   - YouTube on the name (videos; the name search's own query, often cached)          0–1
 *   - Wikidata (structured, community-sourced; free public API, no SerpApi)            0
 *
 * Every fact is returned as a claim with its source, URL and — for text extraction — the exact words it
 * came from. Nothing is inferred: a source that does not name the organisation is ignored, similarly named
 * entities are rejected (all words of the searched name must appear), and an ambiguous Wikidata match is
 * reported as ambiguous rather than picked. Cross-checking between sources is done by the caller.
 */
import { SerpApiProvider } from '../search/serpApiProvider';
import { peopleFromText } from './peopleExtract';

export type OrgField =
  | 'official_name' | 'alt_name' | 'type' | 'industry' | 'sector' | 'description' | 'founded'
  | 'headquarters' | 'country' | 'address' | 'website' | 'phone' | 'email' | 'hours' | 'coordinates'
  | 'person' | 'product' | 'service' | 'social' | 'parent' | 'subsidiary' | 'unit' | 'employees';

export interface OrgClaim {
  field: OrgField;
  value: string;
  /** Role for a person claim ("CEO", "Founder"); platform for a social claim. */
  role?: string;
  source: string;
  sourceKind: 'wikidata' | 'maps' | 'search' | 'bing' | 'social';
  sourceUrl?: string;
  /** The source's own words the claim was read from (text extraction only). */
  quote?: string;
}

export interface MapsListing {
  title: string;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  rating?: number;
  reviews?: number;
  latitude?: number;
  longitude?: number;
  mapsUrl: string;
  /** Why the listing is attributed to the organisation. */
  matchedBy: string;
}

export interface OrgMention { title: string; url: string; snippet?: string; source: string; date?: string; thumbnail?: string; engine: string }

export interface OrgEnrichment {
  /** Version of the enrichment (cases searched with an older one refresh once). */
  version: number;
  name: string;
  checkedAt: string;
  claims: OrgClaim[];
  mapsListings: MapsListing[];
  wikidata?: { id: string; url: string; label: string; description?: string; wikipediaUrl?: string }
    | { ambiguous: Array<{ id: string; label: string; description?: string; url: string }> };
  /** Web pages from the searches that name the organisation (for mentions/activities). */
  mentions: OrgMention[];
  videos: OrgMention[];
  sources: Array<{ label: string; status: 'ok' | 'empty' | 'failed'; results: number; used: number; error?: string }>;
}

// ─── Name matching ───────────────────────────────────────────────────────────

const STOP = new Set(['the', 'of', 'and', 'for', 'ltd', 'limited', 'inc', 'plc', 'llc', 'co']);
const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOP.has(w));
/** Every word of the organisation's name appears in the text. */
function names(text: string, org: string): boolean {
  const t = new Set(words(text));
  const n = words(org);
  return n.length > 0 && n.every(w => t.has(w));
}
const hostOf = (u?: string) => { try { return new URL(String(u)).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const clip = (s: string, n = 300) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// ─── Snippet extraction (exact words kept) ───────────────────────────────────

const ORG_NOUN = 'company|corporation|organi[sz]ation|agency|institution|university|college|school|academy|association|firm|ngo|non-?profit|charity|startup|start-up|body|authority|force|forces|military|enterprise|foundation|ministry|department|bank|hospital|group|brand|manufacturer|provider|federation|union|society|council|commission|institute|business|conglomerate|cooperative';

function standalone(sentence: string, org: string): boolean {
  const phrase = org.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s-]+');
  const re = new RegExp(`(^|[^\\w])(${phrase})(?=$|[^\\w])`, 'gi');
  for (const m of sentence.matchAll(re)) {
    const after = sentence.slice((m.index || 0) + m[0].length);
    // Followed by another capitalised word → part of a longer proper name.
    if (!/^\s+(?!(?:Is|Was|Has|Had|In|On|At|Of|And|The|A|An|Which|That|Who|Are|Were|To|For|By|With|From)\b)[A-Z][\w'’-]*/.test(after)) return true;
  }
  return false;
}

/**
 * The organisation's name as a page title writes it: the first part of "Ghana Armed Forces - Wikipedia" or
 * "Ghana Armed Forces | LinkedIn", when it is exactly the searched name (not a longer or different name).
 */
export function titleName(title: string, org: string): string | null {
  const first = String(title || '').split(/\s+[|–—:·-]\s+|\s*\|\s*/)[0].replace(/^(?:the|welcome to( the)?)\s+/i, '').trim();
  return first && words(first).join(' ') === words(org).join(' ') ? first : null;
}


/** A search result that is probably the organisation's own website (the website check confirms it later). */
function siteCandidate(url: string, title: string, org: string): string | null {
  if (platformOf(url)) return null;
  // A site named exactly after the organisation (sokoaerial.com) whose page names it, even with a longer title.
  const exactHost = hostOf(url).split('.')[0] === words(org).join('') && words(org).join('').length >= 4;
  if (!titleName(title, org) && !(exactHost && names(title, org))) return null;
  const host = hostOf(url);
  if (!host || /wikipedia|wikidata|britannica|crunchbase|bloomberg|dnb\.com|zoominfo|glassdoor|indeed|facebook|google\./i.test(host)) return null;
  const label = host.split('.')[0];
  const c = words(org).join('');
  const w = words(org);
  const initials = w.length >= 3 ? w.map(x => x[0]).join('') : '';
  const nameInHost = (c.length >= 4 && (label === c || label.startsWith(c) || (label.length >= 5 && c.startsWith(label))))
    || (initials.length >= 3 && label.startsWith(initials) && label.length <= initials.length + 8);
  // The address must carry the name or its initials (gra.gov.gh, gafonline.mil.gh): a government portal
  // page about the organisation (ghana.gov.gh/…) is not its website.
  if (!nameInHost) return null;
  try { return `${new URL(url).origin}/`; } catch { return null; }
}

export function snippetClaims(text: string, org: string, source: string, sourceKind: OrgClaim['sourceKind'], url: string): OrgClaim[] {
  if (!names(text, org)) return [];
  const out: OrgClaim[] = [];
  const add = (field: OrgField, value: string, quote: string, max = 140) => {
    const v = value.replace(/\s+/g, ' ').replace(/[\s,;:.-]+$/, '').trim();
    if (v.length >= 2 && v.length <= max) out.push({ field, value: v, source, sourceKind, sourceUrl: url, quote: clip(quote, 240) });
  };
  const phrase = org.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s-]+');
  const sentences = text.split(/(?<=[.!?])\s+|\s·\s|\s\|\s/);
  for (const s of sentences) {
    // Only sentences about the organisation itself: its name appears on its own, not as part of a longer
    // name ("Ghana Armed Forces Command and Staff College was established in 1963" is about the college).
    if (!standalone(s, org)) continue;
    // The name must also stand alone before the fact word, i.e. be the subject of the statement.
    const about = (m: RegExpMatchArray | null) => Boolean(m && standalone(s.slice(0, m.index), org));
    // "The Ghana Armed Forces (GAF) is …": the abbreviation the source gives, and the defining sentence.
    const acr = s.match(new RegExp(`(?:^|[^\\w])${phrase}\\s*\\(([A-Z][A-Za-z.&]{1,9})\\)`, 'i'));
    if (acr && /[A-Z]{2}/.test(acr[1])) add('alt_name', acr[1], s);
    const def = s.match(new RegExp(`(?:^|[^\\w])(?:the\\s+)?${phrase}(?:\\s*\\([^)]{1,20}\\))?\\s+(?:is|was|are)\\s+(?:a|an|the)\\s+\\w`, 'i'));
    // The pattern itself makes the name the subject ("<name> (ABC) is a …"), so no separate subject check.
    if (def && !/(…|\.\.\.)\s*$/.test(s) && s.length >= 40) add('description', s.trim(), s, 320);
    // "… consisting of the Army (GA), Navy (GN), and Ghana Air Force": the parts the source lists.
    const comp = s.match(/\b(?:consist(?:s|ing)? of|comprises|comprising|is made up of|made up of|is composed of|composed of|includes the|including the)\s+(?:the\s+)?(.+?)(?:[.;]|$)/i);
    if (comp && about(comp)) {
      const items = comp[1].replace(/\([^)]*\)/g, '').split(/\s*,\s*|\s+and\s+|\s*&\s*/).map(x => x.replace(/^(?:and|the)\s+/i, '').trim()).filter(Boolean);
      const unitLike = items.filter(x => /^[A-Z][\w'’-]*(?:\s+(?:of|and|for|the|[A-Z][\w'’-]*)){0,5}$/.test(x) && x.split(/\s+/).length <= 6);
      // Only a list of proper names (2+ items, all capitalised) — not a sentence about something else.
      if (unitLike.length >= 2 && unitLike.length === items.length) unitLike.forEach(u => add('unit', u, s));
    }
    let m = s.match(/\b(?:founded|established|incorporated|formed|set up|created)\s+(?:in|on)\s+(?:[A-Z][a-z]+\s+\d{1,2},?\s+|\d{1,2}\s+[A-Z][a-z]+\s+)?((?:18|19|20)\d{2})\b/i);
    if (about(m)) add('founded', m![1], s);
    m = s.match(/\b(?:headquartered|headquarters(?:\s+is)?|head\s+office(?:\s+is)?)\s+(?:located\s+)?(?:in|at)\s+((?:[A-Z][\w'’.-]*)(?:[ ,]+(?:[A-Z][\w'’.-]*)){0,4})/);
    if (about(m)) add('headquarters', m![1], s);
    m = s.match(new RegExp(`\\bis\\s+(?:a|an|the)\\s+((?:[\\w'’-]+\\s+){0,6}?(?:${ORG_NOUN}))\\b`, 'i'));
    if (about(m) && m && !/\b(?:one of|part of)\b/i.test(m[1])) add('type', m[1].charAt(0).toUpperCase() + m[1].slice(1), s);
    m = s.match(/\b(?:provides|offers|specializ(?:es|ing) in|specialis(?:es|ing) in|deals in|focus(?:es)? on)\s+([^.;…]{5,120})/i);
    const service = m?.[1].replace(/^(?:a\s+)?(?:wide\s+|broad\s+|full\s+)?(?:range|variety|number|host|suite)\s+of\s+/i, '').replace(/^(?:the|a|an)\s+/i, '');
    if (about(m) && m && service && !/career|job|vacanc|opportunit|discount|shipping|cookie/i.test(service) && service.split(/\s+/).length >= 2 && !/(…|\.\.\.)$/.test(m[0])) add('service', service, s);
  }
  return out;
}

// ─── Wikidata (free API, structured) ─────────────────────────────────────────

const WD_UA = 'OSINT-Investigation-Platform/1.0 (organisation lookups; public data only)';
const wdCache = new Map<string, { at: number; data: any }>();
const WD_TTL = 12 * 3600 * 1000;

async function wdGet(url: string, attempt = 1): Promise<any> {
  const hit = wdCache.get(url);
  if (hit && Date.now() - hit.at < WD_TTL) return hit.data;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': WD_UA, Accept: 'application/json' }, signal: controller.signal });
    if (!res.ok) {
      // Rate limited: wait as long as Wikidata asks (at most 5 s), then try again.
      const wait = Math.min(5, Number(res.headers.get('retry-after')) || 2) * 1000;
      throw Object.assign(new Error(`Wikidata answered HTTP ${res.status}`), { retry: res.status === 429 || res.status >= 500, wait });
    }
    const data = await res.json();
    wdCache.set(url, { at: Date.now(), data });
    if (wdCache.size > 300) wdCache.delete(wdCache.keys().next().value as string);
    return data;
  } catch (e) {
    // One retry for a network error, timeout, rate limit or server error.
    if (attempt <= 2 && ((e as any)?.retry !== false)) {
      await new Promise(r => setTimeout(r, (e as any)?.wait || 800));
      return wdGet(url, attempt + 1);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const API = 'https://www.wikidata.org/w/api.php?format=json&origin=*';
const WD_ORG_TYPE = /(organi[sz]ation|company|business|enterprise|corporation|university|college|school|academy|institute|institution|agency|authority|ministry|department|government|armed forces|military|army|navy|air force|police|association|foundation|charity|non-?profit|ngo|club|society|union|federation|council|commission|bank|hospital|party|brand|manufacturer|public company|subsidiary|conglomerate|startup|cooperative|intergovernmental|international|body|group|force|service|publisher|broadcaster|newspaper|airline|operator|firm)/i;

const claimsOf = (e: any, p: string): any[] => (e?.claims?.[p] || []).filter((c: any) => c.rank !== 'deprecated').map((c: any) => c.mainsnak?.datavalue?.value).filter((v: any) => v !== undefined);
const idsOf = (e: any, p: string): string[] => claimsOf(e, p).map(v => v?.id).filter(Boolean);
/** Statements still current: no end date (P582) qualifier — e.g. today's CEO, not former ones. */
const currentIdsOf = (e: any, p: string): string[] => (e?.claims?.[p] || [])
  .filter((c: any) => c.rank !== 'deprecated' && !c.qualifiers?.P582)
  .map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
/** Aliases that are names, not identifiers or web addresses ("IAU-020164", "ug.edu.gh"). */
const nameLike = (a: string) => !/^[\w-]+\.[a-z]{2,}(\.[a-z]{2,})?$/i.test(a) && !/\d{3,}/.test(a) && a.length <= 80;

function wdTime(v: any): string | null {
  const t = String(v?.time || '');
  const m = t.match(/^[+]?(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  if ((v.precision ?? 9) >= 11 && m[2] !== '00' && m[3] !== '00') return `${m[1]}-${m[2]}-${m[3]}`;
  return m[1];
}

const REF_PROPS = ['P452', 'P159', 'P17', 'P112', 'P169', 'P488', 'P1037', 'P749', 'P355', 'P1056', 'P101', 'P131', 'P527', 'P199'];

async function wikidataClaims(org: string, websiteHosts: string[]): Promise<{ claims: OrgClaim[]; info?: OrgEnrichment['wikidata'] }> {
  const search = await wdGet(`${API}&action=wbsearchentities&type=item&language=en&limit=8&search=${encodeURIComponent(org)}`);
  const orgWords = words(org);
  const candidates: any[] = (search?.search || []).filter((s: any) => {
    const label = String(s.label || s.match?.text || '');
    return names(label, org) && words(label).length <= orgWords.length + 3;
  });
  if (candidates.length === 0) return { claims: [] };

  const ents = await wdGet(`${API}&action=wbgetentities&props=labels|descriptions|claims|aliases|sitelinks/urls&languages=en&sitefilter=enwiki&ids=${candidates.slice(0, 6).map(c => c.id).join('|')}`);
  const all: any[] = Object.values(ents?.entities || {});
  // Instance-of labels, to keep organisations only (not people, papers, places, events…).
  // One label lookup for the candidates' types and every item they refer to (fewer Wikidata requests).
  const typeIds = Array.from(new Set(all.flatMap(e => [...REF_PROPS, 'P31'].flatMap(p => idsOf(e, p)))));
  const typeLabels = await labels(typeIds);
  const orgs = all.filter(e => {
    const types = idsOf(e, 'P31');
    return !types.includes('Q5') && types.some(t => WD_ORG_TYPE.test(typeLabels[t] || ''));
  });
  if (orgs.length === 0) return { claims: [] };

  const siteHost = (e: any) => claimsOf(e, 'P856').map(u => hostOf(u));
  let chosen = websiteHosts.length ? orgs.filter(e => siteHost(e).some(h => websiteHosts.includes(h))) : [];
  if (chosen.length !== 1) {
    // Without a matching website, only an unambiguous exact-name match is used.
    const exact = orgs.filter(e => words(e.labels?.en?.value || '').join(' ') === orgWords.join(' '));
    chosen = exact.length === 1 ? exact : chosen.length === 1 ? chosen : [];
  }
  if (chosen.length !== 1) {
    return {
      claims: [],
      info: { ambiguous: orgs.slice(0, 5).map(e => ({ id: e.id, label: e.labels?.en?.value || e.id, description: e.descriptions?.en?.value, url: `https://www.wikidata.org/wiki/${e.id}` })) }
    };
  }

  const e = chosen[0];
  const url = `https://www.wikidata.org/wiki/${e.id}`;
  const missing = Array.from(new Set(REF_PROPS.flatMap(p => idsOf(e, p)))).filter(id => !typeLabels[id]);
  const L = { ...typeLabels, ...(missing.length ? await labels(missing) : {}) };
  const claims: OrgClaim[] = [];
  const src = 'Wikidata';
  const add = (field: OrgField, value: string | null | undefined, role?: string) => {
    if (value && String(value).trim()) claims.push({ field, value: String(value).trim(), source: src, sourceKind: 'wikidata', sourceUrl: url, ...(role ? { role } : {}) });
  };
  const labelled = (p: string, field: OrgField, role?: string) => idsOf(e, p).forEach(id => add(field, L[id], role));

  add('official_name', claimsOf(e, 'P1448').find(v => v?.language === 'en')?.text || claimsOf(e, 'P1448')[0]?.text);
  add('official_name', e.labels?.en?.value);
  (e.aliases?.en || []).map((a: any) => String(a.value)).filter(nameLike).slice(0, 6).forEach((a: string) => add('alt_name', a));
  claimsOf(e, 'P1813').forEach(v => add('alt_name', v?.text));
  add('description', e.descriptions?.en?.value);
  // Only instance-of values that describe an organisation (not e.g. "telegraphic address").
  idsOf(e, 'P31').filter(id => WD_ORG_TYPE.test(L[id] || '')).forEach(id => add('type', L[id]));
  labelled('P452', 'industry');
  labelled('P101', 'sector');
  labelled('P159', 'headquarters');
  labelled('P17', 'country');
  labelled('P112', 'person', 'Founder');
  currentIdsOf(e, 'P169').forEach(id => add('person', L[id], 'Chief executive officer'));
  currentIdsOf(e, 'P488').forEach(id => add('person', L[id], 'Chairperson'));
  currentIdsOf(e, 'P1037').forEach(id => add('person', L[id], 'Director / manager'));
  labelled('P749', 'parent');
  idsOf(e, 'P355').slice(0, 10).forEach(id => add('subsidiary', L[id]));
  // Parts and divisions of the organisation (armed forces → army, navy, air force; a university → its colleges).
  [...idsOf(e, 'P527'), ...idsOf(e, 'P199')].slice(0, 20).forEach(id => add('unit', L[id]));
  idsOf(e, 'P1056').slice(0, 12).forEach(id => add('product', L[id]));
  claimsOf(e, 'P571').forEach(v => add('founded', wdTime(v)));
  claimsOf(e, 'P856').forEach(v => add('website', v));
  claimsOf(e, 'P968').forEach(v => add('email', String(v).replace(/^mailto:/i, '')));
  claimsOf(e, 'P1329').forEach(v => add('phone', v));
  claimsOf(e, 'P6375').forEach(v => add('address', v?.text));
  const emp = claimsOf(e, 'P1128')[0]?.amount;
  if (emp) add('employees', String(emp).replace(/^\+/, ''));
  const coord = claimsOf(e, 'P625')[0];
  if (coord?.latitude !== undefined) add('coordinates', `${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);
  const social: Array<[string, string, (v: string) => string]> = [
    ['P2002', 'X (Twitter)', v => `https://x.com/${v}`],
    ['P2013', 'Facebook', v => `https://www.facebook.com/${v}`],
    ['P2003', 'Instagram', v => `https://www.instagram.com/${v}`],
    ['P4264', 'LinkedIn', v => `https://www.linkedin.com/company/${v}`],
    ['P2397', 'YouTube', v => `https://www.youtube.com/channel/${v}`]
  ];
  social.forEach(([p, platform, link]) => claimsOf(e, p).slice(0, 2).forEach(v => add('social', link(String(v)), platform)));
  const wikipediaUrl = e.sitelinks?.enwiki?.url;
  if (wikipediaUrl) add('social', wikipediaUrl, 'Wikipedia');

  return { claims, info: { id: e.id, url, label: e.labels?.en?.value || org, description: e.descriptions?.en?.value, ...(wikipediaUrl ? { wikipediaUrl } : {}) } };
}

async function labels(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    if (!chunk.length) continue;
    const data = await wdGet(`${API}&action=wbgetentities&props=labels&languages=en&ids=${chunk.join('|')}`);
    Object.values<any>(data?.entities || {}).forEach(e => { if (e.labels?.en?.value) out[e.id] = e.labels.en.value; });
  }
  return out;
}

// ─── Google Maps listings ────────────────────────────────────────────────────

function mapsListings(data: any, org: string, websiteHosts: string[]): MapsListing[] {
  const raw: any[] = data?.place_results ? [data.place_results] : Array.isArray(data?.local_results) ? data.local_results : [];
  return raw.flatMap(p => {
    const byName = names(String(p.title || ''), org);
    // The listing links to the organisation's known website, or to a site named exactly after it (sokoaerial.com).
    const siteLabel = hostOf(p.website).split('.')[0];
    const bySite = Boolean(p.website && (websiteHosts.includes(hostOf(p.website)) || (siteLabel.length >= 4 && siteLabel === words(org).join(''))));
    if (!byName && !bySite) return [];
    const hours = Array.isArray(p.hours)
      ? p.hours.map((h: any) => Object.entries(h).map(([d, t]) => `${d.charAt(0).toUpperCase()}${d.slice(1, 3)} ${t}`).join('')).join(' · ')
      : typeof p.operating_hours === 'object' && p.operating_hours
        ? Object.entries(p.operating_hours).map(([d, t]) => `${d.charAt(0).toUpperCase()}${d.slice(1, 3)} ${t}`).join(' · ')
        : undefined;
    const lat = p.gps_coordinates?.latitude;
    const lng = p.gps_coordinates?.longitude;
    return [{
      title: String(p.title),
      ...(Array.isArray(p.type) ? { category: p.type.join(', ') } : p.type ? { category: String(p.type) } : {}),
      ...(p.address ? { address: String(p.address) } : {}),
      ...(p.phone ? { phone: String(p.phone) } : {}),
      ...(p.website ? { website: String(p.website) } : {}),
      ...(hours ? { hours } : {}),
      ...(typeof p.rating === 'number' ? { rating: p.rating } : {}),
      ...(typeof p.reviews === 'number' ? { reviews: p.reviews } : {}),
      ...(typeof lat === 'number' && typeof lng === 'number' ? { latitude: lat, longitude: lng } : {}),
      mapsUrl: p.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}`
        : `https://www.google.com/maps/search/${encodeURIComponent(`${p.title} ${p.address || ''}`)}`,
      matchedBy: byName && bySite ? 'name and website match' : byName ? 'the listing’s name contains the organisation’s name' : 'the listing links to the organisation’s website'
    }];
  }).slice(0, 10);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const SOCIAL_HOSTS: Record<string, string> = {
  'linkedin.com': 'LinkedIn', 'facebook.com': 'Facebook', 'x.com': 'X (Twitter)', 'twitter.com': 'X (Twitter)',
  'instagram.com': 'Instagram', 'youtube.com': 'YouTube', 'tiktok.com': 'TikTok'
};
const platformOf = (url: string) => {
  const h = hostOf(url).replace(/^([a-z]{2}|m)\./, '');
  const k = Object.keys(SOCIAL_HOSTS).find(x => h === x || h.endsWith(`.${x}`));
  return k ? SOCIAL_HOSTS[k] : null;
};
/** Account pages only: not posts, videos, search or listing pages. */
const accountPage = (url: string) => {
  try {
    const p = new URL(url).pathname.replace(/\/+$/, '');
    if (/linkedin/.test(url)) return /^\/(company|school|showcase)\/[^/]+$/.test(p);
    if (/youtube/.test(url)) return /^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)$/.test(p);
    return /^\/[^/]+$/.test(p) && !/^\/(watch|search|hashtag|explore|p|reel|status|groups|events|pages|share)$/i.test(p);
  } catch { return false; }
};

/** A readable reason for a failed source (never the raw provider error). */
function failure(r: { error: string | null; data: any; quotaExhausted?: boolean }): { error?: string } {
  if (!r.error || r.data) return {};
  if (r.quotaExhausted) return { error: 'The monthly SerpApi search quota is used up' };
  if (/timed out|abort/i.test(r.error)) return { error: 'The source did not respond in time' };
  if (/not configured/i.test(r.error)) return { error: 'Search is not configured on the server' };
  return { error: 'The source could not be reached' };
}

/** 2: units (Wikidata parts, "consisting of …"), people named with the organisation, DuckDuckGo, Google News. */
export const ENRICHMENT_VERSION = 2;

export async function enrichOrganization(org: string, websiteHints: string[] = []): Promise<OrgEnrichment> {
  const serp = new SerpApiProvider();
  const quoted = `"${org}"`;
  const websiteHosts = websiteHints.map(hostOf).filter(Boolean);
  const socialSites = '(site:linkedin.com/company OR site:facebook.com OR site:x.com OR site:instagram.com OR site:youtube.com)';

  const [maps, google, google2, ddg, social, videos, gnews, wd] = await Promise.all([
    serp.request('google_maps', { q: org, type: 'search', ll: '@20,0,3z', hl: 'en' }),
    // Same parameters as the name search's broad query, so page 1 usually comes from the cache.
    serp.request('google', { q: quoted, num: 10 }),
    serp.request('google', { q: quoted, num: 10, start: 10 }),
    // DuckDuckGo: an independent index that respects the exact name (Bing through SerpApi ignores the
    // quotation marks and returns results for the server's region, so it is not used here).
    serp.request('duckduckgo', { q: quoted }),
    serp.request('google', { q: `${quoted} ${socialSites}`, num: 20, hl: 'en' }),
    // The name search's own YouTube query, so it is usually cached too.
    serp.request('youtube', { search_query: org }),
    serp.request('google_news', { q: quoted, hl: 'en' }),
    wikidataClaims(org, websiteHosts).then(r => ({ ...r, error: null as string | null })).catch(e => {
      console.warn('[orgEnrichment] Wikidata:', (e as Error)?.message, (e as any)?.cause?.code || '');
      return { claims: [] as OrgClaim[], info: undefined, error: (e as Error).message || 'Wikidata could not be reached' };
    })
  ]);

  const claims: OrgClaim[] = [...wd.claims];
  const mentions: OrgMention[] = [];
  const sources: OrgEnrichment['sources'] = [];
  const status = (r: { error: string | null; data: any }, n: number) => (r.error && !r.data ? 'failed' as const : n ? 'ok' as const : 'empty' as const);

  // Maps: the listings that are the organisation's (name or website match).
  const listings = mapsListings(maps.data, org, websiteHosts);
  // Organisation-level facts only from the organisation's own listing (its exact name, or linking to its
  // website); branch, shop or office listings are kept as locations only.
  const orgWords = words(org).join(' ');
  listings.filter(l => words(l.title).join(' ') === orgWords || l.matchedBy.includes('website')).forEach(l => {
    const base ={ source: `Google Maps listing “${l.title}”`, sourceKind: 'maps' as const, sourceUrl: l.mapsUrl };
    if (titleName(l.title, org)) claims.push({ field: 'official_name', value: l.title, ...base });
    if (l.address) claims.push({ field: 'address', value: l.address, ...base });
    if (l.phone) claims.push({ field: 'phone', value: l.phone, ...base });
    if (l.website) claims.push({ field: 'website', value: l.website, ...base });
    if (l.hours) claims.push({ field: 'hours', value: l.hours, ...base });
    if (l.latitude !== undefined && l.longitude !== undefined) claims.push({ field: 'coordinates', value: `${l.latitude.toFixed(5)}, ${l.longitude.toFixed(5)}`, ...base });
  });
  const mapsRaw = maps.data?.place_results ? 1 : (maps.data?.local_results || []).length;
  sources.push({ label: 'Google Maps', status: status(maps, mapsRaw), results: mapsRaw, used: listings.length, ...failure(maps) });

  // Web searches: snippets that name the organisation.
  const web = (r: typeof google, label: string, kind: OrgClaim['sourceKind'], engine: string) => {
    const items: any[] = r.data?.organic_results || [];
    let used = 0;
    items.forEach(it => {
      const text = `${it.title || ''}. ${it.snippet || ''}`;
      if (!it.link || !names(text, org)) return;
      used++;
      const site = hostOf(it.link);
      const src = `${label}: ${site}`;
      const found = snippetClaims(String(it.snippet || ''), org, src, kind, it.link);
      claims.push(...found);
      // People the result names with a role, next to the organisation (role as written; may be another body's).
      peopleFromText(String(it.snippet || ''), org).forEach(p => claims.push({ field: 'person', value: p.name, role: p.role, source: src, sourceKind: kind, sourceUrl: it.link, quote: p.quote }));
      // The name as the page title writes it, and a result that is probably the organisation's own site.
      const titled = titleName(String(it.title || ''), org);
      if (titled) claims.push({ field: 'official_name', value: titled, source: src, sourceKind: kind, sourceUrl: it.link, quote: clip(String(it.title), 160) });
      const own = siteCandidate(it.link, String(it.title || ''), org);
      if (own) claims.push({ field: 'website', value: own, source: `${label} result titled “${clip(String(it.title), 80)}”`, sourceKind: kind, sourceUrl: it.link });
      if (!platformOf(it.link)) mentions.push({ title: String(it.title || it.link), url: it.link, snippet: it.snippet, source: site, engine, ...(it.date ? { date: String(it.date) } : {}) });
    });
    sources.push({ label, status: status(r, items.length), results: items.length, used, ...failure(r) });
  };
  web(google, 'Google search', 'search', 'google');
  web(google2, 'Google search (page 2)', 'search', 'google');
  web(ddg, 'DuckDuckGo search', 'search', 'duckduckgo');

  // Google News: articles naming the organisation (mentions, activities, and facts stated in them).
  const newsItems: any[] = (gnews.data?.news_results || []).flatMap((n: any) => (Array.isArray(n.stories) ? n.stories : [n]));
  let newsUsed = 0;
  newsItems.forEach(n => {
    const text = `${n.title || ''}. ${n.snippet || ''}`;
    if (!n.link || !names(text, org)) return;
    newsUsed++;
    const outlet = String(n.source?.name || hostOf(n.link));
    claims.push(...snippetClaims(text, org, `Google News: ${outlet}`, 'search', n.link));
    peopleFromText(text, org).forEach(p => claims.push({ field: 'person', value: p.name, role: p.role, source: `Google News: ${outlet}`, sourceKind: 'search', sourceUrl: n.link, quote: p.quote }));
    mentions.push({ title: String(n.title), url: n.link, snippet: n.snippet, source: outlet, engine: 'google_news', ...(n.date ? { date: String(n.date).split(',')[0] } : {}) });
  });
  sources.push({ label: 'Google News', status: status(gnews, newsItems.length), results: newsItems.length, used: newsUsed, ...failure(gnews) });

  // Official accounts: account pages whose title names the organisation.
  const socialItems: any[] = social.data?.organic_results || [];
  let socialUsed = 0;
  socialItems.forEach(it => {
    const platform = it.link ? platformOf(it.link) : null;
    if (!platform || !accountPage(it.link) || !names(String(it.title || ''), org)) return;
    socialUsed++;
    const titled = titleName(String(it.title || ''), org);
    if (titled) claims.push({ field: 'official_name', value: titled, source: `${platform} account`, sourceKind: 'social', sourceUrl: it.link, quote: clip(String(it.title), 160) });
    claims.push({ field: 'social', value: String(it.link).replace(/[?#].*$/, ''), role: platform, source: `Google search result (${platform})`, sourceKind: 'social', sourceUrl: it.link, quote: clip(String(it.title || ''), 160) });
  });
  sources.push({ label: 'Social platforms (Google)', status: status(social, socialItems.length), results: socialItems.length, used: socialUsed, ...failure(social) });

  // Videos naming the organisation.
  const videoItems: any[] = videos.data?.video_results || [];
  const vids: OrgMention[] = videoItems
    .filter(v => v.link && names(`${v.title || ''} ${v.description || ''} ${v.channel?.name || ''}`, org))
    .slice(0, 12)
    .map(v => ({
      title: String(v.title), url: v.link, snippet: v.description, source: String(v.channel?.name || 'YouTube'), engine: 'youtube',
      ...(v.published_date ? { date: String(v.published_date) } : {}),
      ...(v.thumbnail?.static || typeof v.thumbnail === 'string' ? { thumbnail: String(v.thumbnail?.static || v.thumbnail) } : {})
    }));
  sources.push({ label: 'YouTube', status: status(videos, videoItems.length), results: videoItems.length, used: vids.length, ...failure(videos) });

  sources.push({
    label: 'Wikidata',
    status: wd.error ? 'failed' : wd.claims.length ? 'ok' : 'empty',
    results: wd.claims.length ? 1 : 0,
    used: wd.claims.length ? 1 : 0,
    ...(wd.error ? { error: 'Wikidata could not be reached' } : {})
  });

  // One mention per page.
  const seen = new Set<string>();
  return {
    version: ENRICHMENT_VERSION,
    name: org,
    checkedAt: new Date().toISOString(),
    claims,
    mapsListings: listings,
    ...(wd.info ? { wikidata: wd.info } : {}),
    mentions: mentions.filter(m => (seen.has(m.url) ? false : (seen.add(m.url), true))).slice(0, 30),
    videos: vids,
    sources
  };
}

/**
 * Suggestions while typing: entities whose name or alias matches (Wikidata search — free, no SerpApi).
 * They are only suggestions for the user to pick from; nothing is attributed.
 */
export async function suggestEntities(q: string): Promise<Array<{ id: string; label: string; description: string; url: string }>> {
  const data = await wdGet(`${API}&action=wbsearchentities&type=item&language=en&uselang=en&limit=10&search=${encodeURIComponent(q)}`);
  return (data?.search || [])
    .filter((s: any) => s.label && s.description && !/^(wikimedia|scholarly article|scientific article|encyclopedic article|journal|chemical compound|family name|given name|male given name|female given name|disambiguation|species|genus|type of insect)/i.test(String(s.description)))
    .slice(0, 6)
    .map((s: any) => ({ id: String(s.id), label: String(s.label), description: String(s.description), url: `https://www.wikidata.org/wiki/${s.id}` }));
}
