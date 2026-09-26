import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, Loader2, X } from 'lucide-react';
import { AUTH_NOTICE_TEXT, authErrorMessage, clearAuthNotice, peekAuthNotice, signInWithGoogle } from '../../firebase/auth';
import { useSession } from '../../context/SessionContext';
import { GoogleIcon } from '../../components/ui/GoogleIcon';

/**
 * Shown on the homepage when a signed-out visitor tried to open an app page
 * (ProtectedRoute redirects here with state.authRequired), or after being signed out
 * (session expired, account disabled, old guest session ended).
 */
export const AuthRequiredNotice: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authError, clearAuthError } = useSession();
  const state = (location.state || {}) as { authRequired?: boolean; from?: string };
  const [notice, setNotice] = useState(peekAuthNotice);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [ownError, setOwnError] = useState('');
  // Also shows a Google sign-in that went through a full-page redirect and failed.
  const error = ownError || authError;
  const setError = (message: string) => {
    setOwnError(message);
    clearAuthError();
  };

  if (user || (!state.authRequired && !notice && !error)) return null;
  const from = state.from || '/dashboard';

  const dismiss = () => {
    clearAuthNotice();
    setNotice(null);
    setError('');
    navigate(location.pathname, { replace: true, state: null });
  };

  const continueWithGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const signedIn = await signInWithGoogle();
      clearAuthNotice();
      if (signedIn) navigate(from, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-required-notice" role="alert">
      <div className="arn-icon"><Lock size={18} /></div>
      <div className="arn-text">
        <strong>{notice === 'expired' ? 'Session expired' : 'Sign in required'}</strong>
        <span>{notice ? AUTH_NOTICE_TEXT[notice] : 'You need to sign in before you can open the dashboard. Continue with Google or sign in with your account.'}</span>
        {error && <span className="arn-error">{error}</span>}
      </div>
      <div className="arn-actions">
        <button type="button" className="arn-primary" onClick={() => navigate('/auth', { state: { from } })}>Sign in</button>
        <button type="button" className="arn-secondary" onClick={continueWithGoogle} disabled={googleLoading}>
          {googleLoading ? <Loader2 size={15} className="arn-spin" /> : <GoogleIcon size={15} />} Continue with Google
        </button>
        <button type="button" className="arn-close" onClick={dismiss} aria-label="Dismiss"><X size={16} /></button>
      </div>
    </div>
  );
};
