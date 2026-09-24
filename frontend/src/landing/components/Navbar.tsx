import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import appLogo from '../../assets/images/icon.png';
import { LandingMobileNav } from './LandingMobileNav';

interface NavbarProps {
  currentUser?: any;
}

const NAV_ITEMS = [
  { label: 'Features', path: '/features' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'Documentation', path: '/documentation' },
  { label: 'About', path: '/about' },
  { label: 'Help', path: '/help-center' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <nav className="lp-nav" role="navigation" aria-label="Main landing navigation">
        <div className="lp-nav-inner">
          {/* Logo */}
          <Link to="/" className="lp-logo" aria-label="OSINT Platform Homepage">
            <img src={appLogo} alt="OSINT Platform Logo" className="lp-logo-img" />
            <span className="lp-logo-name">
              OSINT <span>Platform</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <ul className="lp-nav-links" role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`lp-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Actions & Theme toggle */}
          <div className="lp-nav-actions">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {currentUser ? (
              <button onClick={() => navigate('/dashboard')} className="btn-primary-warm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                Dashboard <ArrowRight size={13} />
              </button>
            ) : (
              <>
                <Link to="/auth" className="btn-outline btn-outline-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Sign In
                </Link>
                <Link to="/auth" className="btn-primary-warm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Hamburger Menu Button */}
          <button
            className="lp-hamburger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open mobile menu"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px'
            }}
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Brutalist Mobile Navigation Overlay (Matches Dashboard Reference Implementation) */}
      <LandingMobileNav
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
};
