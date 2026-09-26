import React, { useEffect, useState } from 'react';
import '../../styles/SearchLoader.css';

export type LoaderStepState = 'waiting' | 'active' | 'done' | 'empty' | 'failed';

export interface LoaderStep {
  id: string;
  label: string;
  state: LoaderStepState;
  note?: string;
}

interface SearchLoaderProps {
  /** What is being searched, shown as: Searching for "…" */
  query?: string;
  /** Replaces the default title. */
  title?: string;
  /** Sources being checked. Progress is the share of sources that have finished. */
  steps?: LoaderStep[];
  onCancel?: () => void;
  /** Full-screen overlay instead of an inline card. */
  overlay?: boolean;
}

const FINISHED: LoaderStepState[] = ['done', 'empty', 'failed'];

/**
 * The one loader used for every search. Progress only moves when a source really finishes;
 * with no sources it shows an indeterminate spinner and the elapsed time.
 */
export const SearchLoader: React.FC<SearchLoaderProps> = ({ query, title, steps = [], onCancel, overlay }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const finished = steps.filter(s => FINISHED.includes(s.state)).length;
  const withResults = steps.filter(s => s.state === 'done').length;
  const pct = steps.length ? Math.round((finished / steps.length) * 100) : null;
  const status = steps.length
    ? finished === steps.length
      ? 'Done. Building the results…'
      : `Checked ${finished} of ${steps.length} source${steps.length === 1 ? '' : 's'} · ${withResults} with results so far`
    : `Working… ${elapsed}s`;

  const card = (
    <section className="sl-card" role="status" aria-live="polite" aria-busy="true">
      <div className="sl-ring">
        <svg className="sl-spin" width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
          <circle cx="48" cy="48" r="42" stroke="var(--sl-track)" strokeWidth="6" />
          <path d="M90 48A42 42 0 0 0 48 6" stroke="var(--sl-accent)" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <svg className="sl-spin-rev" width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
          <path d="M48 70a22 22 0 0 1-22-22" stroke="var(--sl-accent-2)" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <span className="sl-pct">{pct != null ? `${pct}%` : ''}</span>
      </div>
      <div className="sl-text">
        <h2>{title || (query ? `Searching for “${query}”` : 'Searching…')}</h2>
        <p>{status}{steps.length > 0 && elapsed >= 5 ? ` · ${elapsed}s` : ''}</p>
      </div>
      {pct != null && (
        <div className="sl-bar"><div style={{ width: `${Math.max(pct, 4)}%` }} /></div>
      )}
      {steps.length > 0 && (
        <div className="sl-steps">
          {steps.map(s => (
            <div key={s.id} className="sl-step">
              <span className="sl-step-icon">
                {s.state === 'active' && (
                  <svg className="sl-spin" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--sl-track)" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="var(--sl-accent)" strokeWidth="3" strokeLinecap="round" /></svg>
                )}
                {s.state === 'waiting' && <span className="sl-dot" />}
                {FINISHED.includes(s.state) && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill={s.state === 'done' ? '#2F7A45' : s.state === 'failed' ? '#B42318' : '#A8A29E'} />
                    <path d={s.state === 'done' ? 'M7.5 12.5l3 3 6-6.5' : s.state === 'failed' ? 'M9 9l6 6M15 9l-6 6' : 'M8 12h8'} stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="sl-step-label">{s.label}</span>
              <span className={`sl-step-note sl-note-${s.state}`}>
                {s.note || (s.state === 'active' ? 'Checking…' : s.state === 'waiting' ? 'Waiting' : s.state === 'empty' ? 'No results' : s.state === 'failed' ? 'Failed' : 'Done')}
              </span>
            </div>
          ))}
        </div>
      )}
      {onCancel && <button type="button" className="sl-cancel" onClick={onCancel}>Cancel search</button>}
    </section>
  );

  return overlay ? <div className="sl-overlay">{card}</div> : card;
};
