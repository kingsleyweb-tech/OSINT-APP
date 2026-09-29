import React, { useEffect, useState } from 'react';
import '../../styles/SearchLoader.css';
import { RadarLoader } from './RadarLoader';

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
 * with no sources the radar shows the elapsed time.
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
      <RadarLoader
        className="sl-radar"
        size={200}
        label={pct != null ? `${pct}%` : `${elapsed}s`}
        sub={steps.length ? `${finished} / ${steps.length}` : 'WORKING'}
        blips={steps.map(s => s.state)}
      />
      <div className="sl-text">
        <h2>{title || (query ? `Searching for “${query}”` : 'Searching…')}</h2>
        <p>{status}{steps.length > 0 && elapsed >= 5 ? ` · ${elapsed}s` : ''}</p>
      </div>
      {steps.length > 0 && (
        <div className="sl-steps">
          {steps.map(s => (
            <div key={s.id} className="sl-step">
              <span className="sl-step-icon">
                {s.state === 'active' && (
                  <span className="sl-dot sl-dot-active" />
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
