import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import appLogo from '../../assets/images/osint-logo.svg';
import { Ar, Moon, Sun } from './site/Icons';

interface NavbarProps {
  currentUser?: unknown;
}

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const NAV_ITEMS = [
  {
    label: 'Features', path: '/features', note: 'Search tools, profile checks and case workspace',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" {...line}><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" /></svg>,
  },
  {
    label: 'How it works', path: '/how-it-works', note: 'From a name or username to a reviewed case',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" {...line}><circle cx="5.5" cy="6" r="2.2" /><circle cx="18.5" cy="18" r="2.2" /><path d="M7.7 6H15a3.5 3.5 0 0 1 0 7H9a3.5 3.5 0 0 0 0 7h7.3" /></svg>,
  },
  {
    label: 'Documentation', path: '/documentation', note: 'Guides for every part of the platform',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" {...line}><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" /><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19M9 7.5h6M9 11h4" /></svg>,
  },
  {
    label: 'About', path: '/about', note: 'Who we are and how we work',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" {...line}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5h.01" /></svg>,
  },
  {
    label: 'Help Center', path: '/help-center', note: 'Answers to common questions',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" {...line}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8M12 17h.01" /></svg>,
  },
];

const TRUST_LINKS = [
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Responsible use', path: '/responsible-use' },
  { label: 'Law enforcement', path: '/law-enforcement' },
];

/** Width at which the full link bar replaces the menu (matches site.css). */
const DESKTOP = '(min-width: 1101px)';

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : '');

export const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme, setTheme } = useTheme();
  const burgerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => setMenuOpen(false);

  // While open: freeze the page where it is (works on iOS too), close on Escape or at desktop width.
  useEffect(() => {
    if (!menuOpen) return;
    const burger = burgerRef.current;
    const { body, documentElement: html } = document;
    const scrollY = window.scrollY;
    const saved = {
      position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right,
      width: body.style.width, overflow: body.style.overflow, htmlOverflow: html.style.overflow,
    };
    const gap = window.innerWidth - html.clientWidth; // scrollbar width, so the page doesn't jump sideways
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = gap ? `${gap}px` : '0';
    body.style.width = 'auto';
    panelRef.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        burger?.focus({ preventScroll: true });
      }
    };
    // Touch moves outside the menu panel (the dimmed area, the top bar) must not scroll anything.
    const onTouchMove = (e: TouchEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) e.preventDefault();
    };
    const wide = window.matchMedia(DESKTOP);
    const onWide = (e: MediaQueryListEvent) => { if (e.matches) setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    wide.addEventListener('change', onWide);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('touchmove', onTouchMove);
      wide.removeEventListener('change', onWide);
      html.style.overflow = saved.htmlOverflow;
      body.style.overflow = saved.overflow;
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.left = saved.left;
      body.style.right = saved.right;
      body.style.width = saved.width;
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  }, [menuOpen]);

  return (
    <header className={`tb${menuOpen ? ' tb-open' : ''}`}>
      <div className="wrap tb-in">
        <Link to="/" className="tb-brand" aria-label="OSINT Platform home" onClick={close}>
          <img src={appLogo} alt="" />
          <span>OSINT <span>Platform</span></span>
        </Link>
        <nav className="tb-links" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} className={linkClass}>{item.label}</NavLink>
          ))}
        </nav>
        <div className="tb-right">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label="Switch between light and dark mode"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
          {currentUser ? (
            <Link to="/dashboard" className="btn btn-br">Dashboard <Ar /></Link>
          ) : (
            <>
              <Link to="/auth" className="tb-signin">Sign in</Link>
              <Link to="/auth" className="btn btn-br">Get started <Ar /></Link>
            </>
          )}
          <button
            ref={burgerRef}
            type="button"
            className={`icon-btn burger${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="burger-lines" aria-hidden="true"><i /><i /><i /></span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="mnav-scrim" onClick={close} aria-hidden="true" />
          <div className="mnav" id="site-menu" ref={panelRef}>
            <div className="wrap mnav-in">
              <div className="mnav-h">Explore</div>
              <nav className="mnav-list" aria-label="Mobile">
                {NAV_ITEMS.map((item, i) => (
                  <NavLink key={item.path} to={item.path} className={linkClass} onClick={close} style={{ animationDelay: `${40 + i * 35}ms` }}>
                    <span className="mnav-ic">{item.icon}</span>
                    <span className="mnav-tx">
                      <b>{item.label}</b>
                      <small>{item.note}</small>
                    </span>
                    <svg className="mnav-go" width="16" height="16" viewBox="0 0 24 24" {...line} aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                  </NavLink>
                ))}
              </nav>

              <div className="mnav-h">Trust &amp; legal</div>
              <div className="mnav-chips">
                {TRUST_LINKS.map((item) => (
                  <NavLink key={item.path} to={item.path} className={linkClass} onClick={close}>{item.label}</NavLink>
                ))}
              </div>

              <div className="mnav-foot">
                <div className="mnav-theme" role="group" aria-label="Appearance">
                  <button type="button" className={theme === 'light' ? 'on' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
                    <Sun /> Light
                  </button>
                  <button type="button" className={theme === 'dark' ? 'on' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
                    <Moon /> Dark
                  </button>
                </div>
                <div className="mnav-cta">
                  {currentUser ? (
                    <Link to="/dashboard" className="btn btn-br" onClick={close}>Open dashboard <Ar /></Link>
                  ) : (
                    <>
                      <Link to="/auth" className="btn btn-br" onClick={close}>Get started <Ar /></Link>
                      <Link to="/auth" className="btn btn-line" onClick={close}>Sign in</Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
