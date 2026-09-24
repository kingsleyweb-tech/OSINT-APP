import React from 'react';
import { Shield, Eye, Lock, Server, Cpu, CheckCircle2, ArrowRight, AlertTriangle, Layers } from 'lucide-react';
const appLogo = '/icon.png';

export const AboutPage: React.FC<{ navigate?: any }> = ({ navigate }) => {
  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          {/* Header */}
          <div style={{ marginBottom: '50px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Shield size={14} />
              <span>Institutional Scope & Mission</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
              About the OSINT Investigation Platform
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              Engineered to standardize, accelerate, and safeguard open-source intelligence research for analysts, investigators, cybersecurity professionals, and journalists.
            </p>
          </div>

          {/* Mission Editorial Split */}
          <div className="lp-about-grid">
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                The Problem We Address
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '16px' }}>
                Open-Source Intelligence (OSINT) research historically required juggling dozens of browser tabs, manually crafting search engine dorks, and wading through false matches.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '24px' }}>
                Our platform aggregates public search engine signals via SerpApi, executes automated platform query rules, verifies live candidate profiles, and organizes digital footprints into clean, structured subject profile records — ethically and efficiently.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  '100% Public Data Indexing Compliance',
                  'Search Powered by SerpApi Google Index Backend',
                  'Zero Access to Private Accounts or Non-Public DBs',
                  'Auditable Case Records for Professional Teams'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontSize: '0.925rem' }}>
                    <CheckCircle2 style={{ width: '18px', height: '18px', color: 'var(--accent-warm-light)', flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-code-block" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
                <img src={appLogo} alt="Logo" style={{ width: '22px', height: '22px', borderRadius: '4px' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>System Core Specifications</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Primary Backend:</span>
                  <span style={{ color: 'var(--accent-warm-light)', marginLeft: '8px', fontWeight: 600 }}>SerpApi (Google Engine)</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Supported Scope:</span>
                  <span style={{ color: 'var(--text-primary)', marginLeft: '8px' }}>People & Username Handles</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Target Users:</span>
                  <span style={{ color: 'var(--text-primary)', marginLeft: '8px' }}>Cyber Analysts, Journalists, Researchers</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Data Persistence:</span>
                  <span style={{ color: 'var(--text-primary)', marginLeft: '8px' }}>Firebase Firestore (UID Isolated)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Responsible OSINT Section */}
          <div style={{ padding: '44px 0', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Role of Responsible OSINT & Limitations
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '20px' }}>
              Open-source intelligence relies entirely on information made publicly accessible on the indexed web. The platform does not claim certainty regarding candidate identity matching; analysts must always verify original source URLs before reaching research conclusions.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <AlertTriangle style={{ width: '22px', height: '22px', color: 'var(--accent-warm-light)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <strong>Non-CRA Notice:</strong> The platform is not a Consumer Reporting Agency (CRA) under FCRA guidelines and may not be used for credit, employment, or housing screening.
              </span>
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <a href="http://localhost:5178/auth" className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              Launch Investigation Workspace <ArrowRight size={18} />
            </a>
          </div>

        </div>
      </section>
    </div>
  );
};
