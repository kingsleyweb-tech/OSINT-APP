import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, Shield, AlertTriangle, Lock, FileText, CheckCircle2 } from 'lucide-react';

export const LawEnforcementPage: React.FC = () => {
  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Scale size={14} />
              <span>Legal Process & Agency Guidelines</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              Law Enforcement Guide & Protocols
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              Information regarding platform data architecture, legal process requirements, and public index search scope for government and law enforcement officers.
            </p>
          </div>

          {/* Continuous Editorial Flow (No Card Box Container) */}
          <div style={{ lineHeight: 1.75, color: 'var(--text-muted)', width: '100%' }}>
            
            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 01</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                1. Platform Data Architecture & Public Nature
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '20px' }}>
                The OSINT Investigation Platform provides software interfaces for querying publicly indexed search engine records via <strong>SerpApi</strong>. The platform does not operate a proprietary private database of personal records, criminal background checks, or telecom logs.
              </p>

              {/* Explicit List of What Platform DOES NOT Provide */}
              <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: '20px', marginTop: '16px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block', marginBottom: '8px' }}>
                  What the Platform DOES NOT Provide
                </strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
                  The platform does not store or provide access to:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <div>• Private messages or chat logs</div>
                  <div>• Passwords or account credentials</div>
                  <div>• Private non-public social accounts</div>
                  <div>• Subscriber contact PII records</div>
                  <div>• Telecommunications location data</div>
                  <div>• Hidden or non-indexed databases</div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 02</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                2. Information Maintained by Platform
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '14px' }}>
                The only non-public data stored on platform infrastructure consists of:
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8 }}>
                <li><strong>User Account Details:</strong> Registered email address, user UID, and account creation date stored in Firebase Auth.</li>
                <li><strong>Saved Investigation Cases:</strong> User-saved candidate profile bookmarks, query parameters, and notes stored in Firebase Firestore.</li>
                <li><strong>Access Logs:</strong> Standard web server HTTP access logs containing IP address and timestamp.</li>
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 03</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                3. Legal Process Requirements
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '16px' }}>
                We require valid legal process before releasing non-public user account records:
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '28px' }}>
                <li><strong>Subpoenas:</strong> Required for basic subscriber registration data (email, account creation timestamp, IP logs).</li>
                <li><strong>Court Orders:</strong> Required for transactional query log history.</li>
                <li><strong>Search Warrants:</strong> Required for stored investigation case contents and private analyst notes.</li>
              </ul>

              <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <span style={{ fontSize: '0.95rem' }}>For official compliance inquiries or subpoena service:</span>
                <Link to="/help-center" className="btn-outline" style={{ fontSize: '0.875rem' }}>
                  Contact Compliance via Help Center
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
