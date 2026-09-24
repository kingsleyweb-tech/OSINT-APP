import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search as SearchIcon, 
  ArrowUpRight, 
  MoreVertical,
  Loader2
} from 'lucide-react';
import appLogo from '../../assets/images/icon.png';
import { PossibleIdentitiesView, type DiscoveredIdentity } from '../../components/search/PossibleIdentitiesView';
import { CoilingSnakeLoader } from '../../components/search/CoilingSnakeLoader';
import type { Investigation } from '../../types/investigation';
import { saveInvestigationToDb, getUserInvestigationsFromDb } from '../../firebase/firestore';
import { useToast } from '../../components/ui/Toast';
import { useNotifications } from '../../context/NotificationContext';
import '../../styles/NewInvestigation.css';

interface NewInvestigationPageProps {
  currentUser?: {
    uid: string;
    displayName?: string;
    email?: string;
  };
}

const SEARCH_TYPES = ['Name', 'Username'] as const;
type SearchType = typeof SEARCH_TYPES[number];

export const NewInvestigationPage: React.FC<NewInvestigationPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { addNotification } = useNotifications();

  const [searchType, setSearchType] = useState<SearchType>(() => {
    return (sessionStorage.getItem('osint_new_inv_type') as SearchType) || 'Name';
  });
  const [queryInput, setQueryInput] = useState(() => {
    return sessionStorage.getItem('osint_new_inv_query') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [realInvestigations, setRealInvestigations] = useState<Investigation[]>([]);

  // Multi-identity discovery state
  const [activeQuery, setActiveQuery] = useState(() => {
    return sessionStorage.getItem('osint_new_inv_active_query') || '';
  });
  const [discoveredIdentities, setDiscoveredIdentities] = useState<DiscoveredIdentity[] | null>(() => {
    const saved = sessionStorage.getItem('osint_new_inv_identities');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const userId = currentUser?.uid || 'demo-user';

  useEffect(() => {
    sessionStorage.setItem('osint_new_inv_type', searchType);
  }, [searchType]);

  useEffect(() => {
    sessionStorage.setItem('osint_new_inv_query', queryInput);
  }, [queryInput]);

  useEffect(() => {
    sessionStorage.setItem('osint_new_inv_active_query', activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    if (discoveredIdentities) {
      sessionStorage.setItem('osint_new_inv_identities', JSON.stringify(discoveredIdentities));
    } else {
      sessionStorage.removeItem('osint_new_inv_identities');
    }
  }, [discoveredIdentities]);

  useEffect(() => {
    getUserInvestigationsFromDb(userId).then(setRealInvestigations);
  }, [userId]);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = queryInput.trim();
    if (!query) {
      toastError('Input required', 'Please enter a target name or username.');
      return;
    }

    setIsLoading(true);
    setActiveQuery(query);
    setDiscoveredIdentities(null);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBase}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type: searchType.toLowerCase() }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Search failed');
      }

      const data = await response.json();
      const rawIdentities: DiscoveredIdentity[] = data.possibleIdentities || [];

      if (rawIdentities.length > 1) {
        setDiscoveredIdentities(rawIdentities);
        success('Discovery Complete', `Identified ${rawIdentities.length} possible public identity clusters matching "${query}".`);
      } else {
        const investigation: Investigation = data.investigation;
        investigation.createdBy = userId;

        await saveInvestigationToDb(investigation);
        setRealInvestigations(prev => [investigation, ...prev.filter(i => i.id !== investigation.id)]);
        success('Investigation complete', `Found ${investigation.resultsCount?.sources ?? 0} sources for "${investigation.name}".`);
        addNotification({
          type: 'investigation_saved',
          title: 'Investigation Saved',
          message: `"${investigation.name}" – ${investigation.resultsCount?.sources ?? 0} sources discovered.`,
          targetInvestigationId: investigation.id
        });
        navigate(`/investigations/${investigation.id}`);
      }
    } catch (err: any) {
      toastError('Search failed', err.message || 'An error occurred during the search.');
      addNotification({
        type: 'system_alert',
        title: 'Search Failed',
        message: `Failed search for "${query}": ${err.message || 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIdentity = async (selectedIdentity: DiscoveredIdentity) => {
    const invData: Investigation = {
      id: `inv-${Date.now()}`,
      name: selectedIdentity.fullName,
      description: selectedIdentity.summary,
      searchInputs: { queryValue: activeQuery },
      status: 'Completed',
      overallConfidence: selectedIdentity.confidenceScore,
      confidenceLevel: (selectedIdentity.confidenceLabel as string) === 'Strong match' ? 'High' : (selectedIdentity.confidenceLabel as string) === 'Possible match' ? 'Medium' : 'Low',
      quickSummary: selectedIdentity.summary,
      targetProfile: {
        initials: selectedIdentity.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OS',
        fullName: selectedIdentity.fullName,
        location: selectedIdentity.location,
        gender: 'Unverified',
        age: 'Unverified',
        occupation: selectedIdentity.publicRole,
        avatarUrl: selectedIdentity.avatarUrl,
        interests: selectedIdentity.matchingPlatforms,
        lastActive: 'Recently active'
      },
      resultsCount: {
        profiles: selectedIdentity.profilesCount,
        emails: 0,
        phones: 0,
        websites: selectedIdentity.sourcesCount,
        other: 0,
        sources: selectedIdentity.sourcesCount,
        activities: selectedIdentity.activitiesCount,
        associations: selectedIdentity.associationsCount
      },
      socialProfiles: selectedIdentity.investigation.socialProfiles || [],
      activities: selectedIdentity.investigation.activities || [],
      recentActivities: (selectedIdentity.investigation.activities || []).map((a: any) => ({
        type: a.category.toLowerCase(),
        title: a.title,
        platform: a.sourceName,
        timestamp: a.date,
        url: a.sourceUrl
      })),
      associations: selectedIdentity.investigation.associations || [],
      sources: selectedIdentity.investigation.sources || [],
      sourceLinks: (selectedIdentity.investigation.sources || []).map((s: any) => ({
        title: `${s.sourceName}: ${s.title}`,
        url: s.url
      })),
      notes: [],
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveInvestigationToDb(invData);
      addNotification({
        type: 'investigation_saved',
        title: 'Identity Confirmed',
        message: `Investigation created for "${invData.name}".`,
        targetInvestigationId: invData.id
      });
    } catch (err) {
      console.error("Save investigation error:", err);
    }
    setRealInvestigations(prev => [invData, ...prev.filter(i => i.id !== invData.id)]);
    navigate(`/investigations/${invData.id}`, { state: { investigation: invData } });
  };

  const getPlaceholderText = () => {
    switch (searchType) {
      case 'Username': return 'e.g. user123, @developer, dev_kwame';
      default: return 'e.g. Kwame Mensah, John Mahama, Amina Ibrahim, Daniel Ofori';
    }
  };

  const displayCards = realInvestigations.slice(0, 4);

  if (discoveredIdentities) {
    return (
      <div className="new-investigation-page">
        {isLoading && <CoilingSnakeLoader query={activeQuery || queryInput} searchType={searchType} />}
        <PossibleIdentitiesView
          query={activeQuery}
          identities={discoveredIdentities}
          onSelectIdentity={handleSelectIdentity}
          onNewSearch={() => setDiscoveredIdentities(null)}
        />
      </div>
    );
  }

  return (
    <div className="new-investigation-page">
      {isLoading && <CoilingSnakeLoader query={activeQuery || queryInput} searchType={searchType} />}
      {/* Top Back Nav Button */}
      <button className="back-to-dash-btn" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </button>

      {/* Page Title Header */}
      <div className="new-inv-header">
        <h1 className="new-inv-title">New Investigation</h1>
        <p className="new-inv-subtitle">
          Search and discover information across multiple platforms and sources.
        </p>
      </div>

      {/* Main 2-Column Search Section */}
      <div className="new-inv-main-grid">
        {/* Left Column: Search Form Card */}
        <div className="search-form-card">
          {/* Selector Tabs */}
          <div className="search-type-tabs">
            {SEARCH_TYPES.map((t) => (
              <button
                key={t}
                className={`search-type-tab ${searchType === t ? 'active' : ''}`}
                onClick={() => setSearchType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search Input Form */}
          <form className="search-input-form" onSubmit={handleSearchSubmit}>
            <div className="search-input-wrapper">
              <SearchIcon size={18} className="search-input-icon" />
              <input
                type="text"
                className="search-main-input"
                placeholder={getPlaceholderText()}
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="search-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <span>Search</span>
                )}
              </button>
            </div>
          </form>


        </div>

        {/* Right Column: Feature Promo Card */}
        <div className="feature-promo-card">
          <div className="promo-logo-container">
            <div className="promo-logo-circle">
              <img src={appLogo} alt="OSINT" className="promo-app-logo" />
            </div>
          </div>
          <h2 className="promo-headline">More than just search.</h2>
          <p className="promo-subheadline">
            Find connections. Uncover associations. See the bigger picture.
          </p>
        </div>
      </div>

      {/* Bottom Horizontal Recent Investigations Section */}
      <div className="recent-inv-bottom-section">
        <div className="section-header-row">
          <h3 className="section-title">Recent Investigations</h3>
          <button className="view-all-link" onClick={() => navigate('/investigations')}>
            View all <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="recent-cards-grid">
          {displayCards.length === 0 ? (
            <div className="no-cards-placeholder" style={{ padding: '24px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', textAlign: 'center', gridColumn: '1 / -1' }}>
              No recent investigations yet. Start a new search above.
            </div>
          ) : (
            displayCards.map((inv) => {
              const initials = inv.targetProfile?.initials || inv.name.substring(0, 2).toUpperCase();
              const formattedDate = inv.createdAt 
                ? new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Recent';

              return (
                <div 
                  key={inv.id} 
                  className="recent-card-item"
                  onClick={() => navigate(`/investigations/${inv.id}`, { state: { investigation: inv } })}
                >
                  <div className="card-top-row">
                    <div className="card-initials-badge">{initials}</div>
                    <button 
                      className="card-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/investigations/${inv.id}`, { state: { investigation: inv } });
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>

                  <div className="card-body">
                    <h4 className="card-target-name">{inv.name}</h4>
                    <p className="card-target-role">{inv.description || inv.targetProfile?.occupation || 'Public Target'}</p>
                  </div>

                  <div className="card-footer">
                    <span className="card-scanned-date">Last scanned: {formattedDate}</span>
                    <span className="card-status-pill completed">Completed</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
