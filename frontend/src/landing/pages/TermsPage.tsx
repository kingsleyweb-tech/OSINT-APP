import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, ShieldCheck } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const lastUpdated = 'September 24, 2026';

  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <FileText size={14} />
              <span>Terms of Service</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              Terms of Service
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              Effective Date: {lastUpdated} | Comprehensive product terms governing workspace use, non-FCRA status, and search infrastructure rules.
            </p>
          </div>

          {/* Continuous Editorial Document Flow (No Card Container) */}
          <div style={{ lineHeight: 1.75, color: 'var(--text-muted)', width: '100%' }}>
            
            {/* Non-FCRA Banner */}
            <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '28px 0', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <AlertTriangle style={{ width: '26px', height: '26px', color: 'var(--accent-warm-light)', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block', marginBottom: '4px' }}>
                    Mandatory Non-FCRA Compliance Disclaimer
                  </strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6 }}>
                    The OSINT Investigation Platform is NOT a Consumer Reporting Agency (CRA) as defined by the Fair Credit Reporting Act (FCRA). Data provided by this platform may NOT be used for credit eligibility, employment screening, tenant vetting, or insurance determinations.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 01</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                1. Acceptance of Terms & Eligibility
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                By registering an account or accessing the OSINT Investigation Platform, you agree to be bound by these Terms of Service. Access is restricted to individuals 18 years of age or older operating in compliance with applicable law.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 02</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                2. Permitted Use & Prohibited Conduct
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '14px' }}>
                The workspace is provided exclusively for legitimate cybersecurity research, academic study, journalism, and corporate due diligence. Users are strictly prohibited from using the platform for:
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8 }}>
                <li>Unlawful harassment, stalking, cyber-bullying, or physical intimidation.</li>
                <li>Doxxing or publishing private home addresses/phone numbers.</li>
                <li>FCRA-regulated credit, employment, or housing background screening.</li>
                <li>Bypassing private social account settings or credential theft.</li>
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 03</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                3. Search Infrastructure & SerpApi
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                Search engine results are retrieved via <strong>SerpApi</strong>. We do not guarantee the completeness, real-time index timeliness, or accuracy of third-party search engine crawl data.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 04</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                4. Limitation of Liability & Account Suspension
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '24px' }}>
                THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE RESERVE THE RIGHT TO SUSPEND OR TERMINATE ACCOUNTS THAT VIOLATE ACCEPTABLE USE POLICIES WITHOUT PRIOR NOTICE.
              </p>

              <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                <span>Need clarification on terms?</span>
                <Link to="/responsible-use" style={{ color: 'var(--accent-warm-light)', textDecoration: 'underline' }}>
                  Read Ethics Policy
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
