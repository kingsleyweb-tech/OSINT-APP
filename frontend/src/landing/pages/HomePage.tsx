import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Search, Layers, FileText, CheckCircle2,
  AlertTriangle, HelpCircle, Cpu, Building2
} from 'lucide-react';
import appLogo from '../../assets/images/icon.png';
import entityGraphImg from '../../assets/images/entity-graph.png';
import { HeroSearchWidget } from '../components/HeroSearchWidget';
import { TypewriterTitle } from '../components/TypewriterTitle';
import { SourceEcosystem } from '../components/SourceEcosystem';

interface HomePageProps {
  currentUser?: any;
}

interface Capability { num: string; title: string; sub: string; desc: string; left: [string, string]; right: [string, string]; tags: string[] }

const CAPABILITIES: Capability[] = [
  {
    num: '01', title: 'NAME INVESTIGATION', sub: 'People found by their full name',
    desc: 'Searches the exact name on Google and the main platforms, then groups the results into possible people, so different people with the same name are kept apart.',
    left: ['What it covers', 'LinkedIn, Facebook, Instagram, X, TikTok, Threads, YouTube, GitHub and more, plus web pages and news. A location or organisation can be added to narrow a common name.'],
    right: ['Spelling help', 'A misspelt name is checked first (“Did you mean…”). While typing, the page can suggest matching organisations.'],
    tags: ['Exact name', 'Possible people', 'Did you mean', 'Name suggestions']
  },
  {
    num: '02', title: 'USERNAME INVESTIGATION', sub: 'One handle, many platforms',
    desc: 'Looks for a username on many platforms, including common variations such as humblechild_99, humblechild99 and 99_humblechild. The username you searched is highlighted.',
    left: ['Clear match labels', 'Each account is marked Exact match, Username variation, Possibly related or Other person — with the reason — and results are shown by platform.'],
    right: ['Never merged', 'Look-alike accounts are kept apart. Any of them can be opened as its own investigation.'],
    tags: ['Variations', 'Platform tabs', 'Direct checks', 'Match reasons']
  },
  {
    num: '03', title: 'ORGANISATION INTELLIGENCE', sub: 'Companies, schools, agencies and more',
    desc: 'Recognises when a search is an organisation — even a short form such as “UPSA” — and builds a profile from Google’s knowledge panel, Wikidata, Google Maps, news, social pages and its own official website.',
    left: ['What it shows', 'Organisation type, official name, website (checked before it is trusted), headquarters and locations, units, leadership, contact details, social accounts and news from the last 12 months.'],
    right: ['Cross-checked', 'Each fact shows how many independent sources agree. When sources disagree, both answers are shown.'],
    tags: ['Entity type', 'Official website', 'Units & leadership', 'Source agreement']
  },
  {
    num: '04', title: 'CASE WORKSPACE', sub: 'Everything about a subject, in tabs',
    desc: 'Each investigation is split into clear tabs: Overview, Profiles, Activity, Associations, Sources, Web, News, Images, Location, Contact, Metrics and Audit — plus an Organisation tab for organisations.',
    left: ['Record your review', 'Mark each result Raw, Relevant or Validated. Every search and change is written to the Audit tab with the time.'],
    right: ['Follow and export', 'Re-run a case to see what changed, track the subject on the People page, and export to JSON or CSV.'],
    tags: ['12+ tabs', 'Evidence levels', 'Audit trail', 'Export']
  },
  {
    num: '05', title: 'SEARCH PAGES', sub: 'Social, news, media, places and trends',
    desc: 'Separate pages for public social posts and forums, news, images and videos, places (with a map and satellite view) and search trends. Useful results can be saved to a case.',
    left: ['Filters', 'Date range, country, language and platform choice, depending on the page.'],
    right: ['Trends', 'Interest over time and by region, related searches and topics, and what is trending now in a country.'],
    tags: ['Social search', 'News', 'Media', 'Geo search', 'Trends']
  },
  {
    num: '06', title: 'ANALYSIS & EVIDENCE', sub: 'See connections and patterns',
    desc: 'The Network page shows how people, usernames, organisations and websites in your cases connect. Content Analysis charts your saved results by time, platform, hashtags, accounts, languages and locations.',
    left: ['Location evidence', 'A place is only recorded when a source states it, with how strong the evidence is: stated, reported, only mentioned or unconfirmed.'],
    right: ['Public contact details', 'Emails and phone numbers are only shown when a public source shows them, each with its source.'],
    tags: ['Network', 'Content analysis', 'Location', 'Contact']
  }
];

