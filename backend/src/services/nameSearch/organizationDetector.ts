/**
 * Decides whether a name search is about an organisation (company, institution, association…) and
 * gathers the organisation's public facts. It uses only what the name search already returned — the
 * Google knowledge panel and the kept results — so it costs no extra SerpApi searches.
 *
 * Nothing is inferred: every fact carries its source; a fact the sources do not give is simply absent
 * (the page shows "Not found"). Similar names are not merged: the knowledge panel and website are only
 * used when their name matches the searched name.
 */

export interface OrgFact {
  label: string;
  value: string;
  source: string;
  sourceUrl?: string;
}

export interface OrgSignal {
  signal: string;
  matched: boolean;
}

export interface OrganizationProfile {
  name: string;
  type?: OrgFact;
  description?: OrgFact;
  /** Every other fact the knowledge panel lists (headquarters, founded, CEO, phone, products…). */
  facts: OrgFact[];
  website?: { url: string; basis: string; source: string };
  socialProfiles: Array<{ platform: string; url: string; source: string }>;
  signals: OrgSignal[];
  hasKnowledgePanel: boolean;
}

export interface OrganizationDetection {
  kind: 'organization' | 'person' | 'unclear';
  reason: string;
  profile?: OrganizationProfile;
  /** When the search is an abbreviation: the full names the results give for it, with their support. */
  resolution?: EntityResolution;
}

export interface EntityResolution {
  query: string;
  /** resolved: one full name is clearly supported; ambiguous: several are; possible: only weak support. */
  kind: 'resolved' | 'ambiguous' | 'possible';
  candidates: Array<{ name: string; support: number; sources: Array<{ title: string; url: string }> }>;
}

// ─── Abbreviations ───────────────────────────────────────────────────────────

const CONNECTORS = new Set(['of', 'and', 'for', 'the', '&', 'de', 'du', 'des', 'la', 'le', 'in', 'at', 'on']);

/** A search that looks like an abbreviation: one word of 2–8 letters/digits ("UPSA", "knust", "ECG"). */
export function looksLikeAbbreviation(q: string): boolean {
  const t = q.trim();
  return /^[A-Za-z][A-Za-z0-9&.]{1,7}$/.test(t) && !/^[A-Z][a-z]{3,}$/.test(t);
}

/** Initials of a full name, skipping connecting words: "University of Professional Studies, Accra" → "upsa". */
function initialsOf(name: string): string {
  return name.replace(/[,()]/g, ' ').split(/\s+/).filter(w => w && !CONNECTORS.has(w.toLowerCase())).map(w => w.replace(/[^A-Za-z0-9]/g, '')[0] || '').join('').toLowerCase();
}

const NAME_WORD = "[A-Z][\\w'’.-]*";
const FULL_NAME = `(${NAME_WORD}(?:,?\\s+(?:(?:of|and|for|the|&|de|du|des|la|le|in|at|on)\\s+)?${NAME_WORD}){1,9})`;

/**
 * Full names the search results give for an abbreviation: "University of Professional Studies, Accra (UPSA)",
 * "UPSA – University of Professional Studies", "Kwame Nkrumah University of Science and Technology | KNUST".
 * A full name is only kept when its initials spell the abbreviation. Support = distinct sites.
 */
export function resolveAbbreviation(query: string, broadData: any): EntityResolution | undefined {
  if (!looksLikeAbbreviation(query)) return undefined;
  const acr = query.replace(/[^A-Za-z0-9]/g, '');
  const A = acr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`${FULL_NAME}\\s*\\(\\s*${A}\\s*\\)`, 'g'),
    new RegExp(`\\b${A}\\b\\s*[-–—|:]\\s*(?:The\\s+)?${FULL_NAME}`, 'g'),
    new RegExp(`${FULL_NAME}\\s*[-–—|:]\\s*${A}\\b`, 'g')
  ];
  const found = new Map<string, { name: string; sites: Map<string, { title: string; url: string }> }>();
  const consider = (text: string, title: string, url: string) => {
    for (const re of patterns) {
      for (const m of String(text || '').matchAll(re)) {
        // Trim leading words until the initials spell the abbreviation ("Welcome to the University of …").
        const parts = m[1].replace(/\s+/g, ' ').trim().split(' ');
        for (let i = 0; i < parts.length; i++) {
          const cand = parts.slice(i).join(' ').replace(/^(?:the)\s+/i, '').replace(/[,\s]+$/, '');
          if (initialsOf(cand) === acr.toLowerCase() && cand.split(' ').length >= 2) {
            const key = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
            const site = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
            const cur = found.get(key) || { name: cand, sites: new Map() };
            if (!cur.sites.has(site)) cur.sites.set(site, { title: String(title || site).slice(0, 120), url });
            // Prefer the most complete wording ("…, Accra" over "…").
            if (cand.length > cur.name.length) cur.name = cand;
            found.set(key, cur);
            break;
          }
        }
      }
    }
  };
  const kg = broadData?.knowledge_graph;
  if (kg?.title) consider(`${kg.title} (${acr})`, `Google knowledge panel: ${kg.title}`, `https://www.google.com/search?q=${encodeURIComponent(acr)}`);
  (broadData?.organic_results || []).forEach((r: any) => consider(`${r.title || ''} . ${r.snippet || ''}`, r.title, r.link));

  // Names that differ only by a trailing place are one candidate ("… Studies" and "… Studies, Accra").
  const list = Array.from(found.values())
    .map(c => ({ name: c.name, support: c.sites.size, sources: Array.from(c.sites.values()).slice(0, 5) }))
    .sort((a, b) => b.support - a.support);
  if (!list.length) return undefined;
  const top = list[0];
  const rivals = list.slice(1).filter(c => c.support >= 2);
  const kind: EntityResolution['kind'] = rivals.length ? 'ambiguous' : top.support >= 2 ? 'resolved' : 'possible';
  return { query, kind, candidates: list.slice(0, 5) };
}

