import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { authErrorMessage, clearAuthNotice, completeGoogleRedirect, setAuthNotice, signInMethods, signOutUser, subscribeToAuth } from '../firebase/auth';
import { createUserProfileInDb, subscribeToUserProfile, updateUserProfileInDb } from '../firebase/firestore';
import { SESSION_EXPIRED_EVENT } from '../lib/apiAuth';
import { browserTimeZone, setSessionState } from '../lib/session';
import {
  DEFAULT_NOTIFICATION_PREFS, DEFAULT_SEARCH_DEFAULTS, type SessionUser, type UserProfile
} from '../types/user';

interface SessionContextValue {
  /** Null while signed out. */
  user: SessionUser | null;
  profile: UserProfile | null;
  /** True until Firebase has restored (or ruled out) a saved session. */
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  /** Friendly message when finishing a Google sign-in (redirect) failed; empty otherwise. */
  authError: string;
  clearAuthError: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const iso = (firebaseTime?: string) => {
  const t = firebaseTime ? Date.parse(firebaseTime) : NaN;
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
};

function providerOf(user: User): SessionUser['provider'] {
  const methods = signInMethods(user);
  return methods.includes('google') ? 'google' : methods.includes('password') ? 'password' : 'other';
}

function newProfileFor(user: User): UserProfile {
  const now = new Date().toISOString();
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Investigator',
    role: 'Investigator',
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    timeZone: browserTimeZone(),
    dateFormat: 'dmy',
    searchDefaults: DEFAULT_SEARCH_DEFAULTS,
    notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    createdAt: iso(user.metadata.creationTime) || now,
    lastLoginAt: iso(user.metadata.lastSignInTime) || now
  };
}

/**
 * Tracks the Firebase Authentication user and their Firestore profile (users/{uid}).
 * Firebase restores and refreshes the session itself; nothing about the sign-in is kept in localStorage.
 * Only Google and email/password accounts are accepted. Old guest (anonymous) sessions are signed out.
 */
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const clearAuthError = useCallback(() => setAuthError(''), []);

  // Finish a Google sign-in that went through a full-page redirect (used when pop-ups are blocked).
  useEffect(() => {
    completeGoogleRedirect().catch(err => setAuthError(authErrorMessage(err)));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(u => {
      if (u?.isAnonymous) {
        // Guest access has been removed: end any guest session still saved in this browser.
        setAuthNotice('guest-removed');
        setAuthUser(null);
        setProfile(null);
        setLoading(false);
        signOutUser().catch(() => undefined);
        return;
      }
      setAuthUser(u);
      if (u) clearAuthNotice();
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Session validation: confirm the saved sign-in is still accepted (disabled or deleted accounts,
  // revoked sessions), and sign out when the backend reports the session is no longer valid.
  useEffect(() => {
    if (!authUser) return undefined;
    let cancelled = false;
    const expire = (notice: 'expired' | 'disabled') => {
      if (cancelled) return;
      setAuthNotice(notice);
      setSessionState(null, null);
      signOutUser().catch(() => undefined);
    };
    authUser.getIdToken().catch(err => {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/user-disabled') expire('disabled');
      else if (code === 'auth/user-token-expired' || code === 'auth/user-not-found' || code === 'auth/invalid-user-token') expire('expired');
      // Network errors: keep the session; Firebase retries when back online.
    });
    const onExpired = (e: Event) => expire((e as CustomEvent).detail === 'auth/user-disabled' ? 'disabled' : 'expired');
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, [authUser]);

  // Live profile: created on first sign-in, then kept in sync with Firestore.
  useEffect(() => {
    if (!authUser) return undefined;
    let first = true;
    const unsubscribe = subscribeToUserProfile(
      authUser.uid,
      p => {
        if (p) {
          setProfile(p);
          if (first) {
            // Keep the account details current; fill a missing name/photo from Google without
            // overwriting anything the user changed in Settings.
            updateUserProfileInDb(authUser.uid, {
              lastLoginAt: iso(authUser.metadata.lastSignInTime) || new Date().toISOString(),
              ...(authUser.email && authUser.email !== p.email ? { email: authUser.email } : {}),
              ...(!p.displayName && authUser.displayName ? { displayName: authUser.displayName } : {}),
              ...(!p.photoURL && authUser.photoURL ? { photoURL: authUser.photoURL } : {}),
              ...(p.role === 'Guest' ? { role: 'Investigator' } : {})
            }).catch(() => undefined);
          }
        } else {
          const fresh = newProfileFor(authUser);
          setProfile(fresh);
          createUserProfileInDb(fresh).catch(err => console.error('Profile creation error:', err));
        }
        first = false;
        setLoading(false);
      },
      err => {
        console.error('Profile listener error:', err);
        setProfile(newProfileFor(authUser));
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [authUser]);

  const user: SessionUser | null = useMemo(() => {
    if (!authUser) return null;
    return {
      uid: authUser.uid,
      email: authUser.email,
      displayName: profile?.displayName || authUser.displayName || authUser.email?.split('@')[0] || 'Investigator',
      role: profile?.role || 'Investigator',
      photoURL: profile?.photoURL || authUser.photoURL || undefined,
      provider: providerOf(authUser),
      createdAt: iso(authUser.metadata.creationTime),
      lastSignInAt: iso(authUser.metadata.lastSignInTime)
    };
  }, [authUser, profile]);

  useEffect(() => setSessionState(user, profile), [user, profile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!authUser) throw new Error('You are not signed in.');
    await updateUserProfileInDb(authUser.uid, updates);
  }, [authUser]);

  const signOut = useCallback(async () => {
    setSessionState(null, null);
    await signOutUser();
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, updateProfile, signOut, authError, clearAuthError }),
    [user, profile, loading, updateProfile, signOut, authError, clearAuthError]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
