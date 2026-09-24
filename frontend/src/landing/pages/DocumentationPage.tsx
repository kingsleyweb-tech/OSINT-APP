import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

type DocSectionId =
  | 'introduction'
  | 'getting-started'
  | 'creating-investigation'
  | 'name-search'
  | 'username-search'
  | 'search-results'
  | 'possible-people'
  | 'profiles'
  | 'activity'
  | 'associations'
  | 'websites'
  | 'news'
  | 'sources'
  | 'deep-search'
  | 'accuracy'
  | 'confidence'
  | 'saving-findings'
  | 'analyst-notes'
  | 'case-management'
  | 'original-sources'
  | 'limitations'
  | 'responsible-osint'
  | 'privacy'
  | 'security'
  | 'troubleshooting';

interface DocItem {
  id: DocSectionId;
  label: string;
  category: 'Overview' | 'Workflows' | 'Analysis' | 'Management' | 'Ethics & Help';
}

export const DocumentationPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSectionId>('introduction');

  const docNav: DocItem[] = [
    { id: 'introduction', label: '01. Platform Introduction', category: 'Overview' },
    { id: 'getting-started', label: '02. Getting Started', category: 'Overview' },
    { id: 'creating-investigation', label: '03. Creating an Investigation', category: 'Workflows' },
    { id: 'name-search', label: '04. Name Search Workflow', category: 'Workflows' },
    { id: 'username-search', label: '05. Username Search Workflow', category: 'Workflows' },
    { id: 'deep-search', label: '06. Deep Search Sweeping', category: 'Workflows' },
    { id: 'search-results', label: '07. Results Normalization', category: 'Analysis' },
    { id: 'possible-people', label: '08. Possible People Matching', category: 'Analysis' },
    { id: 'profiles', label: '09. Profiles Discovery', category: 'Analysis' },
    { id: 'activity', label: '10. Activity Extraction', category: 'Analysis' },
    { id: 'associations', label: '11. Associations & Groups', category: 'Analysis' },
    { id: 'websites', label: '12. Personal Web Presence', category: 'Analysis' },
    { id: 'news', label: '13. News & Publications', category: 'Analysis' },
    { id: 'sources', label: '14. Sources & Audit Metadata', category: 'Analysis' },
    { id: 'accuracy', label: '15. Search Accuracy Rules', category: 'Analysis' },
    { id: 'confidence', label: '16. Confidence Scoring', category: 'Analysis' },
    { id: 'saving-findings', label: '17. Saving to Firestore', category: 'Management' },
    { id: 'analyst-notes', label: '18. Analyst Case Notes', category: 'Management' },
    { id: 'case-management', label: '19. Case Management', category: 'Management' },
    { id: 'original-sources', label: '20. Reviewing Original Sources', category: 'Ethics & Help' },
    { id: 'limitations', label: '21. Platform Search Limitations', category: 'Ethics & Help' },
    { id: 'responsible-osint', label: '22. Responsible OSINT Rules', category: 'Ethics & Help' },
    { id: 'privacy', label: '23. Privacy & Data Boundaries', category: 'Ethics & Help' },
    { id: 'security', label: '24. Security & Access Control', category: 'Ethics & Help' },
    { id: 'troubleshooting', label: '25. Troubleshooting & FAQs', category: 'Ethics & Help' },
  ];

  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <BookOpen size={14} />
              <span>Product Documentation Manual</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              System Documentation & Guide
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '840px' }}>
              Comprehensive operational reference manual covering query syntax, analysis tabs, confidence scoring, case management, and ethical compliance.
            </p>
          </div>

          {/* Wide Editorial Layout */}
          <div className="lp-doc-grid">
            
            {/* Sticky Table of Contents Sidebar */}
            <div className="lp-doc-toc-sidebar">
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-warm-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                ON THIS PAGE
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {docNav.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      style={{
                        display: 'block',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                        background: isActive ? 'var(--bg-hover)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--accent-warm-light)' : '3px solid transparent',
                        borderTop: 'none',
                        borderRight: 'none',
                        borderBottom: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Continuous Wide Document Flow */}
            <div style={{ lineHeight: 1.7, color: 'var(--text-muted)', width: '100%' }}>
              
              {activeSection === 'introduction' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 01</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Platform Introduction
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '16px' }}>
                    The OSINT Investigation Platform is a specialized open-source intelligence research workspace engineered for cybersecurity analysts, legal investigators, journalists, and academic researchers. It automates query generation, retrieves organic search engine index results via <strong>SerpApi</strong>, verifies live candidate profiles, and organizes digital footprints into clean case records.
                  </p>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    All data aggregated by the platform is derived exclusively from publicly accessible search engine indexes. The platform does not access private accounts, bypass paywalls, or query non-public databases.
                  </p>
                </div>
              )}

              {activeSection === 'getting-started' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 02</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Getting Started
                  </h2>
                  <ol style={{ paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                    <li>Create an account or sign in at the authentication portal (/auth).</li>
                    <li>Select your search type: <strong>Person / Name Search</strong> or <strong>Username Search</strong>.</li>
                    <li>Enter the target subject name or handle along with optional location/role qualifiers.</li>
                    <li>Execute the query to launch SerpApi index requests.</li>
                    <li>Review findings structured across Overview, Profiles, Activity, Associations, News, and Sources.</li>
                    <li>Bookmark verified candidate profiles and save case records to your Firestore account workspace.</li>
                  </ol>
                </div>
              )}

              {activeSection === 'creating-investigation' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 03</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Creating an Investigation
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75, marginBottom: '16px' }}>
                    To launch a new investigation, navigate to the <strong>New Search</strong> tab in the workspace. Enter your subject parameters. The system automatically constructs targeted Google search dorks combining exact match phrase quotes and site filters.
                  </p>
                  <div className="lp-code-block" style={{ padding: '20px', marginBottom: '20px', fontSize: '0.9rem' }}>
                    Query Syntax Example:<br />
                    Name: "Kwame Mensah"<br />
                    Location: "Accra"<br />
                    Generated Dork: site:linkedin.com/in "Kwame Mensah" "Accra"
                  </div>
                </div>
              )}

              {activeSection === 'name-search' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 04</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Name Search Workflow
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Name search evaluates public web records across major search engine indexes. It is optimized for discovering professional profiles, news mentions, corporate registrations, and academic publications.
                  </p>
                </div>
              )}

              {activeSection === 'username-search' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 05</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Username Search Workflow
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Username search probes over 30 leading web services (GitHub, X, Instagram, Medium, Reddit, YouTube, etc.) for target handle existence and returns canonical profile links.
                  </p>
                </div>
              )}

              {activeSection === 'deep-search' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 06</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Deep Search Sweeping
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Deep Search executes secondary query sweeps combining subject names with niche keywords, co-authors, or historic domain references to surface long-tail web mentions.
                  </p>
                </div>
              )}

              {activeSection === 'search-results' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 07</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Search Results Normalization
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Raw search engine JSON data returned by SerpApi is processed by our normalization service: tracking parameters (utm_*, ref) are stripped, duplicate URLs removed, and snippets categorized.
                  </p>
                </div>
              )}

              {activeSection === 'possible-people' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 08</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Possible People Matching
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    The Possible People section clusters candidate profiles by matching name tokens, location alignment, and co-occurring bio details. Matches are classified as Strong, Possible, or Mention Only.
                  </p>
                </div>
              )}

              {activeSection === 'profiles' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 09</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Profiles Discovery
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Displays verified social, professional, developer, and creative profiles discovered during the search.
                  </p>
                </div>
              )}

              {activeSection === 'activity' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 10</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Activity Extraction
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Gathers publicly indexed commits, posted articles, media appearances, and blog posts into a unified chronological timeline.
                  </p>
                </div>
              )}

              {activeSection === 'associations' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 11</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Associations & Group Affiliations
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Identifies documented employer links, academic institution affiliations, GitHub open-source organization memberships, and public co-authors.
                  </p>
                </div>
              )}

              {activeSection === 'websites' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 12</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Personal & Portfolio Web Presence
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Surfaces target personal blogs, custom portfolio sites, resume pages, and project domains.
                  </p>
                </div>
              )}

              {activeSection === 'news' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 13</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    News & Publications
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Filters press reporting, media interviews, and academic journal articles citing the subject name.
                  </p>
                </div>
              )}

              {activeSection === 'sources' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 14</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Sources & Audit Metadata
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Maintains an auditable reference log containing original web URLs, crawl dates, and query parameters.
                  </p>
                </div>
              )}

              {activeSection === 'accuracy' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 15</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Search Accuracy Rules
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Analysts must account for common names, shared handles, and outdated search engine crawl caches. Always review target URLs directly before making identity assessments.
                  </p>
                </div>
              )}

              {activeSection === 'confidence' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 16</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Confidence Scoring Model
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Confidence scores evaluate name token similarity, location overlap, and bio context. High confidence indicates strong profile alignment; low confidence indicates a possible or generic mention.
                  </p>
                </div>
              )}

              {activeSection === 'saving-findings' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 17</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Saving Findings to Firestore
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Clicking <strong>Save Investigation</strong> writes candidate profile bookmarks, query metadata, and analyst notes to your Firebase Firestore user collection.
                  </p>
                </div>
              )}

              {activeSection === 'analyst-notes' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 18</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Adding Analyst Notes
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    The <strong>Notes</strong> tab allows investigators to record research conclusions, hypothesis evaluations, and verification steps directly within the case document.
                  </p>
                </div>
              )}

              {activeSection === 'case-management' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 19</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Managing Investigation Cases
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    All historical investigations are accessible from the <strong>Investigations</strong> dashboard list, allowing analysts to resume, update, or archive past research.
                  </p>
                </div>
              )}

              {activeSection === 'original-sources' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 20</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Reviewing Original Sources
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Search engine snippets are preliminary summaries. Investigators must open and review original target URLs to confirm full context and accuracy.
                  </p>
                </div>
              )}

              {activeSection === 'limitations' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 21</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Platform Search Limitations
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    The platform cannot search unindexed web pages, private social accounts, password-protected forums, or deleted web content.
                  </p>
                </div>
              )}

              {activeSection === 'responsible-osint' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 22</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Responsible OSINT Rules
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    Users must comply with all applicable local and international laws. Harassment, stalking, doxxing, and non-FCRA credit/employment screening are strictly prohibited.
                  </p>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 23</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Privacy & Data Boundaries
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    The platform aggregates public search engine index data. It does not collect or sell private personal dossiers.
                  </p>
                </div>
              )}

              {activeSection === 'security' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 24</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Security & Access Control
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    User accounts and Firestore investigation collections are protected by Firebase Auth and security rules enforcing strict per-user UID isolation.
                  </p>
                </div>
              )}

              {activeSection === 'troubleshooting' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '32px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-warm-light)', fontFamily: 'monospace', marginBottom: '8px' }}>SECTION 25</div>
                  <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Troubleshooting & FAQs
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>
                    If a search returns zero results, verify spelling, broaden location qualifiers, or try searching by username handle instead of full name.
                  </p>
                </div>
              )}

            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
