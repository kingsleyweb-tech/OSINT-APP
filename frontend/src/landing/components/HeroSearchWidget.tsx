import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ar, SearchIcon } from './site/Icons';

interface HeroSearchWidgetProps {
  currentUser?: unknown;
}

type Mode = 'name' | 'username';

const SAMPLES: Record<Mode, string[]> = {
  name: ['"John Mahama"', '"Kwame Mensah"', 'site:linkedin.com "Engineer"'],
  username: ['@satoshi_n', '@alex_dev', 'site:github.com/user'],
};

/** Hero "Start an investigation" box: signed-in users go to New Investigation, others to sign-in. */
export const HeroSearchWidget: React.FC<HeroSearchWidgetProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('name');
  const [query, setQuery] = useState('');

  const pickMode = (next: Mode) => {
    setMode(next);
    setQuery('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    if (currentUser) {
      // The New Investigation page expects "Name" or "Username".
      navigate(`/new-investigation?type=${mode === 'username' ? 'Username' : 'Name'}&q=${encodeURIComponent(q)}`);
    } else {
      navigate(`/auth?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <form className="finder brk" role="search" aria-label="Start an investigation" onSubmit={submit}>
      <div className="finder-top">
        <span className="label">Start an investigation</span>
        <div className="segs">
          <button type="button" className={`seg ${mode === 'name' ? 'on' : ''}`} aria-pressed={mode === 'name'} onClick={() => pickMode('name')}>Name</button>
          <button type="button" className={`seg ${mode === 'username' ? 'on' : ''}`} aria-pressed={mode === 'username'} onClick={() => pickMode('username')}>Username</button>
        </div>
      </div>
      <div className="finder-row">
        <span style={{ flex: 'none', display: 'grid' }}><SearchIcon /></span>
        <input
          ref={inputRef}
          type="text"
          aria-label={mode === 'name' ? 'Name or organisation to search' : 'Username to search'}
          placeholder={mode === 'name' ? 'Search a name or an organisation — e.g. Kwame Mensah, UPSA' : 'Search a username — e.g. alex_rivera99'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-br">Search <Ar /></button>
      </div>
      <div className="tries">
        <span className="label">Try</span>
        {SAMPLES[mode].map((t) => (
          <button key={t} type="button" onClick={() => setQuery(t.replace(/^site:\S+\s*/, '').replace(/"/g, '').replace('@', '') || t.split('/').pop() || '')}>{t}</button>
        ))}
      </div>
    </form>
  );
};
