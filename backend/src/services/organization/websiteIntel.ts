import { peopleFromHeadings, peopleFromText, personKey } from './peopleExtract';
import dns from 'dns/promises';
import net from 'net';

/**
 * Website intelligence for an organisation: reads the public pages of its (likely) official website —
 * home, About, Contact, Services, Products, Leadership/Team, Locations, News — and extracts only what
 * the pages state: titles, descriptions, contact details, addresses, social links and schema.org data.
 * No SerpApi searches are used. Nothing is inferred; missing items stay missing.
 *
 * Safety: only public http(s) hosts (private, loopback and link-local addresses are refused, including
 * after redirects), pages on the same site only, at most 8 pages, 1.5 MB and 10 s per page.
 */

export type PageKind = 'home' | 'about' | 'contact' | 'services' | 'products' | 'programs' | 'leadership' | 'departments' | 'locations' | 'news' | 'projects' | 'publications' | 'events' | 'admissions' | 'careers';

export interface WebsitePage {
  kind: PageKind;
  url: string;
  title: string;
  description?: string;
  /** Opening paragraphs of the page, as written. */
  text: string[];
  /** Section headings as written (e.g. service names on a Services page). */
  headings: string[];
  emails: string[];
  phones: string[];
  addresses: string[];
}

export interface WebsiteIntel {
  requestedUrl: string;
  finalUrl?: string;
  reachable: boolean;
  error?: string;
  verification: { status: 'verified' | 'probable' | 'unverified'; reasons: string[] };
  siteName?: string;
  pages: WebsitePage[];
  /** schema.org Organization data the site publishes about itself. */
  structured: Array<{ label: string; value: string; url: string }>;
  socialLinks: Array<{ platform: string; url: string; foundOn: string }>;
  emails: Array<{ value: string; foundOn: string }>;
  phones: Array<{ value: string; foundOn: string }>;
  addresses: Array<{ value: string; foundOn: string }>;
  /** People the site names with a role (leadership, about and home pages), with the words they came from. */
  people?: Array<{ name: string; role: string; url: string; quote: string }>;
  /** Other websites the official site links to (units, affiliates, partners), as the site labels them. */
  linkedSites?: Array<{ url: string; host: string; text: string }>;
  fetchedAt: string;
}

const MAX_PAGES = 14;
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 10_000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ─── Safe fetching ────────────────────────────────────────────────────────────

function privateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.') || v.startsWith('::ffff:192.168.');
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http and https websites can be read.');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('Only websites on the standard ports can be read.');
  if (u.username || u.password) throw new Error('Website addresses with credentials are not allowed.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error('This address is not a public website.');
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map(a => a.address);
  if (addrs.length === 0 || addrs.some(privateAddress)) throw new Error('This address is not a public website.');
  return u;
}

async function fetchPage(raw: string): Promise<{ url: string; html: string }> {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    const u = await assertPublicUrl(url);
    const res = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, u).toString();
      continue;
    }
    if (!res.ok) throw new Error(`The website answered with HTTP ${res.status}.`);
    if (!/text\/html|application\/xhtml/i.test(res.headers.get('content-type') || 'text/html')) throw new Error('The address is not a web page.');
    const reader = res.body?.getReader();
    if (!reader) return { url: u.toString(), html: await res.text() };
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      size += value.length;
      chunks.push(value);
      if (size > MAX_BYTES) { await reader.cancel(); break; }
    }
    return { url: u.toString(), html: Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8') };
  }
  throw new Error('Too many redirects.');
}

// ─── Extraction (plain text parsing; nothing is executed) ────────────────────

const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const clean = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function meta(html: string, name: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i');
  const m = html.match(re);
  const v = m && (m[1] || m[2]);
  return v ? decode(v).trim() || undefined : undefined;
}

