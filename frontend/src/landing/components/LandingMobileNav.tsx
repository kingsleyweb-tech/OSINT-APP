import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import appLogo from '../../assets/images/icon.png';
import '../../styles/MobileNav.css';

interface LandingMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export const LandingMobileNav: React.FC<LandingMobileNavProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  if (!isOpen) return null;

  const publicMenuItems = [
    { path: '/', label: 'Home' },
    { path: '/features', label: 'Features' },
    { path: '/how-it-works', label: 'How It Works' },
    { path: '/documentation', label: 'Documentation' },
    { path: '/about', label: 'About Scope' },
    { path: '/help-center', label: 'Help Center' },
    { path: '/privacy', label: 'Privacy Policy' },
    { path: '/terms', label: 'Terms of Service' },
    { path: '/responsible-use', label: 'Ethics Policy' },
    { path: '/law-enforcement', label: 'Law Enforcement' },
  ];

  return (
    <div className="brutalist-menu-overlay" onClick={onClose}>
      <div className="brutalist-menu-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Brutalist Frame Corner Brackets */}
        <div className="brutalist-corner-mark corner-top-left">┌</div>
        <div className="brutalist-corner-mark corner-top-right">┐</div>
        <div className="brutalist-side-mark side-middle-left">│</div>
        <div className="brutalist-side-mark side-middle-right">│</div>
        <div className="brutalist-corner-mark corner-bottom-left">└</div>
        <div className="brutalist-corner-mark corner-bottom-right">┘</div>

        {/* Top Header */}
        <div className="brutalist-menu-header">
          <div className="brutalist-header-left">
            <span className="brutalist-square-bullet">■</span>
            <span className="brutalist-menu-tag">public menu</span>
          </div>

          <div className="brutalist-header-actions">
            <button 
              className="brutalist-theme-btn" 
              onClick={toggleTheme}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? '[theme: light]' : '[theme: dark]'}
            </button>
            <button className="brutalist-close-btn" onClick={onClose} aria-label="Close menu">
              [close]
            </button>
          </div>
        </div>

        {/* Main Clean Left-Aligned Links */}
        <nav className="brutalist-menu-list">
          {publicMenuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`brutalist-menu-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Section */}
        <div className="brutalist-menu-footer">
          {currentUser ? (
            <div className="user-profile-badge" onClick={() => { onClose(); navigate('/dashboard'); }}>
              <img src={appLogo} alt="OSINT Logo" style={{ width: '22px', height: '22px', borderRadius: '4px' }} />
              <span className="user-name-text">{currentUser.displayName || 'Investigator'}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="brutalist-logout-btn"
                style={{ color: 'var(--text-primary)', fontWeight: 600 }}
                onClick={() => { onClose(); navigate('/auth'); }}
              >
                [sign in]
              </button>
            </div>
          )}

          <button
            className="brutalist-theme-btn"
            style={{ color: 'var(--accent-warm)' }}
            onClick={() => { onClose(); navigate(currentUser ? '/dashboard' : '/auth'); }}
          >
            {currentUser ? '[open workspace]' : '[get started]'}
          </button>
        </div>

      </div>
    </div>
  );
};
