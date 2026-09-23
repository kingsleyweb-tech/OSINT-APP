import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  UserCheck, 
  Globe, 
  Layers, 
  Cpu, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  ChevronDown, 
  FileText, 
  Activity, 
  Share2, 
  Database,
  ExternalLink
} from 'lucide-react';
import './styles/LandingPage.css';

export default function App() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const appAuthUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173/auth';

  return (
    <div className="landing-page-root">
      {/* NAVBAR */}
      <nav className="landing-navbar">
        <div className="nav-logo-block">
          <div className="nav-logo-icon">OS</div>
          <span className="nav-logo-text">CyberMonitor <span>OSINT</span></span>
        </div>

        <ul className="nav-links-list">
          <li><a href="#features" className="nav-link-item">Capabilities</a></li>
          <li><a href="#workflow" className="nav-link-item">How It Works</a></li>
          <li><a href="#platforms" className="nav-link-item">35+ Platforms</a></li>
          <li><a href="#security" className="nav-link-item">Security</a></li>
          <li><a href="#faq" className="nav-link-item">FAQ</a></li>
        </ul>

        <div className="nav-auth-buttons">
          <a href={appAuthUrl} className="btn-secondary">Sign In</a>
          <a href={appAuthUrl} className="btn-primary">
            <span>Create Account</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="hero-section">
        <div className="hero-pill-tag">
          <ShieldCheck size={14} />
          <span>Multi-Stage Public Intelligence Engine</span>
        </div>

        <h1 className="hero-headline">
          Investigate Public Information.<br />
          Discover Connections. Understand Evidence.
        </h1>

        <p className="hero-subheadline">
          CyberMonitor OSINT is a deep, multi-stage public intelligence platform designed to discover, cross-reference, and map verified public identity signals across 35+ global platforms.
        </p>

        <div className="hero-actions-row">
          <a href={appAuthUrl} className="btn-primary" style={{ padding: '12px 28px', fontSize: '1rem' }}>
            <span>Start Investigation</span>
            <ArrowRight size={16} />
          </a>
          <a href="#features" className="btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
            Explore Capabilities
          </a>
        </div>

        {/* HERO INTERACTIVE PREVIEW CARD */}
        <div className="hero-preview-card">
          <div className="preview-top-bar">
            <div className="preview-dots">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <span className="preview-badge">Live Intelligence Scan • 4-Stage Pipeline</span>
          </div>

          <div className="preview-content-grid">
            <div className="preview-box">
              <div className="preview-box-title">Target Inquiry</div>
              <div className="preview-box-value" style={{ color: '#38bdf8' }}>"Kingsley Anaab"</div>
            </div>
            <div className="preview-box">
              <div className="preview-box-title">Platforms Searched</div>
              <div className="preview-box-value" style={{ color: '#34d399' }}>35+ Connected</div>
            </div>
            <div className="preview-box">
              <div className="preview-box-title">Verified Profiles</div>
              <div className="preview-box-value" style={{ color: '#c084fc' }}>Exact & Strong Matches</div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES SECTION */}
      <section id="features" className="section-wrapper">
        <div className="section-header">
          <div className="section-tag">Core Capabilities</div>
          <h2 className="section-title">Designed for Deep Public Intelligence</h2>
          <p className="section-subtitle">
            Search thoroughly across social, professional, developer, and academic ecosystems without falling for partial-word noise or unverified links.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <UserCheck size={22} />
            </div>
            <h3 className="feature-card-title">Person & Name Investigation</h3>
            <p className="feature-card-desc">
              Execute double-quoted, token-boundary exact phrase searches across public profiles, biographies, websites, and organizational directories.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Search size={22} />
            </div>
            <h3 className="feature-card-title">Deep Username Discovery</h3>
            <p className="feature-card-desc">
              Investigate exact handle matches and clean variations across 35+ social networks, code registries, and streaming platforms.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Layers size={22} />
            </div>
            <h3 className="feature-card-title">4-Stage Pipeline</h3>
            <p className="feature-card-desc">
              Progress from exact identity discovery to platform sweeps, query expansion, cross-platform handle tracking, and paginated web sweeps.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Cpu size={22} />
            </div>
            <h3 className="feature-card-title">Strict Relevance & Filtering</h3>
            <p className="feature-card-desc">
              Automatically reject generic search pages, login screens, reels, videos, and partial-word collisions (e.g. "King" matching "Kingsley").
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Activity size={22} />
            </div>
            <h3 className="feature-card-title">Entity & Activity Mapping</h3>
            <p className="feature-card-desc">
              Categorize findings into social profiles, web news, public activities, documented associations, and timeline metrics.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Database size={22} />
            </div>
            <h3 className="feature-card-title">Firestore Intelligence Sync</h3>
            <p className="feature-card-desc">
              Save only clean, sanitized, high-confidence results to Firestore. Real-time updates sync seamlessly across all your devices.
            </p>
          </div>
        </div>
      </section>

      {/* WORKFLOW PIPELINE SECTION */}
      <section id="workflow" className="section-wrapper" style={{ background: 'rgba(17, 23, 38, 0.4)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
        <div className="section-header">
          <div className="section-tag">Investigation Pipeline</div>
          <h2 className="section-title">Multi-Stage Search Architecture</h2>
          <p className="section-subtitle">
            How CyberMonitor OSINT searches deeper, not wider for the sake of noise.
          </p>
        </div>

        <div className="workflow-steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>
            <h4 className="step-title">Stage 1: Exact Discovery</h4>
            <p className="step-desc">
              Queries exact quotes for names and usernames across broad web indexes to establish primary identity bounds.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">02</div>
            <h4 className="step-title">Stage 2: Platform Sweeps</h4>
            <p className="step-desc">
              Executes site-specific queries and direct API/HTTP profile checks across 35+ registered platform categories.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">03</div>
            <h4 className="step-title">Stage 3: Cross Discovery</h4>
            <p className="step-desc">
              Extracts discovered handles, locations, and organizations to query additional cross-platform networks.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">04</div>
            <h4 className="step-title">Stage 4: Paginated Sweeps</h4>
            <p className="step-desc">
              Pages through organic search results up to 3 pages deep with diminishing-returns protection.
            </p>
          </div>
        </div>
      </section>

      {/* PLATFORMS COVERAGE SECTION */}
      <section id="platforms" className="section-wrapper">
        <div className="section-header">
          <div className="section-tag">Ecosystem Coverage</div>
          <h2 className="section-title">35+ Connected Platform Categories</h2>
          <p className="section-subtitle">
            Truthful search coverage stats generated directly from real investigation execution.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', textCenter: 'center' }}>
          {[
            { name: 'Instagram', cat: 'Social' },
            { name: 'LinkedIn', cat: 'Professional' },
            { name: 'GitHub', cat: 'Developer' },
            { name: 'X (Twitter)', cat: 'Social' },
            { name: 'YouTube', cat: 'Video' },
            { name: 'TikTok', cat: 'Social' },
            { name: 'Reddit', cat: 'Community' },
            { name: 'Dev.to', cat: 'Developer' },
            { name: 'Substack', cat: 'Publishing' },
            { name: 'Medium', cat: 'Publishing' },
            { name: 'Google Scholar', cat: 'Academic' },
            { name: 'Behance', cat: 'Creative' },
            { name: 'Spotify', cat: 'Music' },
            { name: 'Twitch', cat: 'Streaming' },
            { name: 'Telegram', cat: 'Messaging' }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.cat}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY & COMPLIANCE SECTION */}
      <section id="security" className="section-wrapper" style={{ background: 'rgba(17, 23, 38, 0.4)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
        <div className="section-header">
          <div className="section-tag">Security & Open Web Compliance</div>
          <h2 className="section-title">Ethical Open-Source Intelligence</h2>
          <p className="section-subtitle">
            100% public-domain index gathering. No private data scraping or unauthorized access.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div className="feature-card">
            <Lock size={24} style={{ color: 'var(--accent-emerald)', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Client-Side API Isolation</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Private keys such as SerpApi remain strictly on the backend server and are never exposed in browser code.
            </p>
          </div>

          <div className="feature-card">
            <ShieldCheck size={24} style={{ color: 'var(--accent-cyan)', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Firebase Auth Protection</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Firebase Authentication protects all intelligence file records with user profile security rules.
            </p>
          </div>

          <div className="feature-card">
            <CheckCircle2 size={24} style={{ color: 'var(--accent-purple)', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Truthful Audit Trail</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Every statistics counter and coverage metric reflects verified execution without fabricated numbers.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="section-wrapper">
        <div className="section-header">
          <div className="section-tag">Frequently Asked Questions</div>
          <h2 className="section-title">Everything You Need to Know</h2>
        </div>

        <div className="faq-list">
          {[
            {
              q: "How does CyberMonitor OSINT differ from standard Google search?",
              a: "CyberMonitor OSINT uses a 4-Stage Deep Search Engine pipeline. It automatically constructs double-quoted exact queries, sweeps 35+ platform categories, extracts discovered handles for cross-platform matching, and filters out non-profile items like video reels, posts, and search pages."
            },
            {
              q: "Does CyberMonitor OSINT store private passwords or credentials?",
              a: "No. Authentication is handled by Firebase Authentication (Google Auth & Email/Password). Passwords are never stored on custom servers."
            },
            {
              q: "How is API cost controlled during deep search?",
              a: "The Deep Search Engine includes query deduplication, canonical URL deduplication, and a diminishing-returns stopping mechanism. If consecutive queries yield zero new relevant results, lower-tier sweeps halt early."
            },
            {
              q: "Can I rescan or search deeper on an existing investigation?",
              a: "Yes. Every investigation file includes a 'Search Deeper' action button that executes an extended multi-stage scan to discover newly indexed public information."
            }
          ].map((item, idx) => (
            <div key={idx} className="faq-item">
              <div className="faq-question" onClick={() => toggleFaq(idx)}>
                <span>{item.q}</span>
                <ChevronDown size={18} style={{ transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
              </div>
              {openFaq === idx && (
                <div className="faq-answer">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="section-wrapper" style={{ textAlign: 'center', padding: '60px 32px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>Ready to Begin Your Investigation?</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto 28px' }}>
          Access the authenticated CyberMonitor OSINT platform to generate intelligence files, discover profiles, and track public activity.
        </p>
        <a href={appAuthUrl} className="btn-primary" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
          <span>Launch OSINT Application</span>
          <ArrowRight size={18} />
        </a>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-links">
          <a href="#features">Capabilities</a>
          <a href="#workflow">Pipeline</a>
          <a href="#platforms">Platforms</a>
          <a href={appAuthUrl}>Sign In</a>
          <a href={appAuthUrl}>Create Account</a>
        </div>
        <p>© 2026 CyberMonitor OSINT Platform. All rights reserved. Open-Source Intelligence Tooling.</p>
      </footer>
    </div>
  );
}
