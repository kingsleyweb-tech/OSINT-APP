import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  FolderSearch, 
  Users, 
  Globe, 
  Settings, 
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import appLogo from '../../assets/images/icon.png';
import '../../styles/Sidebar.css';

interface SidebarProps {
  userName?: string;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  userName = "Kingsley Anaab", 
  userRole = "Investigator" 
}) => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/new-investigation', label: 'New Investigation', icon: Search },
    { path: '/investigations', label: 'Investigations', icon: FolderSearch },
    { path: '/people', label: 'People', icon: Users },
    { path: '/sources', label: 'Sources', icon: Globe },
    { path: '/help', label: 'Help & Docs', icon: HelpCircle },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

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
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path === '/new-investigation' && location.pathname === '/search') ||
            (item.path === '/investigations' && location.pathname.startsWith('/investigations/'));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">
            {userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
        </div>
        <div className="user-info">
          <div className="user-name">{userName}</div>
          <div className="user-role">{userRole}</div>
        </div>
        <ChevronRight className="user-arrow" />
      </div>
    </aside>
  );
};

