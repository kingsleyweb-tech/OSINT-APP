import React, { useState, useEffect } from 'react';
import { openIdentityCase } from '../../lib/openCase';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ChevronRight, 
  Search as SearchIcon,
  Loader2
} from 'lucide-react';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { SearchLoader } from '../../components/ui/SearchLoader';
import { CostHint } from '../../components/ui/CostHint';
import { addCosts, nameSearchRange, spellingCheck, usernameSearchRange } from '../../lib/searchCosts';
import { RadarLoader } from '../../components/ui/RadarLoader';
import { QueryIntelBanner, SearchModeToggle } from '../../components/search/QueryIntelBanner';
import { useSearchMode } from '../../components/search/useIntelligentSearch';
import { useProfilerSearch } from '../../components/search/useProfilerSearch';
import { clearPageState, usePageState } from '../../lib/pageState';
import { PossibleIdentitiesView, type DiscoveredIdentity } from '../../components/search/PossibleIdentitiesView';
import type { Investigation } from '../../types/investigation';
import { subscribeToUserInvestigations } from '../../firebase/firestore';
import { useToast } from '../../components/ui/Toast';
import { identityToInvestigation, SearchError } from '../../lib/searchClient';
import { useNotifications } from '../../context/NotificationContext';
import { useSession } from '../../context/SessionContext';
import { DEFAULT_SEARCH_DEFAULTS } from '../../types/user';
import { useQuota } from '../../components/explore/exploreHooks';
import type { QuotaStatus } from '../../lib/exploreClient';
import appLogo from '../../assets/images/osint-logo.svg';
import '../../styles/Dashboard.css';

/** SerpApi searches used and left this month, read live from the SerpApi account (free, uses no search). */
const SearchCreditsCard: React.FC<{ quota: QuotaStatus | null }> = ({ quota }) => {
  const used = quota?.usedThisMonth ?? null;
  const left = quota?.searchesLeft ?? null;
  const total = quota?.searchesPerMonth ?? (used != null && left != null ? used + left : null);
  const pctUsed = total && used != null ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const low = left != null && total ? left / total <= 0.1 : false;
  const unavailable = !quota || !quota.configured || quota.error || left == null;
  return (
    <div className="dash-card credits-card">
      <div className="dash-card-header">
        <h3 className="dash-card-title">Search Credits</h3>
        <span className="activity-timeframe">{quota?.plan ? `${quota.plan} · this month` : 'This month'}</span>
      </div>
      {!quota ? (
        <p className="credits-note">Checking your SerpApi account…</p>
      ) : unavailable ? (
        <p className="credits-note">{quota.configured ? 'Could not read your SerpApi account right now.' : 'No SerpApi key is set on the server.'}</p>
      ) : (
        <>
          <div className="credits-numbers">
            <div><span className={`credits-big${low ? ' low' : ''}`}>{left}</span><span className="credits-label">left</span></div>
            <div><span className="credits-big muted">{used ?? '—'}</span><span className="credits-label">used{total ? ` of ${total}` : ''}</span></div>
          </div>
          <div className="st-progress-bar" aria-label={`${pctUsed}% used`}>
            <div className="st-progress-fill" style={{ width: `${pctUsed}%` }} />
          </div>
          <p className="credits-note">
            {low ? 'Running low. ' : ''}About 11–15 per username search and 6–7 per organisation. Repeating a search within 12 hours is free.
          </p>
        </>
      )}
    </div>
  );
};

interface DashboardPageProps {
  currentUser?: {
    uid: string;
    displayName?: string;
    email?: string | null;
  };
}

