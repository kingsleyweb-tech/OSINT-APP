import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Globe, Loader2, Lock, Mail, Phone, ShieldCheck, User, Zap } from 'lucide-react';
import {
  AUTH_NOTICE_TEXT, authErrorMessage, clearAuthNotice, peekAuthNotice, resetPassword, signIn, signInWithGoogle, signUp
} from '../../firebase/auth';
import { useSession } from '../../context/SessionContext';
import { GoogleIcon } from '../../components/ui/GoogleIcon';
import { updateUserProfileInDb } from '../../firebase/firestore';
import { browserTimeZone } from '../../lib/session';
import { isValidPhone } from '../../lib/validation';
import { DEFAULT_NOTIFICATION_PREFS, DEFAULT_SEARCH_DEFAULTS } from '../../types/user';
import '../../styles/AuthPages.css';

type Mode = 'signin' | 'signup';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [busy, setBusy] = useState<'form' | 'google' | 'reset' | null>(null);
  const { user, authError, clearAuthError } = useSession();
  const [ownError, setOwnError] = useState('');

  // Auto-redirect if already signed in
  useEffect(() => {
    if (user) {
      navigate(from && from !== '/auth' ? from : '/dashboard', { replace: true });
    }
  }, [user, navigate, from]);

  // Also shows a Google sign-in that went through a full-page redirect and failed.
  const error = ownError || authError;
  const setError = (message: string) => {
    setOwnError(message);
    clearAuthError();
  };
  const [info, setInfo] = useState(() => {
    const notice = peekAuthNotice();
    return notice ? AUTH_NOTICE_TEXT[notice] : '';
  });

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setInfo('');
    clearAuthNotice();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'signup') {
      if (!name.trim()) return setError('Enter your full name.');
      if (!isValidPhone(phone)) return setError('Enter a valid phone number, including the country code (e.g. +233 24 123 4567).');
      if (password.length < 8) return setError('Use at least 8 characters for your password.');
      if (password !== confirm) return setError('The passwords do not match.');
    }
    setBusy('form');
    try {
      if (mode === 'signin') {
        await signIn(email, password, keepSignedIn);
      } else {
        const u = await signUp(email, password, name);
        // Profile and settings are stored in Firestore (users/{uid}); the password stays in Firebase Authentication.
        await updateUserProfileInDb(u.uid, {
          uid: u.uid,
          email: u.email || email.trim(),
          displayName: name.trim(),
          phoneNumber: phone.trim(),
          role: 'Investigator',
          timeZone: browserTimeZone(),
          dateFormat: 'dmy',
          searchDefaults: DEFAULT_SEARCH_DEFAULTS,
          notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
          createdAt: new Date().toISOString()
        });
      }
      navigate(from && from !== '/auth' ? from : '/dashboard', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  };

  const continueWithGoogle = async () => {
    setError('');
    setInfo('');
    clearAuthNotice();
    setBusy('google');
    try {
      const signedInUser = await signInWithGoogle();
      if (signedInUser) {
        navigate(from && from !== '/auth' ? from : '/dashboard', { replace: true });
      }
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  };

  const forgot = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) return setError('Enter your email address above, then choose "Forgot password" again.');
    setBusy('reset');
    try {
      await resetPassword(email);
      setInfo(`If an account exists for ${email.trim()}, a password reset link has been sent to it.`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="au-page">
      <aside className="au-brand">
        <Link to="/" className="au-logo" aria-label="OSINT Platform home">
          <span className="au-logo-tile"><Search /></span>
          <span className="au-logo-text">OSINT <em>Platform</em></span>
        </Link>
        <p className="au-tagline">Search less, discover more</p>

        <div className="au-brand-body">
          <span className="au-pill"><Zap size={15} /> Enterprise OSINT workspace</span>
          <h1>Public intelligence &amp; entity investigation suite</h1>
          <p className="au-lead">
            Automate public digital footprint research, aggregate multi-source index signals, and organise structured
            subject records into clear, actionable intelligence.
          </p>
          <ul className="au-features">
            <li><span><CheckCircle2 size={18} /></span>Cross-platform profile discovery</li>
            <li><span><Globe size={18} /></span>Multi-source index aggregation</li>
            <li><span><ShieldCheck size={18} /></span>Private &amp; encrypted workspaces</li>
          </ul>
        </div>
        <footer className="au-brand-foot">
          <span>For lawful, authorised investigations only.</span>
          <span>© {year} OSINT Platform</span>
        </footer>
      </aside>

      <main className="au-main">
        <div className="au-form-wrap">
          <Link to="/" className="au-back"><ArrowLeft size={17} /> Back to home</Link>
          <h2 className="au-title">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="au-sub">{mode === 'signin' ? 'Sign in to continue your investigations.' : 'Your investigations are saved privately to your account.'}</p>

          <button type="button" className="au-google" onClick={continueWithGoogle} disabled={busy !== null}>
            {busy === 'google' ? <Loader2 size={19} className="au-spin" /> : <GoogleIcon size={19} />} Continue with Google
          </button>

          <div className="au-or"><span>or use your email</span></div>

          <div className="au-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'on' : ''} onClick={() => switchMode('signin')}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>Create account</button>
          </div>

          <form onSubmit={submit} noValidate>
            {mode === 'signup' && (
              <label className="au-field">
                <span className="au-label">Full name</span>
                <span className="au-input"><User size={19} /><input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name" /></span>
              </label>
            )}
            {mode === 'signup' && (
              <label className="au-field">
                <span className="au-label">Phone number</span>
                <span className="au-input"><Phone size={18} /><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+233 24 123 4567" autoComplete="tel" inputMode="tel" /></span>
              </label>
            )}
            <label className="au-field">
              <span className="au-label">Email</span>
              <span className="au-input"><Mail size={19} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@organisation.com" autoComplete="email" required /></span>
            </label>
            <div className="au-field">
              <span className="au-label-row">
                <label className="au-label" htmlFor="au-password">Password</label>
                {mode === 'signin' && (
                  <button type="button" className="au-link" onClick={forgot} disabled={busy === 'reset'}>
                    {busy === 'reset' ? 'Sending…' : <><span className="au-hide-mobile">Forgot password?</span><span className="au-show-mobile">Forgot?</span></>}
                  </button>
                )}
              </span>
              <span className="au-input">
                <Lock size={19} />
                <input
                  id="au-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signin' ? 'Enter your password' : 'At least 8 characters'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                />
                <button type="button" className="au-eye" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </span>
            </div>
            {mode === 'signup' && (
              <label className="au-field">
                <span className="au-label">Confirm password</span>
                <span className="au-input"><Lock size={19} /><input type={showPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" /></span>
              </label>
            )}
            {mode === 'signin' && (
              <label className="au-check">
                <input type="checkbox" checked={keepSignedIn} onChange={e => setKeepSignedIn(e.target.checked)} />
                <span>Keep me signed in on this device</span>
              </label>
            )}

            {error && <p className="au-msg au-error" role="alert">{error}</p>}
            {info && <p className="au-msg au-info" role="status">{info}</p>}

            <button type="submit" className="au-submit" disabled={busy !== null}>
              {busy === 'form' ? <Loader2 size={20} className="au-spin" /> : null}
              {mode === 'signin' ? 'Sign in' : 'Create account'} {busy !== 'form' && <ArrowRight size={20} />}
            </button>
          </form>

          <p className="au-switch">
            {mode === 'signin'
              ? <>New here? <button type="button" onClick={() => switchMode('signup')}>Create an account</button></>
              : <>Already have an account? <button type="button" onClick={() => switchMode('signin')}>Sign in</button></>}
          </p>
          <p className="au-legal">
            <span className="au-hide-mobile">Protected sign-in. </span>By continuing you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
};

function Search() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#e8793e" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <circle cx="10.5" cy="10.5" r="2.2" fill="#e8793e" stroke="none" />
      <line x1="15.5" y1="15.5" x2="20" y2="20" />
    </svg>
  );
}
