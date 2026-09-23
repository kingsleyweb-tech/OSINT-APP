import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import '../../styles/NewInvestigationForm.css';
import { UsernameDiscoveryDropdown } from './UsernameDiscoveryDropdown';

interface NewInvestigationFormProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export const NewInvestigationForm: React.FC<NewInvestigationFormProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'username' | 'email' | 'domain'>('name');
  const [showDropdown, setShowDropdown] = useState(false);
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const typeOptions = [
    { value: 'name', label: 'Full Name' },
    { value: 'username', label: 'Username' },
    { value: 'email', label: 'Email' },
    { value: 'domain', label: 'Domain / URL' },
  ] as const;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSearch(trimmed);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchType === 'username' && val.trim().length >= 2) {
      setDiscoveryQuery(val.trim());
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const placeholder: Record<string, string> = {
    name: 'e.g. John Smith, Jane Doe...',
    username: 'e.g. @johndoe, john_doe...',
    email: 'e.g. john@example.com...',
    domain: 'e.g. example.com, https://...',
  };

  return (
    <div className="inv-form-container">
      <div className="inv-form-header">
        <h1 className="inv-form-title">New Investigation</h1>
        <p className="inv-form-subtitle">Enter a target identity to begin an OSINT scan across connected public data sources.</p>
      </div>

      <form className="inv-form" onSubmit={handleSubmit}>
        <div className="type-tabs">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`type-tab ${searchType === opt.value ? 'active' : ''}`}
              onClick={() => { setSearchType(opt.value); setShowDropdown(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="inv-input-row" ref={dropdownRef}>
          <div className="inv-input-wrap">
            <Search className="inv-input-icon" size={16} />
            <input
              id="investigation-search-input"
              type="text"
              className="inv-input"
              placeholder={placeholder[searchType]}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              disabled={isLoading}
              autoComplete="off"
            />
            {showDropdown && searchType === 'username' && (
              <UsernameDiscoveryDropdown
                query={discoveryQuery}
                onSelect={(val) => { setQuery(val); setShowDropdown(false); }}
              />
            )}
          </div>
          <button
            id="investigation-submit-btn"
            type="submit"
            className="inv-submit-btn"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <><Loader2 className="spin" size={16} /> Scanning...</>
            ) : (
              <><Search size={16} /> Begin Scan</>
            )}
          </button>
        </div>

        <div className="inv-disclaimer">
          <AlertCircle size={12} />
          <span>Only publicly available information is collected. Results reflect real-time open-source data.</span>
        </div>
      </form>
    </div>
  );
};
