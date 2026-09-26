import { useCallback, useRef, useState } from 'react';
import type { LoaderStep } from '../ui/SearchLoader';
import {
  planExplore, runExplore, mergeResponses, ExploreError,
  type ExploreCapability, type ExploreOptions, type ExploreResponse
} from '../../lib/exploreClient';

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

/**
 * Runs one or more searches, each engine as its own request, so the loader shows real
 * per-source progress. One engine failing never stops the others; Cancel aborts everything.
 */
export function useSearchRun() {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<LoaderStep[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setSteps([]);
  }, []);

  const run = useCallback(async (tasks: SearchTask[]): Promise<SearchRunResult | null> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);
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
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setRunning(false);
      }
    }
  }, []);

  return { run, cancel, running, steps };
}
