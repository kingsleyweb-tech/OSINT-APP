/**
 * Location evidence for the Location tab. Conservative by design:
 *  - A place is only recorded when a retrieved source states it in words next to the subject
 *    (or on the subject's own profile). Nothing is guessed from names, surnames, organisations or
 *    nearby words, and no coordinates are produced.
 *  - The kind of reference comes from the source's own wording: "lives in" is a residence claim,
 *    "from" a hometown, "works in" a workplace, a profile's location field a profile-declared location,
 *    and anything else a mention. A mention is never presented as where the person lives.
 *  - Pages that name someone with the same name but are not linked to this identity are kept apart
 *    as unconfirmed, so namesakes are never merged into the subject.
 */
import type { Investigation, SocialProfile } from '../types/investigation';
import type { ExploreItem } from './exploreClient';
import { bucketOf, isSimilarActivity, isSimilarProfile, similarProfileKeys, urlKey } from './workspace';

export type LocationRefType =
  | 'profile'      // location field of the subject's own profile
  | 'residence'    // "lives in", "resides in", "based in" (stated)
  | 'hometown'     // "from", "hails from", "native of", "born in"
  | 'workplace'    // "works in"
  | 'organization' // where an organisation linked to the person is listed (Google Maps)
  | 'event'        // place of an event the person is mentioned with
  | 'post'         // place in a public post, or attached to a saved post/result
  | 'listing'      // a Google Maps / directory listing whose name contains the person's name or handle
  | 'mentioned';   // named near the subject, relationship not stated

export type LocationStatus = 'stated' | 'reported' | 'mentioned' | 'unconfirmed';

export interface LocationRef {
  id: string;
  place: string;
  /** Normalised key for grouping ("accra, ghana"). */
  key: string;
  type: LocationRefType;
  status: LocationStatus;
  /** Where it was found: "LinkedIn profile", "Web page", "News article", "Profile bio", "Saved post". */
  sourceKind: string;
  sourceName: string;
  url: string;
  /** The words of the source that support the reference. */
  evidence: string;
  /** Plain statement of what the reference does and does not show. */
  relationship: string;
  /** ISO date of the source, when the source provides one. */
  date?: string;
  /** Why a page found by the location search is attributed to this identity (not just the same name). */
  linkedBy?: string;
  /** Search engine that found it (for the location search). */
  engine?: string;
}

export const TYPE_LABEL: Record<LocationRefType, string> = {
  profile: 'Publicly stated on profile',
  residence: 'Stated residence / base',
  hometown: 'Hometown / origin',
  workplace: 'Workplace location',
  organization: 'Organisation location',
  event: 'Event location',
  post: 'Location in a public post',
  listing: 'Listing using the name',
  mentioned: 'Mentioned location'
};

export const STATUS_LABEL: Record<LocationStatus, string> = {
  stated: 'Stated on the profile',
  reported: 'Reported by a source',
  mentioned: 'Mentioned only',
  unconfirmed: 'Unconfirmed — may be another person'
};

// Countries (and common short forms) used to validate "City, Country" mentions.
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cape Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  "Côte d'Ivoire", 'Cote d\'Ivoire', 'Ivory Coast', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Czechia', 'Denmark', 'Djibouti',
  'Dominica', 'Dominican Republic', 'DR Congo', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini',
  'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'The Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
  'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand',
  'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Samoa', 'San Marino', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone',
  'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka',
  'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
  'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Türkiye', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'UAE', 'United Kingdom', 'UK', 'England', 'Scotland', 'Wales', 'Northern Ireland', 'United States', 'United States of America', 'USA',
  'U.S.', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];
const COUNTRY_SET = new Set(COUNTRIES.map(c => c.toLowerCase()));

// Capitalised words that are not places when they follow "in"/"from".
const NOT_PLACE = new Set(('the a an this that his her their our my your its january february march april may june july august september october ' +
  'november december monday tuesday wednesday thursday friday saturday sunday university college school company team department ministry ' +
  'office church group bank limited ltd inc facebook instagram linkedin twitter tiktok youtube google whatsapp telegram ' +
  'charge collaboration partnership order addition fact general particular person public private business finance marketing sales ' +
  'engineering technology it software research management education health law media politics sports music art design').split(' '));