const ORG_TYPE_RE = /\b(company|corporation|organi[sz]ation|business|enterprise|firm|agency|authority|ministry|department|government|military|armed forces|army|navy|air force|police|university|college|school|institute|academy|hospital|clinic|bank|association|foundation|charity|non[- ]?profit|ngo|club|society|union|church|mosque|council|commission|party|brand|manufacturer|retailer|startup|website|software|media|newspaper|publisher|broadcaster|radio|television|restaurant|hotel|airline|holding|subsidiary|conglomerate|cooperative|federation|league|team|embassy|court|parliament|district|municipal)\b/i;
const PERSON_TYPE_RE = /\b(actor|actress|singer|rapper|musician|politician|footballer|athlete|player|author|writer|journalist|businessman|businesswoman|entrepreneur|president of|minister of|born|artist|comedian|model|producer|director|poet|preacher|pastor|lawyer|engineer|scientist|professor|doctor|influencer|youtuber)\b/i;
/** Knowledge-panel fields that only organisations have. */
const ORG_ONLY_FIELDS = ['headquarters', 'founded', 'founders', 'founder', 'ceo', 'subsidiaries', 'parent_organization', 'parent_organisation', 'number_of_employees', 'revenue', 'stock_price', 'customer_service', 'motto', 'type_of_business', 'industry'];
const PERSON_ONLY_FIELDS = ['born', 'spouse', 'children', 'parents', 'height', 'education', 'died'];
const ORG_NAME_RE = /\b(ltd|limited|inc|incorporated|corp|corporation|company|co|plc|llc|gmbh|group|holdings|bank|university|college|school|academy|institute|ministry|forces|army|navy|police|service|services|association|foundation|agency|authority|hospital|clinic|church|club|council|commission|union|society|federation|robotics|technologies|technology|tech|solutions|systems|enterprises?|industries|media|network|consult(ing|ants)?|partners|studio|labs?|international|global|africa|ghana|nigeria)\b/i;

/** Knowledge-panel keys that are not facts about the organisation. */
const SKIP_KEYS = new Set([
  'title', 'type', 'description', 'source', 'profiles', 'image', 'header_images', 'kgmid', 'knowledge_graph_search_link',
  'serpapi_knowledge_graph_search_link', 'people_also_search_for', 'people_also_search_for_link', 'see_results_about',
  'entity_type', 'website', 'thumbnail', 'images', 'list', 'buttons', 'tabs', 'user_reviews', 'reviews_from_the_web',
  'rating', 'review_count', 'hours', 'hours_links', 'menu', 'order', 'reservations', 'popular_times', 'photos', 'songs',
  'movies', 'books', 'tv_shows', 'albums', 'videos', 'news', 'people_also_ask', 'related_questions', 'lyrics', 'buy_tickets'
]);

const compact = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 1);

/** Whether a name (e.g. a knowledge panel title) is the searched name, not just a similar one. */
export function sameName(a: string, searched: string): boolean {
  const s = words(searched).filter(w => !['the', 'of', 'and'].includes(w));
  const t = new Set(words(a));
  return s.length > 0 && s.every(w => t.has(w));
}

const ACRONYMS = /\b(ceo|cfo|cmo|cto|coo|cio|ciso|md|hq|ngo|id)\b/g;

function label(key: string): string {
  const k = key.replace(/_links?$/, '').replace(/_/g, ' ').trim().replace(ACRONYMS, m => m.toUpperCase());
  return k.charAt(0).toUpperCase() + k.slice(1);
}

