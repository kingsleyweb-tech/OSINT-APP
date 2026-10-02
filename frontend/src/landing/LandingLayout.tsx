import React from 'react';
import { Outlet } from 'react-router-dom';
import './styles/LandingPage.css';
import './styles/site.css';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTopBtn } from './components/ScrollToTop';
import { AuthRequiredNotice } from './components/AuthRequiredNotice';
import { useTheme } from '../context/ThemeContext';

interface LandingLayoutProps {
  currentUser?: unknown;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ currentUser }) => {
  const { theme } = useTheme();

  return (
    <div className="pf" data-theme={theme}>
      <div className="nav-anchor">
        <Navbar currentUser={currentUser} />
      </div>

      <AuthRequiredNotice />

      <main>
        <Outlet />
      </main>

      <div className="foot-wrap">
        <Footer />
      </div>
      <ScrollToTopBtn />
    </div>
  );
};
