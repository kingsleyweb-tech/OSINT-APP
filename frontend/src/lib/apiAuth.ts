import { getToken } from 'firebase/app-check';
import { appCheck, auth } from '../firebase/config';

/** Fired when the backend says the sign-in is no longer valid; SessionContext signs the user out. */
export const SESSION_EXPIRED_EVENT = 'osint:session-expired';

/**
 * Headers that prove who is calling the backend: the signed-in user's Firebase ID token
 * (refreshed automatically by Firebase when close to expiry) and, when configured, an App Check token.
 */
export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  const user = auth.currentUser;
  if (user) {
    try {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/user-token-expired' || code === 'auth/user-disabled' || code === 'auth/invalid-user-token') {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: code }));
      }
    }
  }
  if (appCheck) {
    try {
      headers['X-Firebase-AppCheck'] = (await getToken(appCheck, false)).token;
    } catch { /* the backend decides whether App Check is required */ }
  }
  return headers;
}

/** Call with every backend response: a 401 means the session is no longer accepted. */
export function checkAuthResponse(res: Response): Response {
  if (res.status === 401) {
    // Only a token the backend rejected ends the session; a token that could not be fetched
    // (e.g. brief network loss) just fails this request.
    res.clone().json().then(
      (body: { code?: string }) => {
        if (body?.code === 'auth/invalid-session') window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: body.code }));
      },
      () => undefined
    );
  }
  return res;
}

/** fetch() to the backend with sign-in headers attached and 401 handling. */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = await authHeaders((init.headers as Record<string, string>) || {});
  return checkAuthResponse(await fetch(url, { ...init, headers }));
}
