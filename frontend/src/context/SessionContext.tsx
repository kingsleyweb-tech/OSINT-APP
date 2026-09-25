import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { forgetParkedGuest, GUEST_RESUMED_EVENT, isParkedGuest, signOutUser, subscribeToAuth } from '../firebase/auth';
import { createUserProfileInDb, subscribeToUserProfile, updateUserProfileInDb } from '../firebase/firestore';
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
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function newProfileFor(user: User): UserProfile {
  const now = new Date().toISOString();
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.isAnonymous ? 'Guest Investigator' : user.displayName || user.email?.split('@')[0] || 'Investigator',
    role: user.isAnonymous ? 'Guest' : 'Investigator',
    isGuest: user.isAnonymous,
    timeZone: browserTimeZone(),
    dateFormat: 'dmy',
    searchDefaults: DEFAULT_SEARCH_DEFAULTS,
    notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    createdAt: now,
    lastLoginAt: now
  };
}

/**
 * Tracks the Firebase Authentication user and their Firestore profile (users/{uid}).
 * Firebase restores the session itself after a refresh, so nothing is kept in localStorage.
 */
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(u => {
      // A parked guest session stays on the device but counts as signed out until resumed.
      const active = isParkedGuest(u) ? null : u;
      if (u && !u.isAnonymous) forgetParkedGuest();
      setAuthUser(active);
      if (!active) {
        setProfile(null);
        setLoading(false);
      }
    });
    const onResume = () => setAuthUser(auth.currentUser);
    window.addEventListener(GUEST_RESUMED_EVENT, onResume);
    return () => {
      unsubscribe();
      window.removeEventListener(GUEST_RESUMED_EVENT, onResume);
    };
  }, []);

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
            updateUserProfileInDb(authUser.uid, {
              lastLoginAt: new Date().toISOString(),
              isGuest: authUser.isAnonymous,
              ...(authUser.email && authUser.email !== p.email ? { email: authUser.email } : {})
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
      displayName: profile?.displayName || authUser.displayName || (authUser.isAnonymous ? 'Guest Investigator' : authUser.email?.split('@')[0] || 'Investigator'),
      role: profile?.role || (authUser.isAnonymous ? 'Guest' : 'Investigator'),
      photoURL: profile?.photoURL,
      isGuest: authUser.isAnonymous
    };
  }, [authUser, profile]);

  useEffect(() => setSessionState(user, profile), [user, profile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!authUser) throw new Error('You are not signed in.');
    await updateUserProfileInDb(authUser.uid, updates);
  }, [authUser]);

  const signOut = useCallback(async () => {
    setSessionState(null, null);
    const parked = await signOutUser();
    if (parked) {
      // Firebase still holds the guest account, so no auth event fires; end the session here.
      setAuthUser(null);
      setProfile(null);
    }
  }, []);

  const value = useMemo(() => ({ user, profile, loading, updateProfile, signOut }), [user, profile, loading, updateProfile, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