/** Place phrase: Capitalised words, optionally ", Region" / ", Country" parts (e.g. "Accra, Greater Accra Region, Ghana"). */
// No full stop inside a word: in "Kumasi, Ghana. The event" the place must end at "Ghana".
const WORD = "\\p{Lu}[\\p{L}'’-]*";
const PHRASE = `${WORD}(?:[ -](?:${WORD}|of|de|la|el|du|da))*`.replace(/\*$/, '{0,3}');
const PLACE = `(${PHRASE}(?:,\\s*${PHRASE}){0,2})`;

/**
 * Keyword alternatives that match with a lowercase or capital first letter ("lives in" / "Lives in").
 * The place itself must stay capitalised, so the whole pattern cannot be case-insensitive.
 */
const kw = (...words: string[]) => `(?:${words.map(w => w.replace(/^(\p{L})/u, c => `[${c.toLowerCase()}${c.toUpperCase()}]`).replace(/ /g, '\\s+')).join('|')})`;

interface Pattern { re: RegExp; type: LocationRefType; needsValidation: boolean }
const PATTERNS: Pattern[] = [
  { re: new RegExp(`\\b${kw('lives', 'living', 'resides', 'residing', 'resident')}\\s+(?:in|at)\\s+${PLACE}`, 'gu'), type: 'residence', needsValidation: false },
  { re: new RegExp(`\\b${kw('based', 'located', 'settled', 'relocated', 'moved')}\\s+(?:in|to)\\s+${PLACE}`, 'gu'), type: 'residence', needsValidation: false },
  { re: new RegExp(`${PLACE}-based\\b`, 'gu'), type: 'residence', needsValidation: true },
  { re: new RegExp(`\\b${kw('hails from', 'originally from', 'native of', 'born in', 'grew up in')}\\s+${PLACE}`, 'gu'), type: 'hometown', needsValidation: false },
  { re: new RegExp(`\\b(?:is|was|am|I'm|comes)\\s+from\\s+${PLACE}`, 'gu'), type: 'hometown', needsValidation: true },
  { re: new RegExp(`\\b${kw('works', 'working', 'worked', 'employed')}\\s+in\\s+${PLACE}`, 'gu'), type: 'workplace', needsValidation: true },
  { re: new RegExp(`\\b(?:Location|Based in|Lives in|From)\\s*[:\\-–]\\s*${PLACE}`, 'gu'), type: 'residence', needsValidation: false },
  { re: /📍\s*([^\n|•·]{2,60})/gu, type: 'residence', needsValidation: false },
  // "in City, Country" anywhere near the name: only a mention, and only with a known country.
  { re: new RegExp(`\\b(?:in|at)\\s+${PLACE}`, 'gu'), type: 'mentioned', needsValidation: true }
];

function cleanPlace(raw: string): string | null {
  const place = raw.replace(/[\s,.;:]+$/, '').replace(/\s+/g, ' ').trim();
  if (place.length < 2 || place.length > 80) return null;
  const first = place.split(/[\s,]/)[0].toLowerCase();
  if (NOT_PLACE.has(first)) return null;
  return place;
}

/** Whether a place phrase contains a known country ("Accra, Ghana", "Ghana", "Lagos, Nigeria"). */
function hasCountry(place: string): boolean {
  const parts = place.split(',').map(p => p.trim().toLowerCase());
  return parts.some(p => COUNTRY_SET.has(p)) || COUNTRY_SET.has(place.toLowerCase());
}

