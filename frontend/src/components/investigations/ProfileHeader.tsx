import React, { useState } from 'react';
import { 
  MapPin, 
  User, 
  Calendar, 
  Briefcase, 
  Edit, 
  Share2, 
  Download, 
  ShieldCheck, 
  Check, 
  X, 
  Bookmark, 
  RefreshCw,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import type { Investigation } from '../../types/investigation';
import '../../styles/ProfileHeader.css';

interface ProfileHeaderProps {
  investigation: Investigation;
  onUpdateInvestigation?: (updated: Investigation) => void;
  onRescanInvestigation?: () => Promise<void>;
  onSearchDeeper?: () => Promise<void>;
  onBackToSearchResults?: () => void;
  isRescanning?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  investigation,
  onUpdateInvestigation,
  onRescanInvestigation,
  onSearchDeeper,
  onBackToSearchResults,
  isRescanning = false
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const isTracked = investigation.isTracked || false;

  const profile = investigation.targetProfile || {
    initials: 'OS',
    fullName: investigation.name,
    location: 'Not specified',
    gender: 'Unverified',
    age: 'Unverified',
    occupation: 'Public Entity'
  };

  const [editName, setEditName] = useState(profile.fullName);
  const [editLocation, setEditLocation] = useState(profile.location);
  const [editOccupation, setEditOccupation] = useState(profile.occupation);
  const [editSummary, setEditSummary] = useState(investigation.quickSummary);

  const handleToggleTrack = () => {
    if (onUpdateInvestigation) {
      onUpdateInvestigation({
        ...investigation,
        isTracked: !isTracked
      });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(investigation, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `OSINT_${investigation.name.replace(/\s+/g, '_')}_Report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowExportMenu(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = editName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OS';
    const updated: Investigation = {
      ...investigation,
      name: editName,
      quickSummary: editSummary,
      targetProfile: {
        ...profile,
        initials,
        fullName: editName,
        location: editLocation,
        occupation: editOccupation
      }
    };
    if (onUpdateInvestigation) onUpdateInvestigation(updated);
    setShowEditModal(false);
  };

  return (
    <div className="profile-header-container">
      <div className="header-top-bar">
        {onBackToSearchResults ? (
          <button type="button" className="back-results-btn" onClick={onBackToSearchResults}>
            <ArrowLeft size={14} /> Back to Search Results
          </button>
        ) : (
          <div className="breadcrumb">
            <span>Investigations</span>
            <span className="separator">/</span>
            <span className="current">{investigation.name}</span>
          </div>
        )}
        
        <div className="action-buttons">
          {/* Track Person Toggle */}
          <button 
            type="button" 
            className={`action-btn track-btn ${isTracked ? 'active-tracked' : ''}`}
            onClick={handleToggleTrack}
          >
            <Bookmark size={14} /> {isTracked ? 'Tracked Person ✓' : 'Track Person'}
          </button>

          {/* Rescan Investigation */}
          {onRescanInvestigation && (
            <button 
              type="button" 
              className="action-btn rescan-btn" 
              onClick={onRescanInvestigation}
              disabled={isRescanning}
            >
              {isRescanning ? (
                <><Loader2 size={14} className="spinning" /> Rescanning...</>
              ) : (
                <><RefreshCw size={14} /> Refresh / Rescan</>
              )}
            </button>
          )}

          {/* Search Deeper Button */}
          {onSearchDeeper && (
            <button 
              type="button" 
              className="action-btn search-deeper-btn" 
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.18)',
                color: '#60a5fa',
                borderColor: '#3b82f6',
                fontWeight: 600
              }}
              onClick={onSearchDeeper}
              disabled={isRescanning}
            >
              {isRescanning ? (
                <><Loader2 size={14} className="spinning" /> Searching Deeper...</>
              ) : (
                <><RefreshCw size={14} /> Search Deeper</>
              )}
            </button>
          )}

          <button className="action-btn" onClick={() => setShowEditModal(true)}>
            <Edit size={14} /> Edit Target
          </button>

          <button className="action-btn" onClick={handleShare}>
            {copiedShare ? <><Check size={14} className="text-green" /> Link Copied</> : <><Share2 size={14} /> Share</>}
          </button>

          <div className="export-dropdown-wrap">
            <button className="action-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Download size={14} /> Export Report
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={handleExportJSON}>Export JSON Record</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-hero-card">
        <div className="hero-left">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName} className="profile-avatar-badge-img" />
          ) : (
            <div className="profile-avatar-badge">{profile.initials}</div>
          )}

          <div className="profile-info">
            <div className="name-confidence-row">
              <h1 className="profile-name">{profile.fullName}</h1>
              <div className={`confidence-badge ${investigation.confidenceLevel ? investigation.confidenceLevel.toLowerCase() : 'high'}`}>
                <ShieldCheck size={14} />
                <span>{investigation.confidenceLevel || 'High'} Confidence</span>
                <span className="confidence-score">{investigation.overallConfidence || 92}%</span>
              </div>
            </div>

            <p className="profile-subtitle">Public Role: {profile.occupation}</p>

            <div className="profile-tags-bar">
              <div className="tag-item">
                <MapPin size={14} className="tag-icon" />
                <span>{profile.location}</span>
              </div>
              <div className="tag-item">
                <Briefcase size={14} className="tag-icon" />
                <span>{profile.occupation}</span>
              </div>
              {investigation.lastSearched && (
                <div className="tag-item">
                  <Calendar size={14} className="tag-icon" />
                  <span>Scanned: {new Date(investigation.lastSearched).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="quick-summary-box">
          <h4 className="summary-title">Person Summary</h4>
          <p className="summary-text">
            {investigation.quickSummary || `${profile.fullName} is documented in public intelligence sources.`}
          </p>
        </div>
      </div>

      {/* Edit Modal Dialog */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Edit Investigation Target Info</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="form-input" 
                  placeholder="Enter full name"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input 
                  type="text" 
                  value={editLocation} 
                  onChange={(e) => setEditLocation(e.target.value)} 
                  className="form-input"
                  placeholder="e.g. Accra, Ghana" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Occupation / Public Role</label>
                <input 
                  type="text" 
                  value={editOccupation} 
                  onChange={(e) => setEditOccupation(e.target.value)} 
                  className="form-input"
                  placeholder="e.g. Software Developer" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Person Summary</label>
                <textarea 
                  value={editSummary} 
                  onChange={(e) => setEditSummary(e.target.value)} 
                  className="form-input textarea" 
                  rows={3}
                  placeholder="Brief person summary…"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="save-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
