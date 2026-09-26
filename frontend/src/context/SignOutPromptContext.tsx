import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogOut } from 'lucide-react';
import { useSession } from './SessionContext';
import '../styles/SignOutModal.css';

interface SignOutPrompt {
  /** Opens the "Are you sure you want to sign out?" dialog. */
  promptSignOut: () => void;
}

const SignOutPromptContext = createContext<SignOutPrompt | undefined>(undefined);

/** Every sign-out button in the app goes through this confirmation dialog. */
export const SignOutPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const promptSignOut = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

  const confirm = async () => {
    setBusy(true);
    try {
      await signOut();
      setOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SignOutPromptContext.Provider value={{ promptSignOut }}>
      {children}
      {open && (
        <div className="so-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && setOpen(false)}>
          <div className="so-modal" role="alertdialog" aria-modal="true" aria-labelledby="so-title" aria-describedby="so-text">
            <div className="so-icon"><LogOut size={22} /></div>
            <h2 id="so-title">Sign out?</h2>
            <p id="so-text">
              {`Are you sure you want to sign out${user?.email ? ` of ${user.email}` : ''}? Your investigations stay saved to your account.`}
            </p>
            <div className="so-actions">
              <button ref={cancelRef} type="button" className="so-btn" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="button" className="so-btn so-danger" onClick={confirm} disabled={busy}>
                {busy ? <Loader2 size={16} className="so-spin" /> : <LogOut size={16} />} Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </SignOutPromptContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useSignOutPrompt(): SignOutPrompt {
  const ctx = useContext(SignOutPromptContext);
  if (!ctx) throw new Error('useSignOutPrompt must be used inside SignOutPromptProvider');
  return ctx;
}