/** Groups spellings of one place: "Accra" = "Accra, Ghana" = "Accra, Greater Accra Region, Ghana". */
export function placeKey(place: string): string {
  return place.split(',')[0].toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** How the subject is written in text: the full name (all words) or the username. */
export function subjectMatcher(inv: Investigation): { label: string; find: (text: string) => number[] } {
  if (inv.searchType === 'username') {
    const handle = (inv.searchInputs?.username || inv.name).replace(/^@/, '').toLowerCase();
    const re = new RegExp(`(^|[^\\w.])@?${handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`, 'gi');
    return {
      label: `@${handle}`,
      find: text => Array.from(text.matchAll(re)).map(m => (m.index || 0) + m[0].length)
    };
  }
  const name = (inv.searchInputs?.name || inv.searchInputs?.queryValue || inv.name).replace(/"/g, '').trim();
  const words = name.split(/\s+/).filter(w => w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Full name in order, or reordered "Surname, Given".
  const forward = new RegExp(words.join('\\s+'), 'gi');
  const reversed = words.length > 1 ? new RegExp([...words].reverse().join(',?\\s+'), 'gi') : null;
  return {
    label: name,
    find: text => [
      ...Array.from(text.matchAll(forward)).map(m => (m.index || 0) + m[0].length),
      ...(reversed ? Array.from(text.matchAll(reversed)).map(m => (m.index || 0) + m[0].length) : [])
    ]
  };
}

/** The sentence around a position, for the evidence quote. */
function sentenceAround(text: string, index: number): string {
  const start = Math.max(0, text.lastIndexOf('.', index - 1) + 1, text.lastIndexOf('\n', index - 1) + 1);
  const endDot = text.indexOf('.', index);
  const end = endDot === -1 ? text.length : Math.min(text.length, endDot + 1);
  return text.slice(start, end).trim().slice(0, 240);
}

const EVENT_WORDS = /\b(event|conference|summit|forum|festival|ceremony|workshop|seminar|meeting|launch|graduation|convocation|wedding|funeral|concert|show|match|tournament|award|awards|rally|exhibition|expo|hackathon|meetup|premiere|tour|visit(?:ed|s)?|attend(?:ed|s)?|spoke|speaks|speaking|held|hosted)\b/i;

interface TextSource {
  text: string;
  /** A public post (social platform): mentions become "Location in a public post". */
  isPost?: boolean;
  /** Text written by or about the subject's own account (bio, profile details): no name needed nearby. */
  ownProfile: boolean;
  sourceKind: string;
  sourceName: string;
  url: string;
  date?: string;
  /** Linked to this identity (kept in the case) or only a same-name page. */
  linked: boolean;
}

const NEAR = 90;

/** Location phrases in one text, attributed only when the subject is named close before them (or it is their own profile). */
function refsFromText(src: TextSource, subjectEnds: (t: string) => number[]): LocationRef[] {
  const out: LocationRef[] = [];
  const text = src.text || '';
  if (!text.trim()) return out;
  const nameEnds = src.ownProfile ? [] : subjectEnds(text);
  if (!src.ownProfile && nameEnds.length === 0) return out;

  PATTERNS.forEach(p => {
    for (const m of text.matchAll(p.re)) {
      const at = m.index || 0;
      const place = cleanPlace(m[1] || '');
      if (!place) continue;
      if (p.needsValidation && !hasCountry(place)) continue;
      // Third-party text: the subject must be named shortly before the phrase, with no sentence break in between.
      if (!src.ownProfile) {
        const near = nameEnds.some(end => end <= at + 1 && at - end <= NEAR && !/[.!?]\s/.test(text.slice(end, at)));
        if (!near) continue;
      }
      const sentence = sentenceAround(text, at);
      let type: LocationRefType = p.type;
      if (type === 'mentioned' && EVENT_WORDS.test(sentence)) type = 'event';
      else if (type === 'mentioned' && src.isPost) type = 'post';
      const weak = type === 'mentioned' || type === 'event' || type === 'post';
      const status: LocationStatus = !src.linked ? 'unconfirmed'
        : src.ownProfile ? (weak ? 'mentioned' : 'stated')
        : weak ? 'mentioned' : 'reported';
      out.push({
        id: `${urlKey(src.url)}|${placeKey(place)}|${type}`,
        place, key: placeKey(place), type, status,
        sourceKind: src.sourceKind, sourceName: src.sourceName, url: src.url, date: src.date,
        evidence: sentence,
        relationship: relationshipText(type, status, src.ownProfile)
      });
    }
  });
  return out;
}

export function relationshipText(type: LocationRefType, status: LocationStatus, ownProfile: boolean): string {
  if (status === 'unconfirmed') return 'This page names someone with the same name. It is not linked to this identity, so the location may belong to a different person.';
  switch (type) {
    case 'profile': return 'The location the account holder lists on the profile. Profiles can be out of date; this is not proof of current residence.';
    case 'residence': return ownProfile
      ? 'The account holder states this on their own profile. It is self-reported and may be out of date.'
      : 'The source reports that the person lives in or is based in this place. Confirm on the page; it is the source’s claim, not verified residence.';
    case 'hometown': return 'Stated as where the person is from or was born — an origin, not where they live now.';
    case 'workplace': return 'Stated as where the person works. A workplace is not a place of residence.';
    case 'organization': return 'Where an organisation connected to the person is listed. It is the organisation’s location — not the person’s home, and not proof they work at that branch.';
    case 'event': return 'The place of an event the person is mentioned with. It shows where the event was, not where the person lives.';
    case 'post': return 'A place named in, or attached to, a public post. It shows what the post is about or where it was made — not where the person lives.';
    case 'listing': return 'A Google Maps or directory listing whose name contains this name. It may be a business or place named after someone with this name — it is not where the person lives.';
    default: return 'The place is mentioned near the person’s name. The source does not say they live or work there (it may be an event, trip or story location).';
  }
}

/** Facebook About facts kept as evidence: "Lives in X" (current city) vs "From X" (hometown). */
function facebookAboutRefs(p: SocialProfile, url: string): LocationRef[] {
  return (p.evidence || []).filter(e => e.code === 'about_location').flatMap(e => {
    const m = e.text.match(/"(Lives in|From)\s+(.+)"$/i);
    const place = m ? cleanPlace(m[2]) : null;
    if (!m || !place) return [];
    const type: LocationRefType = /^lives/i.test(m[1]) ? 'residence' : 'hometown';
    return [{
      id: `${urlKey(url)}|${placeKey(place)}|${type}`, place, key: placeKey(place), type, status: 'stated' as const,
      sourceKind: 'Facebook About section', sourceName: 'Facebook', url, evidence: e.text.replace(/^Facebook About section:\s*/, ''),
      relationship: relationshipText(type, 'stated', true)
    }];
  });
}

/** Location references in the case itself (profiles, bios, kept pages and news, saved posts). No searches. */
export function refsFromCase(inv: Investigation): LocationRef[] {
  const subject = subjectMatcher(inv).find;
  const refs: LocationRef[] = [];
  const profiles = (inv.socialProfiles || []).filter(p => !isSimilarProfile(p));

  profiles.forEach(p => {
    const url = p.profileUrl || p.url;
    const platform = p.platform || 'Profile';
    const about = facebookAboutRefs(p, url);
    refs.push(...about);
    const loc = p.attributes?.location && cleanPlace(p.attributes.location);
    if (loc && about.length === 0) {
      const byUsername = inv.searchType === 'username';
      refs.push({
        id: `${urlKey(url)}|${placeKey(loc)}|profile`, place: loc, key: placeKey(loc), type: 'profile', status: 'stated',
        sourceKind: `${platform} profile`, sourceName: platform, url,
        evidence: `${platform} lists the location “${loc}” for ${p.profileName || (p.username ? `@${p.username}` : 'this profile')}.`,
        relationship: byUsername
          ? `The location set on the @${p.username || ''} account on ${platform}. It belongs to that account: the same username on another platform may be a different person.`
          : relationshipText('profile', 'stated', true)
      });
    }
    if (p.bio) refs.push(...refsFromText({ text: p.bio, ownProfile: true, sourceKind: `${platform} bio`, sourceName: platform, url, linked: true }, subject));
    // Search-result text about the profile: attributed only if it names the subject next to the place.
    const blurb = [p.title, p.snippet].filter(Boolean).join('. ');
    if (blurb) refs.push(...refsFromText({ text: blurb, ownProfile: false, sourceKind: `${platform} profile (search result)`, sourceName: platform, url, linked: true }, subject));
  });

  (inv.webAndNews || []).forEach(w => {
    const isNews = bucketOf(w) === 'news';
    refs.push(...refsFromText({
      text: [w.title, w.description].filter(Boolean).join('. '), ownProfile: false,
      sourceKind: isNews ? 'News article' : 'Web page', sourceName: w.source, url: w.url, linked: true,
      date: typeof w.metadata?.date === 'string' && !Number.isNaN(Date.parse(w.metadata.date)) ? new Date(w.metadata.date).toISOString() : undefined
    }, subject));
  });

  const similar = similarProfileKeys(inv);
  (inv.activities || []).filter(a => !isSimilarActivity(a, similar)).forEach(a => {
    const loc = a.location && cleanPlace(a.location);
    if (loc) {
      refs.push({
        id: `${urlKey(a.sourceUrl)}|${placeKey(loc)}|post`, place: loc, key: placeKey(loc), type: 'post', status: 'mentioned',
        sourceKind: 'Saved item', sourceName: a.sourceName, url: a.sourceUrl, evidence: `“${a.title}” has the location “${loc}”.`,
        relationship: relationshipText('post', 'mentioned', false),
        date: a.date && !Number.isNaN(Date.parse(a.date)) ? new Date(a.date).toISOString() : undefined
      });
    }
    refs.push(...refsFromText({
      text: [a.title, a.briefReport].filter(Boolean).join('. '), ownProfile: false, isPost: true, sourceKind: 'Public post',
      sourceName: a.sourceName, url: a.sourceUrl, linked: true,
      date: a.date && !Number.isNaN(Date.parse(a.date)) ? new Date(a.date).toISOString() : undefined
    }, subject));
  });

  return dedupe(refs);
}

/**
 * What ties a page to this identity rather than to someone else with the same name: the subject's
 * usernames, profile links and organisations. Generic words and the name itself do not count.
 */
export function identityContext(inv: Investigation): Array<{ term: string; label: string }> {
  const name = (inv.searchInputs?.name || inv.name || '').toLowerCase();
  const out = new Map<string, string>();
  const add = (term: string | undefined, label: string) => {
    const t = (term || '').trim();
    if (t.length < 4 || name.includes(t.toLowerCase()) || /^(ghana|university|limited|company|student|self-employed)$/i.test(t)) return;
    if (!out.has(t.toLowerCase())) out.set(t.toLowerCase(), label);
  };
  (inv.socialProfiles || []).filter(p => !isSimilarProfile(p)).forEach(p => {
    if (p.username) add(p.username, `the username @${p.username}`);
    if (p.attributes?.organization) add(p.attributes.organization, `the organisation “${p.attributes.organization}”`);
    const link = (p.profileUrl || p.url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    if (link.length > 8) add(link, `a link to the ${p.platform} profile`);
  });
  (inv.associations || []).filter(a => a.category === 'Organizations' || a.category === 'Companies').forEach(a => add(a.name, `the organisation “${a.name}”`));
  return Array.from(out.entries()).map(([term, label]) => ({ term, label }));
}

/** Organisations of this identity (from its profiles and associations), for the organisation-location lookup. */
export function identityOrganizations(inv: Investigation): string[] {
  const out = new Map<string, string>();
  const add = (o?: string) => {
    const name = (o || '').replace(/^@/, '').trim();
    if (name.length < 4 || /^(self[- ]employed|freelance|student|none|n\/a|unemployed)$/i.test(name)) return;
    if (!out.has(name.toLowerCase())) out.set(name.toLowerCase(), name);
  };
  (inv.socialProfiles || []).filter(p => !isSimilarProfile(p)).forEach(p => add(p.attributes?.organization));
  (inv.associations || []).filter(a => a.category === 'Organizations' || a.category === 'Companies').forEach(a => add(a.name));
  return Array.from(out.values()).slice(0, 2);
}

/** Every word of the organisation name appears in the listing title ("KPMG Ghana" ~ "KPMG Ghana - Head Office"). */
function listingIsOrganization(title: string, org: string): boolean {
  const t = title.toLowerCase();
  const words = org.toLowerCase().split(/[^\p{L}\p{N}&]+/u).filter(w => w.length > 1 && !['the', 'of', 'and', 'ltd', 'limited', 'inc', 'plc', 'llc'].includes(w));
  return words.length > 0 && words.every(w => t.includes(w));
}

/**
 * Where the person's organisations are listed on Google Maps. Always an organisation location — never
 * the person's residence — and only for listings whose name matches the organisation.
 */
export function refsFromOrganizationPlaces(org: string, items: ExploreItem[]): LocationRef[] {
  return dedupe(items.filter(i => (i.kind === 'place' || i.kind === 'location') && i.location?.address && listingIsOrganization(i.title, org)).slice(0, 3).flatMap(i => {
    const place = cityOfAddress(i.location!.address!);
    if (!place) return [];
    return [{
      id: `${urlKey(i.url)}|${placeKey(place)}|organization`, place, key: placeKey(place), type: 'organization' as const, status: 'reported' as const,
      sourceKind: 'Google Maps listing', sourceName: 'Google Maps', url: i.url, engine: i.engine,
      linkedBy: `the organisation “${org}” is connected to this person in the case`,
      evidence: `“${i.title}”${i.metadata?.type ? ` (${i.metadata.type})` : ''} is listed at ${i.location!.address}`,
      relationship: relationshipText('organization', 'reported', false)
    }];
  }));
}

/** City-level place from a listing address ("12 Oxford St, Osu, Accra, Ghana" → "Accra, Ghana"). */
function cityOfAddress(address: string): string | null {
  const parts = address.split(',').map(x => x.trim()).filter(x => x && !/\d/.test(x) && !/^[A-Z0-9]{4}\+[A-Z0-9]{2,}/.test(x));
  if (parts.length === 0) return null;
  return cleanPlace(parts.slice(-2).join(', '));
}

/**
 * Location references in the results of the Location tab's search (web, Bing, news, Maps, videos,
 * images, social posts). A result is attributed to this identity only when it is already in the case
 * (one of the subject's profiles or kept pages) or its text also names something only this identity
 * has (a username, profile link or organisation). Everything else stays "unconfirmed".
 */
export function refsFromSearch(inv: Investigation, items: ExploreItem[]): LocationRef[] {
  const matcher = subjectMatcher(inv);
  const subject = matcher.find;
  const context = identityContext(inv);
  const linkedKeys = new Set<string>([
    ...(inv.socialProfiles || []).filter(p => !isSimilarProfile(p)).flatMap(p => [p.profileUrl, p.url, p.canonicalUrl].filter(Boolean).map(u => urlKey(u))),
    ...(inv.webAndNews || []).map(w => urlKey(w.url))
  ]);
  const handles = new Set((inv.socialProfiles || []).filter(p => !isSimilarProfile(p)).map(p => (p.username || '').toLowerCase()).filter(Boolean));
  const refs: LocationRef[] = [];

  items.forEach(i => {
    const text = [i.title, i.snippet, i.author].filter(Boolean).join('. ');
    const lower = `${text} ${i.url} ${i.authorUrl || ''}`.toLowerCase();
    let linkedBy: string | undefined;
    if (linkedKeys.has(urlKey(i.url))) linkedBy = 'the page is one of this person’s profiles or saved pages';
    else if (i.username && handles.has(i.username.toLowerCase())) linkedBy = `it was posted by @${i.username}, one of this person’s accounts`;
    else {
      const hit = context.find(c => lower.includes(c.term));
      if (hit) linkedBy = `the page also mentions ${hit.label}`;
    }
    const linked = Boolean(linkedBy);
    const engine = i.engine;

    // A subject's own profile result: "Location: Accra" in its details is the profile's stated location.
    if (linkedKeys.has(urlKey(i.url))) {
      const m = text.match(/\bLocation\s*:\s*([^·|\n]{2,80})/u);
      const loc = m && cleanPlace(m[1]);
      if (loc) {
        refs.push({
          id: `${urlKey(i.url)}|${placeKey(loc)}|profile`, place: loc, key: placeKey(loc), type: 'profile', status: 'stated',
          sourceKind: `${i.platform || i.domain} profile`, sourceName: i.platform || i.domain, url: i.url, engine, linkedBy,
          evidence: sentenceAround(text, m.index || 0), relationship: relationshipText('profile', 'stated', true)
        });
      }
    }

    // Google Maps listing whose name contains the person's name or handle.
    if (i.kind === 'place' || i.kind === 'location') {
      const place = i.location?.address ? cityOfAddress(i.location.address) : null;
      if (place && subject(i.title).length > 0) {
        refs.push({
          id: `${urlKey(i.url)}|${placeKey(place)}|listing`, place, key: placeKey(place), type: 'listing', status: linked ? 'mentioned' : 'unconfirmed',
          sourceKind: 'Google Maps listing', sourceName: 'Google Maps', url: i.url, engine, linkedBy,
          evidence: `Listing “${i.title}”${i.metadata?.type ? ` (${i.metadata.type})` : ''} at ${i.location?.address}`,
          relationship: relationshipText('listing', linked ? 'mentioned' : 'unconfirmed', false)
        });
      }
      return;
    }

    const kind = i.kind === 'news' ? 'News article' : i.kind === 'video' ? 'Video' : i.kind === 'image' ? 'Image page'
      : i.kind === 'post' ? `${i.platform || 'Social'} post` : i.platform ? `${i.platform} page` : 'Web page';
    refsFromText({
      text, ownProfile: false, isPost: i.kind === 'post', sourceKind: kind, sourceName: i.platform || i.author || i.domain, url: i.url, linked, date: i.publishedAt
    }, subject).forEach(r => refs.push({
      ...r, engine, linkedBy,
      relationship: linkedBy && !linkedKeys.has(urlKey(i.url)) ? `${r.relationship} Linked to this identity because ${linkedBy}.` : r.relationship
    }));
  });
  return dedupe(refs);
}

/** Every location reference of a case: its own data plus the Location tab's saved search. */
export function allLocationRefs(inv: Investigation): LocationRef[] {
  const fromCase = refsFromCase(inv);
  const ids = new Set(fromCase.map(r => r.id));
  const scan = inv.locationScan;
  const searched = [...(scan?.runs?.core?.refs || []), ...(scan?.runs?.more?.refs || []), ...(scan?.refs || [])];
  return dedupe([...fromCase, ...searched.filter(r => !ids.has(r.id))]);
}

function dedupe(refs: LocationRef[]): LocationRef[] {
  const seen = new Map<string, LocationRef>();
  refs.forEach(r => { if (!seen.has(r.id)) seen.set(r.id, r); });
  // "lives in Toronto, Canada" also matches the generic "in <place>" rule: keep only the stronger reading.
  const stronger = new Set(Array.from(seen.values()).filter(r => r.type !== 'mentioned').map(r => `${urlKey(r.url)}|${r.key}`));
  return Array.from(seen.values()).filter(r => r.type !== 'mentioned' || !stronger.has(`${urlKey(r.url)}|${r.key}`));
}

const TYPE_RANK: Record<LocationRefType, number> = { residence: 0, profile: 1, hometown: 2, workplace: 3, organization: 4, event: 5, post: 6, listing: 7, mentioned: 8 };
const STATUS_RANK: Record<LocationStatus, number> = { stated: 0, reported: 1, mentioned: 2, unconfirmed: 3 };

export interface LocationSummary {
  key: string;
  place: string;
  types: LocationRefType[];
  sources: number;
  /** Distinct websites supporting the place (independent sources). */
  sites: string[];
  best: LocationRef;
  refs: LocationRef[];
  /** Same-name pages (not linked to this identity) that name the same place. They do not raise confidence. */
  agreeing: LocationRef[];
}

const siteOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '').replace(/^m\./, ''); } catch { return url; } };

/** One row per place (confirmed references only), strongest evidence first. */
export function summarise(refs: LocationRef[]): LocationSummary[] {
  const byPlace = new Map<string, LocationRef[]>();
  refs.filter(r => r.status !== 'unconfirmed').forEach(r => byPlace.set(r.key, [...(byPlace.get(r.key) || []), r]));
  const unconfirmed = refs.filter(r => r.status === 'unconfirmed');
  return Array.from(byPlace.entries()).map(([key, list]) => {
    const sorted = [...list].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || TYPE_RANK[a.type] - TYPE_RANK[b.type]);
    return {
      // Shown with its most complete spelling ("Accra, Greater Accra Region, Ghana" over "Accra").
      key, place: [...sorted].sort((a, b) => b.place.length - a.place.length)[0].place, refs: sorted, best: sorted[0],
      types: Array.from(new Set(sorted.map(r => r.type))).sort((a, b) => TYPE_RANK[a] - TYPE_RANK[b]),
      sources: new Set(sorted.map(r => urlKey(r.url))).size,
      sites: Array.from(new Set(sorted.map(r => siteOf(r.url)))),
      agreeing: unconfirmed.filter(u => u.key === key)
    };
  }).sort((a, b) => STATUS_RANK[a.best.status] - STATUS_RANK[b.best.status] || b.sites.length - a.sites.length || TYPE_RANK[a.best.type] - TYPE_RANK[b.best.type]);
}

