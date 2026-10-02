import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import appLogo from '../../assets/images/icon.png';

export const AboutPage: React.FC = () => {
  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">

          <div style={{ marginBottom: '50px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Shield size={14} />
              <span>About the platform</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
              About the OSINT Investigation Platform
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              A web application that finds public information about people, usernames and organisations,
              and keeps every finding in one organised case — together with the source it came from.
            </p>
          </div>

          <div className="lp-about-grid">
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                The problem we solve
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '16px' }}>
                Open-source intelligence (OSINT) research used to mean opening dozens of browser tabs, writing search after search by hand,
                and sorting out which results really belong to the person or organisation you are looking for.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '24px' }}>
                The platform searches many public sources at once — search engines, news, maps, public social media pages, Wikidata and
                organisations’ own websites. It removes results that do not match, keeps people with a similar name apart, and saves
                everything into a case you can review, re-run and export.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  'Public information only — no private accounts or private messages',
                  'Every finding keeps a link to its source',
                  'Missing details are shown as “Not found”, never guessed',
                  'A full record (audit trail) of every search and change in a case'
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
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>At a glance</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>What you can search:</span>
                  <span style={{ color: 'var(--text-primary)', marginLeft: '8px' }}>People, usernames, organisations, places, news, media and trends — plus keyword alerts by email</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Where results come from:</span>
                  <span style={{ color: 'var(--accent-warm-light)', marginLeft: '8px', fontWeight: 600 }}>
                    Google, Bing, DuckDuckGo, Yahoo, YouTube, Google News, Bing News, Google Maps, Google Trends (through SerpApi), Wikidata, public platform checks and official websites
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Who it is for:</span>
                  <span style={{ color: 'var(--text-primary)', marginLeft: '8px' }}>Investigators, analysts, researchers and journalists</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Where your work is kept:</span>
                  <span style={{ color: 'var(--text-primary)', marginLeft: '8px' }}>In your own account (Firebase) — other users cannot see it</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '44px 0', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
              What the platform does
            </h2>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.85, marginBottom: '8px' }}>
              <li><strong style={{ color: 'var(--text-primary)' }}>Name and username searches</strong> that group results into possible people, and label each account as an exact match, a username variation, possibly related or another person — with the reason.</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Organisation profiles</strong> for companies, schools, universities, government agencies, associations and NGOs: type, official name, website, locations, leadership, units, contact details, social accounts and recent news — each fact checked against several sources.</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Search pages</strong> for social media posts, news, images and videos, places (with a map) and search trends.</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Cases</strong> with separate tabs for profiles, activity, links to others, sources, web pages, news, images, locations and contact details, plus metrics and an audit trail. Cases can be re-run, tracked, exported as a PDF report and shared with a view-only link.</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Keyword alerts</strong> that watch news and social platforms for your keywords on a schedule and email you — only you — when new results appear, each alert with its own page of results.</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Analysis</strong> of connections between cases and of the content saved in them.</li>
            </ul>
          </div>

          <div style={{ padding: '44px 0', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Responsible use and limits
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '20px' }}>
              The platform only uses information that is already public. It does not know for certain that two accounts belong to the same person:
              match labels and confidence levels help you judge, but they are not proof. Always open the original source before you reach a conclusion.
              The platform does not access private accounts, private messages or paid databases, and it does not do facial recognition.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <AlertTriangle style={{ width: '22px', height: '22px', color: 'var(--accent-warm-light)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <strong>Not a consumer reporting agency:</strong> the platform is not a Consumer Reporting Agency (CRA) under the FCRA and must not be used for credit, employment, housing or insurance decisions.
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <Link to="/auth" className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              Open the investigation workspace <ArrowRight size={18} />
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
};
