import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, Loader2, X } from 'lucide-react';
import { authErrorMessage, signInAsGuest } from '../../firebase/auth';

/**
 * Shown on the homepage when a signed-out visitor tried to open an app page
 * (ProtectedRoute redirects here with state.authRequired).
 */
export const AuthRequiredNotice: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as { authRequired?: boolean; from?: string };
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');

  if (!state.authRequired) return null;
  const from = state.from || '/dashboard';

  const dismiss = () => navigate(location.pathname, { replace: true, state: null });

  const continueAsGuest = async () => {
    setGuestLoading(true);
    setError('');
    try {
      await signInAsGuest();
      navigate(from, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="auth-required-notice" role="alert">
      <div className="arn-icon"><Lock size={18} /></div>
      <div className="arn-text">
        <strong>Sign in required</strong>
        <span>You need to sign in before you can open the dashboard. Sign in with your account or continue as a guest.</span>
        {error && <span className="arn-error">{error}</span>}
      </div>
      <div className="arn-actions">
        <button type="button" className="arn-primary" onClick={() => navigate('/auth', { state: { from } })}>Sign in</button>
        <button type="button" className="arn-secondary" onClick={continueAsGuest} disabled={guestLoading}>
          {guestLoading ? <Loader2 size={15} className="arn-spin" /> : null} Continue as guest
        </button>
        <button type="button" className="arn-close" onClick={dismiss} aria-label="Dismiss"><X size={16} /></button>
      </div>
    </div>
  );
};
