import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { NAV_SECTIONS, isNavActive } from './navItems';
import appLogo from '../../assets/images/icon.png';
import '../../styles/Sidebar.css';

interface SidebarProps {
  userName?: string;
  userRole?: string;
  photoURL?: string;
  onSignOut?: () => void | Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  userName = 'Investigator',
  userRole = 'Investigator',
  photoURL,
  onSignOut
}) => {
  const location = useLocation();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Opens the "Are you sure?" dialog; the dialog signs out and returns to the homepage.
    onSignOut?.();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo-img-wrapper">
          <img src={appLogo} alt="OSINT Logo" className="sidebar-app-logo" />
        </div>
        <div className="brand-text">
          <div className="brand-title">OSINT</div>
          <div className="brand-subtitle">INVESTIGATION PLATFORM</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, si) => (
          <React.Fragment key={section.title || si}>
            {section.title && <div className="nav-section-title">{section.title}</div>}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isNavActive(item.path, location.pathname) ? 'active' : ''}`}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="sidebar-user-wrapper">
        <div className="sidebar-user">
          <div className="user-avatar">
            {photoURL
              ? <img src={photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              : userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'IN'}
          </div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-role">{userRole}</div>
          </div>
          <button 
            className="sidebar-signout-btn" 
            onClick={handleSignOut}
            title="Sign Out"
            aria-label="Sign Out of OSINT Platform"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
