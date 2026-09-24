import React, { useState, useEffect } from 'react';
import './styles/LandingPage.css';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTopBtn } from './components/ScrollToTop';
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { AboutPage } from './pages/AboutPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { HelpPage } from './pages/HelpPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { ResponsibleUsePage } from './pages/ResponsibleUsePage';
import { LawEnforcementPage } from './pages/LawEnforcementPage';

export type PageId =
  | 'home'
  | 'features'
  | 'how-it-works'
  | 'about'
  | 'documentation'
  | 'help'
  | 'privacy'
  | 'terms'
  | 'responsible-use'
  | 'law-enforcement';

const PAGE_MAP: Record<string, PageId> = {
  '': 'home',
  'home': 'home',
  'features': 'features',
  'how-it-works': 'how-it-works',
  'about': 'about',
  'documentation': 'documentation',
  'help': 'help',
  'privacy': 'privacy',
  'terms': 'terms',
  'responsible-use': 'responsible-use',
  'law-enforcement': 'law-enforcement'
};

function getPageFromHash(): PageId {
  const hash = window.location.hash.replace('#/', '').replace('#', '').toLowerCase().trim();
  return PAGE_MAP[hash] || 'home';
}

export default function App() {
  const [page, setPage] = useState<PageId>(getPageFromHash);

  const navigate = (to: PageId) => {
    window.location.hash = to === 'home' ? '/' : `/${to}`;
    setPage(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHash = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Update title per page
  useEffect(() => {
    const titles: Record<PageId, string> = {
      home: 'OSINT Investigation Platform — Public Intelligence Research',
      features: 'Features — OSINT Investigation Platform',
      'how-it-works': 'How It Works — OSINT Investigation Platform',
      about: 'About — OSINT Investigation Platform',
      documentation: 'Documentation — OSINT Investigation Platform',
      help: 'Help Center — OSINT Investigation Platform',
      privacy: 'Privacy Policy — OSINT Investigation Platform',
      terms: 'Terms of Service — OSINT Investigation Platform',
      'responsible-use': 'Responsible Use Policy — OSINT Investigation Platform',
      'law-enforcement': 'Law Enforcement Guide — OSINT Investigation Platform'
    };
    document.title = titles[page] || titles.home;
  }, [page]);

  const renderPage = () => {
    switch (page) {
      case 'features': return <FeaturesPage navigate={navigate} />;
      case 'how-it-works': return <HowItWorksPage navigate={navigate} />;
      case 'about': return <AboutPage navigate={navigate} />;
      case 'documentation': return <DocumentationPage navigate={navigate} />;
      case 'help': return <HelpPage navigate={navigate} />;
      case 'privacy': return <PrivacyPage navigate={navigate} />;
      case 'terms': return <TermsPage navigate={navigate} />;
      case 'responsible-use': return <ResponsibleUsePage navigate={navigate} />;
      case 'law-enforcement': return <LawEnforcementPage navigate={navigate} />;
      default: return <HomePage navigate={navigate} />;
    }
  };

  return (
    <div className="lp-page">
      <Navbar currentPage={page} navigate={navigate} />
      <main>
        {renderPage()}
      </main>
      <Footer navigate={navigate} />
      <ScrollToTopBtn />
    </div>
  );
}