/** Google's type text without its internal tags ("military, kp3_verticals" → "military"). */
function cleanType(raw: unknown): string {
  return String(raw || '').split(',').map(t => t.trim()).filter(t => t && !/_|^kp\d/i.test(t)).join(', ');
}

function valueOf(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    const parts = v.map(x => (typeof x === 'string' ? x : typeof x === 'object' && x ? String((x as any).name || (x as any).title || '') : '')).filter(Boolean);
    return parts.length ? parts.slice(0, 8).join(', ') : null;
  }
  return null;
}

/** Host part of a domain that could be the organisation's own site: "sokoaerial.com" for "Soko Aerial". */
function domainMatchesName(url: string, name: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const label0 = host.split('.')[0];
    const c = compact(name);
    // Initials of a name of 3+ words: "gaf.mil.gh" for "Ghana Armed Forces" (the website check confirms it later).
    const w = words(name).filter(x => !['the', 'of', 'and', 'for'].includes(x));
    const initials = w.length >= 3 ? w.map(x => x[0]).join('') : '';
    return (c.length >= 4 && (label0 === c || (label0.length >= 5 && (c.startsWith(label0) || label0.startsWith(c))))) || (initials.length >= 3 && label0 === initials);
  } catch {
    return false;
  }
}

const SOCIAL_HOSTS: Record<string, string> = {
  'facebook.com': 'Facebook', 'instagram.com': 'Instagram', 'linkedin.com': 'LinkedIn', 'x.com': 'X (Twitter)', 'twitter.com': 'X (Twitter)',
  'youtube.com': 'YouTube', 'tiktok.com': 'TikTok', 'threads.net': 'Threads', 'github.com': 'GitHub', 'wikipedia.org': 'Wikipedia'
};
const platformOf = (url: string): string | null => {
  try {
    const host = new URL(url).hostname.replace(/^(www|m|[a-z]{2})\./, '');
    const hit = Object.keys(SOCIAL_HOSTS).find(h => host === h || host.endsWith(`.${h}`));
    return hit ? SOCIAL_HOSTS[hit] : null;
  } catch { return null; }
};