export const sortRefs = (refs: LocationRef[]) =>
  [...refs].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || TYPE_RANK[a.type] - TYPE_RANK[b.type] || a.place.localeCompare(b.place));

export type LocationSearchLevel = 'core' | 'more';

/** One task of the location search (run through the existing explore route). */
export interface LocationSearchTask {
  key: string;
  label: string;
  capability: 'web' | 'webBing' | 'news' | 'places' | 'videos' | 'images' | 'social';
  query: string;
  options?: { platforms?: string[] };
  /** Organisation lookup: the Google Maps listing of this organisation. */
  organization?: string;
}

/**
 * The Location tab's search across the open web. Every source gets the exact name or handle only:
 * the explore relevance filter treats every query word as required, so location words would drop
 * relevant pages; the strict location filtering happens in refsFromSearch.
 *  - core (5 searches, run when the tab is first opened): Google web, Bing web, Google News + Bing News, Google Maps
 *  - more (8 searches, on request): YouTube + Google Videos, Google Images + Bing Images, X, Instagram, TikTok, Threads posts
 */
export function locationSearchPlan(inv: Investigation, level: LocationSearchLevel): LocationSearchTask[] {
  const q = inv.searchType === 'username'
    ? `"${(inv.searchInputs?.username || inv.name).replace(/^@/, '')}"`
    : `"${(inv.searchInputs?.name || inv.searchInputs?.queryValue || inv.name).replace(/"/g, '').trim()}"`;
  if (level === 'core') {
    return [
      { key: 'web', label: 'Google web', capability: 'web', query: q },
      { key: 'bing', label: 'Bing web', capability: 'webBing', query: q },
      { key: 'news', label: 'News', capability: 'news', query: q },
      { key: 'maps', label: 'Google Maps', capability: 'places', query: q.replace(/"/g, '') },
      // Where the person's organisations are (an organisation location, never a residence).
      ...identityOrganizations(inv).map((org, n) => ({ key: `org${n}`, label: `Google Maps · ${org}`, capability: 'places' as const, query: org, organization: org }))
    ];
  }
  return [
    { key: 'videos', label: 'Videos', capability: 'videos', query: q },
    { key: 'images', label: 'Images', capability: 'images', query: q },
    { key: 'social', label: 'Social posts', capability: 'social', query: q, options: { platforms: ['x', 'instagram', 'tiktok', 'threads'] } }
  ];
}

/** SerpApi searches a level uses (news, videos and images each query two engines). */
export function locationSearchCost(inv: Investigation, level: LocationSearchLevel): number {
  return locationSearchPlan(inv, level).reduce((n, t) =>
    n + (t.capability === 'news' || t.capability === 'videos' || t.capability === 'images' ? 2 : t.capability === 'social' ? (t.options?.platforms?.length || 1) : 1), 0);
}

/** Accounts or sources that state different places for the person (e.g. the same username owned by different people). */
export function conflictingStatedPlaces(refs: LocationRef[]): string[] {
  const stated = refs.filter(r => r.status === 'stated' && (r.type === 'profile' || r.type === 'residence'));
  return Array.from(new Set(stated.map(r => r.key))).length > 1 ? Array.from(new Set(stated.map(r => r.place))) : [];
}

/** Google Maps search for a place name (city level; opens in a new tab, no coordinates are produced). */
export function mapSearchUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

const ENGINE_LABEL: Record<string, string> = {
  google: 'Google', bing: 'Bing', google_news: 'Google News', bing_news: 'Bing News', google_maps: 'Google Maps',
  youtube: 'YouTube', google_videos: 'Google Videos', google_images: 'Google Images', bing_images: 'Bing Images'
};
export const engineLabel = (engine?: string) => (engine ? ENGINE_LABEL[engine] || engine : '');
