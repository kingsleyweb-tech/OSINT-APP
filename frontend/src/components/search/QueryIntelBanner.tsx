import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronDown, ChevronRight, ExternalLink, FolderOpen, AlertTriangle } from 'lucide-react';
import { CONFIDENCE_LABEL, type QueryIntel } from '../../lib/queryIntelClient';
import type { SearchMode } from '../../types/user';
import '../../styles/QueryIntel.css';

interface Props {
  intel: QueryIntel | null;
  /** Run a search for this query (a suggestion or a related search). */
  onSearch: (query: string) => void;
  /** Run the original query as typed, without correction. */
  onSearchOriginal: () => void;
  /** Number of results the main search returned, for the search path. */
  resultCount?: number;
  /** Sources that ran, for the search path. */
  sources?: string[];
  /** The investigator's cases, to link "you already have a case". */
  cases?: Array<{ id: string; name: string }>;
}

/** Intelligent / Precise switch shown next to a search form. */
export const SearchModeToggle: React.FC<{ mode: SearchMode; onChange: (m: SearchMode) => void }> = ({ mode, onChange }) => (
  <div className="qi-mode" role="group" aria-label="Search mode">
    <button type="button" className={mode === 'intelligent' ? 'on' : ''} aria-pressed={mode === 'intelligent'} onClick={() => onChange('intelligent')}
      title="Checks spelling first and suggests corrections (1 extra search, cached)"><Sparkles size={13} /> Intelligent</button>
    <button type="button" className={mode === 'precise' ? 'on' : ''} aria-pressed={mode === 'precise'} onClick={() => onChange('precise')}
      title="Searches exactly what you type">Precise</button>
  </div>
);

/**
 * "Showing results for … / Did you mean …" with the confidence, the reason, the search path,
 * results for the original spelling, related searches and matching cases. Similar spelling is not
 * proof of identity; the wording says so.
 */
