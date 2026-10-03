import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from './SessionContext';
import { setAuthNotice } from '../firebase/auth';
import { IdleWarning } from '../components/ui/IdleWarning';
import {
  clearLastActivity, phaseOf, readLastActivity, remainingMs, writeLastActivity, WARN_BEFORE_MS
} from '../lib/idle';

/** Real user input only. Background work (listeners, searches, API calls) is not activity. */
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart', 'pointerdown'] as const;

/**
 * Signs the user out after IDLE_LIMIT_MS without activity, with a live warning for the last
 * WARN_BEFORE_MS. Renders nothing while signed out or while the user is active.
 */
export const IdleLogout: React.FC = () => {
  const { user, signOut } = useSession();
  const uid = user?.uid;
  const [remaining, setRemaining] = useState<number | null>(null);
  const markRef = useRef<() => void>(() => undefined);
  // Kept in a ref so a new function identity can never restart the clock.
  const signOutRef = useRef(signOut);
  useEffect(() => { signOutRef.current = signOut; }, [signOut]);

  useEffect(() => {
    if (!uid) return undefined;
    let done = false;
    let lastWrite = 0;
    let seen = false;

    const logout = () => {
      if (done) return;
      done = true;
      setRemaining(null);
      clearLastActivity();
      setAuthNotice('inactive');
      signOutRef.current().catch(() => undefined);
    };

    /** Reads the shared clock; returns the time left, or null once the user has been signed out. */
    const check = () => {
      if (done) return;
      const stored = readLastActivity();
      if (stored === null) {
        // A key we had seen is gone: another tab signed the user out. A missing key on first sight is a fresh sign-in.
        if (seen) return logout();
        writeLastActivity(Date.now());
        return;
      }
      seen = true;
      const left = remainingMs(stored, Date.now());
      const phase = phaseOf(left);
      if (phase === 'expired') return logout();
      setRemaining(phase === 'warning' ? left : null);
    };

    const mark = () => {
      if (done) return;
      const now = Date.now();
      // A computer that slept past the limit must not be rescued by the first mouse move on waking.
      const stored = readLastActivity();
      if (stored !== null && remainingMs(stored, now) <= 0) return check();
      if (now - lastWrite < 1000) return;
      lastWrite = now;
      writeLastActivity(now);
      seen = true;
      setRemaining(null);
    };
    markRef.current = () => {
      lastWrite = 0;
      mark();
    };

    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, mark, { passive: true, capture: true }));
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, 1000);
    // Start the clock now unless a clock from an earlier visit is still running (so a reopened tab can expire).
    if (readLastActivity() === null) {
      writeLastActivity(Date.now());
      seen = true;
    }
    return () => {
      done = true;
      window.clearInterval(timer);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, mark, { capture: true }));
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
      setRemaining(null);
    };
  }, [uid]);

  const stay = useCallback(() => markRef.current(), []);

  if (!uid || remaining === null || remaining > WARN_BEFORE_MS) return null;
  return <IdleWarning remaining={remaining} onStay={stay} />;
};
