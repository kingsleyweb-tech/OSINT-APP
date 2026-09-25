import React, { useState, useMemo } from 'react';
import { 
  Search, 
  HelpCircle, 
  BookOpen, 
  Shield, 
  Layers, 
  UserCheck, 
  FileText, 
  ChevronRight,
  CheckCircle2,
  Lock,
  Cpu,
  Server,
  X,
  Filter
} from 'lucide-react';
import './Help.css';

const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || query.trim().length === 0) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="search-highlight">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export const HelpPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('intro');

  const navigationSections = [
    { id: 'intro', label: '1. Introduction & Core Principles', icon: Shield },
    { id: 'modalities', label: '2. Search Modalities & Query Engine', icon: Search },
    { id: 'tiers', label: '3. 14 Platform Categories & Tiers', icon: Layers },
    { id: 'matching', label: '4. Identity Separation Engine', icon: UserCheck },
    { id: 'workspace', label: '5. The 8 Dedicated Workspace Tabs', icon: FileText },
    { id: 'workflows', label: '6. Advanced Pivoting & Workflows', icon: Cpu },
    { id: 'serpapi', label: '7. SerpApi Integration & Quota Optimization', icon: Server },
    { id: 'compliance', label: '8. Legal Compliance & Data Governance', icon: Lock },
    { id: 'faq', label: '9. Frequently Asked Questions', icon: HelpCircle },
  ];

  const suggestedSearchTerms = [
    'SerpApi',
    '14 Tiers',
    'Handle Pivoting',
    'Candidate Cards',
    'Workspace Tabs',
    'Disambiguation',
    'Legal Compliance',
    'FAQ'
  ];

  const sectionData = useMemo(() => {
    return [
      {
        id: 'intro',
        headerPill: 'SECTION 01',
        title: 'Introduction & Core Principles',
        lead: 'The OSINT Intelligence Platform is an enterprise reconnaissance tool designed for cyber intelligence analysts, fraud investigators, and security researchers. It automates publicly indexed web discovery across major search engines, developer platforms, social networks, and academic repositories.',
        items: [
          {
            title: 'Zero Synthetic Data',
            desc: 'All discovered profiles, handles, web snippets, and metadata originate directly from live public web index queries (SerpApi and public APIs). No fake verifications or simulated accounts are generated.',
            tags: ['SerpApi', 'Live Web', 'Public APIs']
          },
          {
            title: 'Up-Front Provider Execution',
            desc: 'When an investigation is initialized, all search query tiers execute in batch up-front. Results are parsed and structured immediately so no hidden data appears unexpectedly later when switching tabs.',
            tags: ['Batch Search', 'Provider Query', 'Up-Front']
          },
          {
            title: 'Identity Disambiguation',
            desc: 'Identical names often belong to different individuals. The engine separates candidate profiles into isolated identity clusters based on shared handles, locations, employers, and co-occurring entities.',
            tags: ['Disambiguation', 'Candidate Cards', 'Clustering']
          }
        ]
      },
      {
        id: 'modalities',
        headerPill: 'SECTION 02',
        title: 'Search Modalities & Query Engine',
        lead: 'The platform features three specialized search input modes tailored to different initial intelligence inputs.',
        items: [
          {
            badge: 'SEARCH MODALITY 1',
            title: 'Person & Individual Reconnaissance',
            desc: 'Executes multi-platform queries to find public web presences, professional profiles, articles, and social media accounts matching a target name.',
            queryExample: 'Kwame Mensah or John Mahama',
            list: [
              'Triggers the Tiered Query Engine across 14 platform categories.',
              'Parses Knowledge Graph metadata, social handles, and location signals.',
              'Groups discovered items into separate Candidate Person Cards.'
            ]
          },
          {
            badge: 'SEARCH MODALITY 2',
            title: 'Username & Handle Reconnaissance',
            desc: 'Discovers matching handle profiles across 35+ developer, social, audio, and publishing networks.',
            queryExample: 'alex_dev99 or cyber_investigator',
            list: [
              'Searches GitHub, X, Instagram, TikTok, Reddit, Medium, Spotify, and Stack Overflow.',
              'Correlates identical handles to reveal cross-platform digital footprints.'
            ]
          }
        ]
      },
      {
        id: 'tiers',
        headerPill: 'SECTION 03',
        title: '14 Platform Categories & Tiered Strategy',
        lead: 'To balance thorough coverage with API efficiency, the Platform Registry structures web platforms into 14 categories managed across 3 prioritized Tiers.',
        tiers: [
          {
            num: 'TIER 01',
            name: 'Core Discovery',
            desc: 'Executed on every search for immediate high-value identity discovery.',
            platforms: ['LinkedIn', 'X (Twitter)', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'GitHub', 'Reddit', 'News & Web']
          },
          {
            num: 'TIER 02',
            name: 'Specialized Networks',
            desc: 'Targeted discovery for developer hubs, streaming, audio, and publishing networks.',
            platforms: ['Twitch', 'Kick', 'Medium', 'Substack', 'Stack Overflow', 'Google Scholar', 'ResearchGate', 'Behance', 'Spotify', 'SoundCloud', 'Crunchbase']
          },
          {
            num: 'TIER 03',
            name: 'Extended & Documents',
            desc: 'Public corporate filings, legal court records, and creator monetization platforms.',
            platforms: ['SEC EDGAR', 'OpenCorporates', 'Justia', 'CourtListener', 'Scribd', 'Patreon', 'Ko-fi']
          }
        ]
      },
      {
        id: 'matching',
        headerPill: 'SECTION 04',
        title: 'Identity Separation & Disambiguation Engine',
        lead: 'Common names return search results from many unrelated individuals. Our separation engine evaluates candidate signals to isolate distinct people rather than merging unrelated profiles.',
        steps: [
          {
            num: '01',
            title: 'Signal Extraction',
            desc: 'Extracts social handles (@username), locations, employers, education, and co-mentioned names from search snippets.'
          },
          {
            num: '02',
            title: 'Clustering & Separation',
            desc: 'Groups candidates with overlapping handles, matching locations, or shared company affiliations into distinct Person Cards.'
          },
          {
            num: '03',
            title: 'Confidence Level Scoring',
            desc: 'Assigns a transparent confidence indicator (e.g. 85% Match Signal) based on verifiable cross-platform handle consistency.'
          }
        ]
      },
      {
        id: 'workspace',
        headerPill: 'SECTION 05',
        title: 'The 9 Investigation Tabs',
        lead: 'Each investigation is organized into 9 tabs. Every tab count is the number of items that tab shows.',
        tabs: [
          { num: '01', title: 'Overview Tab', desc: 'Primary target summary card, top candidate profiles, verified external links, and key intelligence metrics.' },
          { num: '02', title: 'Profiles Tab', desc: 'Complete directory of all social, professional, developer, and creative profiles discovered for the selected identity.' },
          { num: '03', title: 'Activity Tab', desc: 'Chronological feed of public posts, code commits, published articles, videos, and online activities.' },
          { num: '04', title: 'Associations Tab', desc: 'Co-mentioned colleagues, business associates, linked organizations, and affiliated usernames.' },
          { num: '05', title: 'Sources Tab', desc: 'Complete list of verified domain sources, direct URLs, and source domain reputation details.' },
          { num: '06', title: 'Web Tab', desc: 'Public web pages that mention or belong to the subject, split into pages linked to this identity and pages that only mention the name.' },
          { num: '07', title: 'News Tab', desc: 'News articles naming the subject, with their publishers.' },
          { num: '08', title: 'Metrics Tab', desc: 'Result counts, returned-versus-kept figures per search, and the full SerpApi search log.' },
          { num: '09', title: 'Audit Tab', desc: 'Time-stamped log of every search run and every change made to the investigation, exportable as CSV.' }
        ]
      },
      {
        id: 'workflows',
        headerPill: 'SECTION 06',
        title: 'Advanced Pivoting & Investigative Workflows',
        lead: 'Pivoting is the core process of using discovered intelligence attributes (handles, linked accounts, and public mentions) to launch secondary searches.',
        practices: [
          { num: 'A', title: 'Handle Pivoting Workflow', desc: "When a target's social profile is discovered, inspect their handle (e.g. @johndoe_dev). Copy that handle and launch a Username Reconnaissance Search to uncover hidden accounts on platforms like GitHub, Reddit, or Spotify." },
          { num: 'B', title: 'Location & Affiliation Filtering', desc: 'For common names, append location or employer keywords (e.g. Kwame Mensah Accra or John Mahama Ghana) in the initial search field to narrow candidate profiles immediately.' },
          { num: 'C', title: 'Case Audit Log Maintenance', desc: 'Always maintain audit integrity. Export the investigation (JSON) and the Sources and Audit lists (CSV) to keep verifiable timestamped records of all source URLs for reporting.' }
        ]
      },
      {
        id: 'serpapi',
        headerPill: 'SECTION 07',
        title: 'SerpApi Integration & Quota Optimization',
        lead: 'The search backend leverages SerpApi for real-time web indexing and structured extraction.',
        content: {
          title: 'SerpApi Query Batching',
          desc: 'Name searches run a fixed plan of 8 exact-phrase SerpApi searches (plus one per location or organization hint and up to 2 profile confirmations). Username searches run a larger multi-stage sweep capped at 35 queries. Identical requests are cached for 12 hours so they do not use quota twice.',
          sponsorLabel: 'Powered by',
          url: 'https://serpapi.com/'
        }
      },
      {
        id: 'compliance',
        headerPill: 'SECTION 08',
        title: 'Legal Compliance & Data Governance',
        lead: 'Guidelines for conducting lawful, ethical open source intelligence collection.',
        principles: [
          { title: 'Public Domain Compliance', desc: 'All data comes from publicly indexed search engine results and public platform APIs. No private data breaches or non-public databases are accessed.' },
          { title: 'Chain of Custody', desc: 'Audit metrics preserve original source URLs, domain timestamps, and execution parameters to support legal evidentiary standards.' }
        ]
      },
      {
        id: 'faq',
        headerPill: 'SECTION 09',
        title: 'Frequently Asked Questions (FAQ)',
        lead: 'Common inquiries regarding provider updates, data accuracy, and query optimization.',
        faqs: [
          { q: 'Why did some results appear after opening an investigation?', a: 'In previous versions, secondary queries were executed dynamically when opening sub-tabs. We refactored the search flow so that 100% of available provider searches complete up-front during initial search execution.' },
          { q: 'Does the platform create fake verification labels?', a: 'No. We follow a strict rule: zero synthetic data. Profile links and match signals are derived exclusively from actual public web pages indexed by SerpApi.' },
          { q: 'How are API quotas managed?', a: 'Each search uses a small, fixed set of targeted queries (8 to 11 SerpApi requests for a name search, up to about 71 for a username search), and identical requests are served from a 12-hour cache instead of being billed again.' }
        ]
      }
    ];
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return sectionData;

    return sectionData.filter((sec) => {
      const matchInHeader = sec.title.toLowerCase().includes(normalizedQuery) ||
                            sec.lead.toLowerCase().includes(normalizedQuery);

      if (matchInHeader) return true;

      if (sec.items && sec.items.some((i: any) => 
        i.title?.toLowerCase().includes(normalizedQuery) || 
        i.desc?.toLowerCase().includes(normalizedQuery) ||
        (i.tags && i.tags.some((t: string) => t.toLowerCase().includes(normalizedQuery))) ||
        (i.list && i.list.some((l: string) => l.toLowerCase().includes(normalizedQuery)))
      )) return true;

      if (sec.tiers && sec.tiers.some(t => 
        t.name.toLowerCase().includes(normalizedQuery) || 
        t.desc.toLowerCase().includes(normalizedQuery) ||
        t.platforms.some(p => p.toLowerCase().includes(normalizedQuery))
      )) return true;

      if (sec.steps && sec.steps.some(s => s.title.toLowerCase().includes(normalizedQuery) || s.desc.toLowerCase().includes(normalizedQuery))) return true;

      if (sec.tabs && sec.tabs.some(tb => tb.title.toLowerCase().includes(normalizedQuery) || tb.desc.toLowerCase().includes(normalizedQuery))) return true;

      if (sec.practices && sec.practices.some(p => p.title.toLowerCase().includes(normalizedQuery) || p.desc.toLowerCase().includes(normalizedQuery))) return true;

      if (sec.content && (sec.content.title.toLowerCase().includes(normalizedQuery) || sec.content.desc.toLowerCase().includes(normalizedQuery))) return true;

      if (sec.principles && sec.principles.some(pr => pr.title.toLowerCase().includes(normalizedQuery) || pr.desc.toLowerCase().includes(normalizedQuery))) return true;

      if (sec.faqs && sec.faqs.some(f => f.q.toLowerCase().includes(normalizedQuery) || f.a.toLowerCase().includes(normalizedQuery))) return true;

      return false;
    });
  }, [normalizedQuery, sectionData]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="help-page-container">
      <div className="help-hero-banner">
        <div className="help-hero-content">
          <div className="help-badge">
            <BookOpen size={14} />
            <span>KNOWLEDGE BASE & OPERATIONAL MANUAL</span>
          </div>
          <h1 className="help-hero-title">OSINT Intelligence Platform Guide</h1>
          <p className="help-hero-subtitle">
            Comprehensive operational manual for open source intelligence gathering, multi-tier platform reconnaissance, candidate identity separation, and investigative auditing.
          </p>

          <div className="help-search-box">
            <Search size={18} className="help-search-icon" />
            <input
              type="text"
              placeholder="Search documentation (e.g. SerpApi, 14 Tiers, handles, PDF export, quota)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="help-search-input"
            />
            {searchQuery && (
              <button 
                className="clear-search-icon-btn" 
                onClick={() => setSearchQuery('')}
                title="Clear search filter"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {searchQuery.trim() !== '' ? (
            <div className="help-search-status-bar">
              <span className="search-status-text">
                <Filter size={14} className="filter-icon" />
                Showing <strong>{filteredSections.length}</strong> matching section{filteredSections.length === 1 ? '' : 's'} for <em>"{searchQuery}"</em>
              </span>
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={13} /> Reset Filter
              </button>
            </div>
          ) : (
            <div className="help-quick-chips">
              <span className="chips-label">Popular Searches:</span>
              {suggestedSearchTerms.map((term) => (
                <button
                  key={term}
                  className="chip-btn"
                  onClick={() => setSearchQuery(term)}
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="help-layout">
        <aside className="help-nav-sidebar">
          <div className="help-nav-title">TABLE OF CONTENTS</div>
          <nav className="help-nav-list">
            {navigationSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              const isMatch = normalizedQuery === '' || filteredSections.some(fs => fs.id === sec.id);

              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`help-nav-btn ${isActive ? 'active' : ''} ${!isMatch ? 'dimmed' : ''}`}
                >
                  <Icon size={16} className="help-nav-btn-icon" />
                  <span>{sec.label}</span>
                  <ChevronRight size={14} className="help-nav-arrow" />
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="help-doc-body">
          {filteredSections.length === 0 ? (
            <div className="help-no-results-box">
              <div className="no-results-icon-wrapper">
                <Search size={32} />
              </div>
              <h3>No Documentation Results Found</h3>
              <p>No topics or FAQ items matched your query <strong>"{searchQuery}"</strong>.</p>
              <div className="suggested-terms-prompt">
                <span>Try searching for one of these topics:</span>
                <div className="suggested-chips-grid">
                  {suggestedSearchTerms.map((term) => (
                    <button
                      key={term}
                      className="suggested-chip-btn"
                      onClick={() => setSearchQuery(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
              <button className="reset-search-hero-btn" onClick={() => setSearchQuery('')}>
                Clear Search Filter
              </button>
            </div>
          ) : (
            filteredSections.map((sec) => {
              if (sec.id === 'intro') {
                return (
                  <section key={sec.id} id={sec.id} className="help-doc-section">
                    <div className="section-header-pill">{sec.headerPill}</div>
                    <h2 className="section-heading"><Highlight text={sec.title} query={searchQuery} /></h2>
                    <p className="section-lead"><Highlight text={sec.lead} query={searchQuery} /></p>

                    <div className="principles-grid">
                      {sec.items?.map((item, idx) => (
                        <div key={idx} className="principle-card">
                          <div className="principle-icon-wrapper">
                            <CheckCircle2 size={20} className="text-emerald" />
                          </div>
                          <h3><Highlight text={item.title} query={searchQuery} /></h3>
                          <p><Highlight text={item.desc} query={searchQuery} /></p>
                          {(item as any).tags && (
                            <div className="item-tags-row">
                              {(item as any).tags.map((t: string) => <span key={t} className="mini-tag">{t}</span>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'modalities') {
                return (
                  <section key={sec.id} id={sec.id} className="help-doc-section">
                    <div className="section-header-pill">{sec.headerPill}</div>
                    <h2 className="section-heading"><Highlight text={sec.title} query={searchQuery} /></h2>
                    <p className="section-lead"><Highlight text={sec.lead} query={searchQuery} /></p>

                    <div className="modality-cards-stack">
                      {sec.items?.map((mod: any, idx) => (
                        <div key={idx} className="modality-card">
                          <div className="modality-badge">{mod.badge}</div>
                          <h3><Highlight text={mod.title} query={searchQuery} /></h3>
                          <p><Highlight text={mod.desc} query={searchQuery} /></p>
                          {mod.queryExample && (
                            <div className="example-query-box">
                              <code>Example Query: "<Highlight text={mod.queryExample} query={searchQuery} />"</code>
                            </div>
                          )}
                          {mod.list && (
                            <ul className="modality-list">
                              {mod.list.map((li: string, lIdx: number) => <li key={lIdx}><Highlight text={li} query={searchQuery} /></li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'tiers') {
                return (
                  <section key={sec.id} id={sec.id} className="help-doc-section">
                    <div className="section-header-pill">{sec.headerPill}</div>
                    <h2 className="section-heading"><Highlight text={sec.title} query={searchQuery} /></h2>
                    <p className="section-lead"><Highlight text={sec.lead} query={searchQuery} /></p>

                    <div className="tiers-overview-grid">
                      {sec.tiers?.map((t, idx) => (
                        <div key={idx} className={`tier-column tier-${idx + 1}`}>
                          <div className="tier-header">
                            <span className="tier-num">{t.num}</span>
                            <h4><Highlight text={t.name} query={searchQuery} /></h4>
                          </div>
                          <p className="tier-desc"><Highlight text={t.desc} query={searchQuery} /></p>
                          <div className="tier-tags">
                            {t.platforms.map((p) => {
                              const isHighlight = normalizedQuery && p.toLowerCase().includes(normalizedQuery);
                              return (
                                <span key={p} className={`platform-pill ${isHighlight ? 'highlighted' : ''}`}>
                                  {p}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'matching') {
                return (
                  <section key={sec.id} id={sec.id} className="help-doc-section">
                    <div className="section-header-pill">{sec.headerPill}</div>
                    <h2 className="section-heading"><Highlight text={sec.title} query={searchQuery} /></h2>
                    <p className="section-lead"><Highlight text={sec.lead} query={searchQuery} /></p>

                    <div className="matching-explanation-box">
                      {sec.steps?.map((step, idx) => (
                        <div key={idx} className="matching-step">
                          <div className="step-number">{step.num}</div>
                          <div className="step-content">
                            <h4><Highlight text={step.title} query={searchQuery} /></h4>
                            <p><Highlight text={step.desc} query={searchQuery} /></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'workspace') {
                return (
                  <section key={sec.id} id={sec.id} className="help-doc-section">
                    <div className="section-header-pill">{sec.headerPill}</div>
                    <h2 className="section-heading"><Highlight text={sec.title} query={searchQuery} /></h2>
                    <p className="section-lead"><Highlight text={sec.lead} query={searchQuery} /></p>

                    <div className="tabs-guide-grid">
                      {sec.tabs?.map((tb, idx) => (
                        <div key={idx} className="tab-guide-card">
                          <div className="tab-card-header">
                            <span className="tab-number-badge">{tb.num}</span>
                            <h4><Highlight text={tb.title} query={searchQuery} /></h4>
                          </div>
                          <p><Highlight text={tb.desc} query={searchQuery} /></p>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'workflows') {
                return (
                  <section key={sec.id} id={sec.id} className="help-doc-section">
                    <div className="section-header-pill">{sec.headerPill}</div>
                    <h2 className="section-heading"><Highlight text={sec.title} query={searchQuery} /></h2>
                    <p className="section-lead"><Highlight text={sec.lead} query={searchQuery} /></p>

                    <div className="best-practices-box">
                      {sec.practices?.map((pr, idx) => (
                        <div key={idx} className="practice-item">
                          <div className="practice-num">{pr.num}</div>
                          <div className="practice-content">
                            <h4><Highlight text={pr.title} query={searchQuery} /></h4>
                            <p><Highlight text={pr.desc} query={searchQuery} /></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'serpapi') {
                return (
                  <section key={sec.id} id={sec.id} className="help-doc-section">
                    <div className="section-header-pill">{sec.headerPill}</div>
                    <h2 className="section-heading"><Highlight text={sec.title} query={searchQuery} /></h2>
                    <p className="section-lead"><Highlight text={sec.lead} query={searchQuery} /></p>

                    {sec.content && (
                      <div className="serpapi-info-card">
                        <div className="serpapi-card-header">
                          <Server size={18} className="text-amber" />
                          <h4><Highlight text={sec.content.title} query={searchQuery} /></h4>
                        </div>
                        <p><Highlight text={sec.content.desc} query={searchQuery} /></p>
                        <div className="serpapi-link-callout">
                          <span>{sec.content.sponsorLabel}</span>
                          <a href={sec.content.url} target="_blank" rel="noopener noreferrer" className="serpapi-doc-link">
                            SerpApi Official Website ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </section>
                );
              }

              if (sec.id === 'compliance') {
                return (
                  <section key={sec.id} id={sec.id} className="help-doc-section">
                    <div className="section-header-pill">{sec.headerPill}</div>
                    <h2 className="section-heading"><Highlight text={sec.title} query={searchQuery} /></h2>
                    <p className="section-lead"><Highlight text={sec.lead} query={searchQuery} /></p>

                    <div className="principles-grid">
                      {sec.principles?.map((pr, idx) => (
                        <div key={idx} className="principle-card">
                          <div className="principle-icon-wrapper">
                            <Lock size={18} className="text-blue" />
                          </div>
                          <h3><Highlight text={pr.title} query={searchQuery} /></h3>
                          <p><Highlight text={pr.desc} query={searchQuery} /></p>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'faq') {
                return (
                  <section key={sec.id} id={sec.id} className="help-doc-section">
                    <div className="section-header-pill">{sec.headerPill}</div>
                    <h2 className="section-heading"><Highlight text={sec.title} query={searchQuery} /></h2>
                    <p className="section-lead"><Highlight text={sec.lead} query={searchQuery} /></p>

                    <div className="faq-accordion">
                      {sec.faqs?.map((f, idx) => (
                        <div key={idx} className="faq-item">
                          <h4 className="faq-question"><Highlight text={f.q} query={searchQuery} /></h4>
                          <div className="faq-answer">
                            <p><Highlight text={f.a} query={searchQuery} /></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              return null;
            })
          )}
        </main>
      </div>
    </div>
  );
};