export function detectOrganization(
  searchedName: string,
  broadData: any,
  profiles: Array<{ platform: string; profileUrl: string; profileName?: string; relation?: string; pageKind?: string }>,
  webItems: Array<{ url: string; title: string; metadata?: Record<string, any> }>
): OrganizationDetection {
  // An abbreviation ("UPSA") is resolved from the results to the full name they give for it; the full name
  // is then used alongside the abbreviation. Several supported full names → no guess (the user chooses).
  const resolution = resolveAbbreviation(searchedName, broadData);
  const fullName = resolution?.kind === 'resolved' ? resolution.candidates[0].name : '';
  const nameMatch = (t: string) => sameName(t, searchedName) || Boolean(fullName && (sameName(t, fullName) || (words(t).length >= 2 && sameName(fullName, t))));

  const kg = broadData?.knowledge_graph;
  const kgMatches = Boolean(kg?.title && nameMatch(String(kg.title)));
  const kgType = kgMatches ? cleanType(kg.type || kg.entity_type) : '';
  const kgKeys = kgMatches ? Object.keys(kg) : [];

  const kgSaysOrg = kgMatches && (ORG_TYPE_RE.test(kgType) || kgKeys.some(k => ORG_ONLY_FIELDS.includes(k)));
  const kgSaysPerson = kgMatches && !kgSaysOrg && (PERSON_TYPE_RE.test(kgType) || kgKeys.some(k => PERSON_ONLY_FIELDS.includes(k)));

  const linkedinCompany = [...webItems.map(w => w.url), ...profiles.map(p => p.profileUrl)].find(u => /linkedin\.com\/(company|school|showcase)\//i.test(u || ''));
  const orgPage = webItems.find(w => ['organization_page', 'group', 'community'].includes(String(w.metadata?.pageKind || '')) && nameMatch(w.title || ''));
  const organic: any[] = Array.isArray(broadData?.organic_results) ? broadData.organic_results : [];
  const siteCandidate = organic.find(r => typeof r.link === 'string' && !platformOf(r.link) && (domainMatchesName(r.link, searchedName) || Boolean(fullName && domainMatchesName(r.link, fullName))));
  const nameLooksOrg = ORG_NAME_RE.test(searchedName) || Boolean(fullName && ORG_NAME_RE.test(fullName));

  const signals: OrgSignal[] = [
    { signal: `Google knowledge panel describes it as an organisation${kgType ? ` (“${kgType}”)` : ''}`, matched: kgSaysOrg },
    ...(resolution ? [{
      signal: resolution.kind === 'resolved'
        ? `The abbreviation “${searchedName}” stands for “${fullName}” in ${resolution.candidates[0].support} independent sources`
        : resolution.kind === 'ambiguous'
          ? `The abbreviation “${searchedName}” is used by several organisations (${resolution.candidates.map(c => c.name).join('; ')})`
          : `The abbreviation “${searchedName}” may stand for “${resolution.candidates[0].name}” (one source)`,
      matched: resolution.kind === 'resolved'
    }] : []),
    { signal: 'A LinkedIn company page was found', matched: Boolean(linkedinCompany) },
    { signal: 'A Facebook/Instagram organisation page with this name was found', matched: Boolean(orgPage) },
    { signal: 'A website whose address matches the name was found', matched: Boolean(siteCandidate) },
    { signal: 'The name contains an organisation word (e.g. Ltd, University, Forces, Robotics)', matched: nameLooksOrg }
  ];
  const weak = signals.slice(1).filter(s => s.matched).length;

  let kind: OrganizationDetection['kind'];
  let reason: string;
  if (kgSaysPerson) { kind = 'person'; reason = `Google's knowledge panel describes “${kg.title}” as a person${kgType ? ` (${kgType})` : ''}.`; }
  else if (kgSaysOrg) { kind = 'organization'; reason = `Google's knowledge panel describes “${kg.title}” as ${kgType || 'an organisation'}.`; }
  else if (weak >= 2) { kind = 'organization'; reason = `${weak} signals point to an organisation: ${signals.slice(1).filter(s => s.matched).map(s => s.signal.toLowerCase()).join('; ')}.`; }
  else if (weak === 1) { kind = 'unclear'; reason = 'Only one weak signal points to an organisation, so the results are treated as a person search.'; }
  else { kind = 'person'; reason = 'No sign of an organisation in the results.'; }

  if (kind !== 'organization') return { kind, reason, ...(resolution ? { resolution } : {}) };

  // ── Facts (knowledge panel only when its title is the searched name) ──
  const facts: OrgFact[] = [];
  if (kgMatches) {
    Object.entries(kg).forEach(([k, v]) => {
      if (SKIP_KEYS.has(k) || k.endsWith('_link') || k.endsWith('_links') || k.startsWith('serpapi')) return;
      const value = valueOf(v);
      if (value && value.length <= 400) facts.push({ label: label(k), value, source: 'Google knowledge panel' });
    });
  }

  const website = kgMatches && typeof kg.website === 'string'
    ? { url: kg.website, basis: 'Listed as the website in Google’s knowledge panel', source: 'Google knowledge panel' }
    : siteCandidate
      ? { url: String(siteCandidate.link).replace(/(https?:\/\/[^/]+).*/, '$1/'), basis: 'The website address matches the organisation’s name (not yet confirmed)', source: 'Google search result' }
      : undefined;

  const social = new Map<string, { platform: string; url: string; source: string }>();
  if (kgMatches && Array.isArray(kg.profiles)) {
    kg.profiles.forEach((p: any) => { if (typeof p.link === 'string') social.set(p.link, { platform: String(p.name || platformOf(p.link) || 'Profile'), url: p.link, source: 'Google knowledge panel' }); });
  }
  profiles.filter(p => p.relation !== 'similar' && (nameMatch(p.profileName || '') || domainMatchesName(p.profileUrl, searchedName) || compact(p.profileUrl).includes(compact(searchedName))))
    .forEach(p => { if (!social.has(p.profileUrl)) social.set(p.profileUrl, { platform: p.platform, url: p.profileUrl, source: 'Name search result' }); });
  if (linkedinCompany && !social.has(linkedinCompany)) social.set(linkedinCompany, { platform: 'LinkedIn', url: linkedinCompany, source: 'Name search result' });

  return {
    kind,
    reason,
    ...(resolution ? { resolution } : {}),
    profile: {
      name: kgMatches && words(String(kg.title)).length >= words(fullName || searchedName).length - 1 ? String(kg.title) : fullName || searchedName,
      ...(kgType ? { type: { label: 'Type', value: kgType, source: 'Google knowledge panel' } } : {}),
      ...(kgMatches && kg.description ? {
        description: {
          label: 'Description', value: String(kg.description),
          source: kg.source?.name ? `Google knowledge panel (from ${kg.source.name})` : 'Google knowledge panel',
          ...(typeof kg.source?.link === 'string' ? { sourceUrl: kg.source.link } : {})
        }
      } : {}),
      facts,
      ...(website ? { website } : {}),
      socialProfiles: Array.from(social.values()),
      signals,
      hasKnowledgePanel: kgMatches
    }
  };
}
