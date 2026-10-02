/**
 * The app page a signed-out visitor was trying to open (e.g. an alert's results from an email link).
 * Kept in sessionStorage so it survives Google's full-page sign-in redirect, which loses router state.
 */
const KEY = 'osint:returnTo';

/** Only paths inside this app (no other sites, no landing or sign-in pages). */
const isAppPath = (p: string) => /^\/(?!\/)/.test(p) && !/^\/(auth)?(\?|$)/.test(p);

export function rememberReturnTo(path: string): void {
  try {
    if (isAppPath(path)) sessionStorage.setItem(KEY, path);
  } catch { /* storage unavailable */ }
}

/** Returns the remembered page once, and forgets it. */
export function takeReturnTo(): string | null {
  try {
    const p = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return p && isAppPath(p) ? p : null;
  } catch {
    return null;
  }
}
