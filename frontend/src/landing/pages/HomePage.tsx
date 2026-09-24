import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Search, UserCheck,
  Layers, Activity, Share2, FileText, Globe, CheckCircle2,
  AlertTriangle, HelpCircle, ExternalLink, Database, Cpu
} from 'lucide-react';
import appLogo from '../../assets/images/icon.png';
import { HeroSearchWidget } from '../components/HeroSearchWidget';
import { TypewriterTitle } from '../components/TypewriterTitle';
import { SourceEcosystem } from '../components/SourceEcosystem';

interface HomePageProps {
  currentUser?: any;
}

export const HomePage: React.FC<HomePageProps> = ({ currentUser }) => {
  const navigate = useNavigate();

  const titlePhrases = [
    'Person Profiles',
    'Username Handles',
    'Public Footprints',
    'Professional Mentions',
    'Social Associations'
  ];

  return (
    <div className="lp-route-container">
      {/* ── 1. HERO SECTION ── */}
      <section className="lp-section-wide" style={{ paddingTop: '50px', paddingBottom: '50px', textAlign: 'center' }}>
        <div className="lp-container-wide">
          
          <div className="lp-badge" style={{ margin: '0 auto 20px' }}>
            <img src={appLogo} alt="Logo" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
            <span>Search powered by SerpApi</span>
          </div>

          <h1 className="lp-title" style={{ maxWidth: '1040px', margin: '0 auto 20px' }}>
            Ethical OSINT Research & <br />
            <TypewriterTitle phrases={titlePhrases} />
          </h1>

          <p className="lp-subtitle" style={{ maxWidth: '840px', margin: '0 auto 32px' }}>
            Automate public digital footprint research. Aggregate search engine index signals, verify live social profiles, and organize structured subject investigation records — ethically, transparently, and securely.
          </p>

          {/* Interactive Hero Search Widget */}
          <HeroSearchWidget currentUser={currentUser} />

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px', marginBottom: '40px' }}>
            {currentUser ? (
              <button onClick={() => navigate('/dashboard')} className="btn-primary-warm" style={{ padding: '14px 28px', fontSize: '1rem' }}>
                Open Investigation Workspace <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <Link to="/auth" className="btn-primary-warm" style={{ padding: '14px 28px', fontSize: '1rem' }}>
                  Launch Investigation Workspace <ArrowRight size={18} />
                </Link>
                <Link to="/how-it-works" className="btn-outline" style={{ padding: '14px 24px', fontSize: '1rem' }}>
                  Explore Architecture
                </Link>
              </>
            )}
          </div>

          {/* Key Platform Specifications Bar (Horizontal Divider Layout) */}
          <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '24px 0', marginTop: '40px' }}>
            <div className="lp-grid lp-grid-4" style={{ textAlign: 'center', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-warm-light)' }}>30+</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>Supported Public Platforms</div>
              </div>
              <div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-warm-light)' }}>100%</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>Public Index Scope</div>
              </div>
              <div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-warm-light)' }}>SerpApi</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>Real-Time Search Backend</div>
              </div>
              <div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-warm-light)' }}>Firestore</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>Isolated User Cases</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. OSINT INTRODUCTION (FULL-WIDTH EDITORIAL SPLIT) ── */}
      <section className="lp-section-wide" style={{ background: 'var(--bg-mid)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="lp-container-wide">
          <div className="lp-responsive-grid-split">
            
            <div>
              <div className="lp-badge" style={{ marginBottom: '16px' }}>
                <HelpCircle size={14} />
                <span>Foundational Principles</span>
              </div>
              <h2 className="lp-title" style={{ fontSize: '2.4rem', marginBottom: '20px' }}>
                Understanding Open-Source Intelligence (OSINT)
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.75 }}>
                Open-Source Intelligence (OSINT) refers to the collection, processing, and analysis of publicly available data to produce actionable research. In open-source research, "open source" denotes that the information is accessible in the public domain without requiring covert techniques, unauthorized access, or private system intrusion.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Public vs Private Data Boundaries
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.65 }}>
                  Public data includes indexed web pages, news articles, public social profiles, developer commits, and corporate registrations. Private data—such as non-public emails, password-protected messages, financial accounts, or telecom logs—is strictly outside the scope of open-source research.
                </p>
              </div>

              <div style={{ paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Source Verification & False Matches
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.65 }}>
                  Search engine indexes frequently contain duplicate names, shared usernames, or outdated references. Professional OSINT requires evaluating multiple independent sources and reviewing original URLs before concluding identity correlation.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', paddingTop: '4px' }}>
                <ShieldCheck size={24} style={{ color: 'var(--accent-warm-light)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Ethical OSINT Rule:</strong> The platform operates strictly as a public index search aggregator. It does not provide consumer credit reporting, surveillance, or access to private non-public records.
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3. FEATURE BREAKDOWN — EDITORIAL ROWS (NO CARD BOXES) ── */}
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '12px' }}>
              <Layers size={14} />
              <span>Platform Capabilities</span>
            </div>
            <h2 className="lp-title" style={{ fontSize: '2.4rem' }}>
              What the Platform Investigates
            </h2>
            <p className="lp-subtitle" style={{ maxWidth: '780px' }}>
              Deep, structured intelligence collection structured around person identities, username digital footprints, and verified web profiles.
            </p>
          </div>

          {/* Editorial List (01, 02, 03, 04, 05) */}
          <div className="lp-editorial-list">
            
            {/* 01 Name Investigation */}
            <div className="lp-editorial-row">
              <div className="lp-editorial-num">01</div>
              <div className="lp-editorial-title-box">
                <h3>NAME INVESTIGATION</h3>
                <p>Multi-dork Google search engine aggregation</p>
              </div>
              <div className="lp-editorial-body">
                <p className="lp-editorial-desc">
                  Executes multi-dork search engine queries to locate a subject's public mentions, directory listings, publications, and professional affiliations.
                </p>
                <div className="lp-editorial-grid-2">
                  <div className="lp-editorial-spec-item">
                    <strong>Core Capabilities</strong>
                    <p>Exact phrase quotes, location/role dorking, directory isolation (LinkedIn, Scholar, Wikipedia).</p>
                  </div>
                  <div className="lp-editorial-spec-item">
                    <strong>Verification Rule</strong>
                    <p>Verify city, employment history, and bio context on original target pages before assuming match.</p>
                  </div>
                </div>
                <div className="lp-editorial-tags">
                  <span className="lp-editorial-tag">SerpApi Engine</span>
                  <span className="lp-editorial-tag">Google Dorks</span>
                  <span className="lp-editorial-tag">LinkedIn Filter</span>
                  <span className="lp-editorial-tag">News & Press</span>
                </div>
              </div>
            </div>

            {/* 02 Username Investigation */}
            <div className="lp-editorial-row">
              <div className="lp-editorial-num">02</div>
              <div className="lp-editorial-title-box">
                <h3>USERNAME INVESTIGATION</h3>
                <p>Cross-platform handle discovery & probing</p>
              </div>
              <div className="lp-editorial-body">
                <p className="lp-editorial-desc">
                  Probes over 30 leading public web services simultaneously for target handle existence, canonical profile URLs, and platform metadata.
                </p>
                <div className="lp-editorial-grid-2">
                  <div className="lp-editorial-spec-item">
                    <strong>Platform Scope</strong>
                    <p>GitHub, X, Instagram, Facebook, Medium, Reddit, YouTube, Behance, SoundCloud, Spotify.</p>
                  </div>
                  <div className="lp-editorial-spec-item">
                    <strong>Identity Disclaimer</strong>
                    <p>Identical handles on different services do not guarantee they belong to the same human individual.</p>
                  </div>
                </div>
                <div className="lp-editorial-tags">
                  <span className="lp-editorial-tag">Handle Probing</span>
                  <span className="lp-editorial-tag">HTTP Status Check</span>
                  <span className="lp-editorial-tag">Canonical Cleaning</span>
                  <span className="lp-editorial-tag">Avatar Alignment</span>
                </div>
              </div>
            </div>

            {/* 03 Profile Discovery */}
            <div className="lp-editorial-row">
              <div className="lp-editorial-num">03</div>
              <div className="lp-editorial-title-box">
                <h3>PROFILE DISCOVERY</h3>
                <p>Canonical cleaning & string proximity scoring</p>
              </div>
              <div className="lp-editorial-body">
                <p className="lp-editorial-desc">
                  Sanitizes raw search engine links to strip tracking parameters, verify canonical profile status, and score name proximity.
                </p>
                <div className="lp-editorial-grid-2">
                  <div className="lp-editorial-spec-item">
                    <strong>URL Sanitization</strong>
                    <p>Strips utm_*, ref, and tracking parameters; suppresses dead 404 redirects.</p>
                  </div>
                  <div className="lp-editorial-spec-item">
                    <strong>Confidence Scoring</strong>
                    <p>Calculates token alignment and flags Strong, Possible, or Mention-only matches.</p>
                  </div>
                </div>
                <div className="lp-editorial-tags">
                  <span className="lp-editorial-tag">Clean URLs</span>
                  <span className="lp-editorial-tag">Domain Classification</span>
                  <span className="lp-editorial-tag">Proximity Scoring</span>
                </div>
              </div>
            </div>

            {/* 04 Activity & Associations */}
            <div className="lp-editorial-row">
              <div className="lp-editorial-num">04</div>
              <div className="lp-editorial-title-box">
                <h3>ACTIVITY & ASSOCIATIONS</h3>
                <p>Public mentions, commits & affiliations</p>
              </div>
              <div className="lp-editorial-body">
                <p className="lp-editorial-desc">
                  Extracts publicly indexed commits, articles, co-authorships, and organization memberships into structured investigation records.
                </p>
                <div className="lp-editorial-grid-2">
                  <div className="lp-editorial-spec-item">
                    <strong>Public Activity</strong>
                    <p>Aggregates code commits, posted articles, media interviews, and conference speeches.</p>
                  </div>
                  <div className="lp-editorial-spec-item">
                    <strong>Affiliation Mapping</strong>
                    <p>Identifies co-occurring corporate employers, university affiliations, and co-authors.</p>
                  </div>
                </div>
                <div className="lp-editorial-tags">
                  <span className="lp-editorial-tag">GitHub Commits</span>
                  <span className="lp-editorial-tag">Articles & Blogs</span>
                  <span className="lp-editorial-tag">Co-Authors</span>
                  <span className="lp-editorial-tag">Organizations</span>
                </div>
              </div>
            </div>

            {/* 05 Websites & News */}
            <div className="lp-editorial-row">
              <div className="lp-editorial-num">05</div>
              <div className="lp-editorial-title-box">
                <h3>WEBSITES & PUBLIC NEWS</h3>
                <p>Indexed press mentions & portfolio discovery</p>
              </div>
              <div className="lp-editorial-body">
                <p className="lp-editorial-desc">
                  Surfaces personal blogs, portfolio sites, press release mentions, and public PDF documents citing the subject name.
                </p>
                <div className="lp-editorial-grid-2">
                  <div className="lp-editorial-spec-item">
                    <strong>News Coverage</strong>
                    <p>Filters Google News indexes for independent third-party coverage and interviews.</p>
                  </div>
                  <div className="lp-editorial-spec-item">
                    <strong>Document Search</strong>
                    <p>Discovers public indexed PDF resumes, academic papers, and official releases.</p>
                  </div>
                </div>
                <div className="lp-editorial-tags">
                  <span className="lp-editorial-tag">Google News</span>
                  <span className="lp-editorial-tag">Personal Domains</span>
                  <span className="lp-editorial-tag">PDF Dorking</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 4. HOMEPAGE SOURCE ECOSYSTEM SECTION (PUBLIC SOURCES & PLATFORMS) ── */}
      <SourceEcosystem />

      {/* ── 5. STEP-BY-STEP WORKFLOW — HORIZONTAL ROWS (NO CARD GRID) ── */}
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '12px' }}>
              <Cpu size={14} />
              <span>Investigation Pipeline</span>
            </div>
            <h2 className="lp-title" style={{ fontSize: '2.4rem' }}>
              How the Platform Works
            </h2>
            <p className="lp-subtitle" style={{ maxWidth: '760px' }}>
              A structured 9-step pipeline transforming raw search dorks into organized, bookmarked candidate intelligence records.
            </p>
          </div>

          {/* Horizontal Step List */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {[
              { step: '01', title: 'Start Investigation', desc: 'Enter a subject full name or username handle along with optional location/role qualifiers.' },
              { step: '02', title: 'Search Public Sources', desc: 'The system constructs targeted dork expressions and routes search queries through SerpApi search backend.' },
              { step: '03', title: 'Collect Results', desc: 'Organic search engine results are gathered, including profiles, articles, news, and organizational pages.' },
              { step: '04', title: 'Normalize Data', desc: 'Raw result formats are parsed, URL parameters cleaned, and snippet metadata standardized.' },
              { step: '05', title: 'Relevance Matching', desc: 'Candidate matches are evaluated against string proximity algorithms to flag likely profile matches.' },
              { step: '06', title: 'Review Results', desc: 'Inspect findings categorized across Overview, Profiles, Activity, Associations, News, and Sources.' },
              { step: '07', title: 'Save Case Findings', desc: 'Bookmark candidate profiles, write analyst notes, and record investigation state to Firestore.' },
              { step: '08', title: 'Conduct Deep Search', desc: 'Trigger expanded secondary query sweeps to discover hidden or secondary public web references.' },
              { step: '09', title: 'Verify Original Source', desc: 'Always open and inspect original target URLs directly to verify context before forming conclusions.' }
            ].map((item) => (
              <div key={item.step} className="lp-step-row">
                <div className="lp-step-num">STEP {item.step}</div>
                <div className="lp-step-title">{item.title}</div>
                <div className="lp-step-desc">{item.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 6. SEARCH ACCURACY & MATCHING (EDITORIAL COMPARISON) ── */}
      <section className="lp-section-wide" style={{ background: 'var(--bg-mid)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '40px' }}>
            <div className="lp-badge" style={{ marginBottom: '12px' }}>
              <ShieldCheck size={14} />
              <span>Accuracy & Verification</span>
            </div>
            <h2 className="lp-title" style={{ fontSize: '2.4rem', marginBottom: '12px' }}>
              Search Accuracy & Match Levels
            </h2>
            <p className="lp-subtitle" style={{ maxWidth: '780px' }}>
              Understanding match confidence levels, namesake risks, and verification requirements in open-source research.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            
            <div className="lp-responsive-grid-row">
              <div style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> Strong Match
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Target name, username handle, location, and professional bio align across multiple independent public platforms (e.g. GitHub and LinkedIn). High confidence.
              </div>
            </div>

            <div className="lp-responsive-grid-row">
              <div style={{ color: 'var(--accent-warm-light)', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} /> Possible Candidate
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Target handle exists on a platform with partial profile information. Requires manual verification of bio context and activity history.
              </div>
            </div>

            <div className="lp-responsive-grid-row">
              <div style={{ color: '#eab308', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} /> Public Mention
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Target name appears in a news article or document snippet alongside multiple individuals. May represent a shared namesake.
              </div>
            </div>

            <div className="lp-responsive-grid-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> Unverified / Generic
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Generic search engine index entry with insufficient context. Should not be assigned to a subject without corroborating proof.
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 7. SERPAPI INFRASTRUCTURE (FULL-WIDTH SECTION) ── */}
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          <div className="lp-responsive-grid-serp">
            <div>
              <div className="lp-badge" style={{ marginBottom: '12px' }}>
                <Cpu size={14} />
                <span>Search Infrastructure</span>
              </div>
              <h2 className="lp-title" style={{ fontSize: '2.2rem', marginBottom: '12px' }}>
                Search powered by SerpApi
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.65 }}>
                Configured Real-Time Search Engine Integration Provider
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '16px' }}>
                All search requests submitted through the workspace are processed using <strong>SerpApi</strong>. SerpApi delivers real-time organic search engine results in structured JSON format without relying on fragile web scrapers.
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <li>Search engines index public web content dynamically; results may fluctuate over time.</li>
                <li>SerpApi executes raw search queries safely without exposing investigator identity to target subjects.</li>
                <li>SerpApi acts as the infrastructure provider; it does not independently verify subject identities.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. CALL TO ACTION ── */}
      <section className="lp-section-wide" style={{ paddingTop: '60px', paddingBottom: '80px', textAlign: 'center' }}>
        <div className="lp-container-wide" style={{ maxWidth: '960px' }}>
          <h2 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
            Ready to Launch Your Investigation?
          </h2>
          <p className="lp-subtitle" style={{ maxWidth: '680px', margin: '0 auto 36px' }}>
            Sign in to access your secure, user-isolated Firestore investigation workspace and start conducting ethical open-source research.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={currentUser ? "/dashboard" : "/auth"} className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              {currentUser ? "Open Workspace" : "Sign In & Get Started"} <ArrowRight size={18} />
            </Link>
            <Link to="/documentation" className="btn-outline" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
              Read Technical Documentation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