const SEARCH_TYPES = ['Name', 'Username'] as const;
type SearchType = typeof SEARCH_TYPES[number];

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const profiler = useProfilerSearch('dashboard');
  const quota = useQuota(profiler.running); // re-read after each search finishes
  const [searchMode, setSearchMode] = useSearchMode();
  const { addNotification } = useNotifications();
  const { profile } = useSession();
  const searchDefaults = { ...DEFAULT_SEARCH_DEFAULTS, ...(profile?.searchDefaults || {}) };
  const [realInvestigations, setRealInvestigations] = useState<Investigation[]>([]);

  // The search, its progress and its results are kept when you leave the page (until "New search").
  const [searchType, setSearchType] = usePageState<SearchType>('dashboard:type', searchDefaults.type);
  const [queryInput, setQueryInput] = usePageState('dashboard:query', '');
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuery, setActiveQuery] = usePageState('dashboard:activeQuery', '');
  const [activeSearchType, setActiveSearchType] = usePageState<SearchType>('dashboard:activeType', 'Name');
  const [discoveredIdentities, setDiscoveredIdentities] = usePageState<DiscoveredIdentity[] | null>('dashboard:identities', null);
  const newSearch = () => {
    profiler.cancel();
    clearPageState('dashboard');
  };
  // The user id whose case list has arrived; loading until it matches the current user.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const userId = currentUser?.uid || '';
  const userName = currentUser?.displayName?.split(' ')[0] || 'Investigator';


  const invLoading = !!userId && loadedFor !== userId;

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToUserInvestigations(
      userId,
      (list) => {
        setRealInvestigations(list);
        setLoadedFor(userId);
      },
      (err) => {
        console.error("Dashboard realtime error:", err);
        setLoadedFor(userId);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  const displayList = realInvestigations.slice(0, 5);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = realInvestigations.filter(inv => {
      if (!inv.createdAt) return false;
      return inv.createdAt.startsWith(dateStr);
    }).length;
    return { dateStr, dayLabel, count };
  });
  const maxDailyCount = Math.max(1, ...last7Days.map(d => d.count));

  const typeCounts: Record<string, number> = { Name: 0, Username: 0 };
  realInvestigations.forEach(inv => {
    const t = inv.searchType || 'Name';
    const capitalized = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    if (typeCounts[capitalized] !== undefined) {
      typeCounts[capitalized]++;
    } else {
      typeCounts['Name']++;
    }
  });
  const totalSearches = realInvestigations.length || 1;
  const searchTypeStats = [
    { type: 'Name', percent: realInvestigations.length ? Math.round((typeCounts['Name'] / totalSearches) * 100) : 0 },
    { type: 'Username', percent: realInvestigations.length ? Math.round((typeCounts['Username'] / totalSearches) * 100) : 0 }
  ];

  const platformCounts: Record<string, number> = {};
  realInvestigations.forEach(inv => {
    (inv.socialProfiles || []).forEach(p => {
      const plat = p.platform || 'Web';
      platformCounts[plat] = (platformCounts[plat] || 0) + 1;
    });
    (inv.sources || []).forEach(s => {
      const plat = s.sourceName || 'Web';
      platformCounts[plat] = (platformCounts[plat] || 0) + 1;
    });
  });
  const topPlatforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([platform, count]) => ({
      platform,
      label: platform,
      count
    }));

  const getPlaceholderText = () => {
    switch (searchType) {
      case 'Username': return 'e.g. user123, @developer, dev_kwame';
      default: return 'e.g. Kwame Mensah, John Mahama';
    }
  };

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
    } catch (err: unknown) {
      if (err instanceof SearchError && err.title === 'Search cancelled') return;
      toastError(err instanceof SearchError ? err.title : 'Search failed', (err instanceof Error && err.message) || 'The search could not be completed.');
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

    // The same person from the same search reopens its stored case; a new case is saved before it opens.
    const opened = await openIdentityCase(invData, { known: realInvestigations, historyId: profiler.historyId.current });
    if (!opened.reused) {
      opened.saved
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
    }

    setRealInvestigations(prev => [opened.investigation, ...prev.filter(i => i.id !== opened.investigation.id)]);
    navigate(`/investigations/${opened.investigation.id}`, { state: { investigation: opened.investigation } });
  };

  if (discoveredIdentities) {
    return (
      <div className="dashboard-command-center">
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
    <div className="dashboard-command-center">
      {profiler.running && <SearchLoader overlay query={activeQuery || queryInput} steps={profiler.steps} onCancel={profiler.cancel} />}

      <div className="dash-hero-search-section">
        <div className="dash-hero-search-card">
          <div className="dash-hero-left">
            <div className="hero-greeting">
              <h1 className="dash-greeting">Welcome back, {userName}</h1>
              <p className="dash-subgreeting">Search and discover intelligence across multiple platforms.</p>
            </div>

            <div className="hero-search-type-tabs">
              {SEARCH_TYPES.map((t) => (
                <button
                  key={t}
                  className={`hero-search-tab ${searchType === t ? 'active' : ''}`}
                  onClick={() => setSearchType(t)}
                >
                  {t}
                </button>
              ))}
            {searchType === 'Name' && <SearchModeToggle mode={searchMode} onChange={setSearchMode} />}
            </div>

            <form className="hero-search-form" onSubmit={handleSearchSubmit}>
              <div className="hero-search-input-wrapper">
                <SearchIcon size={18} className="hero-search-icon" />
                <input
                  type="text"
                  className="hero-search-input"
                  placeholder={getPlaceholderText()}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="hero-search-btn"
                  disabled={isLoading || !queryInput.trim()}
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
            <div className="profiler-cost">
              <CostHint
                range={searchType === 'Username'
                  ? usernameSearchRange(searchDefaults.depth)
                  : addCosts(nameSearchRange(searchDefaults.depth), spellingCheck(queryInput || 'x', searchMode === 'intelligent'))}
                what={`A ${searchType.toLowerCase()} search (${searchDefaults.depth})`}
                note={searchType === 'Name' ? 'If the name is an organisation, opening its case gathers its facts with 6–7 more.' : undefined}
              />
            </div>

            <nav className="dash-other-searches" aria-label="Other searches">
              <span>Other searches:</span>
              <Link to="/search/social">Social posts</Link>
              <Link to="/search/news">News</Link>
              <Link to="/search/media">Images &amp; videos</Link>
              <Link to="/search/geo">Places near a location</Link>
              <Link to="/search/trends">Trends</Link>
            </nav>
          </div>

          <div className="dash-hero-right">
            <div className="hero-promo-glow" />
            <div className="hero-promo-logo-circle">
              <img src={appLogo} alt="OSINT" className="hero-promo-logo-img" />
            </div>
            <h2 className="hero-promo-headline">More than just search.</h2>
            <p className="hero-promo-sub">
              Find connections. Uncover associations.<br />See the bigger picture.
            </p>
          </div>
        </div>
      </div>

      <div className="dash-main-grid">
        <div className="dash-card recent-inv-card">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Recent Investigations</h3>
            <button className="view-all-link" onClick={() => navigate('/investigations')}>
              View all <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="dash-investigations-list">
            {invLoading ? (
              <div className="no-cards-placeholder" style={{ padding: '24px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <RadarLoader size={64} /> Loading investigations...
              </div>
            ) : displayList.length === 0 ? (
              <div className="no-cards-placeholder" style={{ padding: '24px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', textAlign: 'center' }}>
                No recent investigations yet. Start a new investigation to see target intelligence.
              </div>
            ) : (
              displayList.map((inv) => {
                const initials = inv.targetProfile?.initials || inv.name.substring(0, 2).toUpperCase();
                const formattedDate = inv.createdAt 
                  ? new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Today';

                return (
                  <div 
                    key={inv.id} 
                    className="dash-inv-row"
                    onClick={() => navigate(`/investigations/${inv.id}`, { state: { investigation: inv } })}
                  >
                    <div className="inv-avatar-circle">{initials}</div>
                    <div className="inv-info-meta">
                      <div className="inv-person-name">{inv.name}</div>
                      <div className="inv-person-subtitle">{inv.description || inv.targetProfile?.occupation || 'Public Target'}</div>
                    </div>
                    <div className="inv-row-right">
                      <span className="inv-time-ago">{formattedDate}</span>
                      <span className="inv-status-pill completed">Completed</span>
                      <ChevronRight size={14} className="inv-row-chevron" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="dash-right-column">
          <SearchCreditsCard quota={quota} />

          <div className="dash-card search-activity-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Search Activity</h3>
              <span className="activity-timeframe">Last 7 days</span>
            </div>

            <div className="activity-chart-bars">
              {last7Days.map((item, idx) => (
                <div key={item.dayLabel} className="chart-col">
                  <div className="chart-bar-container">
                    <div 
                      className={`chart-bar-fill ${idx % 2 === 0 ? 'accent' : ''}`} 
                      style={{ height: item.count > 0 ? `${(item.count / maxDailyCount) * 100}%` : '4px', opacity: item.count > 0 ? 1 : 0.25 }}
                    />
                  </div>
                  <span className="chart-day-label">{item.dayLabel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-bottom-split-grid">
            <div className="dash-card search-types-card">
              <h3 className="dash-card-title">Top Search Types</h3>
              <div className="search-types-list">
                {searchTypeStats.map((st) => (
                  <div key={st.type} className="search-type-row">
                    <div className="search-type-info">
                      <span className="st-name">{st.type}</span>
                      <span className="st-percent">{st.percent}%</span>
                    </div>
                    <div className="st-progress-bar">
                      <div className="st-progress-fill" style={{ width: `${st.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dash-card recent-sources-card">
              <h3 className="dash-card-title">Recent Sources</h3>
              <div className="recent-sources-list">
                {topPlatforms.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '12px 0' }}>
                    No source data collected yet.
                  </div>
                ) : (
                  topPlatforms.map((src) => (
                    <div key={src.platform} className="recent-source-row">
                      <div className="source-label-group">
                        <PlatformIcon platform={src.platform} size={16} />
                        <span className="source-label-text">{src.label}</span>
                      </div>
                      <span className="source-count-badge">{src.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
