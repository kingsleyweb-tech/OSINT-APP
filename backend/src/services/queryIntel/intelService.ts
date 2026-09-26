import { SerpApiProvider } from '../search/serpApiProvider';
import { normalizeEngine, domainOf, platformOf } from '../explore/normalize';
import { scoreText } from '../explore/relevance';
import { analyzeQuery, type QueryKind } from './queryAnalyzer';
import { correctFromResults, type Correction } from './resultCorrector';
import { isTypoOf, normalize } from './fuzzy';

const provider = new SerpApiProvider();

export interface IntelRequest {
  query: string;
  kind: QueryKind;
  mode: 'intelligent' | 'precise';
  country?: string;
  /** Names of the investigator's own cases (sent by the page; nothing is read from other users). */
  knownNames?: string[];
}

export interface ProbeItem {
  title: string;
  url: string;
  domain: string;
  platform?: string;
  snippet?: string;
  thumbnail?: string;
  relevance: { score: number; label: string };
}

export interface IntelResponse {
  original: string;
  kind: QueryKind;
  mode: 'intelligent' | 'precise';
  guarded: boolean;
  guardReason?: string;
  /** What the page should search: the original, or a high-confidence correction. */
  searchQuery: string;
  applied: boolean;
  corrections: Correction[];
  ambiguous: boolean;
  originalSupport: number;
  relatedSearches: string[];
  /** Results for the query as typed (from the probe), so the original stays visible. */
  probe: { ran: boolean; items: ProbeItem[]; searchesUsed: number; error?: string; quotaExhausted?: boolean };
  caseMatches: Array<{ name: string; relation: 'same' | 'similar' }>;
}

function caseMatches(query: string, known: string[] = []): IntelResponse['caseMatches'] {
  const q = normalize(query).split(' ').filter(Boolean);
  if (q.length === 0) return [];
  const out: IntelResponse['caseMatches'] = [];
  Array.from(new Set(known.map(k => String(k || '').slice(0, 120)))).slice(0, 300).forEach(name => {
    const n = normalize(name).split(' ').filter(Boolean);
    if (n.length === 0) return;
    if (n.join(' ') === q.join(' ')) out.push({ name, relation: 'same' });
    else if (n.length === q.length && q.every((t, i) => isTypoOf(t, n[i]).related || t === n[i])) out.push({ name, relation: 'similar' });
  });
  return out.slice(0, 3);
}

/**
 * The search-intelligence layer. In Intelligent mode it runs one Google probe for the query as typed
 * (cached), learns likely corrections from Google's own suggestion and from the results, and decides
 * whether a correction is confident enough to search. It never throws: on any failure the page
 * searches the original query.
 */
export async function analyze(req: IntelRequest): Promise<IntelResponse> {
  const analysis = analyzeQuery(req.query, req.kind);
  const base: IntelResponse = {
    original: analysis.original,
    kind: req.kind,
    mode: req.mode,
    guarded: analysis.guarded,
    guardReason: analysis.guardReason,
    searchQuery: analysis.original,
    applied: false,
    corrections: [],
    ambiguous: false,
    originalSupport: 0,
    relatedSearches: [],
    probe: { ran: false, items: [], searchesUsed: 0 },
    caseMatches: caseMatches(analysis.original, req.knownNames)
  };
  // Precise mode, usernames and quoted/operator queries: no probe, no correction.
  if (req.mode === 'precise' || analysis.guarded || !analysis.original) return base;

  try {
    const params: Record<string, string | number> = { q: analysis.original, num: 10, ...(req.country ? { gl: req.country } : {}) };
    const r = await provider.request('google', params);
    if (!r.data) {
      return { ...base, probe: { ran: true, items: [], searchesUsed: 0, error: r.error || 'Probe failed', quotaExhausted: r.quotaExhausted } };
    }
    const outcome = correctFromResults(analysis, r.data);
    const items: ProbeItem[] = normalizeEngine('google', params, r.data).slice(0, 10).map(d => {
      const domain = domainOf(d.url);
      const rel = scoreText(analysis.original, { title: d.title, snippet: d.snippet, url: d.url });
      return { title: d.title, url: d.url, domain, platform: platformOf(domain), snippet: d.snippet, thumbnail: d.thumbnail, relevance: { score: rel.score, label: rel.label } };
    });
    const top = outcome.corrections[0];
    const applied = Boolean(top && top.confidence === 'high' && !outcome.ambiguous);
    return {
      ...base,
      searchQuery: applied ? top.query : analysis.original,
      applied,
      corrections: outcome.corrections,
      ambiguous: outcome.ambiguous,
      originalSupport: outcome.originalSupport,
      relatedSearches: outcome.relatedSearches,
      probe: { ran: true, items, searchesUsed: r.fromCache ? 0 : 1 },
      caseMatches: caseMatches(analysis.original, [...(req.knownNames || [])]).concat(
        top ? caseMatches(top.query, req.knownNames).filter(m => m.relation === 'same').map(m => ({ ...m, relation: 'similar' as const })) : []
      ).slice(0, 3)
    };
  } catch (e: any) {
    console.warn('[QueryIntel] analysis failed, original query will be searched:', e?.message || e);
    return { ...base, probe: { ran: true, items: [], searchesUsed: 0, error: 'Search intelligence unavailable' } };
  }
}
