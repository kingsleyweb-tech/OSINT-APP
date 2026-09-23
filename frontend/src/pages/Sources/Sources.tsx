import React, { useState } from 'react';
import { Activity, ShieldCheck, Database, Filter } from 'lucide-react';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import '../../styles/Sources.css';

interface OSINTSource {
  id: string;
  name: string;
  platformKey: string;
  category: 'Web Search' | 'Knowledge' | 'Developer' | 'Social' | 'Video' | 'Domain' | 'News';
  type: string;
  extractedData: string[];
  description: string;
  metric: string;
  status: 'Operational' | 'Active';
}

const ALL_SOURCES: OSINTSource[] = [
  {
    id: 'google',
    name: 'Google Search Engine',
    platformKey: 'Google',
    category: 'Web Search',
    type: 'SerpApi & Index Extraction',
    extractedData: ['Indexed Profiles', 'Web Snippets', 'Email Addresses', 'Social Links'],
    description: 'Primary web query engine extracting deep web indexing, public profile mentions, and cached snippet metadata across global domains.',
    metric: 'Primary OSINT Crawler',
    status: 'Operational'
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia & Wikidata',
    platformKey: 'Wikipedia',
    category: 'Knowledge',
    type: 'Open Knowledge Graph',
    extractedData: ['Biographical Data', 'Entity Relations', 'Key Facts', 'Occupations'],
    description: 'Retrieves structured entity summaries, verified biographical histories, key associations, and knowledge graph relations.',
    metric: 'Verified Knowledge Base',
    status: 'Operational'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    platformKey: 'YouTube',
    category: 'Video',
    type: 'Google Video API & Scraping',
    extractedData: ['Channel Metadata', 'Public Playlists', 'Video Uploads', 'Creator Bios'],
    description: 'Searches public creator channels, video titles, channel bio links, subscriber counts, and cross-platform profile handles.',
    metric: 'Video & Channel Intel',
    status: 'Operational'
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    platformKey: 'Snapchat',
    category: 'Social',
    type: 'Public Profile Discovery',
    extractedData: ['Bitmoji Avatars', 'Public Handles', 'Display Names', 'Story Links'],
    description: 'Discovers public Snapchat handles, Bitmoji avatars, user bio details, and linked social media accounts.',
    metric: 'Social Handle Discovery',
    status: 'Operational'
  },
  {
    id: 'github',
    name: 'GitHub',
    platformKey: 'GitHub',
    category: 'Developer',
    type: 'GitHub REST & GraphQL API',
    extractedData: ['Code Repositories', 'Commit Emails', 'Developer Bio', 'Activity Stream'],
    description: 'Extracts developer profile details, public code commit email addresses, repository stars, forks, and contribution timestamps.',
    metric: 'Developer Profile Intel',
    status: 'Operational'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    platformKey: 'LinkedIn',
    category: 'Social',
    type: 'Professional Network Index',
    extractedData: ['Job Titles', 'Employment History', 'Company Names', 'Locations'],
    description: 'Parses indexed professional profiles, past and current employers, industry sector classifications, and colleague associations.',
    metric: 'Professional Records',
    status: 'Operational'
  },
  {
    id: 'x-twitter',
    name: 'X (Twitter)',
    platformKey: 'X',
    category: 'Social',
    type: 'Social Microblogging Index',
    extractedData: ['Bio Data', 'Profile Handles', 'Verification Status', 'Public Tweets'],
    description: 'Indexes profile handles, account bio descriptions, verified blue checkmark status, and recent public activity.',
    metric: 'Microblogging Profile',
    status: 'Operational'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    platformKey: 'Instagram',
    category: 'Social',
    type: 'Visual Social Media Index',
    extractedData: ['Profile Avatars', 'Bio Links', 'Follower Counts', 'Public Handles'],
    description: 'Cross-checks visual social handles, avatar image URLs, bio web links, and profile verification signals.',
    metric: 'Visual Media Intel',
    status: 'Operational'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    platformKey: 'Facebook',
    category: 'Social',
    type: 'Public Pages & Index',
    extractedData: ['Public Profiles', 'Community Pages', 'Location Records', 'Organizations'],
    description: 'Identifies public Facebook profile IDs, community pages, organization memberships, and geographical check-ins.',
    metric: 'Community & Page Intel',
    status: 'Operational'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    platformKey: 'TikTok',
    category: 'Video',
    type: 'Creator Index',
    extractedData: ['Short Video Bios', 'Creator Handles', 'Engagement Metrics', 'Linked Accounts'],
    description: 'Pulls short-form video creator bios, verified badges, follower metrics, and cross-platform profile links.',
    metric: 'Creator Handle Discovery',
    status: 'Operational'
  },
  {
    id: 'reddit',
    name: 'Reddit',
    platformKey: 'Reddit',
    category: 'Social',
    type: 'Discussion Forum Index',
    extractedData: ['Public Posts', 'Subreddit Activity', 'Karma Points', 'Comment History'],
    description: 'Scans user post histories, community subreddit involvement, karma totals, and publicly exposed username handles.',
    metric: 'Forum Commentary Intel',
    status: 'Operational'
  },
  {
    id: 'telegram-discord',
    name: 'Telegram & Discord',
    platformKey: 'Telegram',
    category: 'Social',
    type: 'Community Chat Index',
    extractedData: ['Public Channels', 'Handle Cross-Checks', 'User Tags', 'Group Invites'],
    description: 'Resolves public broadcast channel handles, Discord user tag patterns, and open group invite links.',
    metric: 'Chat Network Intel',
    status: 'Operational'
  },
  {
    id: 'rss-feeds',
    name: 'RSS & News Feeds',
    platformKey: 'RSS',
    category: 'News',
    type: 'Public Web News & RSS Syndication',
    extractedData: ['News Articles', 'Press Releases', 'Blog Posts', 'Publication Dates'],
    description: 'Monitors international news outlets, RSS syndication feeds, blog postings, and corporate press announcements.',
    metric: 'News & Media Syndication',
    status: 'Operational'
  },
  {
    id: 'domain-whois',
    name: 'Domain & WHOIS Intel',
    platformKey: 'Domain',
    category: 'Domain',
    type: 'DNS & Registrant Lookup',
    extractedData: ['DNS Records', 'WHOIS Contact Info', 'IP Addresses', 'SSL Certificates'],
    description: 'Resolves domain ownership WHOIS records, DNS name servers, IP geolocation data, and SSL certificate SANs.',
    metric: 'Infrastructure Records',
    status: 'Operational'
  }
];

