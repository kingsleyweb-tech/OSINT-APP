import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, RotateCw, ExternalLink, Search } from 'lucide-react';
import { useSearchRun } from '../../explore/useSearchRun';
import { SearchLoader } from '../../ui/SearchLoader';
import { fmtDate, hostOf, newAuditEvent, openUrl, shortUrl, urlKey } from '../../../lib/workspace';
import {
  locationSearchCost, STATUS_LABEL, TYPE_LABEL, allLocationRefs, locationSearchPlan, mapSearchUrl, refsFromSearch, sortRefs,
  engineLabel, subjectMatcher, summarise, type LocationRef, type LocationSearchLevel, type LocationStatus
} from '../../../lib/locationEvidence';
import type { Investigation } from '../../../types/investigation';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Empty, SectionHead, SourceLogo } from '../workspace/ui';

const STATUS_CLASS: Record<LocationStatus, string> = { stated: 'ok', reported: 'ok', mentioned: 'muted', unconfirmed: 'warn' };
type Run = NonNullable<NonNullable<Investigation['locationScan']>['runs']>['core'];

const StatusTag: React.FC<{ status: LocationStatus }> = ({ status }) => (
  <span className={`ws-loc-status ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
);

/**
 * The Location tab's searches across the open web, through the existing explore route. The core
 * sources run once when the tab is first opened; more sources run on request. Results are only used
 * to extract location references; nothing else is added to the case.
 */
function useLocationScan() {
  const { inv, commit } = useWorkspace();
  const { run, cancel, running, steps } = useSearchRun();
  const started = useRef(false);

  const scan = useCallback(async (level: LocationSearchLevel) => {
    const tasks = locationSearchPlan(inv, level);
    const at = new Date().toISOString();
    let result: Run;
    try {
      const out = await run(tasks.map(t => ({ key: t.key, label: t.label, capability: t.capability, query: t.query, options: t.options })));
      if (!out) return; // cancelled
      const items = tasks.flatMap(t => out[t.key]?.items || []);
      result = {
        at,
        resultsChecked: items.length,
        refs: refsFromSearch(inv, items),
        sources: tasks.map(t => {
          const r = out[t.key];
          const failed = !r || (r.engines.length > 0 && r.engines.every(e => e.status === 'error' || e.status === 'quota'));
          return {
            label: t.label,
            status: failed ? 'failed' as const : r.items.length ? 'ok' as const : 'empty' as const,
            results: r?.items.length || 0,
            ...(failed ? { error: r?.engines.find(e => e.error)?.error || 'Could not be reached' } : {})
          };
        })
      };
    } catch (e) {
      result = { at, resultsChecked: 0, refs: [], sources: [], error: e instanceof Error ? e.message : 'The location search could not be run.' };
    }
    const done = result;
    commit(
      current => ({
        ...current,
        locationScan: { ...(current.locationScan || {}), checkedAt: at, runs: { ...(current.locationScan?.runs || {}), [level]: done } }
      }),
      [newAuditEvent({
        action: level === 'core' ? 'Location search' : 'Location search (more sources)',
        object: tasks.map(t => t.label).join(', '), group: 'Searches', kind: 'system',
        detail: done.error ? `Failed: ${done.error}` : `${done.resultsChecked} results checked · ${done.refs.length} location reference${done.refs.length === 1 ? '' : 's'}`
      })]
    );
  }, [inv, run, commit]);

  useEffect(() => {
    if (started.current || inv.locationScan?.runs?.core) return undefined;
    started.current = true;
    const t = setTimeout(() => { scan('core'); }, 0);
    return () => clearTimeout(t);
  }, [inv.locationScan?.runs?.core, scan]);

  return { scan, cancel, running, steps };
}

const SourceStatus: React.FC<{ title: string; run?: Run }> = ({ title, run }) => {
  if (!run) return null;
  return (
    <div className="ws-loc-run">
      <span className="ws-sub"><b>{title}</b> · {fmtDate(run.at, true)} · {run.resultsChecked} result{run.resultsChecked === 1 ? '' : 's'} checked</span>
      {run.error ? (
        <span className="ws-loc-warn">Unable to retrieve location information: {run.error}</span>
      ) : (
        <span className="ws-loc-sources-line">
          {run.sources.map(s => (
            <span key={s.label} className={`ws-loc-src ${s.status}`} title={s.error}>
              {s.label}: {s.status === 'ok' ? `${s.results} result${s.results === 1 ? '' : 's'}` : s.status === 'empty' ? 'nothing found' : 'unable to retrieve'}
            </span>
          ))}
        </span>
      )}
    </div>
  );
};

export const LocationTab: React.FC = () => {
  const { inv } = useWorkspace();
  const { scan, cancel, running, steps } = useLocationScan();
  const [showAllRefs, setShowAllRefs] = useState(false);

  const refs = useMemo(() => allLocationRefs(inv), [inv]);
  const confirmed = useMemo(() => sortRefs(refs.filter(r => r.status !== 'unconfirmed')), [refs]);
  const unconfirmed = useMemo(() => sortRefs(refs.filter(r => r.status === 'unconfirmed')), [refs]);
  const summary = useMemo(() => summarise(refs), [refs]);
  const timeline = useMemo(() => confirmed.filter(r => r.date).sort((a, b) => Date.parse(b.date!) - Date.parse(a.date!)), [confirmed]);
  const sources = useMemo(() => {
    const m = new Map<string, { url: string; name: string; count: number }>();
    refs.forEach(r => {
      const k = urlKey(r.url);
      const cur = m.get(k) || { url: r.url, name: r.sourceName || hostOf(r.url), count: 0 };
      cur.count++;
      m.set(k, cur);
    });
    return Array.from(m.values());
  }, [refs]);

  const runs = inv.locationScan?.runs || {};
  const allRuns = [runs.core, runs.more].filter(Boolean) as NonNullable<Run>[];
  const everySourceFailed = allRuns.length > 0 && allRuns.every(r => Boolean(r.error) || (r.sources.length > 0 && r.sources.every(s => s.status === 'failed')));
  const subject = subjectMatcher(inv).label;
  const shownRefs = showAllRefs ? confirmed : confirmed.slice(0, 12);

  if (running) return <SearchLoader title={`Searching public sources for location information about ${subject}`} steps={steps} onCancel={cancel} />;

  return (
    <div className="ws-loc">
      <SectionHead title="Location summary" count={summary.length} noRule right={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="ws-btn ws-btn-sm" onClick={() => scan('core')}><RotateCw size={14} /> Search again</button>
          <button type="button" className="ws-btn ws-btn-sm" onClick={() => scan('more')} title={`${locationSearchCost(inv, 'more')} SerpApi searches`}>
            <Search size={14} /> {runs.more ? 'Search more sources again' : 'Search more sources'}
          </button>
        </div>
      } />
      <p className="ws-sub ws-loc-intro">
        Places that public sources connect to {subject}, across the open web — websites, news, Google Maps, videos, images and social posts —
        with what each source actually says. A place is listed only when a source states it next to the person or on their own profile, and a
        page is attributed to this person only when it is one of their profiles or pages, or also mentions their username, profile or organisation.
      </p>

      {/* Which sources were searched, and which could not be reached: a failed source is not "no location". */}
      <div className="ws-loc-status-line">
        <SourceStatus title="Web, Bing, news and Google Maps" run={runs.core} />
        <SourceStatus title="Videos, images and social posts" run={runs.more} />
        {!runs.more && (
          <span className="ws-sub">
            Videos (YouTube, Google Videos), images (Google, Bing) and social posts (X, Instagram, TikTok, Threads) have not been searched yet —
            use Search more sources ({locationSearchCost(inv, 'more')} SerpApi searches). The profiles, pages and news already in this case are always included.
          </span>
        )}
      </div>

      {summary.length === 0 ? (
        <Empty title="No reliable public location information found">
          <span className="ws-sub" style={{ display: 'block', lineHeight: 1.6 }}>
            {everySourceFailed
              ? 'The location searches could not be completed, and the profiles, pages and news in this case do not state a location for this person. Try Search again later.'
              : `The public sources checked do not state where ${subject} lives, works or comes from. Profiles without a location, places mentioned without the person's name, and pages that may be about someone else with the same name are not counted.`}
          </span>
        </Empty>
      ) : (
        <table className="ws-table ws-loc-table">
          <thead><tr><th>Location</th><th>What the sources say</th><th>Independent sources</th><th /></tr></thead>
          <tbody>
            {summary.map(s => (
              <tr key={s.key}>
                <td><b className="ws-loc-place"><MapPin size={14} /> {s.place}</b></td>
                <td>
                  {s.types.map(t => TYPE_LABEL[t]).join(' · ')}
                  <div className="ws-sub">{STATUS_LABEL[s.best.status]} · {s.best.sourceKind}</div>
                  {s.agreeing.length > 0 && (
                    <div className="ws-sub">{s.agreeing.length} same-name page{s.agreeing.length === 1 ? '' : 's'} also name this place (not counted)</div>
                  )}
                </td>
                <td>
                  <b className="ws-mono">{s.sites.length}</b>
                  <div className="ws-sub ws-loc-sites" title={s.sites.join(', ')}>{s.sites.join(' · ')}</div>
                </td>
                <td><a className="ws-link" href={mapSearchUrl(s.place)} target="_blank" rel="noopener noreferrer">View on map <ExternalLink size={12} /></a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmed.length > 0 && (
        <section className="ws-loc-section">
          <SectionHead title="Location evidence" count={confirmed.length} />
          <p className="ws-sub ws-loc-intro">
            Residence, workplace, hometown, listings and mentioned places are kept apart. A place mentioned in an article, video or post is not treated as where the person lives.
          </p>
          <div className="ws-loc-list">
            {shownRefs.map(r => <RefRow key={r.id} r={r} />)}
          </div>
          {confirmed.length > 12 && (
            <button type="button" className="ws-link" style={{ marginTop: 10 }} onClick={() => setShowAllRefs(v => !v)}>
              {showAllRefs ? 'Show fewer' : `Show all ${confirmed.length} references`}
            </button>
          )}
        </section>
      )}

      {timeline.length >= 2 && (
        <section className="ws-loc-section">
          <SectionHead title="Location timeline" count={timeline.length} />
          <p className="ws-sub ws-loc-intro">
            Dated public references to places, newest first. This is when sources mentioned each place — not a record of the person’s movements.
          </p>
          <ol className="ws-loc-timeline">
            {timeline.map(r => (
              <li key={r.id}>
                <span className="ws-mono ws-sub">{fmtDate(r.date)}</span>
                <span><b>{r.place}</b> <span className="ws-sub">· {TYPE_LABEL[r.type]} · {r.sourceKind}</span></span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {unconfirmed.length > 0 && (
        <section className="ws-loc-section">
          <SectionHead title="Same-name pages (not linked to this identity)" count={unconfirmed.length} />
          <p className="ws-sub ws-loc-intro">
            These pages name someone called {subject} but nothing on them ties them to this person’s profiles, usernames or organisations.
            They may describe a different person and are not included in the summary. Add the page to the case if you confirm it is the same person.
          </p>
          <div className="ws-loc-list">
            {unconfirmed.map(r => <RefRow key={r.id} r={r} />)}
          </div>
        </section>
      )}

      {sources.length > 0 && (
        <section className="ws-loc-section">
          <SectionHead title="Sources" count={sources.length} />
          <div className="ws-loc-sources">
            {sources.map(s => (
              <div key={s.url} className="ws-loc-source">
                <SourceLogo url={s.url} platform={s.name} />
                <span className="name">{s.name}</span>
                <button type="button" className="ws-url ws-trunc" onClick={() => openUrl(s.url)} title={s.url}>{shortUrl(s.url)}</button>
                <span className="ws-sub">{s.count} reference{s.count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const RefRow: React.FC<{ r: LocationRef }> = ({ r }) => (
  <div className="ws-loc-ref">
    <div className="ws-loc-ref-head">
      <b className="ws-loc-place"><MapPin size={14} /> {r.place}</b>
      <span className="ws-tag">{TYPE_LABEL[r.type]}</span>
      <StatusTag status={r.status} />
    </div>
    <div className="ws-loc-ref-body">
      <div className="ws-sub">
        <SourceLogo url={r.url} platform={r.sourceName} /> {r.sourceKind}{r.sourceName && !r.sourceKind.includes(r.sourceName) ? ` · ${r.sourceName}` : ''}{r.date ? ` · ${fmtDate(r.date)}` : ''}{r.engine ? ` · found by ${engineLabel(r.engine)}` : ''}
      </div>
      <blockquote className="ws-loc-quote">“{r.evidence}”</blockquote>
      <div className="ws-sub ws-loc-rel">{r.relationship}</div>
      <button type="button" className="ws-url" onClick={() => openUrl(r.url)} title={r.url}>{shortUrl(r.url)}</button>
    </div>
  </div>
);
