import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Target, User, AtSign, ArrowRight } from 'lucide-react';

interface HeroSearchWidgetProps {
  currentUser?: any;
}

export const HeroSearchWidget: React.FC<HeroSearchWidgetProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<'name' | 'username'>('name');
  const [query, setQuery] = useState('');
  
  // Dynamic typewriter phrases for the input placeholder
  const namePlaceholders = [
    'e.g. Kwame Mensah, John Mahama',
    'e.g. Alex Rivera, San Francisco',
    'e.g. Dr. Jane Smith, Researcher',
    'e.g. Michael Chen, Founder'
  ];
  
  const usernamePlaceholders = [
    'e.g. alex_rivera99',
    'e.g. dev_gh_master',
    'e.g. satoshi_n',
    'e.g. crypto_analyst'
  ];

  const placeholders = searchMode === 'name' ? namePlaceholders : usernamePlaceholders;
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  // Typewriter effect logic
  useEffect(() => {
    const currentFullText = placeholders[placeholderIndex % placeholders.length];
    
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && charIndex < currentFullText.length) {
      // Typing
      timer = setTimeout(() => {
        setDisplayedPlaceholder(currentFullText.substring(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, 70);
    } else if (!isDeleting && charIndex === currentFullText.length) {
      // Pause at full word
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
    } else if (isDeleting && charIndex > 0) {
      // Deleting
      timer = setTimeout(() => {
        setDisplayedPlaceholder(currentFullText.substring(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      }, 40);
    } else if (isDeleting && charIndex === 0) {
      // Switch phrase
      setIsDeleting(false);
      setPlaceholderIndex((prev) => prev + 1);
    }

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, placeholderIndex, searchMode, placeholders]);

  // Reset typewriter on tab change
  const handleTabChange = (mode: 'name' | 'username') => {
    setSearchMode(mode);
    setQuery('');
    setCharIndex(0);
    setDisplayedPlaceholder('');
    setIsDeleting(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalQuery = query.trim() || displayedPlaceholder.replace('e.g. ', '');
    if (currentUser) {
      navigate(`/new-investigation?type=${searchMode}&q=${encodeURIComponent(finalQuery)}`);
    } else {
      navigate(`/auth?q=${encodeURIComponent(finalQuery)}`);
    }
  };

  return (
    <div className="hero-search-card">
      {/* Left side: Interactive Search Box */}
      <div className="hero-search-left">
        <div style={{ marginBottom: '16px' }}>
          <h2 className="hero-search-heading">Public OSINT Search Engine</h2>
          <p className="hero-search-subheading">Search and discover intelligence across multiple platforms.</p>
        </div>

        {/* Tab Switcher: Name vs Username */}
        <div className="hero-tab-container">
          <div 
            className="hero-tab-pill-slider" 
            style={{ transform: searchMode === 'username' ? 'translateX(100%)' : 'translateX(0%)' }} 
          />
          <button
            type="button"
            className={`hero-tab-btn ${searchMode === 'name' ? 'active' : ''}`}
            onClick={() => handleTabChange('name')}
          >
            <User size={15} style={{ marginRight: '6px' }} />
            Name
          </button>
          <button
            type="button"
            className={`hero-tab-btn ${searchMode === 'username' ? 'active' : ''}`}
            onClick={() => handleTabChange('username')}
          >
            <AtSign size={15} style={{ marginRight: '6px' }} />
            Username
          </button>
        </div>

        {/* Search Bar Input Form */}
        <form onSubmit={handleSearchSubmit} className="hero-input-wrapper">
          <Search className="hero-input-icon" size={18} />
          <input
            type="text"
            className="hero-input-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={displayedPlaceholder || (searchMode === 'name' ? 'e.g. Kwame Mensah, John Mahama' : 'e.g. alex_rivera')}
          />
          <button type="submit" className="hero-submit-btn">
            Search
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 500 }}>Popular Dorks:</span>
          {(searchMode === 'name' 
            ? ['"John Mahama"', '"Kwame Mensah"', 'site:linkedin.com "Engineer"']
            : ['@satoshi_n', '@alex_dev', 'site:github.com/user']
          ).map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setQuery(suggestion.replace(/^site:\S+\s*/, '').replace(/"/g, '').replace('@', ''))}
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '3px 10px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Right side: Dark Obsidian Feature Panel */}
      <div className="hero-search-right">
        <div className="hero-badge-circle">
          <div className="hero-badge-inner">
            <Target size={26} className="hero-target-icon" />
          </div>
        </div>

        <h3 className="hero-right-title">More than just search.</h3>
        <p className="hero-right-subtitle">
          Find connections. Uncover associations. See the bigger picture.
        </p>

        <div style={{ marginTop: '24px' }}>
          <button
            onClick={() => navigate(currentUser ? '/dashboard' : '/auth')}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '20px',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            Explore Platform Features <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
