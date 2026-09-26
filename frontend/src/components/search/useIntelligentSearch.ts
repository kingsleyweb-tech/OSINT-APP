import { useCallback, useRef, useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { analyzeQuery, type QueryIntel, type QueryKind } from '../../lib/queryIntelClient';
import { spellingFromResults, isRespelling, editDistance } from '../../lib/fuzzy';
import type { LoaderStep } from '../ui/SearchLoader';
import type { SearchMode } from '../../types/user';

/** The page's search mode: the Settings default (Intelligent unless changed), switchable per page. */
export function useSearchMode(): [SearchMode, (m: SearchMode) => void] {
  const { profile } = useSession();
  const [override, setOverride] = useState<SearchMode | null>(null);
  return [override || profile?.searchDefaults?.mode || 'intelligent', setOverride];
}

/**
 * Runs the search-intelligence check before a search and keeps its outcome for the banner.
 * `check` resolves to the query to search: the original, or a high-confidence correction.
 * Any failure resolves to the original query, so the normal search always runs.
 */
export function useQueryIntel() {
  const [intel, setIntel] = useState<QueryIntel | null>(null);
  const [checking, setChecking] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setChecking(false);
  }, []);

  const check = useCallback(async (
    query: string,
    kind: QueryKind,
    mode: SearchMode,
    opts: { country?: string; knownNames?: string[]; keepOriginal?: boolean; chosen?: string } = {}
  ): Promise<{ query: string; intel: QueryIntel | null } | null> => {
    const q = query.trim();
    if (!q) return null;
    // Precise mode: search exactly as typed, no request.
    if (mode === 'precise') {
      setIntel(null);
      return { query: q, intel: null };
    }
    // Usernames are never corrected before the search (no request); suggestions may be learned from the results.
    if (kind === 'username') {
      const local: QueryIntel = {
        original: q, kind, mode, guarded: true, guardReason: 'Usernames are searched as entered', searchQuery: q, applied: false,
        corrections: [], ambiguous: false, originalSupport: 0, relatedSearches: [], probe: { ran: false, items: [], searchesUsed: 0 }, caseMatches: []
      };
      setIntel(local);
      return { query: q, intel: local };
    }
    // A suggestion the investigator picked: reuse the analysis already made (no extra search).
    if (opts.chosen && intel) {
      const picked = intel.corrections.find(c => c.query === opts.chosen);
      const next: QueryIntel = { ...intel, applied: true, searchQuery: opts.chosen, corrections: picked ? [picked, ...intel.corrections.filter(c => c !== picked)] : intel.corrections };
      setIntel(next);
      return { query: opts.chosen, intel: next };
    }
    // Search the original again: keep the analysis, search what was typed.
    if (opts.keepOriginal && intel && intel.original === q) {
      const next: QueryIntel = { ...intel, applied: false, searchQuery: intel.original };
      setIntel(next);
      return { query: q, intel: next };
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setChecking(true);
    try {
      const result = await analyzeQuery(q, kind, mode, { country: opts.country, knownNames: opts.knownNames, signal: controller.signal });
      if (controller.signal.aborted) return null;
      if (!result) {
        setIntel(null);
        return { query: q, intel: null };
      }
      setIntel(result);
      return { query: result.searchQuery, intel: result };
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setChecking(false);
      }
    }
  }, [intel]);

  /**
   * Result-based correction after a search: when the results consistently spell the searched words
   * another way (search "Kingsley Anab", results say "Kingsley Anaab"), add it as a suggestion.
   * Nothing is searched until the investigator picks it.
   */
  const learnFromResults = useCallback((searched: string, texts: string[], kindLabel: string) => {
    const found = spellingFromResults(searched, texts);
    if (!found) return;
    setIntel(prev => {
      if (!prev || prev.mode === 'precise' || prev.corrections.some(c => c.query.toLowerCase() === found.query.toLowerCase())) return prev;
      if (found.query.toLowerCase() === prev.searchQuery.toLowerCase() || found.query.toLowerCase() === prev.original.toLowerCase()) return prev;
      return {
        ...prev,
        corrections: [...prev.corrections, {
          query: found.query,
          confidence: found.support >= 5 ? 'medium' : 'low',
          score: 30 + found.support * 5,
          source: 'results',
          reason: `${found.support} of the ${kindLabel} found spell it "${found.query}". Similar spelling is not proof it is the same person or topic.`,
          evidence: []
        }]
      };
    });
  }, []);

  /** Username searches: a handle one or two characters away that keeps appearing in the results. */
  const learnHandleFromResults = useCallback((searched: string, handles: string[]) => {
    const t = searched.replace(/^@/, '').toLowerCase();
    const alnum = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
    const counts = new Map<string, number>();
    handles.forEach(h => {
      const handle = h.replace(/^@/, '');
      if (!handle || handle.toLowerCase() === t) return;
      if (isRespelling(alnum(t), alnum(handle)) || (alnum(t) !== alnum(handle) && alnum(handle).length >= 6 && editDistance(alnum(t), alnum(handle)) <= 1)) {
        counts.set(handle, (counts.get(handle) || 0) + 1);
      }
    });
    const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] < 2) return;
    setIntel(prev => {
      if (!prev || prev.mode === 'precise' || prev.corrections.some(c => c.query === best[0])) return prev;
      return { ...prev, corrections: [...prev.corrections, {
        query: best[0], confidence: best[1] >= 4 ? 'medium' : 'low', score: 30 + best[1] * 5, source: 'results',
        reason: `The handle @${best[0]} appears in ${best[1]} results. A similar username is usually a different account.`, evidence: []
      }] };
    });
  }, []);

  const step: LoaderStep[] = checking ? [{ id: 'intel', label: 'Checking spelling and meaning', state: 'active' }] : [];
  return { intel, setIntel, check, checking, cancel, step, learnFromResults, learnHandleFromResults };
}
