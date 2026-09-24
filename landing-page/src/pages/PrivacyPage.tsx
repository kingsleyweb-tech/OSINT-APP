import React from 'react';
import { Lock, Shield, CheckCircle2 } from 'lucide-react';

export const PrivacyPage: React.FC<{ navigate?: any }> = ({ navigate }) => {
  const lastUpdated = 'September 24, 2026';

  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Lock size={14} />
              <span>Legal & Data Protection Policy</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              Privacy Policy
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              Effective Date: {lastUpdated} | Full transparency on data collection, processing, SerpApi search requests, and Firebase Firestore security.
            </p>
          </div>

          <div style={{ lineHeight: 1.75, color: 'var(--text-muted)', width: '100%' }}>
            
            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 01</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                1. Introduction & Public Scope
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                This Privacy Policy governs the operation of the OSINT Investigation Platform. The platform provides tools for querying publicly discoverable search engine index records. We do not maintain, purchase, or compile private personal consumer dossiers.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 02</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                2. Information Collected & Account Data
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '14px' }}>
                When you create an account or operate the platform, we store minimal operational data required to provide workspace services:
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8 }}>
                <li><strong>Account Credentials:</strong> Email address, hashed password, and displayName managed via Firebase Authentication.</li>
                <li><strong>Investigation Data:</strong> Search terms, bookmarked candidate profile links, analyst summary notes, and investigation timestamps saved to Firebase Firestore.</li>
                <li><strong>Technical Telemetry:</strong> Standard browser user-agent, local storage session tokens, and IP logs strictly for security monitoring.</li>
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 03</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                3. Search Processing & SerpApi Infrastructure
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '14px' }}>
                Search queries executed in the application are transmitted securely to <strong>SerpApi</strong> to fetch live organic Google search engine results.
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8 }}>
                <li>SerpApi processes search engine dorks safely without disclosing investigator identity to target subjects.</li>
                <li>No personal identifiable information (PII) of the investigating analyst is attached to search requests.</li>
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 04</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                4. Firebase & Firestore Security Isolation
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                Saved investigation records in Firebase Firestore are governed by strict security rules enforcing per-user UID isolation. No other user or unauthorized third party can view or query your saved investigation cases.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 05</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                5. User Data Rights & Account Deletion
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                You maintain complete ownership of your investigation data. You may delete individual saved cases, clear search history, or request full account erasure at any time through account settings or support channels.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 06</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                6. Children's Privacy & Policy Updates
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '24px' }}>
                The platform is intended exclusively for professional researchers over the age of 18. We do not knowingly collect information from children under 13.
              </p>

              <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                <span>Questions regarding this Privacy Policy?</span>
                <a href="#/help" style={{ color: 'var(--accent-warm-light)', textDecoration: 'underline' }}>
                  Contact Help Center
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
