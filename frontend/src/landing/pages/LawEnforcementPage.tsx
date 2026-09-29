import React from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';

const Section: React.FC<{ n: number; title: string; last?: boolean; children: React.ReactNode }> = ({ n, title, last, children }) => (
  <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0', ...(last ? { borderBottom: '1px solid var(--border-color)' } : {}) }}>
    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION {String(n).padStart(2, '0')}</div>
    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{n}. {title}</h2>
    {children}
  </div>
);

export const LawEnforcementPage: React.FC = () => {
  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">

          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Scale size={14} />
              <span>Legal process & agency guidelines</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              Law Enforcement Guide
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              For government and law enforcement officers: what the platform is, what information it keeps, and what legal process we require.
            </p>
          </div>

          <div style={{ lineHeight: 1.75, color: 'var(--text-muted)', width: '100%' }}>

            <Section n={1} title="What the platform is">
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '20px' }}>
                The OSINT Investigation Platform is software that searches <strong>public</strong> sources on behalf of its users: search engines
                through <strong>SerpApi</strong> (Google, Bing, DuckDuckGo, Yahoo, YouTube, news, images, maps and trends), public platform services
                (such as GitHub, Reddit, Mastodon and Bluesky), Wikidata, and the public pages of organisations’ own websites. The platform does not
                run its own database of personal records, criminal records or telecom data.
              </p>

              <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: '20px', marginTop: '16px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block', marginBottom: '8px' }}>
                  What the platform does not have
                </strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
                  The platform does not collect, store or give access to:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <div>• Private messages or chat logs</div>
                  <div>• Passwords or login details of any platform</div>
                  <div>• Private (non-public) social media accounts</div>
                  <div>• Phone company or subscriber records</div>
                  <div>• Phone or device location data</div>
                  <div>• Hidden, paid or non-public databases</div>
                  <div>• Facial recognition data</div>
                </div>
              </div>
            </Section>

            <Section n={2} title="Information the platform keeps about its users">
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '14px' }}>
                The only non-public information held for the platform is about its own users, stored in Google Firebase:
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8 }}>
                <li><strong>Account details:</strong> email address, display name, user ID, sign-in method and account creation date (Firebase Authentication).</li>
                <li><strong>Saved cases:</strong> the investigations a user created — the public results they contain, the user’s evidence levels and each case’s audit log.</li>
                <li><strong>Account activity:</strong> the user’s search history, tracked people and organisations, notifications and settings.</li>
              </ul>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginTop: '14px' }}>
                A user’s search history is stored in their own account, which they can delete. Search results are kept on the server for up to 12
                hours only, to avoid running the same search twice. The server’s technical output, and the standard logs of our hosting and service
                providers, may also contain request details for a limited time.
              </p>
            </Section>

            <Section n={3} title="Legal process requirements" last>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '16px' }}>
                We require valid legal process before releasing any non-public user information:
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '16px' }}>
                <li><strong>Subpoena (or local equivalent):</strong> for basic account details, such as email address and account creation date.</li>
                <li><strong>Court order:</strong> for a user’s search history and activity records.</li>
                <li><strong>Search warrant:</strong> for the contents of a user’s saved cases.</li>
              </ul>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '28px' }}>
                The public information shown in the platform can be found by anyone through the original sources; each result keeps a link to where it came from.
              </p>

              <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <span style={{ fontSize: '0.95rem' }}>For official requests or service of legal process:</span>
                <Link to="/help-center" className="btn-outline" style={{ fontSize: '0.875rem' }}>
                  Contact us through the Help Center
                </Link>
              </div>
            </Section>

          </div>
        </div>
      </section>
    </div>
  );
};
