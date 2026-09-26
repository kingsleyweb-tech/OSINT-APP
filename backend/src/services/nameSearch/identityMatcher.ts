import { isTypoOf } from '../queryIntel/fuzzy';
/**
 * Name / identity evidence helpers for name searches.
 *
 * All matching is whole-word: a single shared word ("Hubert") is never enough for a profile to be
 * attributed to "Hubert Amponsah", and prefixes never match ("King" does not match "Kingsley").
 */

const HONORIFICS = new Set(['dr', 'mr', 'mrs', 'ms', 'miss', 'prof', 'professor', 'rev', 'hon', 'sir', 'eng', 'engr', 'esq', 'jr', 'sr', 'phd', 'mba', 'nana', 'lady', 'madam']);

export type NameMatchLevel = 'exact' | 'reordered' | 'contains_full' | 'similar' | 'partial' | 'none';

export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function nameTokens(name: string): string[] {
  return normalizeText(name).split(' ').filter(t => t && !HONORIFICS.has(t));
}

export function compareName(targetTokens: string[], candidate: string): NameMatchLevel {
  if (targetTokens.length === 0) return 'none';
  const cand = nameTokens(candidate);
  if (cand.length === 0) return 'none';

  if (cand.join(' ') === targetTokens.join(' ')) return 'exact';

  const sortedT = [...targetTokens].sort().join(' ');
  if ([...cand].sort().join(' ') === sortedT) return 'reordered';

  const candSet = new Set(cand);
  const matched = targetTokens.filter(t => candSet.has(t)).length;
  // A middle name or an initial may be present, but a long title is not a name.
  if (matched === targetTokens.length && cand.length <= targetTokens.length + 2) return 'contains_full';
  // Every word of the name has a close respelling (Kingsley Anaaba for Kingsley Anaab): a similar name,
  // which is usually a different person and is never treated as the same one.
  if (targetTokens.length >= 2 && cand.length <= targetTokens.length + 1 &&
      targetTokens.every(t => candSet.has(t) || cand.some(c => isTypoOf(t, c).related))) return 'similar';
  return matched > 0 ? 'partial' : 'none';
}

/** Full name as a contiguous phrase (either order) inside free text. */
export function textHasFullName(targetTokens: string[], text: string): boolean {
  if (targetTokens.length === 0) return false;
  const norm = ` ${normalizeText(text)} `;
  const forward = ` ${targetTokens.join(' ')} `;
  const reversed = ` ${[...targetTokens].reverse().join(' ')} `;
  return norm.includes(forward) || (targetTokens.length === 2 && norm.includes(reversed));
}

export type HandleMatchLevel = 'full' | 'initials' | 'none';

export function compareHandle(targetTokens: string[], handle?: string): HandleMatchLevel {
  if (!handle || targetTokens.length < 2) return 'none';
  const h = handle.toLowerCase().replace(/[^a-z]/g, '');
  if (h.length < 4) return 'none';

  const joined = targetTokens.join('');
  const reversed = [...targetTokens].reverse().join('');
  if (h === joined || h === reversed) return 'full';
  if (targetTokens.every(t => t.length >= 2 && h.includes(t)) && h.length <= joined.length + 4) return 'full';

  const first = targetTokens[0];
  const last = targetTokens[targetTokens.length - 1];
  if (h === `${first[0]}${last}` || h === `${first}${last[0]}` || h === `${last}${first[0]}`) return 'initials';
  return 'none';
}

export interface TitleParts {
  /** Name candidates found in the title (e.g. GitHub titles contain "handle (Full Name)"). */
  nameCandidates: string[];
  /** Handle shown in the title as "(@handle)". */
  titleHandle?: string;
  /** Title segments after the name, platform suffix removed. */
  extraSegments: string[];
}

const PLATFORM_SUFFIX = /^(linkedin|facebook|instagram|tiktok|youtube|x|twitter|github|reddit|medium|threads|pinterest|twitch|instagram photos and videos|watch .* tiktok videos?|professional profile)$/i;

export function parseTitle(title: string): TitleParts {
  const segments = (title || '')
    .split(/\s+[|•·–—\-\/]\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const first = segments[0] || '';
  const nameCandidates: string[] = [];
  let titleHandle: string | undefined;

  const paren = first.match(/^(.*?)\s*\(([^)]+)\)\s*(?:on\s+\w+)?$/);
  if (paren) {
    const outer = paren[1].trim();
    const inner = paren[2].trim();
    if (inner.startsWith('@')) {
      titleHandle = inner.slice(1);
      if (outer) nameCandidates.push(outer);
    } else {
      if (inner) nameCandidates.push(inner);
      if (outer) nameCandidates.push(outer);
    }
  } else if (first) {
    nameCandidates.push(first.replace(/\s+on\s+(instagram|tiktok|facebook|x|twitter)\b.*$/i, '').trim());
  }

  const extraSegments = segments.slice(1).filter(s => !PLATFORM_SUFFIX.test(s));
  return { nameCandidates, titleHandle, extraSegments };
}

export interface ExtractedAttributes {
  headline?: string;
  organization?: string;
  education?: string;
  location?: string;
  /** Short facts Google displays for the result (rich snippet extensions), shown verbatim. */
  details?: string[];
}

function field(snippet: string, label: string): string | undefined {
  const m = snippet.match(new RegExp(`${label}:\\s*([^·|\\n]+?)(?:\\s*[·|]|\\s{2,}|$)`, 'i'));
  const v = m?.[1]?.trim().replace(/[.,;]+$/, '');
  return v && v.length >= 2 && v.length <= 80 ? v : undefined;
}

/**
 * Pull only facts that the result literally states. LinkedIn results carry the most structure
 * ("Name - Headline - Company | LinkedIn", "Experience: X · Education: Y · Location: Z").
 */
export function extractAttributes(platformId: string | null, title: string, snippet: string, extensions?: string[]): ExtractedAttributes {
  const attrs: ExtractedAttributes = {};
  const text = snippet || '';

  attrs.organization = field(text, 'Experience');
  attrs.education = field(text, 'Education');
  attrs.location = field(text, 'Location');

  if (platformId === 'prof-linkedin') {
    const { extraSegments } = parseTitle(title);
    if (extraSegments[0] && extraSegments[0] !== attrs.location) attrs.headline = extraSegments[0];
    if (!attrs.organization && extraSegments[1]) attrs.organization = extraSegments[1];
  }

  if (extensions && extensions.length > 0) {
    attrs.details = extensions.filter(e => typeof e === 'string' && e.length <= 80).slice(0, 4);
    // Google's LinkedIn result details lead with the profile's stated location ("City, Region, Country").
    const first = attrs.details[0];
    if (platformId === 'prof-linkedin' && !attrs.location && first && /^[^,]{2,40}(,\s*[^,]{2,40}){1,2}$/.test(first)) {
      attrs.location = first;
    }
  }

  Object.keys(attrs).forEach(k => (attrs as any)[k] === undefined && delete (attrs as any)[k]);
  return attrs;
}

export function normalizeOrg(org?: string): string {
  return normalizeText(org || '')
    .replace(/\b(ltd|limited|inc|llc|plc|co|company|corp|corporation|group|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
