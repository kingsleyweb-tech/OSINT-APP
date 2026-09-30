import React from 'react';
import { Link } from 'react-router-dom';
import { InvestigationDetailPage } from './InvestigationDetail';
import { ScrollManager } from '../../components/layout/ScrollManager';
import appLogo from '../../assets/images/icon.png';

/**
 * Public page for a view-only share link (/shared/:token). No sign-in and no app sidebar:
 * the case opens read-only, so nothing can be searched, changed or saved.
 */
export const SharedInvestigationPage: React.FC = () => (
  <div className="ws-shared-page">
    <ScrollManager />
    <header className="ws-shared-bar">
      <Link to="/" className="ws-shared-brand">
        <img src={appLogo} alt="" width={26} height={26} />
        <span>OSINT Intelligence Platform</span>
      </Link>
      <Link to="/auth" className="ws-shared-signin">Sign in</Link>
    </header>
    <main className="ws-shared-main">
      <InvestigationDetailPage />
    </main>
  </div>
);