const STEPS: Array<{ step: string; title: string; desc: string }> = [
  { step: '01', title: 'Start a search', desc: 'Enter a name, a username or an organisation. Add a location or organisation to narrow a common name.' },
  { step: '02', title: 'Search public sources', desc: 'The platform searches search engines, news, maps, public social pages, Wikidata and official websites at the same time, and shows the progress of each source.' },
  { step: '03', title: 'Remove what does not match', desc: 'Results that do not name your subject are dropped, links are cleaned, and each result is labelled with how well it matches.' },
  { step: '04', title: 'Keep look-alikes apart', desc: 'Results are grouped into possible people or organisations. Similar names and usernames are listed separately, never merged.' },
  { step: '05', title: 'Choose and open a case', desc: 'Pick the right person or organisation. The case opens with its tabs and gathers news, images, locations and contact details automatically.' },
  { step: '06', title: 'Review and record', desc: 'Check each finding on its original source and mark it Raw, Relevant or Validated. The Audit tab keeps a record of every step.' },
  { step: '07', title: 'Follow up', desc: 'Re-run the case later to see what changed, track the subject, and export the case and its sources for your report.' }
];

export const HomePage: React.FC<HomePageProps> = ({ currentUser }) => {
  const navigate = useNavigate();

  const titlePhrases = [
    'Person Profiles',
    'Username Handles',
    'Organisations',
    'Public Footprints',
    'Places & News'
  ];

  return (
    <div className="lp-route-container">
      <section className="lp-section-wide" style={{ paddingTop: '50px', paddingBottom: '50px', textAlign: 'center' }}>
        <div className="lp-container-wide">

          <div className="lp-badge" style={{ margin: '0 auto 20px' }}>
            <img src={appLogo} alt="Logo" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
            <span>Public sources only · every result cites its source</span>
          </div>

          <h1 className="lp-title" style={{ maxWidth: '1040px', margin: '0 auto 20px' }}>
            Ethical OSINT Research & <br />
            <TypewriterTitle phrases={titlePhrases} />
          </h1>

          <p className="lp-subtitle" style={{ maxWidth: '840px', margin: '0 auto 32px' }}>
            Find public information about people, usernames and organisations across search engines, news, maps, social media and
            official websites — and keep every finding, with its source, in one organised case.
          </p>

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
                  See how it works
                </Link>
              </>
            )}
          </div>

          <div className="lp-showcase">
            <ul className="lp-showcase-trust" aria-label="Principles">
              <li><CheckCircle2 size={15} /> Public sources only</li>
              <li><CheckCircle2 size={15} /> Every result cites its source</li>
              <li><CheckCircle2 size={15} /> Nothing is guessed</li>
              <li><CheckCircle2 size={15} /> Full audit trail</li>
            </ul>
            <figure className="lp-showcase-frame">
              <div className="lp-showcase-bar">
                <span className="lp-showcase-title"><i /> Associations · subject-centred view</span>
                <span className="lp-showcase-meta">illustration</span>
              </div>
              <div className="lp-showcase-screen">
                <img
                  src={entityGraphImg}
                  alt="Entity graph illustration: a subject at the centre, linked to LinkedIn, Instagram, Facebook, a university, a club, an event site and a news feature, each marked validated or relevant."
                  width={2248}
                  height={1080}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption>How an investigation connects a subject to the public profiles, pages and organisations found about them.</figcaption>
            </figure>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '24px 0', marginTop: '40px' }}>
            <div className="lp-grid lp-grid-4" style={{ textAlign: 'center', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-warm-light)' }}>30+</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>Public platforms and sources</div>
              </div>
              <div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-warm-light)' }}>3</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>Subjects: people, usernames, organisations</div>
              </div>
              <div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-warm-light)' }}>12+</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>Tabs in every case</div>
              </div>
              <div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-warm-light)' }}>100%</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>Public sources — no private data</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <section className="lp-section-wide" style={{ background: 'var(--bg-mid)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="lp-container-wide">
          <div className="lp-responsive-grid-split">

            <div>
              <div className="lp-badge" style={{ marginBottom: '16px' }}>
                <HelpCircle size={14} />
                <span>The basics</span>
              </div>
              <h2 className="lp-title" style={{ fontSize: '2.4rem', marginBottom: '20px' }}>
                What is open-source intelligence (OSINT)?
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.75 }}>
                OSINT means collecting and studying information that is already public — web pages, news, public social media profiles,
                maps and official websites — to answer a question. “Open source” means anyone can find the information, without secret
                methods, hacking or access to private systems.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Public and private information
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.65 }}>
                  Public information includes web pages, news articles, public social profiles, map listings and organisations’ own websites.
                  Private information — private messages, private accounts, passwords, bank or phone company records — is outside OSINT and outside this platform.
                </p>
              </div>

              <div style={{ paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Check before you conclude
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.65 }}>
                  Many people share a name or a username, and search results can be old. Good research compares several independent sources
                  and opens the original page before deciding that a result belongs to the subject.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', paddingTop: '4px' }}>
                <ShieldCheck size={24} style={{ color: 'var(--accent-warm-light)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Our rule:</strong> the platform only collects public information. It is not a
                  consumer reporting service, does not do surveillance or facial recognition, and never accesses private records.
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="lp-section-wide">
        <div className="lp-container-wide">

          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '12px' }}>
              <Layers size={14} />
              <span>Platform capabilities</span>
            </div>
            <h2 className="lp-title" style={{ fontSize: '2.4rem' }}>
              What the Platform Investigates
            </h2>
            <p className="lp-subtitle" style={{ maxWidth: '780px' }}>
              People, usernames and organisations — with search pages for social media, news, media, places and trends, and tools to review and analyse what you find.
            </p>
          </div>

          <div className="lp-editorial-list">
            {CAPABILITIES.map(c => (
              <div key={c.num} className="lp-editorial-row">
                <div className="lp-editorial-num">{c.num}</div>
                <div className="lp-editorial-title-box">
                  <h3>{c.title}</h3>
                  <p>{c.sub}</p>
                </div>
                <div className="lp-editorial-body">
                  <p className="lp-editorial-desc">{c.desc}</p>
                  <div className="lp-editorial-grid-2">
                    <div className="lp-editorial-spec-item">
                      <strong>{c.left[0]}</strong>
                      <p>{c.left[1]}</p>
                    </div>
                    <div className="lp-editorial-spec-item">
                      <strong>{c.right[0]}</strong>
                      <p>{c.right[1]}</p>
                    </div>
                  </div>
                  <div className="lp-editorial-tags">
                    {c.tags.map(t => <span key={t} className="lp-editorial-tag">{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      <SourceEcosystem />

      <section className="lp-section-wide">
        <div className="lp-container-wide">

          <div style={{ marginBottom: '44px' }}>
            <div className="lp-badge" style={{ marginBottom: '12px' }}>
              <Cpu size={14} />
              <span>From search to report</span>
            </div>
            <h2 className="lp-title" style={{ fontSize: '2.4rem' }}>
              How the Platform Works
            </h2>
            <p className="lp-subtitle" style={{ maxWidth: '760px' }}>
              Seven steps from a name, username or organisation to a checked, source-backed case.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {STEPS.map((item) => (
              <div key={item.step} className="lp-step-row">
                <div className="lp-step-num">STEP {item.step}</div>
                <div className="lp-step-title">{item.title}</div>
                <div className="lp-step-desc">{item.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      <section className="lp-section-wide" style={{ background: 'var(--bg-mid)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="lp-container-wide">

          <div style={{ marginBottom: '40px' }}>
            <div className="lp-badge" style={{ marginBottom: '12px' }}>
              <ShieldCheck size={14} />
              <span>Accuracy & verification</span>
            </div>
            <h2 className="lp-title" style={{ fontSize: '2.4rem', marginBottom: '12px' }}>
              How results are labelled
            </h2>
            <p className="lp-subtitle" style={{ maxWidth: '780px' }}>
              Every result says how well it matches and why. Labels help you judge — they are not proof.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

            <div className="lp-responsive-grid-row">
              <div style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> Exact match
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                The account uses exactly the name or username you searched. The platform notes when the platform itself confirmed the account exists.
              </div>
            </div>

            <div className="lp-responsive-grid-row">
              <div style={{ color: '#3b82f6', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} /> Username variation
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                The same letters and numbers written differently (for example humblechild99 for humblechild_99). The page says whether anything links it to your subject.
              </div>
            </div>

            <div className="lp-responsive-grid-row">
              <div style={{ color: '#7c3aed', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} /> Possibly related
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                A different name or handle, but with real shared evidence — such as the same display name or website. Kept apart until you check it.
              </div>
            </div>

            <div className="lp-responsive-grid-row">
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> Other person
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                A similar name or handle with nothing linking it to your subject — most likely someone else. Never counted as your subject’s.
              </div>
            </div>

            <div className="lp-responsive-grid-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--accent-warm-light)', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} /> Organisation facts
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Each fact shows “Confirmed by N independent sources”, “Single source” or “Sources disagree”. A detail no source gives is shown as “Not found”.
              </div>
            </div>

          </div>

        </div>
      </section>

      <section className="lp-section-wide">
        <div className="lp-container-wide">
          <div className="lp-responsive-grid-serp">
            <div>
              <div className="lp-badge" style={{ marginBottom: '12px' }}>
                <Cpu size={14} />
                <span>Where results come from</span>
              </div>
              <h2 className="lp-title" style={{ fontSize: '2.2rem', marginBottom: '12px' }}>
                Public sources, searched live
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.65 }}>
                Search engines through SerpApi, plus Wikidata, public platform checks and official websites
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '16px' }}>
                Searches run through <strong>SerpApi</strong> on Google, Bing, DuckDuckGo, Yahoo, YouTube, Google News, Bing News, Google Images,
                Bing Images, Google Maps and Google Trends. Usernames are also checked directly on platforms such as GitHub, Reddit, Mastodon and
                Bluesky, organisations are looked up on Wikidata, and an organisation’s own website is read to build its profile.
              </p>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <li>Searches come from our server; the people you search are not contacted or notified.</li>
                <li>The same search repeated within 12 hours is answered from a saved copy and costs nothing.</li>
                <li>Search engines change over time, so results can differ from one day to the next.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section-wide" style={{ paddingTop: '60px', paddingBottom: '80px', textAlign: 'center' }}>
        <div className="lp-container-wide" style={{ maxWidth: '960px' }}>
          <h2 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
            Ready to start an investigation?
          </h2>
          <p className="lp-subtitle" style={{ maxWidth: '680px', margin: '0 auto 36px' }}>
            Sign in with Google or email to open your private workspace. Your cases, history and tracked subjects are visible only to you.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={currentUser ? "/dashboard" : "/auth"} className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              {currentUser ? "Open Workspace" : "Sign In & Get Started"} <ArrowRight size={18} />
            </Link>
            <Link to="/documentation" className="btn-outline" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
              Read the documentation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
