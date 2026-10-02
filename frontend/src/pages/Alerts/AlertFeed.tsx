import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { ExplorePage, EmptyState } from '../../components/explore/ExploreKit';
import { COUNTRY_OPTIONS, SOCIAL_PLATFORM_OPTIONS } from '../../lib/exploreClient';
import {
  FREQUENCY_LABEL, markAlertSeen, runAlertNow, subscribeToAlert, subscribeToMatches, type Alert, type AlertMatch
} from '../../lib/alertsClient';
import { useToast } from '../../components/ui/Toast';
import { fmtDate } from '../../lib/workspace';
import { EmailStatus } from './Alerts';
import '../../styles/Alerts.css';

const sourceLabel = (id: string) => (id === 'news' ? 'News' : SOCIAL_PLATFORM_OPTIONS.find(p => p.id === id)?.label || id);

/**
 * One alert's page (the email's "View all results" link opens it): every result it has found, grouped by
 * check, newest first. Results found since the owner's previous visit are marked NEW; opening the page
 * counts them as seen.
 */
export const AlertFeedPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [alert, setAlert] = useState<Alert | null | undefined>(undefined);
  const [matches, setMatches] = useState<AlertMatch[] | null>(null);
  const [view, setView] = useState<'all' | 'new'>('all');
  const [keyword, setKeyword] = useState('all');
  const [running, setRunning] = useState(false);
  // The last visit before this one, captured once: what was found after it stays marked NEW during this visit.
  const [seenBefore, setSeenBefore] = useState<string | null | undefined>(undefined);
  const marked = useRef(false);

  useEffect(() => subscribeToAlert(id, setAlert, () => setAlert(null)), [id]);
  useEffect(() => subscribeToMatches(id, setMatches, () => setMatches([])), [id]);

  useEffect(() => {
    if (!alert || marked.current) return;
    marked.current = true;
    setSeenBefore(alert.lastSeenAt || null);
    markAlertSeen(alert.id).catch(() => undefined);
  }, [alert]);

  // New results arriving while the page is open are seen right away (and stay marked NEW here).
  useEffect(() => {
    if (alert && marked.current && (alert.unseenCount || 0) > 0) markAlertSeen(alert.id).catch(() => undefined);
  }, [alert]);

  const isNew = (m: AlertMatch) => seenBefore === null || (typeof seenBefore === 'string' && m.foundAt > seenBefore);
  const newCount = useMemo(() => (matches || []).filter(isNew).length, [matches, seenBefore]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = (matches || []).filter(m => (view === 'all' || isNew(m)) && (keyword === 'all' || m.keyword === keyword));
  // Each check stores its results with the same time, so results group by check.
  const groups = useMemo(() => {
    const out: Array<{ at: string; items: AlertMatch[] }> = [];
    shown.forEach(m => {
      const last = out[out.length - 1];
      if (last && last.at === m.foundAt) last.items.push(m);
      else out.push({ at: m.foundAt, items: [m] });
    });
    return out;
  }, [shown]);

  const checkNow = async () => {
    if (!alert) return;
    setRunning(true);
    try {
      const { result } = await runAlertNow(alert.id);
      if (result.status === 'waiting') toast.error('Not run', result.message || 'The search limit was reached.');
      else if (result.status === 'error') toast.error('Search failed', result.message || 'The search engines could not be reached.');
      else toast.success('Checked', `${result.newMatches} new result${result.newMatches === 1 ? '' : 's'}.`);
    } catch (e) {
      toast.error('Not run', e instanceof Error ? e.message : 'The alert could not be run.');
    } finally {
      setRunning(false);
    }
  };

  if (alert === undefined) return <ExplorePage title="Alert" subtitle="Loading…"><div className="ex-pad ex-muted">Loading the alert…</div></ExplorePage>;
  if (alert === null) {
    return (
      <ExplorePage title="Alert not found" subtitle="This alert does not exist, was deleted, or belongs to another account.">
        <div><Link className="ex-btn ex-btn-ghost" to="/alerts"><ArrowLeft size={15} /> All alerts</Link></div>
      </ExplorePage>
    );
  }

  const firstVisit = seenBefore === null;

  return (
    <ExplorePage title={alert.name} subtitle="Every result this alert has found, newest first. Results that arrived since your last visit are marked NEW."
      actions={<>
        <button type="button" className="ex-btn ex-btn-ghost" onClick={() => navigate('/alerts')}><ArrowLeft size={15} /> All alerts</button>
        <button type="button" className="ex-btn ex-btn-primary" onClick={checkNow} disabled={running}>
          {running ? <Loader2 size={15} className="ex-spin" /> : <RefreshCw size={15} />} Check now
        </button>
      </>}>

      <div className="ex-card ex-card-pad al-feed-head">
        <div className="al-item-title">{alert.active ? <Bell size={16} /> : <BellOff size={16} />} {alert.active ? 'Active' : 'Paused'} · {FREQUENCY_LABEL[alert.frequency]}{alert.emailEnabled ? ' · email on' : ' · email off'}</div>
        <div className="al-kws">{alert.keywords.map(k => <span key={k} className="al-kw sm">{k}</span>)}</div>
        <div className="ex-row-meta">
          <span>{alert.sources.map(sourceLabel).join(', ')}</span>
          {alert.country && <span>{COUNTRY_OPTIONS.find(c => c.code === alert.country)?.label || alert.country.toUpperCase()}</span>}
          <span>{alert.lastRunAt ? `Last checked ${fmtDate(alert.lastRunAt, true)}` : 'Not checked yet'}</span>
          {alert.active && alert.lastRunAt && <span>Next check {fmtDate(alert.nextRunAt, true)}</span>}
        </div>
        {alert.lastResult?.message && <div className="ex-notice ex-small">{alert.lastResult.message}</div>}
        <EmailStatus alert={alert} />
        <div className="al-feed-stats">
          <div><b>{matches?.length ?? '…'}</b><span>results in total</span></div>
          <div className={newCount ? 'new' : ''}><b>{matches ? newCount : '…'}</b><span>{firstVisit ? 'new (first visit)' : `new since your last visit${seenBefore ? ` (${fmtDate(seenBefore, true)})` : ''}`}</span></div>
        </div>
      </div>

      <div className="ex-card">
        <div className="ex-chips">
          <button type="button" className={`ex-chip ${view === 'all' ? 'on' : ''}`} onClick={() => setView('all')}>All results {matches ? matches.length : ''}</button>
          <button type="button" className={`ex-chip ${view === 'new' ? 'on' : ''}`} onClick={() => setView('new')}>New only {matches ? newCount : ''}</button>
          {alert.keywords.length > 1 && <span className="ex-chip-sep" />}
          {alert.keywords.length > 1 && ['all', ...alert.keywords].map(k => (
            <button key={k} type="button" className={`ex-chip ${keyword === k ? 'on' : ''}`} onClick={() => setKeyword(k)}>{k === 'all' ? 'All keywords' : k}</button>
          ))}
        </div>

        {matches === null ? <div className="ex-pad ex-muted">Loading results…</div> : groups.length === 0 ? (
          <div className="ex-pad">
            <EmptyState icon={<Bell size={22} />} title={view === 'new' ? 'Nothing new since your last visit' : 'No results yet'}>
              {view === 'new' ? 'New results appear here (and in your email) after the next check.' : alert.lastRunAt ? 'No result naming these keywords has been found yet.' : 'The first check has not run yet — press Check now.'}
            </EmptyState>
          </div>
        ) : groups.map(g => {
          const fresh = g.items.some(isNew);
          return (
            <section key={g.at} className={`al-group ${fresh ? 'fresh' : ''}`}>
              <div className="al-group-head">
                <span>Check on {fmtDate(g.at, true)} · {g.items.length} result{g.items.length === 1 ? '' : 's'}</span>
                {fresh && <span className="al-new">NEW</span>}
              </div>
              <div className="ex-list">
                {g.items.map(m => (
                  <div key={m.id} className={`ex-row ${isNew(m) ? 'al-row-new' : ''}`}>
                    <div className="ex-row-body">
                      <a className="ex-row-title al-link" href={m.url} target="_blank" rel="noopener noreferrer">{m.title} <ExternalLink size={13} /></a>
                      <div className="ex-row-meta">
                        {isNew(m) && <span className="al-new sm">NEW</span>}
                        <span className="ex-kind">{m.source}</span>
                        {m.publishedText && <span>{m.publishedText}</span>}
                        <span>Keyword: {m.keyword}</span>
                      </div>
                      {m.snippet && <div className="ex-row-snippet">{m.snippet}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        <div className="ex-pad ex-muted ex-small">
          Results come from public search engines. News is usually indexed within minutes; social posts can take hours and some are never indexed.
          Open each link to check it.
        </div>
      </div>
    </ExplorePage>
  );
};
