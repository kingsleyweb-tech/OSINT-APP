import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, User, ShieldCheck, Activity, Search, Database } from 'lucide-react';
import '../../styles/AuthPages.css';
import { signIn, signUp } from '../../firebase/auth';
import { createUserProfileInDb } from '../../firebase/firestore';
import appLogo from '../../assets/images/icon.png';

interface AuthPageProps {
  onLoginSuccess: (user: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const user = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (!isLogin && user) {
        const defaultDisplayName = username.trim() || email.split('@')[0] || 'Investigator';
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
    <div className="auth-page-wrapper">
      <div className="auth-layout">
        {/* Left Side - Dashboard Preview & Branding */}
        <div className="auth-preview-panel">
          <div className="preview-header">
            <div className="preview-logo-box">
              <img src={appLogo} alt="OSINT Platform Logo" className="preview-logo-img" />
            </div>
            <div className="preview-brand-info">
              <span className="preview-brand-name">OSINT <span>Platform</span></span>
              <span className="preview-brand-tag">Cyber Intelligence & Investigation</span>
            </div>
          </div>

          <div className="mockup-frame">
            <div className="mockup-topbar">
              <div className="mockup-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="mockup-search-bar">
                <Search size={12} className="mockup-search-icon" />
                <span>osint.platform/investigations/live</span>
              </div>
            </div>

            <div className="mockup-body">
              <div className="mockup-welcome">
                <div>
                  <h4>Welcome back, <span className="highlight">@investigator</span></h4>
                  <p>All data feeds online • 14 sources synced</p>
                </div>
                <div className="mockup-badge"><ShieldCheck size={12} /> System active</div>
              </div>

              <div className="mockup-quick-access">
                <div className="mockup-card">
                  <div className="card-label">SERP ENGINE</div>
                  <div className="card-val green">Active • 100%</div>
                </div>
                <div className="mockup-card">
                  <div className="card-label">RECENT LOOKUPS</div>
                  <div className="card-val">28 Targets</div>
                </div>
                <div className="mockup-card">
                  <div className="card-label">SYSTEM HEALTH</div>
                  <div className="card-val green">Optimal</div>
                </div>
              </div>

              <div className="mockup-table">
                <div className="table-title">
                  <Activity size={13} />
                  <span>Recent OSINT Telemetry</span>
                </div>
                <div className="table-row header">
                  <span>TARGET</span>
                  <span>SOURCE</span>
                  <span>STATUS</span>
                </div>
                <div className="table-row">
                  <span>john_doe@example.com</span>
                  <span>Google Index</span>
                  <span className="status-badge live">Verified</span>
                </div>
                <div className="table-row">
                  <span>@john_doe_99</span>
                  <span>Social Signals</span>
                  <span className="status-badge live">12 Handles</span>
                </div>
                <div className="table-row">
                  <span>domain-intel-target.com</span>
                  <span>DNS & WHOIS</span>
                  <span className="status-badge live">Resolved</span>
                </div>
              </div>

              <div className="mockup-footer-widget">
                <div className="widget-left">
                  <Database size={14} className="widget-icon" />
                  <div>
                    <div className="widget-title">Active Database Pipeline</div>
                    <div className="widget-sub">Indexing public record footprints...</div>
                  </div>
                </div>
                <div className="widget-status">99.9% Ready</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form Card */}
        <div className="auth-form-panel">
          <div className="auth-top-branding">
            <div className="branding-logo-row">
              <img src={appLogo} alt="OSINT Platform" className="branding-logo" />
              <span className="branding-title">OSINT <span>Platform</span></span>
            </div>
            <p className="branding-tagline">Search less, discover more.</p>
          </div>

          <div className="auth-card-box">
            <h2 className="auth-card-title">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>

            {error && (
              <div className="auth-error-alert">
                <AlertCircleIcon />
                <span>{error}</span>
              </div>
            )}

            <form className="auth-form-body" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="form-field-group">
                  <label htmlFor="auth-username" className="field-label">USERNAME</label>
                  <div className="input-icon-wrap">
                    <User className="input-icon" size={15} />
                    <input
                      id="auth-username"
                      type="text"
                      className="auth-input"
                      placeholder="john_doe"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="form-field-group">
                <label htmlFor="auth-email" className="field-label">EMAIL</label>
                <div className="input-icon-wrap">
                  <Mail className="input-icon" size={15} />
                  <input
                    id="auth-email"
                    type="email"
                    className="auth-input"
                    placeholder="john_doe@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label htmlFor="auth-password" className="field-label">PASSWORD</label>
                <div className="input-icon-wrap">
                  <Lock className="input-icon" size={15} />
                  <input
                    id="auth-password"
                    type={showPass ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="show-pass-btn" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="form-field-group">
                  <label htmlFor="auth-confirm-password" className="field-label">CONFIRM PASSWORD</label>
                  <div className="input-icon-wrap">
                    <Lock className="input-icon" size={15} />
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPass ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                    />
                    <button type="button" className="show-pass-btn" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                      {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              <button id="auth-submit" type="submit" className="auth-primary-btn" disabled={loading}>
                {isLogin ? (
                  <><LogIn size={16} /> {loading ? 'Signing in...' : 'Sign In'}</>
                ) : (
                  <><UserPlus size={16} /> {loading ? 'Creating...' : 'Create Account'}</>
                )}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>

            <button id="demo-btn" className="demo-btn" onClick={handleDemo}>
              Continue with Guest Account
            </button>

            <div className="auth-toggle-row">
              <span>{isLogin ? 'Don\'t have an account?' : 'Already registered?'}</span>
              <button
                className="toggle-link"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </div>

            <p className="auth-legal-footer">
              By creating an account, you agree to our{' '}
              <a href="#/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>Terms of Service</a> and{' '}
              <a href="#/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>Privacy Policy</a>.
            </p>
          </div>
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
