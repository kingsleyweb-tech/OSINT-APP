import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight, AlertTriangle, Eye, Lock } from 'lucide-react';

export const ResponsibleUsePage: React.FC = () => {
  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <ShieldCheck size={14} />
              <span>Ethical OSINT Research Principles</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              Responsible OSINT Policy & Guidelines
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              Establishing rigorous ethical standards for public intelligence collection, identity matching, and subject privacy protection.
            </p>
          </div>

          {/* Editorial Split (No Boxed Card Wrapper) */}
          <div style={{ lineHeight: 1.75, color: 'var(--text-muted)', width: '100%' }}>
            
            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 01</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                1. Core Ethical OSINT Framework
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '20px' }}>
                Open-Source Intelligence (OSINT) grants researchers powerful analytical tools. With that capability comes the duty to operate with proportion, accuracy, and strict respect for legal and ethical boundaries.
              </p>

              {/* Side-by-Side Comparison Rows */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginTop: '20px' }}>
                <div style={{ borderLeft: '3px solid #22c55e', paddingLeft: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <CheckCircle2 style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Approved Use Cases</h3>
                  </div>
                  <ul style={{ paddingLeft: '16px', fontSize: '0.925rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Cybersecurity threat research & attack surface mapping</li>
                    <li>Journalistic verification of public figures & claims</li>
                    <li>Academic research on digital identity patterns</li>
                    <li>Corporate due diligence on public affiliations</li>
                    <li>Fraud investigation & identity verification</li>
                  </ul>
                </div>

                <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <XCircle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Strictly Prohibited</h3>
                  </div>
                  <ul style={{ paddingLeft: '16px', fontSize: '0.925rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Harassment, stalking, or physical intimidation</li>
                    <li>Doxxing or publishing private home addresses</li>
                    <li>FCRA credit, employment, or tenant background checks</li>
                    <li>Bypassing private social account privacy controls</li>
                    <li>Credential theft or unauthorized account access</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 02</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                2. Source Credibility & Identity Verification
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                Investigators must practice <strong>source verification</strong>: never assume that a search engine match or shared handle proves identity correlation without corroborating bio, location, and cross-platform evidence.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION 03</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                3. Responsible Evidence Handling
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '28px' }}>
                Maintain strict confidentiality regarding investigation case files saved in your Firestore workspace. Store evidence securely and practice data minimization by retaining only relevant public records.
              </p>

              <div style={{ textAlign: 'center', paddingTop: '10px' }}>
                <Link to="/auth" className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                  Acknowledge & Launch Workspace <ArrowRight size={18} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