function stripNoise(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(nav|header|footer|form|svg)[\s\S]*?<\/\1>/gi, ' ');
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const JUNK_EMAIL = /\.(png|jpe?g|gif|webp|svg|css|js)$|@(example|sentry|wixpress|domain|email)\./i;

/** Cloudflare's email protection writes addresses as hex XOR-encoded data-cfemail attributes; this is the standard decoding. */
function cfDecode(hex: string): string {
  const key = parseInt(hex.slice(0, 2), 16);
  let out = '';
  for (let i = 2; i + 1 < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

/** Scripts and styles removed, but headers/footers kept: contact details usually live in the footer. */
const withoutCode = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');

function emailsIn(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) out.add(decode(m[1]).toLowerCase());
  for (const m of html.matchAll(/data-cfemail=["']([0-9a-f]{4,})["']/gi)) out.add(cfDecode(m[1]).toLowerCase());
  for (const m of clean(withoutCode(html)).matchAll(EMAIL_RE)) out.add(m[0].toLowerCase());
  return Array.from(out).filter(e => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e) && !JUNK_EMAIL.test(e)).slice(0, 10);
}

function phonesIn(html: string): string[] {
  const out = new Map<string, string>();
  // Tidy the number as written: "(+233) 302…" / "+233) 302…" → "+233 302…"; unbalanced brackets removed.
  const tidy = (v: string) => {
    let s = v.trim().replace(/^\(?\s*(\+\d{1,4})\s*\)\s*/, '$1 ');
    if ((s.match(/\(/g) || []).length !== (s.match(/\)/g) || []).length) s = s.replace(/[()]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  };
  const add = (v: string) => { const d = v.replace(/\D/g, ''); if (d.length >= 9 && d.length <= 15 && !out.has(d.slice(-9))) out.set(d.slice(-9), tidy(v)); };
  for (const m of html.matchAll(/href=["']tel:([^"']+)["']/gi)) add(decode(m[1]));
  const text = clean(withoutCode(html));
  for (const m of text.matchAll(/\(?\+\d[\d\s().-]{7,18}\d/g)) add(m[0]);
  for (const m of text.matchAll(/\b(?:tel|telephone|phone|call|mobile|whatsapp|hotline)\b[\s.:#-]*(\+?\d[\d\s().-]{7,16}\d)/gi)) add(m[1]);
  return Array.from(out.values()).slice(0, 10);
}

function jsonLd(html: string): any[] {
  const out: any[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const v = JSON.parse(m[1].trim());
      const list = Array.isArray(v) ? v : Array.isArray(v?.['@graph']) ? v['@graph'] : [v];
      out.push(...list);
    } catch { /* invalid JSON-LD is ignored */ }
  }
  return out;
}

const ORG_TYPES = /Organization|Corporation|LocalBusiness|EducationalOrganization|GovernmentOrganization|NGO|Company|Store|Hospital|School|CollegeOrUniversity|MilitaryOrganization/i;

function addressText(a: any): string | null {
  if (!a) return null;
  if (typeof a === 'string') return a.trim() || null;
  const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, typeof a.addressCountry === 'string' ? a.addressCountry : a.addressCountry?.name].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function addressesIn(html: string): string[] {
  const out = new Set<string>();
  jsonLd(html).forEach(n => {
    const a = addressText(n?.address);
    if (a) out.add(a);
  });
  for (const m of html.matchAll(/<address[^>]*>([\s\S]*?)<\/address>/gi)) {
    const t = clean(m[1]);
    if (t.length >= 8 && t.length <= 200) out.add(t);
  }
  return Array.from(out).slice(0, 6);
}

function paragraphs(html: string): string[] {
  const body = stripNoise(html);
  const out: string[] = [];
  for (const m of body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = clean(m[1]);
    if (t.length >= 60 && !/cookie|javascript|browser|©|all rights reserved/i.test(t)) out.push(t.slice(0, 500));
    if (out.length >= 3) break;
  }
  return out;
}

function headings(html: string): string[] {
  const body = stripNoise(html);
  const out: string[] = [];
  for (const m of body.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const t = clean(m[2]);
    if (t.length >= 3 && t.length <= 90 && !out.includes(t)) out.push(t);
    if (out.length >= 30) break;
  }
  return out;
}

/**
 * Short text blocks in page order (headings, bold text, captions, card lines) — where leadership pages put
 * a person's name and, next to it, their role.
 */
function shortBlocks(html: string): string[] {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, ' ')
    // A heading's text as one block even when split into spans ("<span>Prof. Emmanuel</span><span>S.</span>…").
    .replace(/<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi, (_m, tag, attrs, inner) => `<${tag}${attrs}>${clean(inner)}</${tag}>`);
  const out: string[] = [];
  for (const m of body.matchAll(/<(h[1-6]|p|span|strong|b|em|small|li|td|figcaption|div|a)\b[^>]*>([^<]{3,120})</gi)) {
    const t = clean(m[2]);
    if (t.length >= 3 && t.length <= 110 && out[out.length - 1] !== t) out.push(t);
    if (out.length >= 600) break;
  }
  return out;
}

const SOCIAL: Array<[RegExp, string]> = [
  [/facebook\.com\/(?!sharer|share|dialog|plugins|tr\?)/i, 'Facebook'], [/instagram\.com\//i, 'Instagram'], [/linkedin\.com\/(company|in|school)\//i, 'LinkedIn'],
  [/(?:twitter|x)\.com\/(?!intent|share|home)/i, 'X (Twitter)'], [/youtube\.com\/(@|channel|c\/|user)/i, 'YouTube'], [/tiktok\.com\/@/i, 'TikTok'], [/wa\.me\/|whatsapp\.com\//i, 'WhatsApp']
];

function socialIn(html: string): Array<{ platform: string; url: string }> {
  const out = new Map<string, { platform: string; url: string }>();
  for (const m of html.matchAll(/href=["'](https?:\/\/[^"'#\s]+)["']/gi)) {
    const url = decode(m[1]).replace(/\/$/, '');
    const hit = SOCIAL.find(([re]) => re.test(url));
    if (hit && !out.has(url)) out.set(url, { platform: hit[1], url });
  }
  return Array.from(out.values()).slice(0, 12);
}

const PAGE_PATTERNS: Array<[PageKind, RegExp]> = [
  ['about', /about|who-we-are|our-story|company|profile|overview/i],
  ['contact', /contact|reach-us|get-in-touch/i],
  ['services', /services?|what-we-do|solutions|capabilities|industries/i],
  ['products', /products?|shop|store|catalog/i],
  ['leadership', /leadership|our-team|\bteam\b|management-team|board-of|\bboard\b|executives?|our-people|founders?|high-command|principal-officers|governing-council|trustees/i],
  ['locations', /locations?|offices?|branches|find-us|where-we-are/i],
  ['news', /news|press|media|blog|updates|announcements/i],
  ['programs', /programm?es?|courses|academics|initiatives/i],
  ['departments', /departments?|divisions?|units|faculties|schools|directorates?|colleges|institutes|centres|centers|branches-of|arms-of-service/i],
  ['events', /events?|calendar|conferences?/i],
  ['admissions', /admissions?|how-to-apply|apply-now/i],
  ['careers', /careers?|jobs|vacanc|recruitment|join-us|work-with-us/i],
  ['projects', /projects?|portfolio|case-studies|our-work/i],
  ['publications', /publications?|reports?|resources|research|downloads/i]
];

/** Link texts that name a page kind exactly ("About us", "Contact", "Our team"). */
const EXACT_TEXT: Array<[PageKind, RegExp]> = [
  ['about', /^(about|about us|who we are|our story|our company|company|about the company)$/i],
  ['contact', /^(contact|contact us|get in touch|reach us)$/i],
  ['services', /^(services|our services|what we do|solutions)$/i],
  ['products', /^(products|our products|shop|store)$/i],
  ['leadership', /^(leadership|our leadership|leadership team|our team|team|management|management team|board|board of directors|board of trustees|trustees|our people|founders|command|high command|higher command|administration|principal officers|governing council|council|executive team|executives|directors)$/i],
  ['locations', /^(locations|our locations|offices|our offices|branches|find us)$/i],
  ['news', /^(news|newsroom|press|media|blog|press releases)$/i],
  ['programs', /^(programs|programmes|our programmes|our programs|courses|academics)$/i],
  ['departments', /^(departments|divisions|faculties|units|directorates|schools|colleges|institutes|centres|centers|arms of service|our units)$/i],
  ['events', /^(events|upcoming events|calendar|conferences)$/i],
  ['admissions', /^(admissions|admission|apply|apply now|how to apply)$/i],
  ['careers', /^(careers|career|jobs|vacancies|recruitment|join us|work with us)$/i],
  ['projects', /^(projects|our projects|our work|portfolio|case studies)$/i],
  ['publications', /^(publications|reports|resources|research|downloads)$/i]
];

/**
 * Picks one page per kind from the home page's links on the same site. Best evidence wins: link text that
 * names the kind exactly, then a path segment that does, then a looser match; a shorter path breaks ties.
 */
function discoverPages(html: string, base: URL): Array<{ kind: PageKind; url: string }> {
  const best = new Map<PageKind, { url: string; score: number; depth: number }>();
  const host = base.hostname.replace(/^www\./, '');
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u: URL;
    try { u = new URL(decode(m[1]), base); } catch { continue; }
    if (u.hostname.replace(/^www\./, '') !== host || !/^https?:$/.test(u.protocol) || u.pathname === '/') continue;
    if (/\.(pdf|jpe?g|png|zip|docx?)$/i.test(u.pathname)) continue;
    const text = clean(m[2]).trim();
    const segments = u.pathname.toLowerCase().split('/').filter(Boolean);
    const depth = segments.length;
    // The kind this link names most clearly.
    let pick: { kind: PageKind; score: number } | null = null;
    for (const [kind, re] of PAGE_PATTERNS) {
      const exact = EXACT_TEXT.find(([k]) => k === kind)![1];
      const score = exact.test(text) ? 3
        : segments.some(sg => exact.test(sg.replace(/[-_]/g, ' '))) ? 2
          : re.test(`${u.pathname} ${text}`) ? 1 : 0;
      if (score > (pick?.score || 0)) pick = { kind, score };
    }
    if (!pick) continue;
    const cur = best.get(pick.kind);
    if (!cur || pick.score > cur.score || (pick.score === cur.score && depth < cur.depth)) best.set(pick.kind, { url: u.toString().split('#')[0], score: pick.score, depth });
  }
  // A loose match on a deep path (e.g. /en-us/education/devices/overview) is too weak to call it that page.
  // Events, admissions and careers pages need the link text or a path part that names them exactly
  // (a loose match picks up "preventive" or "temporary admission").
  return Array.from(best.entries())
    .filter(([kind, v]) => v.score >= 2 || (v.depth <= 2 && !['events', 'admissions', 'careers'].includes(kind)))
    .map(([kind, v]) => ({ kind, url: v.url }));
}

function readPage(kind: PageKind, url: string, html: string): WebsitePage {
  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') || url;
  return {
    kind, url, title,
    description: meta(html, 'description') || meta(html, 'og:description'),
    text: paragraphs(html),
    headings: headings(html),
    emails: emailsIn(html), phones: phonesIn(html), addresses: addressesIn(html)
  };
}

// ─── Verification ────────────────────────────────────────────────────────────

const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 1 && !['the', 'of', 'and', 'ltd', 'limited', 'inc', 'plc', 'llc', 'co'].includes(w));
const nameIn = (text: string, name: string) => { const t = new Set(words(text)); const n = words(name); return n.length > 0 && n.every(w => t.has(w)); };
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Our own messages are already readable; network errors (ENOTFOUND, timeouts, TLS) are translated. */
function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : '';
  const code = String((e as any)?.code || (e as any)?.cause?.code || '');
  if (/ENOTFOUND|EAI_AGAIN/.test(code + msg)) return 'The website address could not be found (it may no longer exist).';
  if (/abort|timeout|ETIMEDOUT/i.test(code + msg + String((e as any)?.name || ''))) return 'The website did not respond in time.';
  if (/ECONNREFUSED|ECONNRESET/.test(code + msg)) return 'The website refused the connection.';
  if (/CERT|SSL|TLS/i.test(code + msg)) return 'The website’s security certificate could not be checked.';
  if (/^(Only |Website addresses|This address|The website answered|The address is not|Too many redirects)/.test(msg)) return msg;
  return 'The website could not be reached.';
}

/**
 * listedBy: independent sources that list this address as the organisation's website (Google knowledge panel,
 * Wikidata, Google Maps listing…); each one counts as a verification signal.
 */
export async function readOrganizationWebsite(rawUrl: string, orgName: string, listedBy: string[] = []): Promise<WebsiteIntel> {
  const fetchedAt = new Date().toISOString();
  const empty = (error: string): WebsiteIntel => ({
    requestedUrl: rawUrl, reachable: false, error, verification: { status: 'unverified', reasons: ['The website could not be read.'] },
    pages: [], structured: [], socialLinks: [], emails: [], phones: [], addresses: [], fetchedAt
  });
  let home: { url: string; html: string };
  try {
    home = await fetchPage(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch (e) {
    return empty(friendlyError(e));
  }
  const base = new URL(home.url);
  const pages: WebsitePage[] = [readPage('home', home.url, home.html)];
  const htmls = [home.html];
  for (const p of discoverPages(home.html, base).slice(0, MAX_PAGES - 1)) {
    try {
      const got = await fetchPage(p.url);
      if (new URL(got.url).hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue;
      pages.push(readPage(p.kind, got.url, got.html));
      htmls.push(got.html);
    } catch { /* a page that cannot be read is skipped */ }
  }

  // schema.org Organization data published by the site itself.
  const structured: WebsiteIntel['structured'] = [];
  const orgNode = htmls.flatMap(jsonLd).find(n => ORG_TYPES.test(String(n?.['@type'] || '')));
  if (orgNode) {
    const add = (label: string, v: unknown) => {
      const value = typeof v === 'string' ? v : Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean).join(', ') : typeof v === 'object' && v ? ((v as any).name || addressText(v)) : null;
      if (value && String(value).length <= 300) structured.push({ label, value: String(value), url: home.url });
    };
    // The site's own schema.org type, when more specific than plain "Organization" ("LocalBusiness" → "Local business").
    const types = (Array.isArray(orgNode['@type']) ? orgNode['@type'] : [orgNode['@type']]).map(String).filter(t => t && !/^(Organization|Thing|WebSite|WebPage)$/i.test(t));
    if (types.length) {
      add('Type', types.map(t => {
        const w = t.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1);
      }).join(', '));
    }
    add('Name', orgNode.name); add('Legal name', orgNode.legalName); add('Description', orgNode.description);
    add('Founded', orgNode.foundingDate); add('Founders', orgNode.founder || orgNode.founders); add('Address', orgNode.address);
    add('Telephone', orgNode.telephone); add('Email', orgNode.email); add('Area served', orgNode.areaServed);
    add('Profiles (sameAs)', orgNode.sameAs);
  }

  const siteName = meta(home.html, 'og:site_name') || (orgNode?.name ? String(orgNode.name) : undefined);
  const homeTitle = pages[0].title;

  // Verification: several independent signals, never a guess.
  const reasons: string[] = [];
  Array.from(new Set(listedBy)).slice(0, 3).forEach(src => reasons.push(`${src} lists this website for the organisation.`));
  if (nameIn(`${homeTitle} ${siteName || ''}`, orgName)) reasons.push(`The site’s own title/name (“${siteName || homeTitle}”) contains the organisation name.`);
  if (orgNode?.name && nameIn(String(orgNode.name), orgName)) reasons.push('The site publishes structured organisation data with this name.');
  const host = base.hostname.replace(/^www\./, '').split('.')[0];
  const initials = words(orgName).length >= 3 ? words(orgName).map(w => w[0]).join('') : '';
  if ((compact(orgName).length >= 4 && (host === compact(orgName) || compact(orgName).startsWith(host) || host.startsWith(compact(orgName)))) || (initials.length >= 3 && host.startsWith(initials) && host.length <= initials.length + 8)) reasons.push(`The web address (${base.hostname}) matches the name.`);
  const status: WebsiteIntel['verification']['status'] = reasons.length >= 2 ? 'verified' : reasons.length === 1 ? 'probable' : 'unverified';
  if (status === 'unverified') reasons.push('The site does not show the organisation’s name, so it may not be its official website.');

  const collect = (pick: (p: WebsitePage) => string[]) => {
    const m = new Map<string, { value: string; foundOn: string }>();
    pages.forEach(p => pick(p).forEach(v => { const k = v.toLowerCase().replace(/\s+/g, ''); if (!m.has(k)) m.set(k, { value: v, foundOn: p.url }); }));
    return Array.from(m.values());
  };
  const socialLinks = new Map<string, { platform: string; url: string; foundOn: string }>();
  htmls.forEach((h, i) => socialIn(h).forEach(s => { if (!socialLinks.has(s.url)) socialLinks.set(s.url, { ...s, foundOn: pages[i]?.url || home.url }); }));

  // People named with a role on the leadership, about and home pages (the organisation's own statements).
  const people = new Map<string, { name: string; role: string; url: string; quote: string }>();
  pages.forEach((p, i) => {
    if (!['leadership', 'about', 'home'].includes(p.kind)) return;
    [...peopleFromHeadings(shortBlocks(htmls[i] || ''), orgName), ...peopleFromText(p.text.join(' '), orgName)].forEach(x => {
      const k = personKey(x.name);
      if (!people.has(k)) people.set(k, { ...x, url: p.url });
    });
  });

  // Other websites the official site links to (units, affiliated bodies, partners), with the site's own label.
  const linkedSites = new Map<string, { url: string; host: string; text: string }>();
  const ownHost = base.hostname.replace(/^www\./, '');
  for (const m of home.html.matchAll(/<a[^>]+href=["'](https?:\/\/[^"'#\s]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = decode(m[1]);
    let h = '';
    try { h = new URL(url).hostname.replace(/^www\./, ''); } catch { continue; }
    const text = clean(m[2]).trim();
    if (!h || h === ownHost || h.endsWith('.' + ownHost) || SOCIAL.some(([re]) => re.test(url))) continue;
    if (/(^|\.)(google|gstatic|apple|w3|wordpress|jquery|cloudflare|bootstrapcdn|fontawesome|addtoany|sharethis)\./i.test(h)) continue;
    if (!text || text.length > 80 || linkedSites.has(h)) continue;
    linkedSites.set(h, { url, host: h, text });
  }

  return {
    requestedUrl: rawUrl, finalUrl: home.url, reachable: true,
    verification: { status, reasons },
    ...(siteName ? { siteName } : {}),
    pages, structured,
    socialLinks: Array.from(socialLinks.values()),
    emails: collect(p => p.emails), phones: collect(p => p.phones), addresses: collect(p => p.addresses),
    people: Array.from(people.values()).slice(0, 25),
    linkedSites: Array.from(linkedSites.values()).slice(0, 20),
    fetchedAt
  };
}
