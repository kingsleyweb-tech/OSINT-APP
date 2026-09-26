/**
 * Small string-similarity helpers (same rules as backend/src/services/queryIntel/fuzzy.ts), used to
 * learn a likely spelling from the results a search already returned. No requests are made.
 */

export function normalizeWords(text: string): string[] {
  return (text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const collapse = (w: string) => w.replace(/(\p{L})\1+/gu, '$1');

/** Whether candidate looks like a respelling of word (not the same word). */
export function isRespelling(word: string, candidate: string): boolean {
  if (word === candidate || word.length < 4 || candidate.length < 4) return false;
  const longest = Math.max(word.length, candidate.length);
  // Short words (John / Joan) differ by one letter too often to be treated as respellings.
  const allowed = longest <= 4 ? 0 : longest <= 5 ? 1 : 2;
  return collapse(word) === collapse(candidate) || editDistance(word, candidate) <= allowed;
}

/**
 * The spelling that the results consistently use instead of the searched words, e.g. search
 * "galemsey" whose results say "galamsey". Needs at least `minSupport` results that agree.
 */
export function spellingFromResults(searched: string, texts: string[], minSupport = 3): { query: string; support: number } | null {
  const q = normalizeWords(searched);
  if (q.length === 0 || q.length > 5) return null;
  const perText = texts.map(t => new Set(normalizeWords(t)));
  const choice = q.map(word => {
    const counts = new Map<string, number>();
    perText.forEach(ws => {
      if (ws.has(word)) return;
      const hit = Array.from(ws).find(w => isRespelling(word, w));
      if (hit) counts.set(hit, (counts.get(hit) || 0) + 1);
    });
    const exact = perText.filter(ws => ws.has(word)).length;
    const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] > exact ? best[0] : word;
  });
  if (choice.join(' ') === q.join(' ')) return null;
  const support = perText.filter(ws => choice.every(w => ws.has(w))).length;
  if (support < minSupport) return null;
  const typed = searched.split(/\s+/);
  // Keep the investigator's capitalisation (Kingsley Anab → Kingsley Anaab).
  const display = choice.map((w, i) => (w === q[i] ? typed[i] || w : /^\p{Lu}/u.test(typed[i] || '') ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  return { query: display, support };
}