export const QueryIntelBanner: React.FC<Props> = ({ intel, onSearch, onSearchOriginal, resultCount, sources, cases = [] }) => {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!intel || intel.mode === 'precise') return null;

  const top = intel.corrections[0];
  const suggestions = intel.corrections.filter(c => c.query.toLowerCase() !== intel.searchQuery.toLowerCase());
  const probeFailed = intel.probe.ran && intel.probe.error;
  const caseLinks = intel.caseMatches.map(m => ({ ...m, id: cases.find(c => c.name === m.name)?.id }));
  const hide = dismissed === intel.original;
  // The main search found nothing: show the web results the spelling check already fetched (no extra search).
  const webFallback = resultCount === 0 && intel.probe.items.length > 0;
  const nothing = !intel.applied && suggestions.length === 0 && intel.relatedSearches.length === 0 && caseLinks.length === 0 && !probeFailed && !webFallback;
  if (nothing) return null;

  return (
    <section className="qi-banner" aria-live="polite">
      {intel.applied && top && (
        <div className="qi-line">
          <Sparkles size={15} className="qi-icon" />
          <span>Showing results for <b>{intel.searchQuery}</b></span>
          <span className={`qi-pill qi-${top.confidence}`}>{CONFIDENCE_LABEL[top.confidence]}</span>
          <span className="qi-muted">· Search instead for </span>
          <button type="button" className="qi-link" onClick={onSearchOriginal}>{intel.original}</button>
        </div>
      )}

      {intel.applied && suggestions.length > 0 && (
        <div className="qi-line">
          <span className="qi-muted" style={{ paddingLeft: 23 }}>Other spellings in the results:</span>
          {suggestions.slice(0, 3).map(c => (
            <button key={c.query} type="button" className="qi-suggest" onClick={() => onSearch(c.query)} title={c.reason}>
              {c.query} <span className={`qi-pill qi-${c.confidence}`}>{c.confidence}</span>
            </button>
          ))}
        </div>
      )}

      {!intel.applied && suggestions.length > 0 && !hide && (
        <div className="qi-line">
          <Sparkles size={15} className="qi-icon" />
          <span>{intel.ambiguous ? 'Several spellings are possible:' : 'Did you mean'}</span>
          {suggestions.slice(0, 3).map((c, i) => (
            <button key={c.query} type="button" className={`qi-suggest${i === 0 ? ' first' : ''}`} onClick={() => onSearch(c.query)} title={c.reason}>
              {c.query} <span className={`qi-pill qi-${c.confidence}`}>{c.confidence}</span>
            </button>
          ))}
          {!intel.ambiguous && <span className="qi-muted">?</span>}
          <button type="button" className="qi-link" onClick={() => setDismissed(intel.original)}>Keep “{intel.original}”</button>
        </div>
      )}

      {(intel.applied || suggestions.length > 0) && top && !hide && (
        <div className="qi-reason">
          {intel.applied ? 'Search expanded' : 'Suggestion'} · {top.reason}
          {intel.kind === 'name' && ' A similar name is not proof that it is the same person.'}
        </div>
      )}

      {probeFailed && (
        <div className="qi-line qi-warn"><AlertTriangle size={14} /> Spelling check unavailable ({intel.probe.quotaExhausted ? 'SerpApi quota exhausted' : intel.probe.error}); searched exactly as typed.</div>
      )}

      {caseLinks.map(m => (
        <div key={m.name} className="qi-line qi-case">
          <FolderOpen size={14} />
          <span>{m.relation === 'same' ? 'You already have a case for' : 'Your case with a similar name:'} <b>{m.name}</b></span>
          {m.id && <Link to={`/investigations/${m.id}`} className="qi-link">Open case</Link>}
        </div>
      ))}

      {webFallback && (
        <div className="qi-web">
          <div className="qi-muted">Nothing relevant came back from this search's sources. Google web results for “{intel.original}” (from the spelling check, no extra search):</div>
          {intel.probe.items.slice(0, 8).map(p => (
            <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="qi-web-row">
              {p.thumbnail && <img src={p.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />}
              <span>
                <b>{p.title}</b> <ExternalLink size={11} />
                <span className="qi-muted"> · {p.platform || p.domain}</span>
                {p.snippet && <span className="qi-web-snippet">{p.snippet}</span>}
              </span>
            </a>
          ))}
        </div>
      )}

      {intel.relatedSearches.length > 0 && (
        <div className="qi-related">
          <span className="qi-muted">Related searches:</span>
          {intel.relatedSearches.slice(0, 8).map(r => (
            <button key={r} type="button" className="qi-chip" onClick={() => onSearch(r)}>{r}</button>
          ))}
        </div>
      )}

      {intel.probe.ran && !probeFailed && (
        <>
          <button type="button" className="qi-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Search path{intel.applied ? ` and results for “${intel.original}”` : ''}
          </button>
          {open && (
            <div className="qi-path">
              <ol>
                <li><span>Original query</span><b>{intel.original}</b><em>{intel.originalSupport} of the top results use this exact spelling</em></li>
                {top && <li><span>Correction</span><b>{top.query}</b><em>{CONFIDENCE_LABEL[top.confidence]} · {top.source === 'google' ? "Google's suggestion" : 'learned from the results'}</em></li>}
                {intel.corrections.length > 1 && <li><span>Other spellings</span><b>{intel.corrections.slice(1).map(c => c.query).join(' · ')}</b></li>}
                <li><span>Searched</span><b>{intel.searchQuery}</b><em>{intel.applied ? 'correction applied (high confidence)' : 'as typed'}</em></li>
                {sources && sources.length > 0 && <li><span>Sources</span><b>{sources.length}</b><em>{sources.slice(0, 6).join(', ')}{sources.length > 6 ? '…' : ''}</em></li>}
                {resultCount != null && <li><span>Results</span><b>{resultCount}</b></li>}
                <li><span>Cost</span><b>{intel.probe.searchesUsed}</b><em>search for the spelling check{intel.probe.searchesUsed === 0 ? ' (from cache)' : ''}</em></li>
              </ol>
              {top && top.evidence.length > 0 && (
                <div className="qi-evidence">
                  <span className="qi-muted">Evidence for “{top.query}”:</span>
                  {top.evidence.map(e => <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer">{e.title} <ExternalLink size={11} /></a>)}
                </div>
              )}
              {intel.applied && intel.probe.items.length > 0 && (
                <div className="qi-evidence">
                  <span className="qi-muted">Top Google results for the original spelling “{intel.original}”:</span>
                  {intel.probe.items.slice(0, 8).map(p => <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">{p.title} <span className="qi-muted">· {p.domain}</span> <ExternalLink size={11} /></a>)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};
