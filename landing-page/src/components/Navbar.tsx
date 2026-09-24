import React, { useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import type { PageId } from '../App';

interface NavbarProps {
  currentPage: PageId;
  navigate: (to: PageId) => void;
}

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173/auth';

const NAV_ITEMS: { label: string; page: PageId }[] = [
  { label: 'Features', page: 'features' },
  { label: 'How It Works', page: 'how-it-works' },
  { label: 'Documentation', page: 'documentation' },
  { label: 'About', page: 'about' },
  { label: 'Help', page: 'help' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentPage, navigate }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: PageId) => {
    navigate(page);
    setMobileOpen(false);
  };

  return (
    <>
      <nav className="lp-nav" role="navigation" aria-label="Main navigation">
        <div className="lp-nav-inner">
          {/* Logo */}
          <button
            className="lp-logo"
            onClick={() => handleNav('home')}
            aria-label="OSINT Platform — go to home"
          >
            <div className="lp-logo-mark">OS</div>
            <span className="lp-logo-name">OSINT <span>Platform</span></span>
          </button>

          {/* Desktop nav links */}
          <ul className="lp-nav-links" role="list">
            {NAV_ITEMS.map(item => (
              <li key={item.page}>
                <button
                  className={`lp-nav-link${currentPage === item.page ? ' active' : ''}`}
                  onClick={() => handleNav(item.page)}
                  aria-current={currentPage === item.page ? 'page' : undefined}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop auth buttons */}
          <div className="lp-nav-auth">
            <a href={APP_URL} className="btn-outline btn-outline-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Sign In</a>
            <a href={APP_URL} className="btn-primary-warm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Sign Up
            </a>
          </div>

          {/* Hamburger */}
          <button
            className="lp-hamburger"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Nav */}
      <div className={`lp-mobile-nav${mobileOpen ? ' open' : ''}`} aria-hidden={!mobileOpen}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.page}
            className="lp-mobile-nav-link"
            onClick={() => handleNav(item.page)}
          >
            {item.label}
          </button>
        ))}
        <div className="lp-mobile-nav-divider" />
        <div className="lp-mobile-auth">
          <a href={APP_URL} className="btn-outline" style={{ justifyContent: 'center' }}>Sign In</a>
          <a href={APP_URL} className="btn-primary-warm" style={{ justifyContent: 'center' }}>
            Sign Up
          </a>
        </div>
      </div>
    </>
  );
};
