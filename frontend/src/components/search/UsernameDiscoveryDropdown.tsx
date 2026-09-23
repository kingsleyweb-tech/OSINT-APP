import React from 'react';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import '../../styles/UsernameDiscoveryDropdown.css';
import { useUsernameDiscovery } from '../../hooks/useUsernameDiscovery';

interface Props {
  query: string;
  onSelect: (value: string) => void;
}

export const UsernameDiscoveryDropdown: React.FC<Props> = ({ query, onSelect }) => {
  const { isSearching, items, foundCount, checkedCount } = useUsernameDiscovery({
    username: query,
    enabled: query.length >= 3,
  });

  const foundItems = items.filter(i => i.status === 'found' && !i.isVariation);

  if (items.length === 0 && !isSearching) return null;

  return (
    <div className="discovery-dropdown">
      <div className="discovery-header">
        {isSearching ? (
          <span className="discovery-status searching">
            <Loader2 className="spin" size={12} /> Scanning {checkedCount} platforms...
          </span>
        ) : (
          <span className="discovery-status done">
            Found {foundCount} profile{foundCount !== 1 ? 's' : ''} across {checkedCount} platforms
          </span>
        )}
      </div>

      <div className="discovery-list">
        {foundItems.map((item) => (
          <a
            key={item.id}
            href={item.profileUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="discovery-item found"
            onClick={(e) => { e.preventDefault(); onSelect(query); }}
          >
            <CheckCircle size={12} className="di-icon found" />
            <span className="di-platform">{item.platform}</span>
            <span className="di-handle">{item.username}</span>
            <ExternalLink size={10} className="di-ext" />
          </a>
        ))}
        {items.filter(i => i.status === 'no_match').slice(0, 3).map((item) => (
          <div key={item.id} className="discovery-item not-found">
            <XCircle size={12} className="di-icon not-found" />
            <span className="di-platform">{item.platform}</span>
            <span className="di-handle dim">Not found</span>
          </div>
        ))}
      </div>
    </div>
  );
};
