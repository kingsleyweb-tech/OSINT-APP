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
import { runSearch, identityToInvestigation, SearchError } from '../../lib/searchClient';
import { useNotifications } from '../../context/NotificationContext';
import { useSession } from '../../context/SessionContext';
import { DEFAULT_SEARCH_DEFAULTS } from '../../types/user';
import '../../styles/NewInvestigation.css';

interface NewInvestigationPageProps {
  currentUser?: {
    uid: string;
    displayName?: string;
    email?: string | null;
  };
}

const SEARCH_TYPES = ['Name', 'Username'] as const;
type SearchType = typeof SEARCH_TYPES[number];

export const NewInvestigationPage: React.FC<NewInvestigationPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { addNotification } = useNotifications();
  const { profile } = useSession();
  const searchDefaults = { ...DEFAULT_SEARCH_DEFAULTS, ...(profile?.searchDefaults || {}) };

  const [searchType, setSearchType] = useState<SearchType>(() => {
    return (sessionStorage.getItem('osint_new_inv_type') as SearchType) || searchDefaults.type;
  });
  const [queryInput, setQueryInput] = useState(() => {
    return sessionStorage.getItem('osint_new_inv_query') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [realInvestigations, setRealInvestigations] = useState<Investigation[]>([]);

  const [activeQuery, setActiveQuery] = useState(() => {
    return sessionStorage.getItem('osint_new_inv_active_query') || '';
  });
  const [activeSearchType, setActiveSearchType] = useState<SearchType>(() => {
    return (sessionStorage.getItem('osint_new_inv_active_type') as SearchType) || 'Name';
  });
  useEffect(() => {
    sessionStorage.setItem('osint_new_inv_active_type', activeSearchType);
  }, [activeSearchType]);
  const [discoveredIdentities, setDiscoveredIdentities] = useState<DiscoveredIdentity[] | null>(() => {
    const saved = sessionStorage.getItem('osint_new_inv_identities');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const userId = currentUser?.uid || '';

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
    setActiveSearchType(searchType);
    setDiscoveredIdentities(null);

    try {
      const identities = await runSearch(query, searchType, searchDefaults.depth);
      setDiscoveredIdentities(identities);
      const profileCount = identities.reduce((n, i) => n + (i.investigation?.socialProfiles?.length || 0), 0);
      success('Search complete', `${identities.length} possible ${identities.length === 1 ? 'person' : 'people'} and ${profileCount} profile${profileCount === 1 ? '' : 's'} for "${query}".`);
    } catch (err: any) {
      toastError(err instanceof SearchError ? err.title : 'Search failed', err?.message || 'The search could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIdentity = async (selectedIdentity: DiscoveredIdentity) => {
    if (!selectedIdentity) return;
    const invData: Investigation = identityToInvestigation(selectedIdentity, {
      activeQuery,
      searchType: activeSearchType,
      userId,
      searchDepth: searchDefaults.depth
    });

    try {
      await saveInvestigationToDb(invData);
      sessionStorage.setItem(`osint_inv_${invData.id}`, JSON.stringify(invData));
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
      <button className="back-to-dash-btn" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </button>

      <div className="new-inv-header">
        <h1 className="new-inv-title">New Investigation</h1>
        <p className="new-inv-subtitle">
          Search and discover information across multiple platforms and sources.
        </p>
      </div>

      <div className="new-inv-main-grid">
        <div className="search-form-card">
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
