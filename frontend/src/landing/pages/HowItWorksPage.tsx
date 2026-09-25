import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Cpu, CheckCircle2, Layers } from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '50px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Cpu size={14} />
              <span>Architecture & Pipeline</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
              How the OSINT Engine Operates
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              A transparent breakdown of query generation, SerpApi index execution, profile validation, and structured case reporting.
            </p>
          </div>

          <div className="lp-editorial-list" style={{ marginBottom: '60px' }}>
            
            <div className="lp-editorial-row">
              <div className="lp-editorial-num">01</div>
              <div className="lp-editorial-title-box">
                <h3>Query Input & Dorking</h3>
                <p>Automated Google search expression builder</p>
              </div>
              <div className="lp-editorial-body">
                <p className="lp-editorial-desc">
                  When an analyst enters a target name or username, our backend engine constructs targeted search expressions combining site scopes (e.g. `site:linkedin.com/in`), exact phrase quotes, and role/location qualifiers.
                </p>
                <div className="lp-code-block" style={{ padding: '16px', fontSize: '0.875rem' }}>
                  Input: "Alex Rivera" (San Francisco, Engineer)<br />
                  Engine Dork: site:linkedin.com/in "Alex Rivera" "San Francisco"<br />
                  Engine Scope: site:github.com "Alex Rivera" OR site:x.com "Alex Rivera"
                </div>
              </div>
            </div>

            <div className="lp-editorial-row">
              <div className="lp-editorial-num">02</div>
              <div className="lp-editorial-title-box">
                <h3>SerpApi Engine Execution</h3>
                <p>Real-time organic index request processing</p>
              </div>
              <div className="lp-editorial-body">
                <p className="lp-editorial-desc">
                  Queries are routed through <strong>SerpApi</strong> to fetch live organic search engine index results. SerpApi guarantees real-time Google search data in structured JSON format without relying on fragile web scraping scripts.
                </p>
              </div>
            </div>

            <div className="lp-editorial-row">
              <div className="lp-editorial-num">03</div>
              <div className="lp-editorial-title-box">
                <h3>Verification & Sanitization</h3>
                <p>URL parameter stripping & proximity scoring</p>
              </div>
              <div className="lp-editorial-body">
                <p className="lp-editorial-desc">
                  Results undergo automated post-processing: tracking parameters are stripped, candidate profiles are scored for name proximity, and generic site footers or 404 links are filtered out.
                </p>
              </div>
            </div>

            <div className="lp-editorial-row">
              <div className="lp-editorial-num">04</div>
              <div className="lp-editorial-title-box">
                <h3>Categorized Presentation & Save</h3>
                <p>Firestore user isolation & case records</p>
              </div>
              <div className="lp-editorial-body">
                <p className="lp-editorial-desc">
                  Verified findings populate structured tabs (Overview, Profiles, Activity, Associations, News, Sources). Analysts can save target profiles or entire cases directly to Firebase Firestore for future audit.
                </p>
              </div>
            </div>

          </div>

          <div style={{ textAlign: 'center', paddingTop: '20px' }}>
            <Link to="/auth" className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              Launch Workspace <ArrowRight size={18} />
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
};
