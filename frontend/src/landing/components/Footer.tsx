import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import appLogo from '../../assets/images/icon.png';

export const Footer: React.FC = () => {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-grid">
        {/* Brand Column */}
        <div className="lp-footer-col">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <img src={appLogo} alt="OSINT Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              OSINT <span style={{ color: 'var(--accent-warm-light)' }}>Platform</span>
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '16px', maxWidth: '320px' }}>
            Ethical Open-Source Intelligence research workspace. Automating search engine discovery, profile verification, and case investigations.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent-warm-glow)', border: '1px solid var(--accent-warm-border)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.78rem', color: 'var(--accent-warm-light)', fontWeight: 600 }}>
            <span>Search powered by SerpApi</span>
          </div>
        </div>

        {/* Product Links */}
        <div className="lp-footer-col">
          <h4>Product</h4>
          <ul>
            <li><Link to="/features" className="lp-footer-link">Features</Link></li>
            <li><Link to="/how-it-works" className="lp-footer-link">How It Works</Link></li>
            <li><Link to="/documentation" className="lp-footer-link">Documentation</Link></li>
            <li><Link to="/help-center" className="lp-footer-link">Help Center</Link></li>
          </ul>
        </div>

        {/* Information & Legal Links */}
        <div className="lp-footer-col">
          <h4>Information</h4>
          <ul>
            <li><Link to="/about" className="lp-footer-link">About</Link></li>
            <li><Link to="/privacy" className="lp-footer-link">Privacy Policy</Link></li>
            <li><Link to="/terms" className="lp-footer-link">Terms of Service</Link></li>
            <li><Link to="/responsible-use" className="lp-footer-link">Responsible Use</Link></li>
            <li><Link to="/law-enforcement" className="lp-footer-link">Law Enforcement</Link></li>
          </ul>
        </div>

        {/* Account & Infrastructure */}
        <div className="lp-footer-col">
          <h4>Account & Infrastructure</h4>
          <ul>
            <li><Link to="/auth" className="lp-footer-link">Sign In</Link></li>
            <li><Link to="/auth" className="lp-footer-link">Get Started</Link></li>
            <li><a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="lp-footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>SerpApi Infrastructure <ExternalLink size={12} /></a></li>
            <li><span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginTop: '6px' }}>Non-FCRA Compliant</span></li>
          </ul>
        </div>
      </div>

      <div className="lp-footer-bottom">
        <div>&copy; {new Date().getFullYear()} OSINT Investigation Platform. All rights reserved.</div>
        <div>Search powered by SerpApi | Firestore Encrypted Case Isolation</div>
      </div>
    </footer>
  );
};
