import { useCallback, useEffect, useState } from 'react';
import { formatClock } from './idle';

/**
 * Client-side lockout for the sign-in, create-account and forgot-password forms.
 * It slows down guessing and accidental hammering and survives a page refresh (localStorage).
 * It is a guard, not the security boundary: Firebase Authentication throttles repeated failures on its
 * own servers (auth/too-many-requests) and the backend limits requests per IP address.
 */

export type ThrottleBucket = 'signin' | 'signup' | 'reset';

const RULES: Record<ThrottleBucket, { max: number; windowMs: number; lockMs: number }> = {
  signin: { max: 5, windowMs: 15 * 60 * 1000, lockMs: 5 * 60 * 1000 },
  signup: { max: 5, windowMs: 15 * 60 * 1000, lockMs: 5 * 60 * 1000 },
  reset: { max: 3, windowMs: 10 * 60 * 1000, lockMs: 5 * 60 * 1000 }
};

const KEY = 'osint_auth_throttle';

interface BucketState { attempts: number[]; lockedUntil: number }
type Store = Partial<Record<ThrottleBucket, BucketState>>;

function load(): Store {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function save(store: Store): void {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage unavailable */ }
}

/** Milliseconds left on a lock (0 when not locked). */
export function lockRemaining(bucket: ThrottleBucket, now = Date.now()): number {
  return Math.max(0, (load()[bucket]?.lockedUntil || 0) - now);
}

/** Locks the bucket for its full lock time. Returns the lock length. */
export function lockNow(bucket: ThrottleBucket, now = Date.now()): number {
  const store = load();
  store[bucket] = { attempts: [], lockedUntil: now + RULES[bucket].lockMs };
  save(store);
  return RULES[bucket].lockMs;
}

/** Records one failed (or, for password reset, any) attempt and locks the bucket when the limit is reached. */
export function recordAttempt(bucket: ThrottleBucket, now = Date.now()): number {
  const rule = RULES[bucket];
  const store = load();
  const state = store[bucket] || { attempts: [], lockedUntil: 0 };
  const attempts = [...state.attempts.filter(t => now - t < rule.windowMs), now];
  if (attempts.length >= rule.max) {
    store[bucket] = { attempts: [], lockedUntil: now + rule.lockMs };
    save(store);
    return rule.lockMs;
  }
  store[bucket] = { attempts, lockedUntil: state.lockedUntil };
  save(store);
  return lockRemaining(bucket, now);
}

/** A successful sign-in or sign-up clears that bucket. */
export function recordSuccess(bucket: ThrottleBucket): void {
  const store = load();
  delete store[bucket];
  save(store);
}

/** Only mistakes a person or a guesser makes count; network errors and cancelled pop-ups do not. */
export function countsAsFailedAttempt(err: unknown): boolean {
  const code = (err as { code?: string })?.code || '';
  return [
    'auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/wrong-password', 'auth/user-not-found',
    'auth/missing-password', 'auth/invalid-email', 'auth/email-already-in-use', 'auth/weak-password',
    'auth/too-many-requests'
  ].includes(code);
}

export const isTooManyRequests = (err: unknown): boolean => (err as { code?: string })?.code === 'auth/too-many-requests';

export const lockMessage = (ms: number): string => `Too many attempts. Try again in ${formatClock(ms)}.`;

/** Live time left on a bucket's lock, ticking once a second, plus a function to re-read it after a new attempt. */
export function useLockout(bucket: ThrottleBucket): [number, () => void] {
  const [left, setLeft] = useState(() => lockRemaining(bucket));
  const refresh = useCallback(() => setLeft(lockRemaining(bucket)), [bucket]);
  const locked = left > 0;
  useEffect(() => {
    if (!locked) return undefined;
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [locked, refresh]);
  return [left, refresh];
}
