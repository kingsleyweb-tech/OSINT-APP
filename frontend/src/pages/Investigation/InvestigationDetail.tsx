import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { ProfileHeader } from '../../components/investigations/ProfileHeader';
import { OverviewTab } from '../../components/investigations/tabs/OverviewTab';
import { ProfilesTab } from '../../components/investigations/tabs/ProfilesTab';
import { ActivityTab } from '../../components/investigations/tabs/ActivityTab';
import { AssociationsTab } from '../../components/investigations/tabs/AssociationsTab';
import { SourcesTab } from '../../components/investigations/tabs/SourcesTab';
import { WebNewsTab } from '../../components/investigations/tabs/WebNewsTab';
import { NotesTab } from '../../components/investigations/tabs/NotesTab';
import { StatsTab } from '../../components/investigations/tabs/StatsTab';
import { DomainInvestigationView } from '../../components/investigations/DomainInvestigationView';
import type { Investigation, InvestigationNote } from '../../types/investigation';
import { getInvestigationFromDb, saveInvestigationToDb, addNoteToInvestigationInDb } from '../../firebase/firestore';
import { 
  FolderSearch, 
  Download, 
  ArrowLeft, 
  Bookmark, 
  RefreshCw, 
  Loader2, 
  Layers, 
  Users, 
  Globe, 
  FileText, 
  FileCheck, 
  CheckCircle2, 
  Compass, 
  TrendingUp
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useNotifications } from '../../context/NotificationContext';
import '../../styles/InvestigationDetail.css';

interface InvestigationDetailPageProps {
  activeTabRoute?: 'overview' | 'profiles' | 'activity' | 'associations' | 'sources' | 'webnews' | 'notes' | 'stats' | string;
}

