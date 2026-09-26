import { useEffect, useState } from 'react';
import { useToast } from '../ui/Toast';
import { useSession } from '../../context/SessionContext';
import { subscribeToUserInvestigations } from '../../firebase/firestore';
import type { Investigation } from '../../types/investigation';
import { saveItemsToCase, createCaseFromSearch } from '../../lib/caseSave';
import { getQuota, type ExploreItem, type QuotaStatus } from '../../lib/exploreClient';

/** The signed-in user's cases, live from Firestore. */
export function useCases(): { cases: Investigation[]; loading: boolean } {
  const { user } = useSession();
  const uid = user?.uid;
  const [state, setState] = useState<{ uid?: string; cases: Investigation[] }>({ cases: [] });
  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToUserInvestigations(uid, list => setState({ uid, cases: list }), () => setState({ uid, cases: [] }));
  }, [uid]);
  return { cases: state.uid === uid ? state.cases : [], loading: Boolean(uid) && state.uid !== uid };
}

const CASE_KEY = 'osint_save_case';
function readCaseChoice(): string {
  try { return localStorage.getItem(CASE_KEY) || ''; } catch { return ''; }
}
function writeCaseChoice(id: string): void {
  try { localStorage.setItem(CASE_KEY, id); } catch { /* storage unavailable */ }
}

/** Save-to-case state shared by result lists. */
export function useSaveToCase(savedFrom: string) {
  const { cases } = useCases();
  const toast = useToast();
  const [caseId, setCaseIdState] = useState(readCaseChoice);
  const [saving, setSaving] = useState(false);
  const validCaseId = cases.some(c => c.id === caseId) ? caseId : '';
  const setCaseId = (id: string) => { setCaseIdState(id); writeCaseChoice(id); };

  /** Saves to the chosen case; with no case chosen, creates one named after the search first. */
  const save = async (items: ExploreItem[], query?: string, newCaseName?: string): Promise<boolean> => {
    if (items.length === 0) return false;
    setSaving(true);
    try {
      let target = newCaseName ? '' : validCaseId;
      let created = '';
      if (!target) {
        const inv = await createCaseFromSearch(newCaseName || query || savedFrom, savedFrom, query);
        target = inv.id;
        created = inv.name;
        setCaseId(inv.id);
      }
      const r = await saveItemsToCase(target, items, savedFrom, query);
      if (created) toast.success('Case created', `"${created}" was created with ${r.added} saved result${r.added === 1 ? '' : 's'}.`);
      else if (r.added === 0) toast.info('Already saved', `These results are already in "${r.caseName}".`);
      else toast.success('Saved to case', `${r.added} result${r.added === 1 ? '' : 's'} added to "${r.caseName}"${r.skipped ? ` (${r.skipped} already there)` : ''}.`);
      return true;
    } catch (e) {
      toast.error('Could not save', e instanceof Error ? e.message : 'The case could not be updated.');
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { cases, caseId: validCaseId, setCaseId, save, saving };
}

export function useQuota(refreshKey: unknown): QuotaStatus | null {
  const [q, setQ] = useState<QuotaStatus | null>(null);
  useEffect(() => {
    let alive = true;
    getQuota().then(r => { if (alive) setQ(r); });
    return () => { alive = false; };
  }, [refreshKey]);
  return q;
}

/** Top terms in a set of results (for "Trending in results" and word clouds). */
const STOP = new Set(('the a an and or of to in on at for by with from is are was were be been it its this that as into about after over new more than not but who what how why when where will can has have had his her their our your you we they he she them i my me us also just via said says news video watch photos post posts com www https http amp').split(' '));

export function topTerms(texts: string[], exclude: string[] = [], limit = 20): Array<{ term: string; count: number }> {
  const ex = new Set(exclude.flatMap(e => e.toLowerCase().split(/\s+/)));
  const counts = new Map<string, number>();
  texts.forEach(t => {
    const seen = new Set<string>();
    (t.toLowerCase().match(/#?[\p{L}\p{N}][\p{L}\p{N}_'-]{2,}/gu) || []).forEach(w => {
      const word = w.replace(/'s$/, '');
      if (STOP.has(word) || ex.has(word) || /^\d+$/.test(word) || seen.has(word)) return;
      seen.add(word);
      counts.set(word, (counts.get(word) || 0) + 1);
    });
  });
  return Array.from(counts.entries()).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([term, count]) => ({ term, count }));
}
