import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Reads a page's search parameters (?q=…&country=…) so History → "Run again" can reopen a search.
 * When ?run=1 is present, `start` is called once after the page has mounted.
 */
export function usePageSearch(start: (params: URLSearchParams) => void) {
  const [params, setParams] = useSearchParams();
  const done = useRef(false);
  const startRef = useRef(start);
  useEffect(() => { startRef.current = start; });

  useEffect(() => {
    if (done.current || params.get('run') !== '1') return undefined;
    done.current = true;
    const snapshot = new URLSearchParams(params);
    // Remove run=1 so a refresh does not repeat the search (and use more of the quota).
    const next = new URLSearchParams(params);
    next.delete('run');
    setParams(next, { replace: true });
    const t = setTimeout(() => startRef.current(snapshot), 0);
    return () => clearTimeout(t);
  }, [params, setParams]);

  return params;
}
