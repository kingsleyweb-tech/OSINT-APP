import { collapseRepeats, normalize } from './fuzzy';

export type QueryKind = 'name' | 'username' | 'topic';

export interface QueryToken {
  /** The word as typed. */
  text: string;
  /** Normalised form used for matching. */
  norm: string;
  /** False when the word must not be corrected (acronym, handle-like, digits, too short…). */
  correctable: boolean;
  why?: string;
}

export interface QueryAnalysis {
  original: string;
  kind: QueryKind;
  tokens: QueryToken[];
  /** True when nothing in the query may be corrected. */
  guarded: boolean;
  guardReason?: string;
  /** Safe local fix (e.g. repeated letters collapsed), used as a hint, never applied on its own. */
  localCandidate?: string;
}

const MAX_QUERY = 200;

/** A deliberate styling such as xX_name_Xx, l33t digits in a word, or @handles. */
function looksDeliberate(word: string): string | null {
  if (/^@/.test(word)) return 'handle';
  if (/[_.]/.test(word) && /\p{L}/u.test(word)) return 'handle-style punctuation';
  if (/\p{L}/u.test(word) && /\d/.test(word)) return 'letters and digits';
  if (/^[xX]{1,2}[A-Z]/.test(word) || /[a-z][A-Z]{2,}/.test(word)) return 'deliberate styling';
  return null;
}

export function analyzeQuery(raw: string, kind: QueryKind): QueryAnalysis {
  const original = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);
  const base: Omit<QueryAnalysis, 'tokens'> = { original, kind, guarded: false };

  if (!original) return { ...base, tokens: [], guarded: true, guardReason: 'Empty query' };
  if (kind === 'username') {
    // Usernames are often spelled unusually on purpose; they are never corrected, only matched loosely.
    return { ...base, tokens: [{ text: original, norm: normalize(original), correctable: false, why: 'username' }], guarded: true, guardReason: 'Usernames are searched as entered' };
  }
  if (/^".*"$/.test(original)) {
    return { ...base, tokens: [], guarded: true, guardReason: 'Exact phrase in quotes' };
  }
  if (/\b(site|inurl|intitle|filetype):/i.test(original) || /\b(OR|AND)\b/.test(original)) {
    return { ...base, tokens: [], guarded: true, guardReason: 'Search operators are used as written' };
  }

  const tokens: QueryToken[] = original.split(' ').map(text => {
    const norm = normalize(text);
    const deliberate = looksDeliberate(text);
    if (deliberate) return { text, norm, correctable: false, why: deliberate };
    if (norm.length < 3) return { text, norm, correctable: false, why: 'too short' };
    if (text.length >= 2 && text === text.toUpperCase() && /\p{L}/u.test(text) && text.length <= 6) return { text, norm, correctable: false, why: 'acronym' };
    return { text, norm, correctable: true };
  });

  const guarded = !tokens.some(t => t.correctable);
  // Repeated letters are only a hint: many real names have them ("Anaab"), so this is never applied alone.
  const collapsed = tokens.map(t => (t.correctable ? collapseRepeats(t.norm) : t.norm));
  const localCandidate = collapsed.join(' ') !== tokens.map(t => t.norm).join(' ') ? collapsed.join(' ') : undefined;

  return { ...base, tokens, guarded, guardReason: guarded ? 'Nothing in the query looks like a typo that is safe to correct' : undefined, localCandidate };
}
