import React, { useState, useRef, useEffect } from 'react';
import { Bell, Sun, Moon, Menu, ArrowLeft } from 'lucide-react';
import '../../styles/Topbar.css';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onToggleMobileNav?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileNav }) => {
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const bellWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close notification dropdown when clicking outside
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bellWrapperRef.current && !bellWrapperRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Back Button */}
        <button
          className="topbar-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          title="Go Back"
        >
          <ArrowLeft size={18} />
        </button>

        {onToggleMobileNav && (
          <button
            className="mobile-hamburger-btn"
            onClick={onToggleMobileNav}
            aria-label="Open Menu"
            title="Open Navigation Menu"
          >
            <Menu size={20} />
            <span className="hamburger-label">MENU</span>
          </button>
        )}
      </div>

      <div className="topbar-right">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="notification-bell-wrapper" ref={bellWrapperRef}>
          <button
            className={`notification-bell-btn ${isNotifOpen ? 'active' : ''}`}
            onClick={() => setIsNotifOpen(prev => !prev)}
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="bell-badge-count">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <NotificationDropdown onClose={() => setIsNotifOpen(false)} />
          )}
        </div>
      </div>
    </header>
  );
};