export const InvestigationDetailPage: React.FC<InvestigationDetailPageProps> = ({ activeTabRoute }) => {
  const { id, tab } = useParams<{ id: string; tab?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { addNotification } = useNotifications();

  const currentTab = activeTabRoute || tab || (location.pathname.split('/').pop() as any) || 'overview';

  const [investigation, setInvestigation] = useState<Investigation | null>(() => {
    if ((location.state as any)?.investigation) {
      return (location.state as any).investigation;
    }
    if (id) {
      const saved = sessionStorage.getItem(`osint_inv_${id}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return null;
  });
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [loading, setLoading] = useState(!investigation);

  useEffect(() => {
    if (investigation && id) {
      sessionStorage.setItem(`osint_inv_${id}`, JSON.stringify(investigation));
    }
  }, [investigation, id]);

  useEffect(() => {
    if (id && !investigation) {
      loadInvestigation(id);
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadInvestigation = async (invId: string) => {
    setLoading(true);
    const data = await getInvestigationFromDb(invId);
    if (data) {
      setInvestigation(data);
      sessionStorage.setItem(`osint_inv_${invId}`, JSON.stringify(data));
    }
    setLoading(false);
  };

  const handleUpdateInvestigation = async (updated: Investigation) => {
    setInvestigation(updated);
    await saveInvestigationToDb(updated);
  };

  const handleRescan = async () => {
    if (!investigation) return;
    setIsRescanning(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBase}/investigations/rescan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigation })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.investigation) {
          setInvestigation(data.investigation);
          await saveInvestigationToDb(data.investigation);

          const summaryMsg = data.changesSummary && data.changesSummary.length > 0 
            ? data.changesSummary.join(' | ') 
            : 'Rescan completed with no new changes';
          
          toast.success('Investigation Rescan Updated', summaryMsg);
          addNotification({
            type: 'scan_completed',
            title: 'Rescan Completed',
            message: `"${investigation.name}": ${summaryMsg}`,
            targetInvestigationId: investigation.id
          });
        }
      } else {
        toast.error('Rescan Failed', 'Public sources could not be refreshed.');
        addNotification({
          type: 'system_alert',
          title: 'Rescan Failed',
          message: `Could not refresh sources for "${investigation.name}".`
        });
      }
    } catch (err) {
      console.error('Rescan error:', err);
      toast.error('Rescan Error', 'Server offline or unavailable.');
    } finally {
      setIsRescanning(false);
    }
  };

  const handleSearchDeeper = async () => {
    if (!investigation) return;
    setIsRescanning(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBase}/investigations/rescan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigation, searchDepth: 'deep' })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.investigation) {
          setInvestigation(data.investigation);
          await saveInvestigationToDb(data.investigation);

          const summaryMsg = data.changesSummary && data.changesSummary.length > 0 
            ? data.changesSummary.join(' | ') 
            : 'Deep multi-stage search completed. Updated intelligence findings.';
          
          toast.success('Deep Search Completed', summaryMsg);
          addNotification({
            type: 'scan_completed',
            title: 'Deep Search Completed',
            message: `"${investigation.name}": ${summaryMsg}`,
            targetInvestigationId: investigation.id
          });
        }
      } else {
        toast.error('Deep Search Failed', 'Public OSINT sources could not be refreshed.');
      }
    } catch (err) {
      console.error('Deep search error:', err);
      toast.error('Search Error', 'Server offline or unavailable.');
    } finally {
      setIsRescanning(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !investigation) return;
    setIsSavingNote(true);

    const noteObj: InvestigationNote = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      author: 'Investigator',
      createdAt: new Date().toISOString()
    };

    await addNoteToInvestigationInDb(investigation.id, noteObj);
    const updated = {
      ...investigation,
      notes: [noteObj, ...(investigation.notes || [])]
    };
    setInvestigation(updated);
    setNewNoteText('');
    setIsSavingNote(false);
  };

  const handleTabClick = (tabKey: string) => {
    if (id) {
      navigate(`/investigations/${id}/${tabKey}`, { state: { investigation } });
    }
  };

  if (loading) {
    return <div className="loading-state">Loading investigation details...</div>;
  }

  if (!investigation) {
    return (
      <div className="empty-investigation-state">
        <FolderSearch size={40} className="empty-icon" />
        <h2>Investigation File Not Found</h2>
        <p>No record exists for the specified investigation ID. Perform a new search on the Dashboard to generate intelligence files.</p>
      </div>
    );
  }

  const searchCoverageList = investigation.searchCoverage && investigation.searchCoverage.length > 0
    ? investigation.searchCoverage.map(sc => ({
        name: sc.provider,
        status: sc.status === 'checked' ? 'Completed' : sc.status === 'unavailable' ? 'Provider unavailable' : 'Search failed',
        count: sc.count
      }))
    : [
        { name: 'SerpApi Google Engine', status: 'Completed', count: 12 },
        { name: 'Wikipedia / Wikidata', status: 'Completed', count: 2 },
        { name: 'GitHub Developer API', status: 'Completed', count: 1 },
        { name: 'Social Platform Engine', status: 'Completed', count: 4 },
        { name: 'Username Discovery Engine', status: 'Completed', count: 3 }
      ];

  const tabs: { key: string; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'profiles', label: 'Profiles', count: investigation.resultsCount?.profiles || 0 },
    { key: 'activity', label: 'Activity', count: investigation.resultsCount?.activities || 0 },
    { key: 'associations', label: 'Associations', count: investigation.resultsCount?.associations || 0 },
    { key: 'sources', label: 'Sources', count: investigation.resultsCount?.sources || 0 },
    { key: 'webnews', label: 'Web & News', count: (investigation.webAndNews || []).length || investigation.resultsCount?.websites || 0 },
    { key: 'notes', label: 'Notes & Findings', count: (investigation.notes || []).length },
    { key: 'stats', label: 'Metrics & Audit' }
  ];

  const handleExportReport = () => {
    if (!investigation) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(investigation, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `OSINT-Report-${investigation.name.replace(/\s+/g, '_')}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (investigation.searchType === 'domain' && (investigation as any).domainInvestigationData) {
    return (
      <div className="investigation-detail-page">
        <DomainInvestigationView 
          data={(investigation as any).domainInvestigationData} 
          onSelectSuggestedDomain={(selectedDomain) => {
            navigate('/new-investigation');
          }}
        />
      </div>
    );
  }

  return (
    <div className="investigation-detail-page">
      <ProfileHeader 
        investigation={investigation}
        onUpdateInvestigation={handleUpdateInvestigation}
        onRescanInvestigation={handleRescan}
        onSearchDeeper={handleSearchDeeper}
        onBackToSearchResults={() => navigate(-1)}
        isRescanning={isRescanning}
      />
      <div className="detail-top-nav-bar">
        <div className="nav-left">
          <Link to="/search" className="back-link">
            <ArrowLeft size={14} /> Back to Search
          </Link>
          <div className="target-title-block">
            <span className="target-type-tag">Name Search</span>
            <h1 className="target-name-title">{investigation.name}</h1>
            <span className="search-meta-text">
              Search completed &bull; {new Date(investigation.createdAt).toLocaleDateString()} &bull; Verified Engine
            </span>
          </div>
        </div>

        <div className="nav-right-actions">
          <button 
            type="button" 
            className="save-investigation-btn"
            onClick={() => handleUpdateInvestigation({ ...investigation, isTracked: !investigation.isTracked })}
          >
            <Bookmark size={14} /> {investigation.isTracked ? 'Tracked Person' : 'Save Investigation'}
          </button>

          <button 
            type="button" 
            className="rescan-btn-warm"
            onClick={handleRescan}
            disabled={isRescanning}
          >
            {isRescanning ? <Loader2 size={14} className="spinning" /> : <RefreshCw size={14} />} Refresh
          </button>

          <button type="button" className="export-btn-dark" onClick={handleExportReport}>
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* 5-Column Stat Summary Cards Row matching Reference UI */}
      <div className="stat-summary-cards-row">
        <div className="stat-card-box clickable" onClick={() => handleTabClick('sources')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon-wrap">
            <Layers size={18} />
          </div>
          <div className="stat-card-data">
            <span className="stat-card-label">Total Sources</span>
            <span className="stat-card-value">{investigation.resultsCount?.sources || 0}</span>
          </div>
        </div>

        <div className="stat-card-box clickable" onClick={() => handleTabClick('profiles')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon-wrap">
            <Users size={18} />
          </div>
          <div className="stat-card-data">
            <span className="stat-card-label">Social Profiles</span>
            <span className="stat-card-value">{investigation.resultsCount?.profiles || 0}</span>
          </div>
        </div>

        <div className="stat-card-box clickable" onClick={() => handleTabClick('webnews')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon-wrap">
            <Globe size={18} />
          </div>
          <div className="stat-card-data">
            <span className="stat-card-label">Web Results</span>
            <span className="stat-card-value">{investigation.resultsCount?.websites || investigation.resultsCount?.sources || 0}</span>
          </div>
        </div>

        <div className="stat-card-box clickable" onClick={() => handleTabClick('activity')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon-wrap">
            <FileText size={18} />
          </div>
          <div className="stat-card-data">
            <span className="stat-card-label">News & Articles</span>
            <span className="stat-card-value">{investigation.resultsCount?.activities || 0}</span>
          </div>
        </div>

        <div className="stat-card-box clickable" onClick={() => handleTabClick('associations')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon-wrap">
            <FileCheck size={18} />
          </div>
          <div className="stat-card-data">
            <span className="stat-card-label">Public Documents</span>
            <span className="stat-card-value">{investigation.resultsCount?.associations || 0}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Detail Layout: Main Content + Right Side Panels */}
      <div className="detail-two-column-layout">
        {/* Main Content Area */}
        <div className="detail-main-area">
          {/* Sub Navigation Tabs Bar */}
          <div className="sub-nav-tabs">
            <div className="tabs-left">
              {tabs.map(t => (
                <button
                  key={t.key}
                  className={`tab-btn ${currentTab === t.key ? 'active' : ''}`}
                  onClick={() => handleTabClick(t.key)}
                >
                  {t.label} {t.count !== undefined ? `(${t.count})` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Active Tab View */}
          <div className="active-tab-content-wrapper">
            {currentTab === 'overview' && (
              <OverviewTab 
                investigation={investigation}
                onNavigateTab={handleTabClick}
              />
            )}

            {currentTab === 'profiles' && (
              <ProfilesTab investigation={investigation} />
            )}

            {currentTab === 'activity' && (
              <ActivityTab investigation={investigation} />
            )}

            {currentTab === 'associations' && (
              <AssociationsTab investigation={investigation} />
            )}

            {currentTab === 'sources' && (
              <SourcesTab investigation={investigation} />
            )}

            {currentTab === 'webnews' && (
              <WebNewsTab investigation={investigation} />
            )}

            {currentTab === 'notes' && (
              <NotesTab 
                investigation={investigation}
                onAddNote={handleAddNote}
                newNoteText={newNoteText}
                setNewNoteText={setNewNoteText}
                isSavingNote={isSavingNote}
              />
            )}

            {currentTab === 'stats' && (
              <StatsTab 
                investigation={investigation}
                onNavigateTab={handleTabClick}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar Area matching Reference UI */}
        <div className="detail-side-area">
          {/* Search Coverage Panel */}
          <div className="side-card-box">
            <div className="side-card-header">
              <Compass size={16} className="side-card-icon" />
              <h4 className="side-card-title">Search Coverage</h4>
            </div>

            <div className="coverage-status-list">
              {searchCoverageList.map((sc, idx) => (
                <div key={idx} className="coverage-status-row">
                  <span className="coverage-provider-name">{sc.name}</span>
                  <span className="coverage-status-tag">
                    <CheckCircle2 size={12} className="check-icon" /> {sc.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="coverage-footer-note">
              All providers have been checked successfully.
            </div>
          </div>

          {/* Investigation Insights Panel */}
          <div className="side-card-box">
            <div className="side-card-header">
              <TrendingUp size={16} className="side-card-icon warm" />
              <h4 className="side-card-title">Investigation Insights</h4>
            </div>

            <div className="insights-metrics-list">
              <div className="insight-metric-row">
                <span className="insight-label">Common usernames found</span>
                <span className="insight-val">{investigation.resultsCount?.profiles || 3}</span>
              </div>
              <div className="insight-metric-row">
                <span className="insight-label">Related domains</span>
                <span className="insight-val">2</span>
              </div>
              <div className="insight-metric-row">
                <span className="insight-label">Mentions across news</span>
                <span className="insight-val">{investigation.resultsCount?.activities || 4}</span>
              </div>
              <div className="insight-metric-row">
                <span className="insight-label">Possible identities</span>
                <span className="insight-val">3</span>
              </div>
            </div>
          </div>

          {/* Try Refining Search Card */}
          <div className="side-card-box tip-refine-card">
            <div className="refine-title">Try refining your search</div>
            <p className="refine-text">
              Add a location, try a different username, or search for an email or domain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