const CATEGORIES = ['All', 'Web Search', 'Knowledge', 'Social', 'Developer', 'Video', 'Domain', 'News'];

export const SourcesPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredSources = selectedCategory === 'All' 
    ? ALL_SOURCES 
    : ALL_SOURCES.filter(s => s.category === selectedCategory);

  return (
    <div className="sources-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sources & Data Providers</h1>
          <p className="page-subtitle">
            All connected OSINT intelligence sources with real-time health indicators and extracted data points
          </p>
        </div>
      </div>

      {/* Bold SerpApi Sponsorship Banner */}
      <div className="serpapi-hero-sponsor-banner">
        <div className="sponsor-banner-left">
          <span className="sponsor-badge-tag">OFFICIAL SEARCH PROVIDER</span>
          <h2 className="sponsor-title">
            Boldly Sponsored & Powered by{' '}
            <a 
              href="https://serpapi.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="serpapi-hero-link"
            >
              SerpApi
            </a>
          </h2>
          <p className="sponsor-desc">
            SerpApi provides high-speed, real-time search engine result scraping and structured JSON extraction across 14 platform categories.
          </p>
        </div>
        <a 
          href="https://serpapi.com/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="sponsor-visit-btn"
        >
          Visit SerpApi Official Site ↗
        </a>
      </div>

      {/* Category Filter Pills */}
      <div className="sources-filter-bar">
        <div className="filter-label">
          <Filter size={14} /> Filter Category:
        </div>
        <div className="filter-pills">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="sources-grid">
        {filteredSources.map((src) => (
          <div key={src.id} className="source-health-card">
            <div className="source-card-top">
              <div className="source-title-group">
                <PlatformIcon platform={src.platformKey} size={22} className="source-brand-icon" />
                <h3 className="source-name">{src.name}</h3>
              </div>
              <span className="status-badge operational">
                <Activity size={10} /> {src.status}
              </span>
            </div>

            <p className="source-type">{src.type}</p>
            <p className="source-description">{src.description}</p>

            <div className="extracted-data-section">
              <span className="extracted-label">Extracted Data Points:</span>
              <div className="data-tags-list">
                {src.extractedData.map(tag => (
                  <span key={tag} className="data-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="source-card-footer">
              <div className="metric">
                <Database className="metric-icon" size={13} />
                <span>{src.metric}</span>
              </div>
              <div className="security-badge">
                <ShieldCheck size={12} /> Live Rate-Limited
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

