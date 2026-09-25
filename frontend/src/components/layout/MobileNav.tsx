import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/MobileNav.css';

interface MobileNavProps {
  isOpen?: boolean;
  userName?: string;
  onClose?: () => void;
  onSignOut?: () => void | Promise<void>;
}

export const MobileNav: React.FC<MobileNavProps> = ({ 
  isOpen = false, 
  userName = 'Investigator',
  onClose,
  onSignOut
}) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  if (!isOpen) return null;

  const initial = userName.charAt(0).toUpperCase();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/new-investigation', label: 'New Search' },
    { path: '/investigations', label: 'Investigations' },
    { path: '/people', label: 'People & Targets' },
    { path: '/sources', label: 'Sources & APIs' },
    { path: '/help', label: 'Help & Manual' },
    { path: '/settings', label: 'Settings' },
  ];

  const handleSignOut = async () => {
    if (onClose) onClose();
    // Opens the "Are you sure?" dialog; the dialog signs out and returns to the homepage.
    onSignOut?.();
  };

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
            <span className="brutalist-menu-tag">menu</span>
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
          {menuItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/new-investigation' && location.pathname === '/search') ||
              (item.path === '/investigations' && location.pathname.startsWith('/investigations/'));

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

        {/* Footer Section with User Profile Badge & Logout */}
        <div className="brutalist-menu-footer">
          <div className="user-profile-badge">
            <div className="avatar-initials-circle">{initial}</div>
            <span className="user-name-text">{userName}</span>
            <ChevronDown className="user-chevron" size={14} />
          </div>

          <button
            className="brutalist-logout-btn"
            onClick={handleSignOut}
          >
            [sign out]
          </button>
        </div>

      </div>
    </div>
  );
};
