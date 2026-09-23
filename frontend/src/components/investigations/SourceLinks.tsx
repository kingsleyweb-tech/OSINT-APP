import React from 'react';
import { ExternalLink } from 'lucide-react';
import { PlatformIcon } from '../ui/PlatformIcon';
import '../../styles/SourceLinks.css';

interface SourceLinkItem {
  title: string;
  url: string;
}

interface SourceLinksProps {
  links: SourceLinkItem[];
}

export const SourceLinks: React.FC<SourceLinksProps> = ({ links }) => {
  return (
    <div className="source-links-section">
      <h4 className="section-title">Verified Public Sources</h4>
      <div className="source-links-grid">
        {links.map((link, idx) => (
          <a 
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link-card"
          >
            <div className="source-card-header">
              <div className="source-title-group">
                <PlatformIcon domain={link.url} size={16} />
                <span className="source-link-title">{link.title}</span>
              </div>
              <ExternalLink size={14} className="external-icon" />
            </div>
            <span className="source-url-text">{link.url}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
