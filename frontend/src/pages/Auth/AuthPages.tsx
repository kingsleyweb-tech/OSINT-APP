import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  User, 
  Search, 
  ArrowLeft,
  Sun,
  Moon,
  Zap,
  Globe,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import '../../styles/AuthPages.css';
import { signIn, signUp } from '../../firebase/auth';
import { createUserProfileInDb } from '../../firebase/firestore';
import appLogo from '../../assets/images/icon.png';
import proImg from '../../assets/images/pro.png';
import { Footer } from '../../landing/components/Footer';
import { useTheme } from '../../context/ThemeContext';

interface AuthPageProps {
  onLoginSuccess: (user: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewSearchMode, setPreviewSearchMode] = useState<'name' | 'username'>('name');

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
      {/* Top Navigation Bar on Auth Page */}
      <header className="auth-top-navbar">
        <div className="auth-nav-inner">
          <Link to="/" className="auth-nav-logo">
            <img src={appLogo} alt="OSINT Logo" className="auth-nav-logo-img" />
            <span className="auth-nav-logo-text">OSINT <span>Platform</span></span>
          </Link>

          <nav className="auth-nav-menu">
            <Link to="/" className="auth-nav-item">Home</Link>
            <Link to="/features" className="auth-nav-item">Features</Link>
            <Link to="/how-it-works" className="auth-nav-item">How It Works</Link>
            <Link to="/documentation" className="auth-nav-item">Documentation</Link>
            <Link to="/about" className="auth-nav-item">About</Link>
            <Link to="/help-center" className="auth-nav-item">Help</Link>
          </nav>

          <div className="auth-nav-actions">
            <button
              onClick={toggleTheme}
              className="auth-theme-toggle-btn"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* Floating Back Button */}
      <div className="auth-back-float-row">
        <button onClick={() => navigate(-1)} className="auth-back-float-btn">
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="auth-layout">
        {/* Left Side - Dashboard Showcase & Information using pro.png */}
        <div className="auth-preview-panel">
          <div className="auth-showcase-header">
            <div className="auth-showcase-badge">
              <Zap size={13} className="badge-icon" />
              <span>ENTERPRISE OSINT WORKSPACE</span>
            </div>
            <h2 className="auth-showcase-title">Public Intelligence & Entity Investigation Suite</h2>
            <p className="auth-showcase-sub">
              Automate public digital footprint research, aggregate multi-source index signals, and organize structured subject investigation records into clear, actionable intelligence.
            </p>
          </div>

          {/* Pro Dashboard Screenshot Showcase */}
          <div className="auth-pro-img-wrapper">
            <img src={proImg} alt="OSINT Platform Pro Dashboard Workspace" className="auth-pro-image" />
            <div className="auth-img-overlay-badge">
              <span className="live-dot" />
              <span>Live Workspace Preview</span>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="auth-feature-pills-row">
            <div className="auth-feature-pill">
              <CheckCircle2 size={14} className="pill-icon" />
              <span>Cross-Platform Profile Discovery</span>
            </div>
            <div className="auth-feature-pill">
              <Globe size={14} className="pill-icon" />
              <span>Multi-Source Index Aggregation</span>
            </div>
            <div className="auth-feature-pill">
              <ShieldCheck size={14} className="pill-icon" />
              <span>Private & Encrypted Workspaces</span>
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
                      placeholder="alex_vance"
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
                    placeholder="alex.vance@cyberintel.io"
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
                    placeholder="••••••••••••"
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
                      placeholder="••••••••••••"
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
              <Link to="/terms">Terms of Service</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar Under Login Form */}
      <div className="auth-footer-container">
        <Footer />
      </div>
    </div>
  );
};

const AlertCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
