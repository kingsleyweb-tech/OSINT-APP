import { useCallback, useState } from 'react';
import type { LoaderStep } from '../ui/SearchLoader';
import {
  planExplore, runExplore, mergeResponses, ExploreError,
  type ExploreCapability, type ExploreOptions, type ExploreResponse
} from '../../lib/exploreClient';
import { setPageState, usePageState } from '../../lib/pageState';

export interface SearchTask {
  /** Key of this task's merged response in the result. */
  key: string;
  /** Prefix for the loader rows, e.g. "News". */
  label?: string;
  capability: ExploreCapability;
  query: string;
  options?: ExploreOptions;
}

export type SearchRunResult = Record<string, ExploreResponse>;

/** One in-flight search per key, kept outside the component so it survives leaving the page. */
const controllers = new Map<string, AbortController>();
let localCounter = 0;

/**
 * Runs one or more searches, each engine as its own request, so the loader shows real
 * per-source progress. One engine failing never stops the others; Cancel aborts everything.
 *
 * With a `stateKey` (e.g. "geo:run") the progress is kept when you leave the page: coming back
 * mid-search shows the loader still running, and the search is not interrupted.
 */
export function useSearchRun(stateKey?: string) {
  const [localKey] = useState(() => `local-${++localCounter}:run`);
  const key = stateKey || localKey;
  const [running] = usePageState<boolean>(`${key}:running`, false);
  const [steps] = usePageState<LoaderStep[]>(`${key}:steps`, []);

  const cancel = useCallback(() => {
    controllers.get(key)?.abort();
    controllers.delete(key);
    setPageState(`${key}:running`, false);
    setPageState<LoaderStep[]>(`${key}:steps`, []);
  }, [key]);

  const run = useCallback(async (tasks: SearchTask[]): Promise<SearchRunResult | null> => {
    controllers.get(key)?.abort();
    const controller = new AbortController();
    controllers.set(key, controller);
    const setSteps = (a: LoaderStep[] | ((p: LoaderStep[]) => LoaderStep[])) => setPageState<LoaderStep[]>(`${key}:steps`, a);
    setPageState(`${key}:running`, true);
    setSteps(tasks.map(t => ({ id: `${t.key}:plan`, label: t.label || 'Preparing search', state: 'active' })));

    const update = (id: string, patch: Partial<LoaderStep>) => {
      if (controller.signal.aborted) return;
      setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
    };

    try {
      const plans = await Promise.all(tasks.map(t => planExplore(t.capability, t.query, t.options).catch((e: unknown) => e as Error)));
      if (controller.signal.aborted) return null;
      const planError = plans.find(p => p instanceof Error) as Error | undefined;
      if (planError && plans.every(p => p instanceof Error)) throw planError;

      const calls = tasks.flatMap((t, ti) => {
        const plan = plans[ti];
        if (plan instanceof Error) return [];
        return plan.map(c => ({ task: t, index: c.index, id: `${t.key}:${c.index}`, label: t.label && tasks.length > 1 ? `${t.label} · ${c.label}` : c.label }));
      });
      setSteps(calls.map(c => ({ id: c.id, label: c.label, state: 'active' })));

      const settled = await Promise.all(calls.map(async c => {
        try {
          const r = await runExplore(c.task.capability, c.task.query, { ...c.task.options, callIndex: c.index }, controller.signal);
          const failed = r.engines.length > 0 && r.engines.every(e => e.status === 'error' || e.status === 'quota');
          update(c.id, {
            state: failed ? 'failed' : r.items.length || r.extra ? 'done' : 'empty',
            note: failed ? (r.engines.find(e => e.error)?.error?.slice(0, 40) || 'Failed')
              : r.items.length ? `${r.items.length} result${r.items.length === 1 ? '' : 's'}`
              : r.extra && Object.keys(r.extra).length ? 'Data received' : 'No results'
          });
          return { c, r };
        } catch (e) {
          update(c.id, { state: 'failed', note: e instanceof ExploreError ? e.message.slice(0, 40) : 'Failed' });
          return { c, r: null };
        }
      }));
      if (controller.signal.aborted) return null;

      const out: SearchRunResult = {};
      tasks.forEach(t => {
        const parts = settled.filter(x => x.c.task.key === t.key && x.r).map(x => x.r!) as ExploreResponse[];
        out[t.key] = mergeResponses(t.capability, t.query, parts);
      });
      return out;
    } finally {
      if (controllers.get(key) === controller) {
        controllers.delete(key);
        setPageState(`${key}:running`, false);
      }
    }
  }, [key]);

  return { run, cancel, running, steps };
}
