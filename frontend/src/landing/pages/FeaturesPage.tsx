import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck, Search, Globe, Activity, Share2, FileText,
  Database, Layers, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, Cpu
} from 'lucide-react';

interface FeatureDetailProps {
  num: string;
  id: string;
  title: string;
  whatItIs: string;
  whyItExists: string;
  howItWorks: string;
  whatUsersSee: string;
  limitations: string;
  whatToVerify: string;
  tags: string[];
}

const EditorialFeatureRow: React.FC<FeatureDetailProps> = ({
  num,
  id,
  title,
  whatItIs,
  whyItExists,
  howItWorks,
  whatUsersSee,
  limitations,
  whatToVerify,
  tags
}) => (
  <div id={id} className="lp-editorial-row" style={{ scrollMarginTop: '100px' }}>
    <div className="lp-editorial-num">{num}</div>
    <div className="lp-editorial-title-box">
      <h3>{title}</h3>
      <div className="lp-editorial-tags" style={{ marginTop: '12px' }}>
        {tags.map((t, idx) => (
          <span key={idx} className="lp-editorial-tag">{t}</span>
        ))}
      </div>
    </div>

    <div className="lp-editorial-body">
      <div className="lp-editorial-grid-2">
        <div className="lp-editorial-spec-item">
          <strong>What It Is</strong>
          <p>{whatItIs}</p>
        </div>
        <div className="lp-editorial-spec-item">
          <strong>Why It Exists</strong>
          <p>{whyItExists}</p>
        </div>
      </div>

      <div style={{ marginTop: '8px' }}>
        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>How It Works</strong>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.65 }}>{howItWorks}</p>
      </div>

      <div>
        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>What Users Can See</strong>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.65 }}>{whatUsersSee}</p>
      </div>

      <div className="lp-editorial-grid-2" style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
        <div className="lp-editorial-spec-item">
          <strong style={{ color: '#ef4444' }}>Limitations</strong>
          <p>{limitations}</p>
        </div>
        <div className="lp-editorial-spec-item">
          <strong style={{ color: '#22c55e' }}>What to Verify</strong>
          <p>{whatToVerify}</p>
        </div>
      </div>
    </div>
  </div>
);

