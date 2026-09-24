import React from 'react';
import { X, ExternalLink, Code, Globe, Calendar, MapPin, Building, ShieldCheck, User, CheckCircle2 } from 'lucide-react';
import type { SocialProfile } from '../../types/investigation';
import '../../styles/ProfileDetailModal.css';

interface ProfileDetailModalProps {
  profile: SocialProfile | null;
  onClose: () => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({ profile, onClose }) => {
  if (!profile) return null;

  const metadata = (profile as any).metadata || {};
  const matchReasons = profile.matchReason || [`Verified profile match on ${profile.platform}`];
  const handle = profile.username ? profile.username.replace(/^@+/, '') : '';
  const canonicalUrl = profile.canonicalUrl || profile.url || '';

  const openUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canonicalUrl) return;
    const targetUrl = canonicalUrl.startsWith('http') ? canonicalUrl : `https://${canonicalUrl}`;
    if (targetUrl.includes('google.com/url') || targetUrl.includes('serpapi.com')) {
      alert('This profile URL could not be resolved to a direct external profile.');
      return;
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-detail-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <span className="platform-tag">{profile.platform} Intelligence</span>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="profile-detail-hero">
          {profile.avatarUrl || metadata.avatarUrl || metadata.profileImage ? (
            <img 
              src={profile.avatarUrl || metadata.avatarUrl || metadata.profileImage} 
              alt={handle} 
              className="hero-avatar-img"
            />
          ) : (
            <div className="hero-avatar-fallback">
              <User size={32} />
            </div>
          )}

          <div className="hero-meta">
            <h2 className="hero-username">@{handle}</h2>
            <div className={`confidence-chip ${profile.confidenceLevel ? profile.confidenceLevel.toLowerCase() : 'high'}`}>
              <ShieldCheck size={14} />
              <span>{profile.confidenceLabel || `${profile.confidence}% Match`}</span>
            </div>
          </div>
        </div>

        <div className="profile-detail-body">
          {metadata.bio || profile.bio ? (
            <div className="detail-section">
              <h4 className="detail-label">Bio / Overview</h4>
              <p className="detail-text">{metadata.bio || profile.bio}</p>
            </div>
          ) : null}

          {/* Evidence Signals / Why This Result */}
          <div className="detail-section">
            <h4 className="detail-label">Evidence Signals & Verification</h4>
            <ul className="modal-evidence-list" style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
              {matchReasons.map((reason, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', marginBottom: '4px' }}>
                  <CheckCircle2 size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="stats-grid">
            {metadata.publicRepos !== undefined && (
              <div className="stat-box">
                <Code size={16} className="stat-icon" />
                <span className="stat-num">{metadata.publicRepos}</span>
                <span className="stat-name">Public Repos</span>
              </div>
            )}

            {metadata.followers !== undefined && (
              <div className="stat-box">
                <User size={16} className="stat-icon" />
                <span className="stat-num">{metadata.followers}</span>
                <span className="stat-name">Followers</span>
              </div>
            )}

            {metadata.createdAt && (
              <div className="stat-box">
                <Calendar size={16} className="stat-icon" />
                <span className="stat-num">{new Date(metadata.createdAt).getFullYear()}</span>
                <span className="stat-name">Member Since</span>
              </div>
            )}
          </div>

          <div className="info-list-group">
            {profile.source && (
              <div className="info-item">
                <Globe size={14} className="item-icon" />
                <span>Discovery Source: <strong>{profile.source}</strong></span>
              </div>
            )}

            {metadata.company && (
              <div className="info-item">
                <Building size={14} className="item-icon" />
                <span>Organization: <strong>{metadata.company}</strong></span>
              </div>
            )}

            {metadata.location && (
              <div className="info-item">
                <MapPin size={14} className="item-icon" />
                <span>Location: <strong>{metadata.location}</strong></span>
              </div>
            )}

            {metadata.blog && (
              <div className="info-item">
                <Globe size={14} className="item-icon" />
                <span>Website: <a href={metadata.blog.startsWith('http') ? metadata.blog : `https://${metadata.blog}`} target="_blank" rel="noreferrer" className="text-cyan">{metadata.blog}</a></span>
              </div>
            )}
          </div>
        </div>

        <div className="profile-modal-footer">
          <button 
            className="open-source-btn"
            onClick={openUrl}
          >
            <span>Open Verified Source Profile</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
