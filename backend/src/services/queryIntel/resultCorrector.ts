import { isTypoOf, normalize, collapseRepeats } from './fuzzy';
import type { QueryAnalysis } from './queryAnalyzer';

export type Confidence = 'high' | 'medium' | 'low';

export interface Correction {
  /** The suggested query, spelled as it appears in the results. */
  query: string;
  confidence: Confidence;
  /** 0–100, for ordering. */
  score: number;
  source: 'google' | 'results';
  reason: string;
  /** Results that use this spelling (up to 3). */
  evidence: Array<{ title: string; url: string }>;
}

export interface CorrectionOutcome {
  corrections: Correction[];
  /** True when two or more different corrections are similarly supported: shown as choices, never auto-applied. */
  ambiguous: boolean;
  /** How many results contain the query exactly as typed. */
  originalSupport: number;
  relatedSearches: string[];
}

interface ResultText { title: string; snippet: string; url: string; words: string[]; display: Map<string, string> }

function resultTexts(data: any): ResultText[] {
  const out: ResultText[] = [];
  const add = (title?: string, snippet?: string, url?: string) => {
    const text = `${title || ''} ${snippet || ''}`;
    const display = new Map<string, string>();
    text.split(/[^\p{L}\p{N}']+/u).forEach(w => {
      const n = normalize(w);
      if (n && !display.has(n)) display.set(n, w);
    });
    out.push({ title: title || url || '', snippet: snippet || '', url: url || '', words: Array.from(display.keys()), display });
  };
  (data?.organic_results || []).forEach((r: any) => add(r.title, r.snippet, r.link));
  (data?.top_stories || []).forEach((r: any) => add(r.title, '', r.link));
  if (data?.knowledge_graph?.title) add(data.knowledge_graph.title, data.knowledge_graph.description, data.knowledge_graph.website || '');
  return out;
}

function titleCase(w: string): string {
  return w ? w[0].toUpperCase() + w.slice(1) : w;
}

