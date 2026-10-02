import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle } from 'lucide-react';

const Section: React.FC<{ n: number; title: string; last?: boolean; children: React.ReactNode }> = ({ n, title, last, children }) => (
  <div style={{ borderTop: '1px solid var(--border-color)', padding: '28px 0', ...(last ? { borderBottom: '1px solid var(--border-color)' } : {}) }}>
    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '6px' }}>SECTION {String(n).padStart(2, '0')}</div>
    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{n}. {title}</h2>
    {children}
  </div>
);

const P: React.FC<{ children: React.ReactNode; mb?: number }> = ({ children, mb = 0 }) => (
  <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: mb }}>{children}</p>
);

const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.8 }}>{children}</ul>
);

export const TermsPage: React.FC = () => {
  const lastUpdated = 'September 29, 2026';

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
              Effective date: {lastUpdated} · The rules for using the platform, what it does and does not promise, and what is not allowed.
            </p>
          </div>

          <div style={{ lineHeight: 1.75, color: 'var(--text-muted)', width: '100%' }}>
            <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '28px 0', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <AlertTriangle style={{ width: '26px', height: '26px', color: 'var(--accent-warm-light)', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block', marginBottom: '4px' }}>
                    Not a consumer reporting agency (FCRA notice)
                  </strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6 }}>
                    The OSINT Investigation Platform is NOT a Consumer Reporting Agency (CRA) as defined by the Fair Credit Reporting Act (FCRA).
                    Its results may NOT be used to decide on credit, employment, housing (tenant screening) or insurance.
                  </p>
                </div>
              </div>
            </div>

            <Section n={1} title="Accepting these terms">
              <P>
                By creating an account or using the platform, you agree to these Terms of Service. You must be 18 or older and must use the
                platform in line with the laws that apply to you.
              </P>
            </Section>

            <Section n={2} title="Allowed use and what is not allowed">
              <P mb={14}>
                The platform is for lawful research: investigations, security research, journalism, academic study and due diligence on
                organisations. You must not use it for:
              </P>
              <List>
                <li>Harassment, stalking, bullying or intimidation of anyone — including using keyword alerts to watch a private person.</li>
                <li>Doxxing — publishing someone’s home address, phone number, email address or other personal details to harm or expose them.</li>
                <li>Credit, employment, housing or insurance screening (see the FCRA notice above).</li>
                <li>Getting around privacy settings, getting into private accounts, or stealing passwords.</li>
                <li>Any activity that breaks the law or the rights of others.</li>
              </List>
            </Section>

            <Section n={3} title="Where results come from">
              <P>
                Results are collected live from public sources: search engines through <strong>SerpApi</strong> (Google, Bing, DuckDuckGo, Yahoo,
                YouTube, news, images, maps and trends), public platform services, Wikidata and the public pages of organisations’ own websites.
                We do not control these sources, and we do not promise that their information is complete, up to date or correct.
              </P>
            </Section>

            <Section n={4} title="Results are a starting point, not proof">
              <List>
                <li>Match labels (such as Exact match, Possibly related or Strong evidence) and confidence levels help you judge a result. They do not prove that an account or fact belongs to your subject.</li>
                <li>Accounts and organisations with similar names are kept apart, but you must check the original source before you rely on any result.</li>
                <li>When the sources do not give a detail, the platform shows “Not found”. It never fills gaps with invented information.</li>
                <li>You are responsible for the conclusions you draw and for how you use the results.</li>
              </List>
            </Section>

            <Section n={5} title="Your account and fair use">
              <P>
                Keep your sign-in details safe; you are responsible for what is done with your account. Searches use a shared monthly allowance,
                so the number of searches an account can run in a short time is limited. We may limit, suspend or close accounts that break these
                terms or put the service at risk.
              </P>
            </Section>

            <Section n={6} title="No warranty and limitation of liability" last>
              <P mb={24}>
                THE PLATFORM IS PROVIDED “AS IS”, WITHOUT WARRANTIES OF ANY KIND. TO THE EXTENT THE LAW ALLOWS, WE ARE NOT LIABLE FOR DECISIONS
                MADE OR ACTIONS TAKEN BASED ON ITS RESULTS. WE MAY CHANGE THESE TERMS; THE EFFECTIVE DATE ABOVE SHOWS THE LATEST VERSION.
              </P>

              <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.9rem' }}>
                <span>Need more detail on acceptable use?</span>
                <Link to="/responsible-use" style={{ color: 'var(--accent-warm-light)', textDecoration: 'underline' }}>
                  Read the Responsible Use policy
                </Link>
              </div>
            </Section>

          </div>
        </div>
      </section>
    </div>
  );
};
