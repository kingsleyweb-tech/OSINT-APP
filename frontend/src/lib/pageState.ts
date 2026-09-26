import { useCallback, useSyncExternalStore, type SetStateAction } from 'react';

/**
 * State that outlives a page: a search page's inputs, results and progress are kept here, so leaving
 * the page and coming back shows them again (until "New search" or sign-out). A search that finishes
 * while you are on another page still lands here. Values are mirrored to sessionStorage so a refresh
 * keeps them too (skipped silently when too large or storage is unavailable).
 *
 * Keys are "<page>:<field>", e.g. "geo:results"; clearPageState("geo") resets one page.
 */

const PREFIX = 'osint_ps_';
const store = new Map<string, unknown>();
const initials = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();
/** Fields not written to sessionStorage (live progress, in-flight flags). */
const MEMORY_ONLY = /:(running|steps|checking)$/;

function readSession(key: string): { ok: boolean; value?: unknown } {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw === null ? { ok: false } : { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function writeSession(key: string, value: unknown): void {
  if (MEMORY_ONLY.test(key)) return;
  try {
    if (value === undefined || value === initials.get(key)) sessionStorage.removeItem(PREFIX + key);
    else sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch { /* too large or storage unavailable: kept in memory only */ }
}

function ensure<T>(key: string, initial: T): void {
  if (!initials.has(key)) initials.set(key, initial);
  if (store.has(key)) return;
  const saved = MEMORY_ONLY.test(key) ? { ok: false } : readSession(key);
  store.set(key, saved.ok ? saved.value : initial);
}

function emit(key: string): void {
  listeners.get(key)?.forEach(l => l());
}

export function getPageState<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function setPageState<T>(key: string, action: SetStateAction<T>): void {
  const prev = store.get(key) as T;
  const next = typeof action === 'function' ? (action as (p: T) => T)(prev) : action;
  if (Object.is(prev, next)) return;
  store.set(key, next);
  writeSession(key, next);
  emit(key);
}

/** useState that survives leaving the page. */
export function usePageState<T>(key: string, initial: T): [T, (action: SetStateAction<T>) => void] {
  ensure(key, initial);
  const subscribe = useCallback((cb: () => void) => {
    const set = listeners.get(key) || new Set<() => void>();
    set.add(cb);
    listeners.set(key, set);
    return () => { set.delete(cb); };
  }, [key]);
  const value = useSyncExternalStore(subscribe, () => store.get(key) as T);
  const set = useCallback((action: SetStateAction<T>) => setPageState<T>(key, action), [key]);
  return [value, set];
}

/** Resets every field of a page ("New search"). */
export function clearPageState(page: string): void {
  Array.from(store.keys()).filter(k => k.startsWith(`${page}:`)).forEach(k => {
    const initial = initials.get(k);
    store.set(k, initial);
    try { sessionStorage.removeItem(PREFIX + k); } catch { /* storage unavailable */ }
    emit(k);
  });
}

/** Forgets every page's state (sign-out). */
export function clearAllPageState(): void {
  Array.from(store.keys()).forEach(k => {
    store.set(k, initials.get(k));
    emit(k);
  });
  try {
    Object.keys(sessionStorage).filter(k => k.startsWith(PREFIX)).forEach(k => sessionStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}
