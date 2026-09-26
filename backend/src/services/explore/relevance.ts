import { isTypoOf } from '../queryIntel/fuzzy';
import type { ExploreRelevance } from '../../types/explore';

/**
 * Scores how well a result's own text matches the query. Only text the source returned
 * (title, snippet, author, URL) is considered. A result is never treated as identifying
 * a person; the label only describes how closely the text matches.
 */

const STOPWORDS = new Set(['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'a', 'an', 'for', 'by', 'with', 'is', 'from']);

export function normalizeText(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Hyphens separate words ("passing-out" matches "passing out").
    .replace(/-/g, ' ')
    .replace(/[^\p{L}\p{N}@#_.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Query terms without search operators (site:, OR, quotes, minus-terms). */
export function queryTerms(query: string): { phrase: string; tokens: string[] } {
  const cleaned = query
    .replace(/\bsite:\S+/gi, ' ')
    .replace(/(^|\s)-\S+/g, ' ')
    .replace(/\b(OR|AND)\b/g, ' ')
    .replace(/["()]/g, ' ');
  const phrase = normalizeText(cleaned);
  const tokens = Array.from(new Set(phrase.split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t))));
  return { phrase, tokens };
}

function hasToken(text: string, token: string): boolean {
  // Whole-token match, so "ama" does not match "amazon".
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, 'u').test(text);
}

export function scoreText(
  query: string,
  fields: { title?: string; snippet?: string; author?: string; url?: string }
): ExploreRelevance {
  const { phrase, tokens } = queryTerms(query);
  if (tokens.length === 0) return { score: 0, label: 'Not scored', reasons: [] };

  const title = normalizeText(fields.title || '');
  const body = normalizeText([fields.snippet, fields.author].filter(Boolean).join(' '));
  const url = normalizeText((fields.url || '').replace(/[/_.-]+/g, ' '));
  const all = `${title} ${body} ${url}`;
  const reasons: string[] = [];
  let score = 0;

  if (tokens.length > 1 && phrase && all.includes(phrase)) {
    score += 50;
    reasons.push(title.includes(phrase) ? 'Exact phrase in title' : 'Exact phrase in text');
  }
  const matched = tokens.filter(t => hasToken(all, t));
  // Words spelled slightly differently in the result (galemsey / galamsey) count at reduced weight.
  const allWords = Array.from(new Set(all.split(' ').filter(w => w.length >= 4)));
  const fuzzyMatched = tokens.filter(t => !matched.includes(t) && t.length >= 4 && allWords.some(w => isTypoOf(t, w).related));
  if (fuzzyMatched.length) reasons.push(`Similar spelling of ${fuzzyMatched.map(t => `"${t}"`).join(', ')}`);
  // A one-word query that appears as a whole word is a full match (there is no phrase to test).
  if (tokens.length === 1 && matched.length === 1) score += 30;
  else if (tokens.length === 1 && fuzzyMatched.length === 1) score += 20;
  score += Math.round(((matched.length + fuzzyMatched.length * 0.75) / tokens.length) * 40);
  if (matched.length === tokens.length) reasons.push(tokens.length > 1 ? 'All terms present' : 'Term present');
  else if (matched.length > 0) reasons.push(`${matched.length} of ${tokens.length} terms present`);
  else if (!fuzzyMatched.length) reasons.push('No query terms in the returned text');

  const inTitle = tokens.filter(t => hasToken(title, t)).length;
  if (inTitle > 0) score += Math.round((inTitle / tokens.length) * 10);
  if (tokens.length === 1 && hasToken(url, tokens[0])) {
    score += 10;
    reasons.push('Term in the link');
  }

  // With several terms, a result naming only a minority of them (e.g. "Accra flights" for
  // "accra floods") is treated as unrelated and hidden.
  if (tokens.length > 1 && (matched.length + fuzzyMatched.length) / tokens.length < 0.6) {
    return { score: Math.min(score, MIN_SCORE - 1), label: 'Weak match', reasons };
  }

  score = Math.min(100, score);
  const label = score >= 70 ? 'Strong match' : score >= 35 ? 'Partial match' : 'Weak match';
  return { score, label, reasons };
}

/** Results below this score are hidden from the list (reported in stats as filtered out). */
export const MIN_SCORE = 20;

/** URL key used for de-duplication: host without www, path without trailing slash, no tracking params. */
export function dedupeKey(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www|m|mobile)\./, '').toLowerCase();
    const keep = ['v', 'id', 'story_fbid', 'q', 'p', 'place_id'];
    const params = keep.filter(k => u.searchParams.has(k)).map(k => `${k}=${u.searchParams.get(k)}`).join('&');
    return `${host}${u.pathname.replace(/\/+$/, '').toLowerCase()}${params ? `?${params}` : ''}`;
  } catch {
    return url.toLowerCase();
  }
}
