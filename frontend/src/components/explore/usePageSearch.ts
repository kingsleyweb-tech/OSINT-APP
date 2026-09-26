import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { getSearchResultsFromDb } from '../../firebase/firestore';

/**
 * Opens a search from History:
 *  - ?restore=<historyId> shows the results saved in Firestore for that search (no searches used);
 *    if none were saved, the search runs again from the other parameters instead.
 *  - ?run=1 runs the search again from the parameters (?q=…&country=…).
 * Both parameters are removed from the address afterwards so a refresh does not repeat anything.
 */
export function usePageSearch(
  start: (params: URLSearchParams) => void,
  restore?: (payload: unknown, savedAt: string) => void
) {
  const [params, setParams] = useSearchParams();
  const done = useRef(false);
  const startRef = useRef(start);
  const restoreRef = useRef(restore);
  useEffect(() => {
    startRef.current = start;
    restoreRef.current = restore;
  });

  useEffect(() => {
    const restoreId = params.get('restore');
    if (done.current || (params.get('run') !== '1' && !restoreId)) return;
    done.current = true;
    const snapshot = new URLSearchParams(params);
    const next = new URLSearchParams(params);
    next.delete('run');
    next.delete('restore');
    setParams(next, { replace: true });

    // Started outside the effect's lifetime: changing the address re-runs this effect, and its
    // cleanup must not cancel the search (that was why "Run again" did nothing).
    const uid = auth.currentUser?.uid;
    if (restoreId && uid && restoreRef.current) {
      getSearchResultsFromDb(uid, restoreId)
        .then(saved => (saved ? restoreRef.current?.(saved.payload, saved.savedAt) : startRef.current(snapshot)))
        .catch(() => startRef.current(snapshot));
    } else {
      Promise.resolve().then(() => startRef.current(snapshot));
    }
  }, [params, setParams]);

  return params;
}
