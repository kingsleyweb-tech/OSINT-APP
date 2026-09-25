import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import './styles/LandingPage.css';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTopBtn } from './components/ScrollToTop';
import { ArrowLeft } from 'lucide-react';
import { AuthRequiredNotice } from './components/AuthRequiredNotice';

interface LandingLayoutProps {
  currentUser?: any;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ currentUser }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  return (
    <div className="lp-page">
      <Navbar currentUser={currentUser} />

      {/* Back Button — shown on all pages except home */}
      {!isHome && (
        <div className="lp-back-btn-bar">
          <button onClick={() => navigate(-1)} className="lp-back-btn">
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>
        </div>
      )}

      <AuthRequiredNotice />

      <main className="lp-route-container">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTopBtn />
    </div>
  );
};
