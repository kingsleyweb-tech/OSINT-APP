import React, { useState } from 'react';
import type { Investigation, SocialProfile } from '../../../types/investigation';
import { 
  Share2, 
  Code, 
  Video, 
  UserCheck, 
  CheckCircle2, 
  Eye, 
  ExternalLink,
  Filter,
  Info,
  Globe
} from 'lucide-react';
import { ProfileDetailModal } from '../ProfileDetailModal';
import { PlatformIcon } from '../../ui/PlatformIcon';
import '../../../styles/ProfilesTab.css';

interface ProfilesTabProps {
  investigation: Investigation;
}

export const ProfilesTab: React.FC<ProfilesTabProps> = ({ investigation }) => {
  const [selectedProfile, setSelectedProfile] = useState<SocialProfile | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [expandedWhy, setExpandedWhy] = useState<Record<number, boolean>>({});

  const profiles = investigation.socialProfiles || [];

  const categories = [
    { title: 'Social Media', key: 'Social', icon: <Share2 size={16} /> },
    { title: 'Professional Profiles', key: 'Professional', icon: <UserCheck size={16} /> },
    { title: 'Developer & Code Platforms', key: 'Developer', icon: <Code size={16} /> },
    { title: 'Video & Streaming', key: 'Video & Streaming', icon: <Video size={16} /> }
  ];

  const getProfilesByCategory = (catKey: string) => {
    return profiles.filter(p => {
      const cat = (p as any).category || 'Social';
      return cat === catKey || (catKey === 'Social' && cat !== 'Professional' && cat !== 'Developer' && cat !== 'Video & Streaming');
    });
  };

  const filteredProfiles = filterCategory === 'All' 
    ? profiles 
    : getProfilesByCategory(filterCategory);

  const toggleWhy = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedWhy(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const openProfileUrl = (url?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!url) return;
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    if (targetUrl.includes('google.com/url') || targetUrl.includes('serpapi.com')) {
      alert('This profile URL could not be resolved to a direct external profile.');
      return;
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const renderProfileCard = (p: SocialProfile, idx: number) => {
    const handle = p.username ? p.username.replace(/^@+/, '') : '';
    const matchReasons = p.matchReason || [`Verified profile match on ${p.platform}`];
    const isWhyOpen = expandedWhy[idx];

    return (
      <div 
        key={idx} 
        className="profile-box-card"
        onClick={() => setSelectedProfile(p)}
      >
        <div className="box-card-top">
          <div className="platform-tag-pill-wrap">
            <PlatformIcon platform={p.platform} size={16} />
            <span className="platform-tag-pill">{p.platform}</span>
          </div>
          <div className={`conf-chip ${p.confidenceLevel ? p.confidenceLevel.toLowerCase() : 'high'}`}>
            <CheckCircle2 size={12} /> {p.confidenceLabel || `${p.confidence}% Match`}
          </div>
        </div>

        <div className="box-card-middle">
          <div className="handle-name">@{handle}</div>
          {p.bio && <p className="bio-snippet">{p.bio}</p>}

          {/* Source attribution */}
          {p.source && (
            <div className="source-attribution">
              <Globe size={11} /> <span>Source: {p.source}</span>
            </div>
          )}

          {/* Why this result / evidence section */}
          <div className="why-result-box">
            <button className="why-toggle-btn" onClick={(e) => toggleWhy(idx, e)}>
              <Info size={12} />
              <span>Why this result? {isWhyOpen ? '▲' : '▼'}</span>
            </button>
            {isWhyOpen && (
              <ul className="why-reasons-list">
                {matchReasons.map((reason, rIdx) => (
                  <li key={rIdx}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="box-card-bottom">
          <button 
            className="view-link-btn"
            onClick={(e) => openProfileUrl(p.canonicalUrl || p.url, e)}
          >
            Visit Profile <ExternalLink size={12} />
          </button>
          <button className="inspect-btn" onClick={() => setSelectedProfile(p)}>
            <Eye size={14} /> Inspect
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="profiles-tab-pane">
      <div className="tab-pane-header">
        <div>
          <h3 className="pane-title">Verified Profiles & Handle Intelligence</h3>
          <p className="pane-sub">Authentic public profiles discovered directly from search engine index results.</p>
        </div>
        <div className="count-badge-cyan">
          {profiles.length} Profiles Discovered
        </div>
      </div>

      {/* Platform Filter Selector */}
      {profiles.length > 0 && (
        <div className="platform-filter-bar">
          <span className="filter-label"><Filter size={13} /> Filter Category:</span>
          {['All', 'Social', 'Professional', 'Developer', 'Video & Streaming'].map(c => (
            <button 
              key={c} 
              className={`platform-filter-btn ${filterCategory === c ? 'active' : ''}`}
              onClick={() => setFilterCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="empty-pane-box">
          No public profiles verified for this investigation.
        </div>
      ) : filterCategory !== 'All' ? (
        <div className="cat-profiles-grid">
          {filteredProfiles.map((p, idx) => renderProfileCard(p, idx))}
        </div>
      ) : (
        <div className="category-groups-list">
          {categories.map(cat => {
            const catProfiles = getProfilesByCategory(cat.key);
            if (catProfiles.length === 0) return null;

            return (
              <div key={cat.key} className="profile-cat-card">
                <div className="cat-card-header">
                  {cat.icon}
                  <h4 className="cat-card-title">{cat.title} ({catProfiles.length})</h4>
                </div>

                <div className="cat-profiles-grid">
                  {catProfiles.map((p, idx) => renderProfileCard(p, idx))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProfileDetailModal 
        profile={selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
      />
    </div>
  );
};
