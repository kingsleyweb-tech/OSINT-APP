import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import './styles/LandingPage.css';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTopBtn } from './components/ScrollToTop';
import { ArrowLeft } from 'lucide-react';

interface LandingLayoutProps {
  currentUser?: any;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ currentUser }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="lp-page">
      <Navbar currentUser={currentUser} />

      {/* Back Button — shown on all pages except home */}
      {!isHome && (
        <div className="lp-back-btn-bar">
          <Link to="/" className="lp-back-btn">
            <ArrowLeft size={15} />
            <span>Back to Home</span>
          </Link>
        </div>
      )}

      <main className="lp-route-container">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTopBtn />
    </div>
  );
};
