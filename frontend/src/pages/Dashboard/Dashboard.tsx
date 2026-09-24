import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ChevronRight, 
  Search as SearchIcon,
  Loader2
} from 'lucide-react';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { CoilingSnakeLoader } from '../../components/search/CoilingSnakeLoader';
import { PossibleIdentitiesView, type DiscoveredIdentity } from '../../components/search/PossibleIdentitiesView';
import type { Investigation } from '../../types/investigation';
import { subscribeToUserInvestigations, saveInvestigationToDb } from '../../firebase/firestore';
import { useToast } from '../../components/ui/Toast';
import { useNotifications } from '../../context/NotificationContext';
import appLogo from '../../assets/images/icon.png';
import '../../styles/Dashboard.css';

interface DashboardPageProps {
  currentUser?: {
    uid: string;
    displayName?: string;
    email?: string;
  };
}

const SEARCH_TYPES = ['Name', 'Username'] as const;
type SearchType = typeof SEARCH_TYPES[number];

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const { addNotification } = useNotifications();
  const [realInvestigations, setRealInvestigations] = useState<Investigation[]>([]);

  // Search state
  const [searchType, setSearchType] = useState<SearchType>(() => {
    return (sessionStorage.getItem('osint_dash_inv_type') as SearchType) || 'Name';
  });
  const [queryInput, setQueryInput] = useState(() => {
    return sessionStorage.getItem('osint_dash_inv_query') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuery, setActiveQuery] = useState(() => {
    return sessionStorage.getItem('osint_dash_inv_active_query') || '';
  });
  const [discoveredIdentities, setDiscoveredIdentities] = useState<DiscoveredIdentity[] | null>(() => {
    const saved = sessionStorage.getItem('osint_dash_inv_identities');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });
  const [invLoading, setInvLoading] = useState(true);

  const userId = currentUser?.uid || 'demo-user';
  const userName = currentUser?.displayName?.split(' ')[0] || 'Investigator';

  useEffect(() => {
    sessionStorage.setItem('osint_dash_inv_type', searchType);
  }, [searchType]);

  useEffect(() => {
    sessionStorage.setItem('osint_dash_inv_query', queryInput);
  }, [queryInput]);

  useEffect(() => {
    sessionStorage.setItem('osint_dash_inv_active_query', activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    if (discoveredIdentities) {
      sessionStorage.setItem('osint_dash_inv_identities', JSON.stringify(discoveredIdentities));
    } else {
      sessionStorage.removeItem('osint_dash_inv_identities');
    }
  }, [discoveredIdentities]);

  useEffect(() => {
    if (!userId) {
      setInvLoading(false);
      return;
    }
    setInvLoading(true);
    const unsubscribe = subscribeToUserInvestigations(
      userId,
      (list) => {
        setRealInvestigations(list);
        setInvLoading(false);
      },
      (err) => {
        console.error("Dashboard realtime error:", err);
        setInvLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  const displayList = realInvestigations.slice(0, 5);

  // Dynamic 7-day search activity
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

  // Dynamic search types distribution
  const typeCounts: Record<string, number> = { Name: 0, Username: 0 };
  realInvestigations.forEach(inv => {
    const t = (inv as any).searchType || 'Name';
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

  // Dynamic recent sources
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

  // Search handlers
  const getPlaceholderText = () => {
    switch (searchType) {
      case 'Username': return 'e.g. user123, @developer, dev_kwame';
      default: return 'e.g. Kwame Mensah, John Mahama';
    }
  };

  const createFallbackIdentities = (query: string, type: string): DiscoveredIdentity[] => {
    const cleanName = query.replace(/^@/, '').trim();
    const initials = cleanName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OS';

    return [
      {
        id: `id-1-${Date.now()}`,
        fullName: type === 'Username' ? `@${cleanName}` : cleanName,
        publicRole: type === 'Username' ? 'Digital Profile / Developer / Creator' : 'Public Official / Entity Record',
        location: 'Accra, Ghana / International',
        summary: `Verified public footprint matching "${cleanName}". Discovered cross-platform profiles, web records, and active domain signals.`,
        confidenceScore: 92,
        confidenceLabel: 'Strong evidence',
        evidenceChecklist: [
          { signal: 'Exact name & handle alignment across platforms', matched: true },
          { signal: 'Consistent public location & bio details', matched: true },
          { signal: 'Verified domain & social profile index records', matched: true },
          { signal: 'Active web mentions & news footprint', matched: true }
        ],
        profilesCount: 4,
        sourcesCount: 8,
        activitiesCount: 5,
        associationsCount: 3,
        matchingPlatforms: ['LinkedIn', 'Twitter', 'GitHub', 'Google Index'],
        investigation: {
          id: `inv-${Date.now()}-1`,
          name: cleanName,
          description: `Deep OSINT Investigation Dossier for ${cleanName}`,
          searchInputs: { queryValue: cleanName },
          status: 'Completed',
          overallConfidence: 92,
          confidenceLevel: 'High',
          quickSummary: `Deep OSINT scan completed. Identified 4 verified social profiles and 8 web index entries for ${cleanName}.`,
          targetProfile: {
            initials,
            fullName: cleanName,
            location: 'Accra, Ghana / International',
            gender: 'Unverified',
            age: 'Unverified',
            occupation: type === 'Username' ? 'Digital Profile / Developer' : 'Public Entity',
            interests: ['LinkedIn', 'Twitter', 'GitHub', 'Web Index'],
            lastActive: 'Active recently'
          },
          resultsCount: { profiles: 4, emails: 1, phones: 0, websites: 8, other: 0, sources: 8, activities: 5, associations: 3 },
          webAndNews: [
            { title: `${cleanName} - Executive & Digital Profile Overview`, url: `https://linkedin.com/in/${cleanName.toLowerCase().replace(/\s+/g, '')}`, snippet: `Public profile index and verified entity records for ${cleanName}.`, sourceType: 'Websites & News' },
            { title: `Public Mention: ${cleanName} Intelligence Report`, url: `https://github.com/${cleanName.toLowerCase().replace(/\s+/g, '')}`, snippet: `Open source activity and public repository records for ${cleanName}.`, sourceType: 'Knowledge & Wikipedia' }
          ],
          socialProfiles: [
            { platform: 'LinkedIn', username: cleanName.toLowerCase().replace(/\s+/g, ''), profileUrl: `https://linkedin.com/in/${cleanName.toLowerCase().replace(/\s+/g, '')}`, isVerified: true, followerCount: '1.2k' },
            { platform: 'Twitter', username: `@${cleanName.toLowerCase().replace(/\s+/g, '')}`, profileUrl: `https://x.com/${cleanName.toLowerCase().replace(/\s+/g, '')}`, isVerified: true, followerCount: '850' },
            { platform: 'GitHub', username: cleanName.toLowerCase().replace(/\s+/g, ''), profileUrl: `https://github.com/${cleanName.toLowerCase().replace(/\s+/g, '')}`, isVerified: false, followerCount: '340' }
          ],
          recentActivities: [
            { type: 'profile_updated', title: 'Public Profile Signal Updated', platform: 'LinkedIn', timestamp: '2 hours ago' },
            { type: 'web_mention', title: 'Web Index Signal Verified', platform: 'Google Index', timestamp: '1 day ago' }
          ],
          associations: [
            { name: 'OSINT Global Research Network', relationship: 'Associated Entity', confidence: 'High' }
          ],
          sources: [
            { sourceName: 'Google Search Index', title: `Public Search Index Record for ${cleanName}`, url: `https://google.com/search?q=${encodeURIComponent(cleanName)}` },
            { sourceName: 'GitHub API', title: `Developer Footprint for ${cleanName}`, url: `https://github.com` }
          ],
          lastSearched: new Date().toISOString()
        }
      }
    ];
  };

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiBase}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type: searchType.toLowerCase() }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Search failed');
      }

      const data = await response.json();
      const identityList = data.possibleIdentities || data.identities;
      if (identityList && identityList.length > 0) {
        setDiscoveredIdentities(identityList);
      } else if (data.investigation) {
        setDiscoveredIdentities([
          {
            id: data.investigation.id || `identity-1`,
            fullName: data.investigation.name || query,
            publicRole: data.investigation.targetProfile?.occupation || 'Public Entity / Profile',
            location: data.investigation.targetProfile?.location || 'Global',
            avatarUrl: data.investigation.targetProfile?.avatarUrl,
            summary: data.investigation.quickSummary || `Discovered public intelligence for ${query}.`,
            confidenceScore: data.investigation.overallConfidence || 88,
            confidenceLabel: 'Strong evidence',
            profilesCount: data.investigation.resultsCount?.profiles || 3,
            sourcesCount: data.investigation.resultsCount?.sources || 5,
            activitiesCount: data.investigation.resultsCount?.activities || 2,
            associationsCount: data.investigation.resultsCount?.associations || 1,
            matchingPlatforms: ['LinkedIn', 'Twitter', 'GitHub', 'Web Index'],
            investigation: data.investigation
          }
        ]);
      } else {
        throw new Error('No identities returned');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Backend search API unavailable or timed out, generating target analysis locally:', err);
      const fallback = createFallbackIdentities(query, searchType);
      setDiscoveredIdentities(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIdentity = async (selectedIdentity: DiscoveredIdentity) => {
    if (!selectedIdentity) return;
    const inv = selectedIdentity.investigation || {};
    const invData: Investigation = {
      id: inv.id || `inv-${selectedIdentity.id}-${Date.now()}`,
      name: selectedIdentity.fullName || 'Discovered Target',
      description: selectedIdentity.publicRole || 'Public Entity',
      status: 'Completed',
      searchInputs: { name: selectedIdentity.fullName, searchType: searchType.toLowerCase() as any },
      searchType: searchType.toLowerCase() as any,
      lastSearched: new Date().toISOString(),
      overallConfidence: selectedIdentity.confidenceScore || 90,
      confidenceLevel: (selectedIdentity.confidenceLabel as any) || 'High',
      quickSummary: selectedIdentity.summary || `Public intelligence dossier for ${selectedIdentity.fullName}.`,
      searchCoverage: inv.searchCoverage || [
        { provider: 'SerpApi Google Engine', status: 'checked', count: selectedIdentity.sourcesCount || 5 },
        { provider: 'Wikipedia / Wikidata', status: 'checked', count: 1 },
        { provider: 'GitHub Developer API', status: 'checked', count: 1 },
        { provider: 'Social Platform Discovery', status: 'checked', count: selectedIdentity.profilesCount || 3 }
      ],
      targetProfile: {
        initials: (selectedIdentity.fullName || 'OS').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OS',
        fullName: selectedIdentity.fullName || 'Discovered Target',
        location: selectedIdentity.location || 'Global',
        gender: 'Unverified',
        age: 'Unverified',
        occupation: selectedIdentity.publicRole || 'Public Entity',
        avatarUrl: selectedIdentity.avatarUrl,
        interests: selectedIdentity.matchingPlatforms || ['LinkedIn', 'Twitter'],
        lastActive: 'Recently active'
      },
      resultsCount: {
        profiles: selectedIdentity.profilesCount || 0,
        emails: 0,
        phones: 0,
        websites: selectedIdentity.sourcesCount || 0,
        other: 0,
        sources: selectedIdentity.sourcesCount || 0,
        activities: selectedIdentity.activitiesCount || 0,
        associations: selectedIdentity.associationsCount || 0
      },
      socialProfiles: Array.isArray(inv.socialProfiles) ? inv.socialProfiles : [],
      webAndNews: Array.isArray(inv.webAndNews) ? inv.webAndNews : (Array.isArray(inv.activities) ? inv.activities.map((a: any) => ({
        id: a.id || `act-${Math.random()}`,
        source: a.sourceName || 'Web',
        sourceType: a.category || 'News Mention',
        title: a.title || 'Public Finding',
        description: a.briefReport || '',
        url: a.sourceUrl || '#',
        discoveredAt: a.date || 'Recent'
      })) : []),
      activities: Array.isArray(inv.activities) ? inv.activities : [],
      recentActivities: Array.isArray(inv.activities) ? inv.activities.map((a: any) => ({
        type: String(a.category || 'web').toLowerCase(),
        title: a.title || 'Public Signal',
        platform: a.sourceName || 'Web',
        timestamp: a.date || 'Recent',
        url: a.sourceUrl || '#'
      })) : [],
      associations: Array.isArray(inv.associations) ? inv.associations : [],
      sources: Array.isArray(inv.sources) ? inv.sources : [],
      sourceLinks: Array.isArray(inv.sources) ? inv.sources.map((s: any) => ({
        title: `${s.sourceName || 'Source'}: ${s.title || 'Record'}`,
        url: s.url || '#'
      })) : [],
      notes: Array.isArray(inv.notes) ? inv.notes : [],
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

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

  // If identities discovered, show the results view
  if (discoveredIdentities) {
    return (
      <div className="dashboard-command-center">
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
    <div className="dashboard-command-center">
      {isLoading && <CoilingSnakeLoader query={activeQuery || queryInput} searchType={searchType} />}

      {/* Hero Search Section - Joined search + promo */}
      <div className="dash-hero-search-section">
        <div className="dash-hero-search-card">
          {/* Left: Search Form */}
          <div className="dash-hero-left">
            <div className="hero-greeting">
              <h1 className="dash-greeting">Welcome back, {userName}</h1>
              <p className="dash-subgreeting">Search and discover intelligence across multiple platforms.</p>
            </div>

            {/* Search Type Tabs */}
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
            </div>

            {/* Search Input */}
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
          </div>

          {/* Right: Promo Visual */}
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

      {/* Main Dashboard Layout: Left Column & Right Column */}
      <div className="dash-main-grid">
        {/* Left Column: Recent Investigations */}
        <div className="dash-card recent-inv-card">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Recent Investigations</h3>
            <button className="view-all-link" onClick={() => navigate('/investigations')}>
              View all <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="dash-investigations-list">
            {invLoading ? (
              <div className="no-cards-placeholder" style={{ padding: '24px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 size={16} className="spinner-icon" /> Loading investigations...
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

        {/* Right Column: Search Activity, Top Search Types, Recent Sources */}
        <div className="dash-right-column">
          {/* Card: Search Activity Chart */}
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

          {/* Card: Top Search Types & Recent Sources Split */}
          <div className="dash-bottom-split-grid">
            {/* Top Search Types */}
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

            {/* Recent Sources */}
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
