import React from 'react';
import { Link } from 'react-router-dom';
import appLogo from '../../assets/images/osint-logo.svg';

export const Footer: React.FC = () => (
  <footer className="ftr">
    <div className="wrap ftr-grid">
      <div>
        <Link to="/" className="tb-brand" aria-label="OSINT Platform home">
          <img src={appLogo} alt="" />
          <span>OSINT <span>Platform</span></span>
        </Link>
        <p className="ftr-about">Ethical Open-Source Intelligence research workspace. Automating search engine discovery, profile verification, and case investigations.</p>
        <span className="ftr-serp">Search powered by SerpApi</span>
      </div>
      <div className="ftr-col">
        <div className="ftr-h">Product</div>
        <Link to="/features">Features</Link>
        <Link to="/how-it-works">How it works</Link>
        <Link to="/documentation">Documentation</Link>
        <Link to="/help-center">Help Center</Link>
      </div>
      <div className="ftr-col">
        <div className="ftr-h">Information</div>
        <Link to="/about">About</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
        <Link to="/responsible-use">Responsible Use</Link>
        <Link to="/law-enforcement">Law Enforcement</Link>
      </div>
      <div className="ftr-col">
        <div className="ftr-h">Account &amp; infrastructure</div>
        <Link to="/auth">Sign in</Link>
        <Link to="/auth">Get started</Link>
        <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer">SerpApi Infrastructure ↗</a>
        <span className="sm">Non-FCRA compliant</span>
      </div>
    </div>
    <div className="wrap">
      <div className="ftr-bar">
        <span>© {new Date().getFullYear()} OSINT Investigation Platform. All rights reserved.</span>
        <span>Search powered by SerpApi | Firestore Encrypted Case Isolation</span>
      </div>
    </div>
  </footer>
);