export const FeaturesPage: React.FC = () => {
  const featuresList: FeatureDetailProps[] = [
    {
      num: '01',
      id: 'name-investigation',
      title: 'Name Investigation Engine',
      tags: ['Google Dorks', 'SerpApi Engine', 'LinkedIn Filter', 'News Index'],
      whatItIs: 'A specialized search engine aggregator designed to query public search engine indexes for a person full name.',
      whyItExists: 'Manual web searching for individuals requires writing complex Google dorks and manually filtering thousands of irrelevant results.',
      howItWorks: 'Constructs targeted search expressions combining site constraints (e.g. site:linkedin.com/in) and exact name quotes routed through SerpApi.',
      whatUsersSee: 'Indexed social profiles, news articles, academic publications, professional bio entries, and public web mentions.',
      limitations: 'Common names (e.g., "John Smith") will produce matches for unrelated individuals sharing the same name.',
      whatToVerify: 'Verify city, employment history, and bio context on original target pages before assuming identity correlation.'
    },
    {
      num: '02',
      id: 'username-investigation',
      title: 'Username Handle Discovery',
      tags: ['Multi-Platform', '30+ Networks', 'Handle Probing', 'URL Check'],
      whatItIs: 'A multi-platform handle probing feature checking over 30 leading web services for target username existence.',
      whyItExists: 'People frequently reuse username handles across developer, social, creative, and media platforms.',
      howItWorks: 'Queries platform-specific URL schemas (e.g. github.com/username) and evaluates HTTP response codes and profile metadata.',
      whatUsersSee: 'A consolidated list of discovered active profiles across GitHub, X, Instagram, Medium, Reddit, YouTube, and Behance.',
      limitations: 'Identical usernames on different platforms do not guarantee they belong to the same human individual.',
      whatToVerify: 'Cross-reference profile avatars, bio text, external link listings, and activity timestamps across discovered profiles.'
    },
    {
      num: '03',
      id: 'deep-search',
      title: 'Deep Search Sweeping',
      tags: ['Secondary Dorks', 'Long-Tail Web', 'Niche Keyphrase', 'Archived PDFs'],
      whatItIs: 'An extended secondary query execution feature that expands search scope to secondary indexes and long-tail web results.',
      whyItExists: 'Primary search queries often return top-tier social profiles while missing historical blog posts or archived PDF mentions.',
      howItWorks: 'Generates secondary dorks combining subject names with niche keywords, company names, or co-authors.',
      whatUsersSee: 'Secondary web mentions, archived articles, forum postings, and niche industry directory pages.',
      limitations: 'Increases the volume of candidate results, requiring greater analyst review to filter false matches.',
      whatToVerify: 'Inspect published dates and surrounding document text to confirm subject context.'
    },
    {
      num: '04',
      id: 'profile-discovery',
      title: 'Profile Discovery & Canonical Cleaning',
      tags: ['URL Sanitizer', 'Proximity Score', 'Domain Authority', 'Clean Links'],
      whatItIs: 'An automated URL sanitizer and profile evaluator that cleans and scores candidate social profile links.',
      whyItExists: 'Search engine links often contain tracking parameters (utm_*, ref) or point to generic login redirects.',
      howItWorks: 'Strips tracking query strings, validates canonical profile paths, and calculates string proximity scores against the target name.',
      whatUsersSee: 'Clean, direct profile links grouped by platform category with visual confidence indicators.',
      limitations: 'Private social profiles cannot reveal bio or activity data beyond publicly indexed snippets.',
      whatToVerify: 'Open the clean profile URL directly in a browser to review privacy settings and bio details.'
    },
    {
      num: '05',
      id: 'activity-discovery',
      title: 'Public Activity Extraction',
      tags: ['GitHub Commits', 'Public Posts', 'Timeline Feed', 'Media Talks'],
      whatItIs: 'A feature that aggregates publicly indexed posts, code commits, published articles, and media interactions.',
      whyItExists: 'Understanding a subject public timeline requires tracking activities across multiple disconnected platforms.',
      howItWorks: 'Parses indexed snippet dates, public RSS feeds, and platform activity logs into a chronological feed.',
      whatUsersSee: 'Recent public commits, posted articles, media interviews, and documented conference appearances.',
      limitations: 'Only indexes activity that has been publicly posted and crawled by search engine bots.',
      whatToVerify: 'Check post timestamps directly on original platforms to verify exact event timelines.'
    },
    {
      num: '06',
      id: 'associations',
      title: 'Associations & Group Affiliations',
      tags: ['Employer Links', 'Co-Authors', 'University Groups', 'GitHub Orgs'],
      whatItIs: 'An organizational affiliation detector that identifies companies, academic institutions, and public groups associated with the subject.',
      whyItExists: 'Subjects are defined by their professional networks, open-source organization memberships, and research groups.',
      howItWorks: 'Scans indexed snippets for co-occurring organization names, university designations, and co-authors.',
      whatUsersSee: 'Structured display of documented employer links, GitHub organization memberships, and research affiliations.',
      limitations: 'Co-occurrence of a name in an article does not automatically prove current formal employment or membership.',
      whatToVerify: 'Confirm official corporate registries, organization member lists, or author attribution sections.'
    },
    {
      num: '07',
      id: 'web-presence',
      title: 'Personal & Portfolio Web Presence',
      tags: ['Personal Domains', 'Portfolio Sites', 'Custom Blogs', 'CV Pages'],
      whatItIs: 'Discovers personal domain websites, portfolio pages, personal blogs, and custom project sites.',
      whyItExists: 'Personal websites often serve as the primary authoritative source for an individual professional CV and project portfolio.',
      howItWorks: 'Filters search index results for root domains owned or operated by the target subject.',
      whatUsersSee: 'Direct links to personal blogs, portfolio sites, custom resume pages, and personal project documentation.',
      limitations: 'Domain WHOIS information may be privacy-protected; site ownership must be verified via site content.',
      whatToVerify: 'Look for contact pages, bio summaries, and linked social profiles on the target domain.'
    },
    {
      num: '08',
      id: 'news-articles',
      title: 'News & Article Aggregation',
      tags: ['Google News', 'Press Releases', 'Interviews', 'Journal Articles'],
      whatItIs: 'Filters search engine results specifically for press releases, news reporting, interviews, and journal articles mentioning the subject.',
      whyItExists: 'Press coverage provides independent third-party context regarding a subject public endeavors.',
      howItWorks: 'Queries Google News indexes via SerpApi and classifies press domain authority.',
      whatUsersSee: 'News headlines, publication names, publishing dates, and snippet excerpts mentioning the target name.',
      limitations: 'Distinguishes between articles focused primarily on the subject versus articles containing brief incidental mentions.',
      whatToVerify: 'Read the full news report to ensure the article refers to your target subject and not a namesake.'
    },
    {
      num: '09',
      id: 'sources',
      title: 'Source URL Tracking & Metadata',
      tags: ['Audit Log', 'SerpApi Metadata', 'Raw JSON', 'Timestamping'],
      whatItIs: 'A dedicated audit tab recording every original source URL, crawl date, search query expression, and engine provider.',
      whyItExists: 'Investigative integrity requires maintaining a complete, auditable record of where every data point originated.',
      howItWorks: 'Logs raw JSON metadata returned by SerpApi into the investigation document structure.',
      whatUsersSee: 'A clean table of source URLs, domain names, query origins, and date stamps.',
      limitations: 'External web pages may change or be removed by site owners after the search engine crawl.',
      whatToVerify: 'Bookmark or save critical source URLs in your Firestore investigation case notes.'
    },
    {
      num: '10',
      id: 'investigation-management',
      title: 'Firestore Case Management & Saved Findings',
      tags: ['Firebase Auth', 'Firestore Rules', 'UID Isolated', 'Case Notes'],
      whatItIs: 'A secure cloud storage workspace allowing analysts to bookmark profiles, save full search runs, and write investigation notes.',
      whyItExists: 'Investigations span multiple sessions and require organized case records that can be revisited over time.',
      howItWorks: 'Stores case files in Firebase Firestore protected by strict per-user UID security rules.',
      whatUsersSee: 'Saved investigation lists, bookmarked candidate profiles, analyst summary notes, and historical query logs.',
      limitations: 'Saved data is accessible exclusively to the authenticated user account that created the case.',
      whatToVerify: 'Review saved notes periodically and export important evidence records for archival.'
    }
  ];

  return (
    <div className="lp-route-container">
      <section className="lp-section-wide">
        <div className="lp-container-wide">
          
          <div style={{ marginBottom: '50px' }}>
            <div className="lp-badge" style={{ marginBottom: '14px' }}>
              <Layers size={14} />
              <span>Detailed Feature Catalog</span>
            </div>
            <h1 className="lp-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
              Product Feature Reference
            </h1>
            <p className="lp-subtitle" style={{ maxWidth: '820px' }}>
              An in-depth explanation of every core capability, underlying search engine mechanism, data display format, and analyst verification rule.
            </p>
          </div>

          <div className="lp-editorial-list" style={{ marginBottom: '60px' }}>
            {featuresList.map((feat) => (
              <EditorialFeatureRow key={feat.id} {...feat} />
            ))}
          </div>

          <div style={{ textAlign: 'center', paddingTop: '20px' }}>
            <Link to="/auth" className="btn-primary-warm" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              Launch Workspace & Try Features <ArrowRight size={18} />
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
};
