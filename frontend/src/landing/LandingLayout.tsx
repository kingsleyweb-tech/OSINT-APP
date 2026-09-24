import React from 'react';
import { Outlet } from 'react-router-dom';
import './styles/LandingPage.css';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTopBtn } from './components/ScrollToTop';

interface LandingLayoutProps {
  currentUser?: any;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ currentUser }) => {
  return (
    <div className="lp-page">
      <Navbar currentUser={currentUser} />
      <main className="lp-route-container">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTopBtn />
    </div>
  );
};
