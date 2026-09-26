import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  type User
} from 'firebase/auth';
import { auth } from './config';
import { clearAllPageState } from '../lib/pageState';

/**
 * Firebase Authentication is the only source of truth for who is signed in.
 * Credentials are held by Firebase Authentication (or Google), never in Firestore or localStorage.
 * Sign-in methods: Google, and email/password. Guest (anonymous) access has been removed.
 */

/** Signs in with email and password. "Keep me signed in" keeps the session after the browser closes. */
export async function signIn(email: string, password: string, keepSignedIn = true): Promise<User> {
  await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence);
  const res = await signInWithEmailAndPassword(auth, email.trim(), password);
  return res.user;
}

export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  await setPersistence(auth, browserLocalPersistence);
  const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) await updateProfile(res.user, { displayName: displayName.trim() });
  return res.user;
}

// ─── Google ─────────────────────────────────────────────────────────────────

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Always let the person choose which Google account to use.
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/**
 * Continue with Google: Google's own sign-in window through Firebase. If the browser blocks the
 * popup, the whole page goes to Google instead and comes back (see completeGoogleRedirect).
 * Resolves null when a redirect was started.
 */
export async function signInWithGoogle(): Promise<User | null> {
  await setPersistence(auth, browserLocalPersistence);
  try {
    const res = await signInWithPopup(auth, googleProvider());
    return res.user;
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, googleProvider());
      return null;
    }
    throw err;
  }
}

/** Finishes a Google sign-in that used the full-page redirect. Throws the sign-in error, if any. */
export async function completeGoogleRedirect(): Promise<User | null> {
  const res = await getRedirectResult(auth);
  return res?.user || null;
}

/** How the signed-in user signs in: 'google', 'password', or both. */
export function signInMethods(user: User | null = auth.currentUser): Array<'google' | 'password'> {
  const ids = (user?.providerData || []).map(p => p.providerId);
  return [
    ...(ids.includes('google.com') ? ['google' as const] : []),
    ...(ids.includes('password') ? ['password' as const] : [])
  ];
}

export function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email.trim());
}

function requireUser(): User {
  if (!auth.currentUser) throw Object.assign(new Error('You are not signed in.'), { code: 'auth/no-current-user' });
  return auth.currentUser;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = requireUser();
  if (!user.email) throw new Error('This account has no email address.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

/**
 * Confirms who is signed in before a sensitive change: with the password for email accounts,
 * or with Google's sign-in window for Google accounts.
 */
export async function reauthenticate(currentPassword?: string): Promise<void> {
  const user = requireUser();
  if (currentPassword && user.email && signInMethods(user).includes('password')) {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    return;
  }
  if (signInMethods(user).includes('google')) {
    await reauthenticateWithPopup(user, googleProvider());
    return;
  }
  throw Object.assign(new Error('Enter your password.'), { code: 'auth/missing-password' });
}

/** Deletes the Firebase Authentication account (call after deleting the user's Firestore data). */
export async function deleteAuthAccount(): Promise<void> {
  clearLocalSessionData();
  await deleteUser(requireUser());
}

/** Removes cached search state so the next person on this browser starts clean. */
export function clearLocalSessionData(): void {
  clearAllPageState();
  try {
    Object.keys(sessionStorage).filter(k => k.startsWith('osint_') && k !== AUTH_NOTICE_KEY).forEach(k => sessionStorage.removeItem(k));
    ['osint_user_session', 'osint_notifications', 'osint_parked_guest'].forEach(k => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}

/** Signs out of Firebase and clears cached data on this browser. */
export async function signOutUser(): Promise<void> {
  clearLocalSessionData();
  await firebaseSignOut(auth);
}

export const subscribeToAuth = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);

// ─── Notices shown on the homepage after being signed out ──────────────────

export const AUTH_NOTICE_KEY = 'osint_auth_notice';
export type AuthNotice = 'expired' | 'guest-removed' | 'disabled';

export function setAuthNotice(notice: AuthNotice): void {
  try { sessionStorage.setItem(AUTH_NOTICE_KEY, notice); } catch { /* storage unavailable */ }
}

export function peekAuthNotice(): AuthNotice | null {
  try {
    return sessionStorage.getItem(AUTH_NOTICE_KEY) as AuthNotice | null;
  } catch {
    return null;
  }
}

export function clearAuthNotice(): void {
  try { sessionStorage.removeItem(AUTH_NOTICE_KEY); } catch { /* storage unavailable */ }
}

export const AUTH_NOTICE_TEXT: Record<AuthNotice, string> = {
  expired: 'Your session has expired. Please sign in again.',
  disabled: 'This account has been disabled. Contact your administrator.',
  'guest-removed': 'Guest access is no longer available. Continue with Google or sign in with your account.'
};

/** Friendly text for Firebase errors. Raw Firebase messages are never shown. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-login-credentials': 'The email or password is incorrect.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'auth/user-not-found': 'No account uses this email. Create an account first.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
    'auth/credential-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/requires-recent-login': 'For security, sign in again before doing this.',
    'auth/user-disabled': 'This account has been disabled. Contact your administrator.',
    'auth/missing-password': 'Enter your password.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
    'auth/user-cancelled': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
    'auth/account-exists-with-different-credential': 'An account already uses this email with a different sign-in method. Sign in with your email and password.',
    'auth/unauthorized-domain': 'Google sign-in is not enabled for this web address yet. Contact your administrator.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled for this workspace. Contact your administrator.',
    'auth/admin-restricted-operation': 'This sign-in method is not enabled for this workspace.',
    'auth/user-token-expired': 'Your session has expired. Please sign in again.',
    'auth/invalid-user-token': 'Your session has expired. Please sign in again.',
    'auth/user-mismatch': 'Please confirm with the same Google account you are signed in with.',
    'auth/internal-error': 'Unable to sign you in right now. Please try again.',
    'auth/no-current-user': 'You are not signed in.',
    'permission-denied': 'You do not have permission to do that. Sign in again and retry.',
    'unavailable': 'The service is unavailable right now. Please try again.',
    'unauthenticated': 'Your session has expired. Please sign in again.'
  };
  if (map[code]) return map[code];
  // Messages we wrote ourselves (no Firebase code) are safe to show.
  if (!code && err instanceof Error && err.message && !/firebase|auth\//i.test(err.message)) return err.message;
  return 'Unable to complete that right now. Please try again.';
}
