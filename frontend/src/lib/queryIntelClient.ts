import { getApiBase } from './searchClient';
import type { SearchMode } from '../types/user';

/** Mirrors backend/src/services/queryIntel/intelService.ts. */
export type QueryKind = 'name' | 'username' | 'topic';
export type Confidence = 'high' | 'medium' | 'low';

export interface Correction {
  query: string;
  confidence: Confidence;
  score: number;
  source: 'google' | 'results';
  reason: string;
  evidence: Array<{ title: string; url: string }>;
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

export interface QueryIntel {
  original: string;
  kind: QueryKind;
  mode: SearchMode;
  guarded: boolean;
  guardReason?: string;
  searchQuery: string;
  applied: boolean;
  corrections: Correction[];
  ambiguous: boolean;
  originalSupport: number;
  relatedSearches: string[];
  probe: { ran: boolean; items: ProbeItem[]; searchesUsed: number; error?: string; quotaExhausted?: boolean };
  caseMatches: Array<{ name: string; relation: 'same' | 'similar' }>;
}

const TIMEOUT_MS = 45_000;

/**
 * Asks the search-intelligence layer what the investigator probably meant. Never throws: on any
 * problem it returns null and the page searches the original query as before.
 */
export async function analyzeQuery(
  query: string,
  kind: QueryKind,
  mode: SearchMode,
  opts: { country?: string; knownNames?: string[]; signal?: AbortSignal } = {}
): Promise<QueryIntel | null> {
  if (!query.trim()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(`${getApiBase()}/query-intel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, kind, mode, country: opts.country, knownNames: opts.knownNames }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    return (await res.json()) as QueryIntel;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };

/** Fields saved with a search-history entry. */
export function intelHistoryFields(intel: QueryIntel | null): { correctedQuery?: string; correctionConfidence?: Confidence; variants?: string[]; mode?: SearchMode } {
  if (!intel) return {};
  return {
    mode: intel.mode,
    ...(intel.applied ? { correctedQuery: intel.searchQuery, correctionConfidence: intel.corrections[0]?.confidence } : {}),
    ...(intel.corrections.length ? { variants: intel.corrections.map(c => c.query).slice(0, 3) } : {})
  };
}
