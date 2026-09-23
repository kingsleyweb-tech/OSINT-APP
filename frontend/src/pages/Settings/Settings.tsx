import React, { useState, useEffect } from 'react';
import { User, Shield, Moon, Sun, CheckCircle, Database, Lock, Loader2 } from 'lucide-react';
import '../../styles/Settings.css';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { auth } from '../../firebase/config';
import { updateProfile } from 'firebase/auth';
import { updateUserProfileInDb } from '../../firebase/firestore';

interface SettingsPageProps {
  currentUser?: {
    uid: string;
    displayName?: string;
    email?: string;
  };
  onUpdateUser?: (updatedName: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onUpdateUser }) => {
  const { theme, setTheme } = useTheme();
  const { success, error: toastError } = useToast();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.displayName) setDisplayName(currentUser.displayName);
      if (currentUser.email) setEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toastError('Invalid Name', 'Display name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      // 1. Update Firebase Auth Profile if authenticated
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }

      // 2. Update Firestore User Document
      if (currentUser?.uid && currentUser.uid !== 'demo-user') {
        await updateUserProfileInDb(currentUser.uid, { displayName: displayName.trim() });
      }

      // 3. Update React App State
      if (onUpdateUser) {
        onUpdateUser(displayName.trim());
      }

      setSavedSuccess(true);
      success('Profile Saved', `Display name updated to "${displayName.trim()}".`);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toastError('Update Failed', err.message || 'Could not update profile in database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings & Preferences</h1>
          <p className="page-subtitle">Manage your personal profile, appearance, and account preferences</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Card 1: User Profile Settings */}
        <div className="settings-card">
          <div className="card-title-row">
            <User className="card-icon" size={18} />
            <h2 className="card-title">User Profile</h2>
          </div>
          <form className="settings-form" onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input disabled" 
                value={email}
                disabled
              />
              <span className="form-hint">Email address is associated with your authenticated session.</span>
            </div>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : savedSuccess ? (
                'Saved!'
              ) : (
                'Save Profile'
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Appearance & Theme Toggle */}
        <div className="settings-card">
          <div className="card-title-row">
            {theme === 'dark' ? <Moon className="card-icon" size={18} /> : <Sun className="card-icon" size={18} />}
            <h2 className="card-title">Appearance & Theme</h2>
          </div>
          <p className="card-description">Choose how the OSINT Intelligence platform looks to you.</p>
          <div className="theme-options-grid">
            <div 
              className={`theme-option-card ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <div className="theme-preview dark-preview">
                <div className="tp-header" />
                <div className="tp-body" />
              </div>
              <div className="theme-option-label">
                <Moon size={14} />
                <span>Dark Mode</span>
              </div>
            </div>

            <div 
              className={`theme-option-card ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <div className="theme-preview light-preview">
                <div className="tp-header" />
                <div className="tp-body" />
              </div>
              <div className="theme-option-label">
                <Sun size={14} />
                <span>Light Mode (White)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Data Security & Storage Isolation */}
        <div className="settings-card">
          <div className="card-title-row">
            <Database className="card-icon" size={18} />
            <h2 className="card-title">Data Storage & Security</h2>
          </div>
          <div className="security-info-box">
            <div className="sec-item">
              <Lock size={16} className="sec-icon" />
              <div>
                <strong>Firestore Account Isolation</strong>
                <p>Your search queries, saved notes, and target profiles are isolated and protected under your authenticated account session.</p>
              </div>
            </div>
            <div className="sec-item">
              <CheckCircle size={16} className="sec-icon green" />
              <div>
                <strong>Server-Side Secret Protection</strong>
                <p>API keys and search provider credentials are managed securely on the server environment. No secrets are stored or exposed in client browsers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Platform Connected Data Sources */}
        <div className="settings-card">
          <div className="card-title-row">
            <Shield className="card-icon" size={18} />
            <h2 className="card-title">Connected Data Sources</h2>
          </div>
          <div className="status-items-list">
            {[
              { label: 'Google Public Search Engine', provider: 'SerpApi', status: 'Connected & Operational' },
              { label: 'GitHub Intelligence & Code Repos', provider: 'REST API', status: 'Connected & Operational' },
              { label: 'Wikipedia Knowledge Base', provider: 'MediaWiki API', status: 'Connected & Operational' },
              { label: 'Open-Source RSS Feeds & News', provider: 'Feed Aggregator', status: 'Connected & Operational' },
            ].map(item => (
              <div key={item.label} className="status-item-row">
                <div className="status-item-info">
                  <span className="status-label">{item.label}</span>
                  <span className="status-sub">{item.provider}</span>
                </div>
                <span className="status-pill active">
                  <CheckCircle size={12} /> {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
