import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';

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
      tags: ['Exact Phrase', 'Per-Platform Queries', 'Profile Confirmation', 'Possible Identities'],
      whatItIs: 'A people search that finds a person’s public profiles, web pages and news from their full name.',
      whyItExists: 'Manual searching means writing many site-restricted queries and sorting thousands of unrelated results by hand.',
      howItWorks: 'Runs exact-name Google searches through SerpApi: the name alone, then one query per platform group (LinkedIn, Facebook with two result pages, Instagram, X, TikTok & Threads, YouTube, developer and writing sites). Optional location and organisation narrow common names; deep searches confirm the best Facebook and Instagram matches with their profile APIs.',
      whatUsersSee: 'Possible identities grouped from the results, each with its profiles, web pages and news, labelled Exact, Likely, Similar or Possible match.',
      limitations: 'Common names (e.g. "John Smith") return many different people; the platform separates them but cannot know which one you mean.',
      whatToVerify: 'Check city, employer and bio on the original pages before choosing an identity.'
    },
    {
      num: '02',
      id: 'username-investigation',
      title: 'Username Handle Discovery',
      tags: ['13 Free Checks', 'DuckDuckGo & Yahoo', 'Punctuation Variants', 'TikTok'],
      whatItIs: 'Finds accounts that use a handle, including versions written with different punctuation (99_humblechild, 99.humblechild_, 99-humblechild).',
      whyItExists: 'People reuse handles across platforms, often with small punctuation changes that exact searches miss.',
      howItWorks: 'Checks GitHub, Reddit, Mastodon, Bluesky, Docker Hub, npm, DEV, Medium, Telegram, Twitch, Vimeo, YouTube and Wikipedia directly through free public APIs, and searches Google, DuckDuckGo and Yahoo, which find punctuation variants and TikTok accounts. Post and video links are traced back to the account that owns them.',
      whatUsersSee: 'The subject’s accounts per platform, with a separate list of similar usernames that may belong to other people.',
      limitations: 'The same handle on two platforms does not prove it is the same person.',
      whatToVerify: 'Compare avatars, bios, links and posting times across the accounts found.'
    },
    {
      num: '03',
      id: 'search-intelligence',
      title: 'Search Intelligence (Typo-Tolerant Search)',
      tags: ['Did You Mean', 'Intelligent / Precise', 'Confidence', 'Search Path'],
      whatItIs: 'A spelling check that runs before a search so typos like "Kingley Anab" or "gaalemseyy" still find the right results.',
      whyItExists: 'A single misspelt letter can make a search return nothing, and the investigator may not notice.',
      howItWorks: 'In Intelligent mode one cached Google check reads Google’s spelling fix and the spellings the results use. High-confidence corrections are searched directly ("Showing results for … · Search instead for …"); less certain ones become a "Did you mean" suggestion. Precise mode searches exactly what was typed. Usernames and quoted text are never corrected.',
      whatUsersSee: 'The correction with High, Medium or Low confidence, the reason, the full search path, related searches and any of your cases that match.',
      limitations: 'A correction is a best guess from public results; unusual spellings of real names can be corrected wrongly.',
      whatToVerify: 'If the correction looks wrong, click "Search instead for" your original spelling.'
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
      tags: ['Google News', 'Bing News', 'Country Editions', 'Exact Phrase'],
      whatItIs: 'News coverage of a person, organisation, place or topic, and automatic news for each case.',
      whyItExists: 'Press coverage gives independent context about a subject.',
      howItWorks: 'Searches Google News and Bing News through SerpApi. Several words are matched as an exact phrase in the article text; if that finds nothing, a looser search runs. Choosing a country shows only that country’s news edition.',
      whatUsersSee: 'Headlines, publishers, dates and thumbnails, ranked by how closely they match your terms.',
      limitations: 'Articles that spell the name differently need their own search; some articles only mention the subject briefly.',
      whatToVerify: 'Read the full article to confirm it refers to your subject and not a namesake.'
    },
    {
      num: '09',
      id: 'sources',
      title: 'Sources, Audit Log & API Reference',
      tags: ['Audit Log', 'Search Log', 'Sources Page', 'API Docs'],
      whatItIs: 'A record of where every result came from, plus a Sources page listing every provider and API the platform uses.',
      whyItExists: 'Investigations need an auditable record of where each piece of evidence originated.',
      howItWorks: 'Each case keeps every source URL, the searches that found it and a time-stamped audit log. The Sources page lists all search engines and platforms, and its API endpoints tab documents every endpoint with links to the provider documentation.',
      whatUsersSee: 'Source and audit tables (exportable as CSV), the full SerpApi search log, and the Sources & API reference.',
      limitations: 'Web pages can change or be removed after they were found.',
      whatToVerify: 'Save or export critical sources while they are available.'
    },
    {
      num: '10',
      id: 'investigation-management',
      title: 'Cases, Search History & Saved Findings',
      tags: ['Save to Case', 'Auto-Created Case', 'Search History', 'Export'],
      whatItIs: 'Your workspace: cases, saved findings from any search page, tracked people and a history of every search.',
      whyItExists: 'Investigations span many sessions and many kinds of search.',
      howItWorks: 'Any result can be saved to a case; if you have no case yet one is created automatically. Every search is saved to your history, grouped by kind, and can be re-run or opened as its case. Cases can be re-run to see what changed and exported as JSON and CSV.',
      whatUsersSee: 'Investigations list, the 11 case tabs, tracked people, and Search history with results and corrections.',
      limitations: 'Data is stored in your own account and visible only to you.',
      whatToVerify: 'Export important cases periodically for your records.'
    },
    {
      num: '11',
      id: 'explore-searches',
      title: 'Social, Media, Geo & Trends Searches',
      tags: ['Social Posts', 'Reverse Image', 'Places & Reviews', 'Trending Now'],
      whatItIs: 'Keyword searches across public social content, images and videos, places and search trends.',
      whyItExists: 'Investigations often start from a topic, image or place rather than a person.',
      howItWorks: 'Social search runs one query per platform (X, Facebook, Instagram, TikTok, YouTube, LinkedIn, Reddit, Threads, Telegram, WhatsApp public groups, VK, Weibo) or searches forums. Media searches images, videos and reverse images (Google Lens). Geo search covers places with reviews, news, social, web and events for a location, with same-named places in other countries. Trends shows interest over time, related queries and what is trending now.',
      whatUsersSee: 'Result lists with engine status, thumbnails and a Save button on each result.',
      limitations: 'Only content that search engines have indexed or platforms expose publicly can be found.',
      whatToVerify: 'Open posts and images on the original platform to confirm context and date.'
    },
    {
      num: '12',
      id: 'similar-accounts',
      title: 'Similar Accounts Separation',
      tags: ['Identity Separation', 'Similar Match', 'No Merging'],
      whatItIs: 'Keeps accounts that only look like your subject apart from your subject.',
      whyItExists: 'Names and handles one letter apart often belong to different people, and mixing them corrupts an investigation.',
      howItWorks: 'Close spellings are labelled Similar match and listed in their own "Similar accounts" section. Their posts and activity are never counted as your subject’s.',
      whatUsersSee: 'A separate section for similar accounts in Profiles, Activity and search results.',
      limitations: 'A similar account can still be your subject using a variant handle.',
      whatToVerify: 'Look for shared photos, links or contacts before linking a similar account to your subject.'
    },
    {
      num: '13',
      id: 'analysis',
      title: 'Network & Content Analysis',
      tags: ['Connections', 'Case Comparison', 'No Searches Used'],
      whatItIs: 'Analysis of the data already saved in your cases.',
      whyItExists: 'Patterns across cases are easier to see visually than in lists.',
      howItWorks: 'Network links the people, usernames, organisations and websites in your cases and compares two cases. Content analysis breaks saved results down by platform, type, date and words. Neither uses any searches.',
      whatUsersSee: 'A connection graph, case comparison, and charts of saved content.',
      limitations: 'Only as complete as the data you have saved.',
      whatToVerify: 'Confirm important connections on the original sources.'
    },
    {
      num: '14',
      id: 'account-security',
      title: 'Google Sign-in & Protected Access',
      tags: ['Continue with Google', 'Protected API', 'Per-User Data'],
      whatItIs: 'Account sign-in and protection for your workspace and the search engine.',
      whyItExists: 'Investigation data is sensitive and the search engine must not be open to anyone.',
      howItWorks: 'Sign in with Google or email and password through Firebase Authentication; passwords are never stored by the platform. Every page requires sign-in, the server verifies it on every search, searches are limited per account, and database rules keep each account’s data private.',
      whatUsersSee: 'Continue with Google on the sign-in page, and Security and Data & privacy settings.',
      limitations: 'Guest access is not available.',
      whatToVerify: 'Sign out on shared computers.'
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
              How every capability works, what it shows, its limits, and what to verify.
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
