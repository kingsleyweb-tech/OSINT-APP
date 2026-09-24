import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { PageId } from '../App';

interface FooterProps {
  navigate: (to: PageId) => void;
}

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173/auth';

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="lp-footer" role="contentinfo">
      <div className="lp-container">
        <div className="lp-footer-grid">
          {/* Brand */}
          <div className="lp-footer-brand">
            <div className="lp-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="lp-logo-mark">OS</div>
              <span className="lp-logo-name">OSINT <span>Platform</span></span>
            </div>
            <p>
              A public-source investigation platform for researching publicly available information about individuals and usernames.
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="lp-footer-col-title">Product</div>
            <div className="lp-footer-links">
              <button className="lp-footer-link" onClick={() => navigate('features')}>Features</button>
              <button className="lp-footer-link" onClick={() => navigate('how-it-works')}>How It Works</button>
              <button className="lp-footer-link" onClick={() => navigate('documentation')}>Documentation</button>
              <button className="lp-footer-link" onClick={() => navigate('help')}>Help Center</button>
            </div>
          </div>

          {/* Company */}
          <div>
            <div className="lp-footer-col-title">Information</div>
            <div className="lp-footer-links">
              <button className="lp-footer-link" onClick={() => navigate('about')}>About</button>
              <button className="lp-footer-link" onClick={() => navigate('privacy')}>Privacy Policy</button>
              <button className="lp-footer-link" onClick={() => navigate('terms')}>Terms of Service</button>
              <button className="lp-footer-link" onClick={() => navigate('law-enforcement')}>Law Enforcement</button>
            </div>
          </div>

          {/* Account + Responsible */}
          <div>
            <div className="lp-footer-col-title">Account</div>
            <div className="lp-footer-links">
              <a href={APP_URL} className="lp-footer-link">Sign In</a>
              <a href={APP_URL} className="lp-footer-link">Create Account</a>
            </div>
            <div className="lp-footer-col-title" style={{ marginTop: 20 }}>Responsible Use</div>
            <div className="lp-footer-links">
              <button className="lp-footer-link" onClick={() => navigate('responsible-use')}>Responsible OSINT</button>
              <button className="lp-footer-link" onClick={() => navigate('documentation')}>Source Verification</button>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p className="lp-footer-copy">
            © {new Date().getFullYear()} OSINT Investigation Platform. All rights reserved.
          </p>
          <div className="lp-footer-serpapi">
            <span>Search powered by</span>
            <a
              href="https://serpapi.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SerpApi official website (opens in new tab)"
            >
              SerpApi
            </a>
            <ExternalLink size={11} />
          </div>
        </div>
      </div>
    </footer>
  );
};
