import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { ExternalLink, Sparkles } from 'lucide-react';
import '../../styles/LayoutFooter.css';

interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  onSearch?: (term: string) => void;
  onSignOut?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  userName = "Kingsley",
  onSignOut
}) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar userName={userName} userRole="Investigator" onSignOut={onSignOut} />
      <div className="main-content">
        <Topbar 
          onToggleMobileNav={() => setIsMobileNavOpen(prev => !prev)} 
        />
        <main className="page-wrapper">
          {children}
        </main>

        {/* Global Page Footer - Powered by SerpApi */}
        <footer className="global-page-footer">
          <div className="serpapi-sponsored-tag">
            <Sparkles size={14} className="sparkle-icon" />
            <span>Powered by</span>
            <a 
              href="https://serpapi.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="serpapi-link-bold"
              title="Visit SerpApi Official Website"
            >
              <strong>SerpApi</strong>
              <ExternalLink size={13} className="ext-icon" />
            </a>
          </div>
        </footer>
      </div>
      <MobileNav 
        isOpen={isMobileNavOpen} 
        userName={userName}
        onClose={() => setIsMobileNavOpen(false)} 
        onSignOut={onSignOut}
      />
    </div>
  );
};
