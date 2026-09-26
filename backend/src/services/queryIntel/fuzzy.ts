/**
 * String-similarity helpers for typo-tolerant search. Pure functions, no dependencies.
 * Similarity says two strings are *probably related*; it never says two people are the same.
 */

/** Lower-case, strip accents and punctuation (keeps letters, digits and single spaces). */
export function normalize(text: string): string {
  return (text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/** Optimal string alignment distance (Damerau-Levenshtein with adjacent swaps). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Jaro-Winkler similarity (0–1); rewards a shared prefix, suited to names. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aM = new Array(a.length).fill(false);
  const bM = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (bM[j] || a[i] !== b[j]) continue;
      aM[i] = bM[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0;
  for (let i = 0, k = 0; i < a.length; i++) {
    if (!aM[i]) continue;
    while (!bM[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

/** Sørensen–Dice coefficient on character bigrams (0–1); good for titles. */
export function dice(a: string, b: string): number {
  const na = normalize(a).replace(/\s/g, '');
  const nb = normalize(b).replace(/\s/g, '');
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const grams = new Map<string, number>();
  for (let i = 0; i < na.length - 1; i++) {
    const g = na.slice(i, i + 2);
    grams.set(g, (grams.get(g) || 0) + 1);
  }
  let hit = 0;
  for (let i = 0; i < nb.length - 1; i++) {
    const g = nb.slice(i, i + 2);
    const n = grams.get(g) || 0;
    if (n > 0) { hit++; grams.set(g, n - 1); }
  }
  return (2 * hit) / (na.length - 1 + nb.length - 1);
}

/** Collapses runs of the same letter to one ("gaalemseyy" → "galemsey"). */
export function collapseRepeats(word: string): string {
  return word.replace(/(\p{L})\1+/gu, '$1');
}

/** A rough sound-alike key (vowels dropped after the first letter, doubled letters collapsed). */
export function soundKey(word: string): string {
  const w = collapseRepeats(normalize(word).replace(/\s/g, ''));
  if (!w) return '';
  return w[0] + w.slice(1).replace(/[aeiouyhw]/g, '').replace(/ph/g, 'f').replace(/ck/g, 'k');
}

/** Largest edit distance still treated as a typo for a word of this length. */
export function maxTypoDistance(len: number): number {
  return len <= 3 ? 0 : len <= 5 ? 1 : 2;
}

/**
 * Whether candidate is a plausible misspelling/respelling of word: close edit distance for its
 * length and high Jaro-Winkler, or the same letters with repeats collapsed, or the same sound key.
 */
export function isTypoOf(word: string, candidate: string): { related: boolean; similarity: number; distance: number } {
  const a = normalize(word);
  const b = normalize(candidate);
  if (!a || !b || a === b) return { related: a === b && !!a, similarity: a === b ? 1 : 0, distance: 0 };
  const distance = editDistance(a, b);
  const similarity = jaroWinkler(a, b);
  const allowed = maxTypoDistance(Math.max(a.length, b.length));
  const collapsed = collapseRepeats(a) === collapseRepeats(b);
  const sameSound = a.length >= 5 && soundKey(a) === soundKey(b) && distance <= allowed + 1;
  const related = collapsed || (distance <= allowed && similarity >= 0.85) || sameSound;
  return { related, similarity, distance };
}
