import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import '../../styles/AuthPages.css';
import { signIn, signUp } from '../../firebase/auth';
import { createUserProfileInDb } from '../../firebase/firestore';

interface AuthPageProps {
  onLoginSuccess: (user: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (!isLogin && user) {
        const defaultDisplayName = email.split('@')[0] || 'Investigator';
        await createUserProfileInDb({
          uid: user.uid,
          email: user.email || email,
          displayName: defaultDisplayName,
          role: 'Investigator',
          createdAt: new Date().toISOString()
        }).catch(err => console.error("Profile creation error on sign up:", err));
      }

      onLoginSuccess(user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    onLoginSuccess({ uid: 'demo-user', displayName: 'Guest Investigator', email: 'demo@osint.io' });
    navigate('/dashboard');
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon-wrapper">
            <ShieldAlert className="brand-icon" />
          </div>
          <span className="brand-title">OSINT</span>
          <span className="brand-subtitle">INVESTIGATION PLATFORM</span>
        </div>

        <h2 className="auth-heading">{isLogin ? 'Sign in to continue' : 'Create your account'}</h2>

        {error && (
          <div className="auth-error-alert">
            <AlertCircleIcon />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-icon-wrap">
            <Mail className="input-icon" size={15} />
            <input
              id="auth-email"
              type="email"
              className="auth-input"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-icon-wrap">
            <Lock className="input-icon" size={15} />
            <input
              id="auth-password"
              type={showPass ? 'text' : 'password'}
              className="auth-input"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button type="button" className="show-pass-btn" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <button id="auth-submit" type="submit" className="auth-submit-btn" disabled={loading}>
            {isLogin ? <><LogIn size={15} /> {loading ? 'Signing in...' : 'Sign In'}</> : <><UserPlus size={15} /> {loading ? 'Creating...' : 'Create Account'}</>}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button id="demo-btn" className="demo-btn" onClick={handleDemo}>
          Continue with Guest Account
        </button>

        <div className="auth-toggle-row">
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button className="toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AlertCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
