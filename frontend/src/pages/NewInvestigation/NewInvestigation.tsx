import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageSearch } from '../../components/explore/usePageSearch';
import { clearPageState, usePageState } from '../../lib/pageState';
import type { QueryIntel } from '../../lib/queryIntelClient';
import { 
  ArrowLeft, 
  Search as SearchIcon, 
  ArrowUpRight, 
  MoreVertical,
  Loader2
} from 'lucide-react';
import appLogo from '../../assets/images/icon.png';
import { PossibleIdentitiesView, type DiscoveredIdentity } from '../../components/search/PossibleIdentitiesView';
import { SearchLoader } from '../../components/ui/SearchLoader';
import { QueryIntelBanner, SearchModeToggle } from '../../components/search/QueryIntelBanner';
import { useSearchMode } from '../../components/search/useIntelligentSearch';
import { useProfilerSearch } from '../../components/search/useProfilerSearch';
import { linkHistoryToCase } from '../../lib/history';
import type { Investigation } from '../../types/investigation';
import { saveInvestigationToDb, getUserInvestigationsFromDb } from '../../firebase/firestore';
import { useToast } from '../../components/ui/Toast';
import { identityToInvestigation, SearchError } from '../../lib/searchClient';
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
  const profiler = useProfilerSearch('profiler');
  const [searchMode, setSearchMode] = useSearchMode();
  const { addNotification } = useNotifications();
  const { profile } = useSession();
  const searchDefaults = { ...DEFAULT_SEARCH_DEFAULTS, ...(profile?.searchDefaults || {}) };

  // The search, its progress and its results are kept when you leave the page (until "New search").
  const [searchType, setSearchType] = usePageState<SearchType>('profiler:type', searchDefaults.type);
  const [queryInput, setQueryInput] = usePageState('profiler:query', '');
  const [isLoading, setIsLoading] = useState(false);
  const [realInvestigations, setRealInvestigations] = useState<Investigation[]>([]);

  const [activeQuery, setActiveQuery] = usePageState('profiler:activeQuery', '');
  const [activeSearchType, setActiveSearchType] = usePageState<SearchType>('profiler:activeType', 'Name');
  const [discoveredIdentities, setDiscoveredIdentities] = usePageState<DiscoveredIdentity[] | null>('profiler:identities', null);
  const newSearch = () => {
    profiler.cancel();
    clearPageState('profiler');
  };

  const userId = currentUser?.uid || '';


  useEffect(() => {
    getUserInvestigationsFromDb(userId).then(setRealInvestigations);
  }, [userId]);

  const handleSearchSubmit = async (e?: React.FormEvent, opts: { q?: string; keepOriginal?: boolean; chosen?: string } = {}) => {
    if (e) e.preventDefault();
    const query = (opts.q ?? queryInput).trim();
    if (!query) {
      toastError('Input required', 'Please enter a target name or username.');
      return;
    }

    setIsLoading(true);
    setActiveQuery(query);
    setActiveSearchType(searchType);
    setDiscoveredIdentities(null);

    try {
      const outcome = await profiler.run(query, searchType, searchDefaults.depth, { mode: searchMode, cases: realInvestigations, keepOriginal: opts.keepOriginal, chosen: opts.chosen });
      if (outcome.openCaseId) {
        navigate(`/investigations/${outcome.openCaseId}`);
        return;
      }
      const identities = outcome.identities;
      // A confident correction was searched: the case is named after what was actually searched.
      setActiveQuery(outcome.searchQuery);
      setDiscoveredIdentities(identities);
      const profileCount = identities.reduce((n, i) => n + (i.investigation?.socialProfiles?.length || 0), 0);
      success('Search complete', `${identities.length} possible ${identities.length === 1 ? 'person' : 'people'} and ${profileCount} profile${profileCount === 1 ? '' : 's'} for "${query}".`);
    } catch (err: any) {
      if (err instanceof SearchError && err.title === 'Search cancelled') return;
      toastError(err instanceof SearchError ? err.title : 'Search failed', err?.message || 'The search could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const runFromParams = React.useRef<{ q: string; t: SearchType } | null>(null);
  // History → "Run again" opens this page with ?q=…&type=…&run=1.
  usePageSearch(p => {
    const q = p.get('q') || '';
    const t = (p.get('type') === 'Username' ? 'Username' : 'Name') as SearchType;
    setQueryInput(q);
    setSearchType(t);
    runFromParams.current = { q, t };
  }, payload => {
    // History → "View results": the saved results, no searches used.
    const d = payload as { query: string; searchQuery: string; type: SearchType; identities: DiscoveredIdentity[]; intel?: QueryIntel | null };
    setQueryInput(d.query); setSearchType(d.type); setActiveSearchType(d.type);
    setActiveQuery(d.searchQuery || d.query); setDiscoveredIdentities(d.identities || []);
    profiler.setIntel(d.intel || null);
  });
  React.useEffect(() => {
    const pending = runFromParams.current;
    if (!pending || pending.q !== queryInput || pending.t !== searchType) return;
    runFromParams.current = null;
    const t = setTimeout(() => handleSearchSubmit(), 0);
    return () => clearTimeout(t);
  });

  const handleSelectIdentity = async (selectedIdentity: DiscoveredIdentity) => {
    if (!selectedIdentity) return;
    const invData: Investigation = identityToInvestigation(selectedIdentity, {
      activeQuery,
      searchType: activeSearchType,
      userId,
      searchDepth: searchDefaults.depth
    });

    // Open the case at once; saving to Firestore continues in the background.
    try { sessionStorage.setItem(`osint_inv_${invData.id}`, JSON.stringify(invData)); } catch { /* storage full */ }
    linkHistoryToCase(profiler.historyId.current, invData.id);
    saveInvestigationToDb(invData)
      .then(() => addNotification({
        type: 'investigation_saved',
        title: 'Identity Confirmed',
        message: `Investigation created for "${invData.name}".`,
        targetInvestigationId: invData.id
      }))
      .catch(err => {
        console.error('Save investigation error:', err);
        toastError('Case not saved', 'The case opened, but it could not be saved to your account. Check your connection.');
      });

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
        {profiler.running && <SearchLoader overlay query={activeQuery || queryInput} steps={profiler.steps} onCancel={profiler.cancel} />}
        <div style={{ marginBottom: 16 }}>
          <QueryIntelBanner intel={profiler.intel} cases={realInvestigations}
            resultCount={discoveredIdentities.reduce((n, i) => n + i.profilesCount, 0)}
            onSearch={q2 => { setQueryInput(q2); handleSearchSubmit(undefined, { q: q2, chosen: profiler.intel?.corrections.some(c => c.query === q2) ? q2 : undefined }); }}
            onSearchOriginal={() => { if (profiler.intel) { setQueryInput(profiler.intel.original); handleSearchSubmit(undefined, { q: profiler.intel.original, keepOriginal: true }); } }} />
        </div>
        <PossibleIdentitiesView
          query={activeQuery}
          identities={discoveredIdentities}
          onSelectIdentity={handleSelectIdentity}
          onNewSearch={newSearch}
        />
      </div>
    );
  }

  return (
    <div className="new-investigation-page">
      {profiler.running && <SearchLoader overlay query={activeQuery || queryInput} steps={profiler.steps} onCancel={profiler.cancel} />}
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
            {searchType === 'Name' && <SearchModeToggle mode={searchMode} onChange={setSearchMode} />}
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
