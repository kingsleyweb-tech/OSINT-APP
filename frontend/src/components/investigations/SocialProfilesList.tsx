import React, { useState } from 'react';
import { 
  Code, 
  Globe, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Search, 
  BookOpen, 
  Video, 
  Share2, 
  MessageSquare, 
  UserCheck 
} from 'lucide-react';
import { PlatformIcon } from '../ui/PlatformIcon';
import type { SocialProfile } from '../../types/investigation';
import { ProfileDetailModal } from './ProfileDetailModal';
import '../../styles/SocialProfilesList.css';

interface SocialProfilesListProps {
  profiles: SocialProfile[];
  onViewAll?: () => void;
  compact?: boolean;
}

export const SocialProfilesList: React.FC<SocialProfilesListProps> = ({ 
  profiles,
  onViewAll,
  compact = false
}) => {
  const [selectedProfile, setSelectedProfile] = useState<SocialProfile | null>(null);

  // If compact mode, display only verified profiles with View All link
  if (compact || onViewAll) {
    const discoveredProfiles = profiles.filter(p => p.username);
    const displayProfiles = discoveredProfiles.slice(0, 4);

    return (
      <div className="social-profiles-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 className="panel-title">Key Discovered Profiles</h4>
          {onViewAll && (
            <button 
              className="view-more-btn" 
              onClick={onViewAll}
              style={{ background: 'none', border: 'none', color: 'var(--accent-warm)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              View All ({profiles.length}) &rarr;
            </button>
          )}
        </div>

        <div className="profiles-list">
          {displayProfiles.length === 0 ? (
            <div style={{ padding: '16px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              No public platform profiles verified for this entity.
            </div>
          ) : (
            displayProfiles.map((p, idx) => (
              <div 
                key={idx} 
                className="profile-item-row found"
                onClick={() => setSelectedProfile(p)}
                style={{ cursor: 'pointer' }}
              >
                <div className="platform-icon-badge">
                  <PlatformIcon platform={p.platform} size={18} />
                </div>
                <div className="profile-details">
                  <div className="platform-name">{p.platform}</div>
                  <div className="handle-text">@{p.username}</div>
                </div>
                <div className="profile-row-right">
                  <div className={`confidence-pill ${p.confidenceLevel ? p.confidenceLevel.toLowerCase() : 'high'}`}>
                    <CheckCircle2 size={12} />
                    <span className="conf-label">Verified ({p.confidence}%)</span>
                  </div>
                  <Eye size={14} className="inspect-icon" />
                </div>
              </div>
            ))
          )}
        </div>

        <ProfileDetailModal 
          profile={selectedProfile} 
          onClose={() => setSelectedProfile(null)} 
        />
      </div>
    );
  }

  // List of all supported search platform checks (Wikipedia, Google Search, Facebook, YouTube, GitHub, etc.)
  const ALL_PLATFORMS = [
    { name: 'Google / Web Engine', key: 'google', category: 'Web Search' },
    { name: 'Wikipedia', key: 'wikipedia', category: 'Knowledge' },
    { name: 'Facebook', key: 'facebook', category: 'Social' },
    { name: 'YouTube', key: 'youtube', category: 'Video' },
    { name: 'GitHub', key: 'github', category: 'Developer' },
    { name: 'Instagram', key: 'instagram', category: 'Social' },
    { name: 'TikTok', key: 'tiktok', category: 'Social' },
    { name: 'Reddit', key: 'reddit', category: 'Communities' },
    { name: 'X (Twitter)', key: 'twitter', category: 'Social' },
    { name: 'LinkedIn', key: 'linkedin', category: 'Social' },
    { name: 'Dev.to', key: 'devto', category: 'Developer' },
    { name: 'Gravatar', key: 'gravatar', category: 'Social' },
    { name: 'Docker Hub', key: 'dockerhub', category: 'Developer' },
    { name: 'NPM Registry', key: 'npm', category: 'Developer' },
    { name: 'Mastodon', key: 'mastodon', category: 'Social' },
    { name: 'Bluesky', key: 'bluesky', category: 'Social' },
    { name: 'Twitch', key: 'twitch', category: 'Video' },
    { name: 'Vimeo', key: 'vimeo', category: 'Video' },
    { name: 'Medium', key: 'medium', category: 'Publishing' },
    { name: 'Telegram', key: 'telegram', category: 'Communities' }
  ];

  const getMatchedProfile = (platformName: string, platformKey: string): SocialProfile | undefined => {
    return profiles.find(p => {
      const pLower = p.platform.toLowerCase();
      const nameLower = platformName.toLowerCase();
      const keyLower = platformKey.toLowerCase();
      return pLower.includes(nameLower) || pLower.includes(keyLower) || (p.url && p.url.toLowerCase().includes(keyLower));
    });
  };

  const renderIcon = (platformName: string) => {
    const lower = platformName.toLowerCase();
    if (lower.includes('google')) return <Search size={18} className="profile-brand-icon globe" style={{ color: '#4285F4' }} />;
    if (lower.includes('wikipedia')) return <BookOpen size={18} className="profile-brand-icon globe" style={{ color: '#00e5ff' }} />;
    if (lower.includes('facebook')) return <span className="brand-letter facebook" style={{ color: '#1877F2', fontWeight: 800 }}>f</span>;
    if (lower.includes('youtube')) return <Video size={18} className="profile-brand-icon globe" style={{ color: '#FF0000' }} />;
    if (lower.includes('github')) return <Code size={18} className="profile-brand-icon github" />;
    if (lower.includes('twitter') || lower.includes('x')) return <span className="brand-letter x">X</span>;
    if (lower.includes('linkedin')) return <span className="brand-letter linkedin">in</span>;
    if (lower.includes('reddit') || lower.includes('telegram') || lower.includes('medium')) return <MessageSquare size={18} className="profile-brand-icon globe" />;
    if (lower.includes('instagram') || lower.includes('tiktok') || lower.includes('mastodon') || lower.includes('bluesky')) return <Share2 size={18} className="profile-brand-icon globe" />;
    return <Globe size={18} className="profile-brand-icon globe" />;
  };

  // Extra profiles found that aren't in standard list
  const matchedStandardUrls = new Set<string>();
  ALL_PLATFORMS.forEach(p => {
    const match = getMatchedProfile(p.name, p.key);
    if (match) matchedStandardUrls.add(match.url);
  });

  const customDiscoveredProfiles = profiles.filter(p => !matchedStandardUrls.has(p.url));

  return (
    <div className="social-profiles-panel">
      <div className="panel-header">
        <h4 className="panel-title">Search Platform Verification & Discovered Profiles</h4>
        <span className="panel-count-badge">
          {profiles.length} Verified Discovered / {ALL_PLATFORMS.length} Platforms Checked
        </span>
      </div>

      <div className="profiles-list">
        {/* Render standard platform check list */}
        {ALL_PLATFORMS.map((platform, idx) => {
          const matched = getMatchedProfile(platform.name, platform.key);

          if (matched) {
            const isStrongMatch = matched.confidence >= 80;
            const statusText = isStrongMatch 
              ? `Verified Match (${matched.confidence}%)` 
              : `Possible Match (${matched.confidence}%)`;

            return (
              <div 
                key={idx} 
                className="profile-item-row found"
                onClick={() => setSelectedProfile(matched)}
                title="Public Profile Discovered - Click to Inspect"
              >
                <div className="platform-icon-badge">
                  <PlatformIcon platform={platform.name} size={18} />
                </div>
                <div className="profile-details">
                  <div className="platform-name">{matched.platform}</div>
                  <div className="handle-text">@{matched.username}</div>
                </div>
                <div className="profile-row-right">
                  <div className={`confidence-pill ${matched.confidenceLevel ? matched.confidenceLevel.toLowerCase() : 'high'}`}>
                    <CheckCircle2 size={12} />
                    <span className="conf-label">{statusText}</span>
                  </div>
                  <Eye size={14} className="inspect-icon" />
                </div>
              </div>
            );
          } else {
            return (
              <div key={idx} className="profile-item-row not-found">
                <div className="platform-icon-badge muted">
                  <PlatformIcon platform={platform.name} size={18} />
                </div>
                <div className="profile-details">
                  <div className="platform-name muted">{platform.name}</div>
                  <div className="handle-text muted">No public profile verified</div>
                </div>
                <div className="profile-row-right">
                  <div className="confidence-pill not-found">
                    <XCircle size={12} />
                    <span className="conf-label">No Match Found</span>
                  </div>
                </div>
              </div>
            );
          }
        })}

        {/* Custom additional discovered profiles */}
        {customDiscoveredProfiles.map((custom, idx) => (
          <div 
            key={`custom-${idx}`} 
            className="profile-item-row found"
            onClick={() => setSelectedProfile(custom)}
          >
            <div className="platform-icon-badge">
              <UserCheck size={18} className="profile-brand-icon globe" style={{ color: '#00e5ff' }} />
            </div>
            <div className="profile-details">
              <div className="platform-name">{custom.platform}</div>
              <div className="handle-text">@{custom.username}</div>
            </div>
            <div className="profile-row-right">
              <div className="confidence-pill high">
                <CheckCircle2 size={12} />
                <span className="conf-label">Verified Finding ({custom.confidence}%)</span>
              </div>
              <Eye size={14} className="inspect-icon" />
            </div>
          </div>
        ))}
      </div>

      {/* Profile Detail Intelligence Inspector Modal */}
      <ProfileDetailModal 
        profile={selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
      />
    </div>
  );
};
