/**
 * Gender of a profile — ONLY when the profile itself states it. Accepted evidence:
 *  - stated pronouns on the profile ("she/her" → Female, "he/him" → Male; "they/them" and mixed
 *    pronouns such as "she/they" are shown as pronouns without assigning a gender);
 *  - an explicit gender field ("Gender: Female", Facebook's About section gender item).
 * Nothing is ever inferred from a name, photo, username or writing style. Without explicit evidence
 * the answer is "Not stated".
 */
import type { Investigation, SocialProfile } from '../types/investigation';
import { isSimilarProfile } from './workspace';

export type StatedGender = 'Female' | 'Male';

export interface GenderEvidence {
  /** Null when only neutral/mixed pronouns are stated. */
  gender: StatedGender | null;
  /** The pronouns as written, when pronouns are the evidence. */
  pronouns?: string;
  /** The words of the profile that state it. */
  quote: string;
  /** Where on the profile: "bio", "profile title", "Facebook About section"… */
  where: string;
}

// "she/her", "He / Him", "she/her/hers", "they/them", "she/they"
const PRONOUNS_RE = /\b(she|he|they)\s*\/\s*(her|hers|him|his|them|theirs|they|she|he)(?:\s*\/\s*(her|hers|him|his|them|theirs))?\b/i;
// "Gender: Female", "Gender - male", "Gender: Woman"
const FIELD_RE = /\bgender\s*[:\-–]\s*(female|male|woman|man|non[- ]?binary)\b/i;

function fromPronouns(raw: string): StatedGender | null {
  const parts = raw.toLowerCase().split('/').map(x => x.trim());
  const female = parts.every(x => ['she', 'her', 'hers'].includes(x));
  const male = parts.every(x => ['he', 'him', 'his'].includes(x));
  return female ? 'Female' : male ? 'Male' : null;
}

function fromField(value: string): StatedGender | null {
  const v = value.toLowerCase();
  if (v === 'female' || v === 'woman') return 'Female';
  if (v === 'male' || v === 'man') return 'Male';
  return null;
}

function quoteAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 40);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/** The gender a profile states about itself, or null when it states none. */
export function genderOfProfile(p: SocialProfile): GenderEvidence | null {
  // Explicit gender item kept from the Facebook About section by the backend.
  const about = (p.evidence || []).find(e => e.code === 'about_gender');
  if (about) {
    const m = about.text.match(/"([^"]+)"/);
    const g = m ? fromField(m[1].trim()) : null;
    return { gender: g, quote: about.text.replace(/^Facebook About section:\s*/, ''), where: 'Facebook About section' };
  }
  const statedPronouns = (p.evidence || []).find(e => e.code === 'stated_pronouns');
  if (statedPronouns) {
    const m = statedPronouns.text.match(PRONOUNS_RE);
    if (m) return { gender: fromPronouns(m[0].replace(/\s+/g, '')), pronouns: m[0].replace(/\s+/g, ''), quote: statedPronouns.text, where: 'profile pronouns field' };
  }

  // The profile's own text (bio first, then the title and summary the search engine shows for it).
  const texts: Array<[string, string]> = [
    [p.bio || '', 'bio'],
    [p.title || '', 'profile title'],
    [p.snippet || '', 'profile summary'],
    [(p.attributes?.details || []).join(' · '), 'profile details']
  ];
  for (const [text, where] of texts) {
    if (!text) continue;
    const field = text.match(FIELD_RE);
    if (field) return { gender: fromField(field[1]), quote: quoteAround(text, field.index || 0, field[0].length), where };
    const pro = text.match(PRONOUNS_RE);
    if (pro) {
      const pronouns = pro[0].replace(/\s+/g, '');
      return { gender: fromPronouns(pronouns), pronouns, quote: quoteAround(text, pro.index || 0, pro[0].length), where };
    }
  }
  return null;
}

/** One-line label for a profile: "Female · stated pronouns “she/her” (bio)" or "Not stated". */
export function genderLabel(e: GenderEvidence | null): string {
  if (!e) return 'Not stated';
  if (!e.gender) return `Not stated · pronouns “${e.pronouns}” (${e.where})`;
  return e.pronouns ? `${e.gender} · stated pronouns “${e.pronouns}” (${e.where})` : `${e.gender} · stated in ${e.where}`;
}

export interface CaseGender {
  /** "Female", "Male", "Conflicting" or "Not publicly stated". */
  value: string;
  /** Profiles that state it, with their evidence. */
  evidence: Array<{ platform: string; url: string; e: GenderEvidence }>;
}

/** The subject's gender across their own profiles (similar accounts excluded). */
export function caseGender(inv: Investigation): CaseGender {
  const evidence = (inv.socialProfiles || [])
    .filter(p => !isSimilarProfile(p))
    .map(p => ({ platform: p.platform, url: p.profileUrl || p.url, e: genderOfProfile(p) }))
    .filter((x): x is { platform: string; url: string; e: GenderEvidence } => Boolean(x.e && x.e.gender));
  const values = Array.from(new Set(evidence.map(x => x.e.gender)));
  return {
    value: values.length === 0 ? 'Not publicly stated' : values.length === 1 ? values[0]! : 'Conflicting',
    evidence
  };
}
