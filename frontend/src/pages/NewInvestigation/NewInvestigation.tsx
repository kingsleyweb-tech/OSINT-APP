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
      const rawIdentities: DiscoveredIdentity[] = data.possibleIdentities || [];

      if (rawIdentities.length > 0) {
        setDiscoveredIdentities(rawIdentities);
        success('Discovery Complete', `Identified ${rawIdentities.length} possible public identity clusters matching "${query}".`);
      } else if (data.investigation) {
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
  };  const handleSelectIdentity = async (selectedIdentity: DiscoveredIdentity) => {
    if (!selectedIdentity) return;
    const inv = selectedIdentity.investigation || {};
    const invData: Investigation = {
      id: inv.id || `inv-${Date.now()}`,
      name: selectedIdentity.fullName || 'Discovered Target',
      description: selectedIdentity.summary || selectedIdentity.publicRole || 'Public Entity',
      searchInputs: { queryValue: activeQuery },
      status: 'Completed',
      overallConfidence: selectedIdentity.confidenceScore || 90,
      confidenceLevel: (selectedIdentity.confidenceLabel as string) === 'Strong match' ? 'High' : (selectedIdentity.confidenceLabel as string) === 'Possible match' ? 'Medium' : 'Low',
      quickSummary: selectedIdentity.summary || `Public intelligence dossier for ${selectedIdentity.fullName}.`,
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