/** Reads the probe response and proposes corrections, with the evidence for each. */
export function correctFromResults(analysis: QueryAnalysis, data: any): CorrectionOutcome {
  const relatedSearches = [
    ...((data?.related_searches || []) as any[]).map(r => String(r.query || '')).filter(Boolean),
    ...((data?.related_questions || []) as any[]).map(r => String(r.question || '')).filter(Boolean)
  ].slice(0, 10);
  const empty: CorrectionOutcome = { corrections: [], ambiguous: false, originalSupport: 0, relatedSearches };
  if (analysis.guarded || analysis.tokens.length === 0 || !data) return empty;

  const results = resultTexts(data);
  const qTokens = analysis.tokens;
  // Results that contain the query as typed, as a phrase (words scattered across a page do not count).
  const phrase = ` ${qTokens.map(t => t.norm).join(' ')} `;
  const originalSupport = results.filter(r => ` ${normalize(r.title)} ${normalize(r.snippet)} `.includes(phrase)).length;
  const corrections: Correction[] = [];

  // 1. Google's own spelling correction.
  const googleFix: string | undefined = data?.search_information?.spelling_fix || data?.search_information?.showing_results_for;
  if (googleFix && normalize(googleFix) !== normalize(analysis.original)) {
    const fixWords = normalize(googleFix).split(' ');
    const supporting = results.filter(r => fixWords.every(w => r.words.includes(w)));
    corrections.push({
      query: googleFix.replace(/^"|"$/g, ''),
      confidence: 'high',
      score: 95,
      source: 'google',
      reason: `Google suggests this spelling${supporting.length ? ` and ${supporting.length} result${supporting.length === 1 ? '' : 's'} use it` : ''}.`,
      evidence: supporting.slice(0, 3).map(r => ({ title: r.title, url: r.url }))
    });
  }

  // 2. Spellings that the results themselves use for each word of the query.
  const options = qTokens.map(t => {
    if (!t.correctable) return [{ norm: t.norm, display: t.text, support: Infinity, similarity: 1 }];
    const exactSupport = results.filter(r => r.words.includes(t.norm)).length;
    const counts = new Map<string, { support: number; similarity: number; display: string }>();
    results.forEach(r => {
      let best: { w: string; sim: number } | null = null;
      r.words.forEach(w => {
        if (w === t.norm || w.length < 3) return;
        const m = isTypoOf(t.norm, w);
        const m2 = analysis.localCandidate ? isTypoOf(collapseRepeats(t.norm), collapseRepeats(w)) : m;
        const sim = Math.max(m.similarity, m2.similarity);
        if ((m.related || (m2.related && collapseRepeats(t.norm) === collapseRepeats(w))) && (!best || sim > best.sim)) best = { w, sim };
      });
      if (best) {
        const b = best as { w: string; sim: number };
        const cur = counts.get(b.w) || { support: 0, similarity: b.sim, display: r.display.get(b.w) || b.w };
        cur.support++;
        counts.set(b.w, cur);
      }
    });
    const ranked = Array.from(counts.entries())
      .map(([norm, c]) => ({ norm, display: c.display, support: c.support, similarity: c.similarity }))
      .filter(c => c.support > exactSupport)
      .sort((a, b) => b.support - a.support || b.similarity - a.similarity);
    return [{ norm: t.norm, display: t.text, support: exactSupport, similarity: 1 }, ...ranked].slice(0, 3);
  });

  // Build up to three candidate phrases: best replacement for every word, then second-best per word.
  const pick = (choice: number[]) => qTokens.map((_, i) => options[i][Math.min(choice[i], options[i].length - 1)]);
  const best: number[] = qTokens.map((_, i) => (options[i].length > 1 ? 1 : 0));
  const phrases = [best];
  qTokens.forEach((_, i) => {
    if (options[i].length > 2) phrases.push(best.map((v, j) => (j === i ? 2 : v)));
  });

  phrases.forEach(choice => {
    const parts = pick(choice);
    const phraseNorm = parts.map(p => p.norm);
    if (phraseNorm.join(' ') === qTokens.map(t => t.norm).join(' ')) return;
    const supporting = results.filter(r => phraseNorm.every(w => r.words.includes(w)));
    if (supporting.length === 0) return;
    const minSim = Math.min(...parts.filter(p => p.support !== Infinity).map(p => p.similarity));
    const changed = parts.filter((p, i) => p.norm !== qTokens[i].norm).length;
    let confidence: Confidence = supporting.length >= 3 && minSim >= 0.9 ? 'high' : supporting.length >= 2 || minSim >= 0.93 ? 'medium' : 'low';
    // The query as typed is itself common in the results: it is probably intended.
    if (originalSupport >= 2 && confidence === 'high') confidence = 'medium';
    if (originalSupport >= supporting.length) confidence = 'low';
    const query = parts.map((p, i) => (p.norm === qTokens[i].norm ? qTokens[i].text : (analysis.kind === 'name' ? titleCase(p.display) : p.display))).join(' ');
    if (corrections.some(c => normalize(c.query) === normalize(query))) return;
    corrections.push({
      query,
      confidence,
      score: Math.round(Math.min(90, 40 + supporting.length * 10 + (minSim - 0.85) * 100)),
      source: 'results',
      reason: `${supporting.length} of the top ${results.length} results spell ${changed === 1 ? 'a word' : 'the words'} this way (similarity ${Math.round(minSim * 100)}%).`,
      evidence: supporting.slice(0, 3).map(r => ({ title: r.title, url: r.url }))
    });
  });

  corrections.sort((a, b) => b.score - a.score);
  // Two different suggestions with similar support: offer both, apply neither automatically.
  const ambiguous = corrections.length > 1 && corrections[0].source !== 'google' && corrections[1].score >= corrections[0].score - 10;
  if (ambiguous) corrections.forEach(c => { if (c.confidence === 'high') c.confidence = 'medium'; });
  return { corrections: corrections.slice(0, 3), ambiguous, originalSupport, relatedSearches };
}
