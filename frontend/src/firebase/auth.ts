import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  type User
} from 'firebase/auth';
import { auth } from './config';

/**
 * Firebase Authentication is the only source of truth for who is signed in.
 * Credentials (passwords) are held by Firebase Authentication, never in Firestore.
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

// ─── Guest sessions ───────────────────────────────────────────────────────────
// A guest is a Firebase anonymous account. Signing a guest out would destroy that account for good,
// so instead the session is "parked" on this device: the app treats the guest as signed out, and
// "Continue as guest" on the same browser resumes the same account with all of its data.

const PARKED_GUEST_KEY = 'osint_parked_guest';
export const GUEST_RESUMED_EVENT = 'osint-guest-resumed';

function readParked(): string | null {
  try { return localStorage.getItem(PARKED_GUEST_KEY); } catch { return null; }
}

function writeParked(uid: string | null): void {
  try {
    if (uid) localStorage.setItem(PARKED_GUEST_KEY, uid);
    else localStorage.removeItem(PARKED_GUEST_KEY);
  } catch { /* storage unavailable */ }
}

/** True when this Firebase user is a guest whose session was parked by signing out. */
export function isParkedGuest(user: User | null): boolean {
  return Boolean(user && user.isAnonymous && readParked() === user.uid);
}

/** A parked guest session exists on this browser and can be resumed. */
export function hasSavedGuestSession(): boolean {
  return isParkedGuest(auth.currentUser);
}

export function forgetParkedGuest(): void {
  writeParked(null);
}

/**
 * Continue as guest: resumes this browser's guest account if there is one, otherwise creates a new
 * private guest account (Firebase anonymous auth) with its own uid.
 */
export async function signInAsGuest(): Promise<User> {
  if (auth.currentUser?.isAnonymous) {
    writeParked(null);
    window.dispatchEvent(new Event(GUEST_RESUMED_EVENT));
    return auth.currentUser;
  }
  await setPersistence(auth, browserLocalPersistence);
  const res = await signInAnonymously(auth);
  writeParked(null);
  return res.user;
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

/** Turns a guest account into an email/password account. The uid stays the same, so all data is kept. */
export async function upgradeGuestAccount(email: string, password: string, displayName: string): Promise<User> {
  const user = requireUser();
  const res = await linkWithCredential(user, EmailAuthProvider.credential(email.trim(), password));
  if (displayName.trim()) await updateProfile(res.user, { displayName: displayName.trim() });
  return res.user;
}

/** Confirms the password of the signed-in user (needed before sensitive changes). */
export async function reauthenticate(currentPassword: string): Promise<void> {
  const user = requireUser();
  if (!user.email) throw new Error('This account has no email address.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
}

/** Deletes the Firebase Authentication account (call after deleting the user's Firestore data). */
export async function deleteAuthAccount(): Promise<void> {
  clearLocalSessionData();
  writeParked(null);
  await deleteUser(requireUser());
}

/** Removes cached search state so the next person on this browser starts clean. */
export function clearLocalSessionData(): void {
  try {
    Object.keys(sessionStorage).filter(k => k.startsWith('osint_')).forEach(k => sessionStorage.removeItem(k));
    ['osint_user_session', 'osint_notifications'].forEach(k => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}

/**
 * Signs out. Account users are signed out of Firebase. Guests are parked on this device (see above)
 * so they can come back to their data; returns true in that case.
 */
export async function signOutUser(): Promise<boolean> {
  clearLocalSessionData();
  const user = auth.currentUser;
  if (user?.isAnonymous) {
    writeParked(user.uid);
    return true;
  }
  await firebaseSignOut(auth);
  return false;
}

export const subscribeToAuth = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);

/** Friendly text for Firebase auth error codes. */
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
    'auth/user-disabled': 'This account has been disabled.',
    'auth/missing-password': 'Enter your password.',
    'auth/admin-restricted-operation': 'Guest access is not enabled for this workspace yet. Sign in or create an account.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled for this workspace.'
  };
  return map[code] || (err as Error)?.message || 'Something went wrong. Please try again.';
}
