import React from 'react';
import {
  Globe, ShieldCheck, Share2, Code, Video, BookOpen, Music, Image, MessageSquare, Terminal, Award
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';

interface PlatformBadgeProps {
  name: string;
  brandColor: string;
  iconSvg?: React.ReactNode;
}

const SourceBadge: React.FC<PlatformBadgeProps> = ({ name, brandColor, iconSvg }) => (
  <div className="source-eco-badge">
    <div className="source-eco-icon-wrap">
      {iconSvg || <PlatformIcon platform={name} size={18} />}
    </div>
    <span className="source-eco-name">{name}</span>
  </div>
);

export const SourceEcosystem: React.FC = () => {
  const categories = [
    {
      title: 'SOCIAL & COMMUNITY',
      items: [
        { name: 'X (Twitter)', color: '#ffffff' },
        { name: 'Instagram', color: '#e1306c' },
        { name: 'Facebook', color: '#1877f2' },
        { name: 'LinkedIn', color: '#0a66c2' },
        { name: 'TikTok', color: '#ff0050' },
        { name: 'Reddit', color: '#ff4500' },
        { name: 'Threads', color: '#ffffff' },
        { name: 'Snapchat', color: '#fffc00' },
        { name: 'Bluesky', color: '#0085ff' },
        { name: 'Mastodon', color: '#6364ff' },
        { name: 'Telegram Public Pages', color: '#26a5e4' },
        { name: 'Tumblr', color: '#36465d' },
      ]
    },
    {
      title: 'PROFESSIONAL & BUSINESS',
      items: [
        { name: 'LinkedIn Profiles', color: '#0a66c2' },
        { name: 'Indeed Resumes', color: '#003a9b' },
        { name: 'Crunchbase', color: '#0288d1' },
        { name: 'Glassdoor', color: '#0caa41' },
      ]
    },
    {
      title: 'DEVELOPER & TECHNICAL',
      items: [
        { name: 'GitHub', color: '#ffffff' },
        { name: 'GitLab', color: '#fc6d26' },
        { name: 'Stack Overflow', color: '#f48024' },
        { name: 'Dev.to', color: '#ffffff' },
        { name: 'Hashnode', color: '#2962ff' },
        { name: 'CodePen', color: '#ffffff' },
      ]
    },
    {
      title: 'VIDEO & STREAMING',
      items: [
        { name: 'YouTube Channels', color: '#ff0000' },
        { name: 'Twitch', color: '#9146ff' },
        { name: 'Vimeo', color: '#1ab7ea' },
        { name: 'Kick', color: '#53fc18' },
        { name: 'Rumble', color: '#85c742' },
        { name: 'Dailymotion', color: '#ffffff' },
      ]
    },
    {
      title: 'PUBLISHING & BLOGS',
      items: [
        { name: 'Medium Articles', color: '#ffffff' },
        { name: 'Substack Newsletters', color: '#ff6719' },
        { name: 'WordPress', color: '#21759b' },
        { name: 'Blogger / Blogspot', color: '#f57c00' },
      ]
    },
    {
      title: 'ACADEMIC & RESEARCH',
      items: [
        { name: 'Google Scholar', color: '#4285f4' },
        { name: 'ResearchGate', color: '#00ccbb' },
        { name: 'Academia.edu', color: '#4285f4' },
        { name: 'ORCID Publications', color: '#a6ce39' },
      ]
    },
    {
      title: 'CREATIVE & PORTFOLIO',
      items: [
        { name: 'Behance Portfolios', color: '#1769ff' },
        { name: 'Dribbble Shots', color: '#ea4c89' },
        { name: 'ArtStation', color: '#13aff0' },
        { name: 'DeviantArt', color: '#05cc47' },
        { name: 'Flickr', color: '#ff0084' },
        { name: '500px', color: '#ffffff' },
      ]
    },
    {
      title: 'MUSIC & AUDIO',
      items: [
        { name: 'Spotify Profiles', color: '#1db954' },
        { name: 'SoundCloud Tracks', color: '#ff5500' },
        { name: 'Bandcamp', color: '#1da0c3' },
        { name: 'Mixcloud', color: '#5000ff' },
      ]
    },
    {
      title: 'WEB & PUBLIC SOURCES',
      items: [
        { name: 'Personal Websites', color: '#a1a1aa' },
        { name: 'News Media Mentions', color: '#a1a1aa' },
        { name: 'Public Indexed PDFs', color: '#ef4444' },
        { name: 'Conference Events', color: '#a1a1aa' },
      ]
    }
  ];

  return (
    <section className="lp-section-wide" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-mid)' }}>
      <div className="lp-container-wide">
        
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div className="lp-badge" style={{ marginBottom: '12px' }}>
            <Globe size={14} />
            <span>Supported Ecosystem Scope</span>
          </div>
          <h2 className="lp-title" style={{ fontSize: '2.25rem', marginBottom: '12px' }}>
            PUBLIC SOURCES & PLATFORMS
          </h2>
          <p className="lp-subtitle" style={{ maxWidth: '820px' }}>
            Search across publicly indexed social, professional, developer, publishing, video, creative, academic, and web sources using the application's configured search infrastructure.
          </p>
        </div>

        {/* Source Categories Editorial Rows (No Boxed Cards) */}
        <div className="source-eco-wrapper">
          {categories.map((cat, idx) => (
            <div key={idx} className="source-eco-row">
              <div className="source-eco-cat-title">{cat.title}</div>
              <div className="source-eco-badges-wrap">
                {cat.items.map((item, i) => (
                  <SourceBadge key={i} name={item.name} brandColor={item.color} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Honest Coverage Disclaimer */}
        <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
            Honest Coverage & Search Limitations:
          </strong>
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', listStyle: 'disc', paddingLeft: '18px' }}>
            <li>The application searches and organizes publicly indexed information from supported platforms and websites.</li>
            <li>Search engines do not index every single profile or web page instantly.</li>
            <li>Some platforms enforce private profile settings or limit public web indexing.</li>
            <li>Password-protected, deleted, or unindexed content is strictly inaccessible.</li>
            <li>Search results fluctuate based on search provider index caches (SerpApi / Google).</li>
          </ul>
        </div>

      </div>
    </section>
  );
};
