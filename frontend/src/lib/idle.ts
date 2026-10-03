/**
 * Inactivity timing for the signed-in app.
 * The clock is a timestamp (not a counter) shared between tabs through localStorage, so a sleeping
 * laptop or a throttled background tab still expires on time, and activity in any tab keeps every tab alive.
 */

const testSeconds = Number(import.meta.env?.VITE_IDLE_TIMEOUT_SECONDS);

/** Time without activity before the user is signed out (30 minutes). */
export const IDLE_LIMIT_MS = testSeconds > 0 ? testSeconds * 1000 : 30 * 60 * 1000;
/** The live warning starts this long before the sign-out (4 minutes). */
export const WARN_BEFORE_MS = Math.min(4 * 60 * 1000, IDLE_LIMIT_MS / 2);

export const ACTIVITY_KEY = 'osint_last_activity';

export type IdlePhase = 'active' | 'warning' | 'expired';

export const remainingMs = (lastActivity: number, now: number): number => IDLE_LIMIT_MS - (now - lastActivity);

export const phaseOf = (remaining: number): IdlePhase =>
  remaining <= 0 ? 'expired' : remaining <= WARN_BEFORE_MS ? 'warning' : 'active';

export function readLastActivity(): number | null {
  try {
    const n = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeLastActivity(time: number): void {
  try { localStorage.setItem(ACTIVITY_KEY, String(time)); } catch { /* storage unavailable */ }
}

export function clearLastActivity(): void {
  try { localStorage.removeItem(ACTIVITY_KEY); } catch { /* storage unavailable */ }
}

/** 3:42 style clock for a number of milliseconds (rounded up, so it never shows 0:00 before sign-out). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
