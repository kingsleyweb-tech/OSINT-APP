import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, ExternalLink, Search, Users } from 'lucide-react';
import { SourceLogo } from './ui';
import { shortUrl } from '../../../lib/workspace';

export interface SimilarItem {
  key: string;
  title: string;
  platform?: string;
  url: string;
  detail?: string;
  /** Opens a search about this account that creates its own investigation (profiles only). */
  investigateTo?: string;
}

/**
 * Accounts whose handle only resembles the searched username. They belong to other people, so they
 * are listed apart from the subject's own profiles and activity, collapsed by default.
 */
export const SimilarAccounts: React.FC<{ items: SimilarItem[]; what: 'profiles' | 'activity'; defaultOpen?: boolean }> = ({ items, what, defaultOpen }) => {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  if (items.length === 0) return null;
  return (
    <section className="ws-similar">
      <button type="button" className="ws-similar-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Users size={16} />
        <span>
          <b>{what === 'profiles' ? 'Similar accounts' : 'Activity of similar accounts'} · {items.length}</b>
          <span className="ws-sub"> — other people with a similar username, not confirmed as this person.{what === 'profiles' ? ' Click one to investigate that person.' : ' Open to check.'}</span>
        </span>
      </button>
      {open && (
        <div className="ws-similar-list">
          {items.map(i => {
            const body = (
              <>
                <SourceLogo url={i.url} platform={i.platform} />
                <span className="ws-similar-text">
                  <span className="ws-cell-title">{i.title}</span>
                  <span className="ws-cell-sub">{i.platform ? `${i.platform} · ` : ''}{shortUrl(i.url)}{i.detail ? ` · ${i.detail}` : ''}</span>
                </span>
                <span className="ws-tag">Other person</span>
              </>
            );
            if (!i.investigateTo) {
              return <a key={i.key} className="ws-similar-row" href={i.url} target="_blank" rel="noopener noreferrer">{body}<ExternalLink size={14} /></a>;
            }
            // Clicking the account opens its own investigation; the icon opens the profile itself.
            return (
              <div key={i.key} className="ws-similar-row">
                <Link className="ws-similar-open" to={i.investigateTo} title="Search this account and open an investigation about this person">
                  {body}
                  <span className="ws-similar-go"><Search size={13} /> Investigate</span>
                </Link>
                <a href={i.url} target="_blank" rel="noopener noreferrer" aria-label="Open the profile" title="Open the profile"><ExternalLink size={14} /></a>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
