import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, ExternalLink, Info, Loader2, Mail, Pause, Pencil, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { ExplorePage, Field, Segmented, EmptyState } from '../../components/explore/ExploreKit';
import { COUNTRY_OPTIONS, LANGUAGE_OPTIONS, SOCIAL_PLATFORM_OPTIONS } from '../../lib/exploreClient';
import {
  createAlert, deleteAlert, FREQUENCY_LABEL, getAlertsStatus, runAlertNow, searchesPerMonth, searchesPerRun, sendTestEmail,
  setAlertActive, subscribeToAlerts, subscribeToMatches, updateAlert,
  type Alert, type AlertFrequency, type AlertInput, type AlertMatch, type AlertsServerStatus
} from '../../lib/alertsClient';
import { auth } from '../../firebase/config';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmModal';
import { fmtDate } from '../../lib/workspace';
import { CostHint } from '../../components/ui/CostHint';
import { fmtRange } from '../../lib/searchCosts';
import '../../styles/Alerts.css';

const SOURCE_OPTIONS = [{ id: 'news', label: 'News (Google + Bing)' }, ...SOCIAL_PLATFORM_OPTIONS.map(p => ({ id: p.id, label: p.label }))];
const sourceLabel = (id: string) => SOURCE_OPTIONS.find(s => s.id === id)?.label.replace(' (Google + Bing)', '') || id;
const EMPTY: AlertInput = { name: '', keywords: [], sources: ['news', 'x'], country: '', language: '', frequency: 'daily', emailEnabled: true };

const AlertForm: React.FC<{ initial?: Alert; budgetPerDay?: number; onDone: (createdId?: string) => void }> = ({ initial, budgetPerDay, onDone }) => {
  const toast = useToast();
  const [v, setV] = useState<AlertInput>(() => initial
    ? { name: initial.name, keywords: initial.keywords, sources: initial.sources, country: initial.country || '', language: initial.language || '', frequency: initial.frequency, emailEnabled: initial.emailEnabled }
    : EMPTY);
  const [kw, setKw] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof AlertInput>(k: K, val: AlertInput[K]) => setV(p => ({ ...p, [k]: val }));

  const addKeyword = () => {
    const k = kw.trim().replace(/\s+/g, ' ');
    if (k.length < 2 || k.length > 80 || v.keywords.length >= 5 || v.keywords.some(x => x.toLowerCase() === k.toLowerCase())) return;
    set('keywords', [...v.keywords, k]);
    setKw('');
  };
  const toggleSource = (id: string) => set('sources', v.sources.includes(id) ? v.sources.filter(s => s !== id) : [...v.sources, id]);

  const pending = kw.trim().length >= 2 && v.keywords.length < 5 ? [...v.keywords, kw.trim()] : v.keywords;
  const perRun = searchesPerRun({ keywords: pending, sources: v.sources, country: v.country });
  const perMonth = searchesPerMonth({ keywords: pending, sources: v.sources, frequency: v.frequency, country: v.country });
  // An alert whose smallest check is above the daily alert limit could never run.
  const tooBig = typeof budgetPerDay === 'number' && perRun.min > budgetPerDay;
  const valid = pending.length >= 1 && v.sources.length >= 1 && !tooBig;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    const input: AlertInput = { ...v, keywords: pending, name: v.name.trim() || pending.join(', ').slice(0, 60), country: v.country || undefined, language: v.language || undefined };
    setSaving(true);
    try {
      if (initial) {
        await updateAlert(initial.id, input);
        toast.success('Alert updated', input.name);
        onDone();
      } else {
        const id = await createAlert(input);
        toast.success('Alert created', 'Searching for what is already published…');
        onDone(id);
      }
    } catch {
      toast.error('Not saved', 'The alert could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ex-card ex-card-pad al-form" onSubmit={save}>
      <div className="al-form-head">
        <b>{initial ? 'Edit alert' : 'New alert'}</b>
        <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" onClick={() => onDone()} aria-label="Close"><X size={15} /></button>
      </div>
      <div className="ex-form">
        <Field label="Alert name (optional)" htmlFor="al-name" grow>
          <input id="al-name" className="ex-input" value={v.name} maxLength={60} onChange={e => set('name', e.target.value)} placeholder="e.g. Accra protests" />
        </Field>
        <Field label="Keywords (up to 5) — press Enter to add" htmlFor="al-kw" grow>
          <div className="al-kw-box">
            {v.keywords.map(k => (
              <span key={k} className="al-kw">{k}<button type="button" onClick={() => set('keywords', v.keywords.filter(x => x !== k))} aria-label={`Remove ${k}`}><X size={12} /></button></span>
            ))}
            {v.keywords.length < 5 && (
              <input id="al-kw" className="al-kw-input" value={kw} maxLength={80} placeholder={v.keywords.length ? 'Add another' : 'e.g. #OccupyAccra or "Accra protest"'}
                onChange={e => setKw(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(); } }} onBlur={addKeyword} />
            )}
          </div>
        </Field>
      </div>

      <div className="al-block">
        <span className="ex-label">Sources</span>
        <div className="al-sources">
          {SOURCE_OPTIONS.map(s => (
            <button key={s.id} type="button" className={`ex-chip ${v.sources.includes(s.id) ? 'on' : ''}`} aria-pressed={v.sources.includes(s.id)} onClick={() => toggleSource(s.id)}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="ex-form">
        <Field label="Country" htmlFor="al-country">
          <select id="al-country" className="ex-input ex-select" value={v.country || ''} onChange={e => set('country', e.target.value)}>
            {COUNTRY_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Language" htmlFor="al-lang">
          <select id="al-lang" className="ex-input ex-select" value={v.language || ''} onChange={e => set('language', e.target.value)}>
            {LANGUAGE_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Check">
          <Segmented<AlertFrequency> label="How often" value={v.frequency} onChange={f => set('frequency', f)}
            options={(['daily', '12h', '6h'] as AlertFrequency[]).map(f => ({ value: f, label: FREQUENCY_LABEL[f] }))} />
        </Field>
        <label className="al-toggle">
          <input type="checkbox" checked={v.emailEnabled} onChange={e => set('emailEnabled', e.target.checked)} /> Email me new matches
        </label>
      </div>

      <div className="al-estimate">
        <CostHint range={perRun} what="Each check" note={<>About <b>{fmtRange(perMonth)}</b> tokens a month at this frequency.</>} />
        {tooBig && <div className="al-warn"><b>Too many sources for the daily alert limit.</b> Each check needs at least {perRun.min} searches, but alerts may use {budgetPerDay} a day. Untick some sources or remove keywords (e.g. News + 2–3 platforms).</div>}
        {!tooBig && perMonth.min > 120 && <span className="al-warn">This is high for the free SerpApi plan (250/month); choose fewer keywords, sources or checks.</span>}
        <div className="ex-muted ex-small">Emails go only to your account email{auth.currentUser?.email ? <> (<b>{auth.currentUser.email}</b>)</> : ''}. Repeat searches within 12 hours are free.</div>
      </div>

      <div className="al-form-actions">
        <button type="submit" className="ex-btn ex-btn-primary" disabled={!valid || saving}>
          {saving ? <Loader2 size={15} className="ex-spin" /> : <Bell size={15} />} {initial ? 'Save changes' : 'Create alert'}
        </button>
        <button type="button" className="ex-btn ex-btn-ghost" onClick={() => onDone()}>Cancel</button>
      </div>
    </form>
  );
};

const statusPill = (a: Alert) => {
  if (!a.active) return <span className="ex-pill ex-pill-low">Paused</span>;
  if (a.lastResult?.status === 'waiting') return <span className="ex-pill ex-pill-warn">Waiting</span>;
  if (a.lastResult?.status === 'error') return <span className="ex-pill ex-pill-warn">Could not search</span>;
  if (!a.lastRunAt) return <span className="ex-pill ex-pill-info">Starting</span>;
  return <span className="ex-pill ex-pill-ok">Active</span>;
};

const Matches: React.FC<{ alert: Alert }> = ({ alert }) => {
  const [matches, setMatches] = useState<AlertMatch[] | null>(null);
  const [keyword, setKeyword] = useState('all');
  useEffect(() => subscribeToMatches(alert.id, setMatches, () => setMatches([])), [alert.id]);
  const shown = (matches || []).filter(m => keyword === 'all' || m.keyword === keyword);

  return (
    <div className="ex-card al-matches">
      <div className="ex-card-head">
        <span className="ex-card-title">Matches · {alert.name}</span>
        <span className="ex-muted ex-small">{matches ? `${matches.length} found` : 'Loading…'}</span>
      </div>
      {alert.keywords.length > 1 && (
        <div className="ex-chips">
          {['all', ...alert.keywords].map(k => (
            <button key={k} type="button" className={`ex-chip ${keyword === k ? 'on' : ''}`} onClick={() => setKeyword(k)}>{k === 'all' ? 'All keywords' : k}</button>
          ))}
        </div>
      )}
      {matches && shown.length === 0 && (
        <div className="ex-pad ex-muted">
          {alert.lastRunAt ? 'No result naming these keywords has been found yet. New results appear here and in your email.' : 'The first check has not run yet.'}
        </div>
      )}
      <div className="ex-list">
        {shown.map(m => (
          <div key={m.id} className="ex-row">
            <div className="ex-row-body">
              <a className="ex-row-title al-link" href={m.url} target="_blank" rel="noopener noreferrer">{m.title} <ExternalLink size={13} /></a>
              <div className="ex-row-meta">
                <span className="ex-kind">{m.source}</span>
                {m.publishedText && <span>{m.publishedText}</span>}
                <span>Keyword: {m.keyword}</span>
                <span>Found {fmtDate(m.foundAt, true)}</span>
              </div>
              {m.snippet && <div className="ex-row-snippet">{m.snippet}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="ex-pad ex-muted ex-small">
        Results come from public search engines. News is usually indexed within minutes; social posts can take hours and some are never indexed,
        so this is not live platform monitoring. Open each link to check it.
      </div>
    </div>
  );
};

export const AlertsPage: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [status, setStatus] = useState<AlertsServerStatus | null>(null);
  const [editing, setEditing] = useState<Alert | 'new' | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => subscribeToAlerts(setAlerts, () => setAlerts([])), []);
  const refreshStatus = useCallback(() => { getAlertsStatus().then(setStatus); }, []);
  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  const current = useMemo(() => alerts?.find(a => a.id === selected) || null, [alerts, selected]);

  const run = useCallback(async (id: string) => {
    setRunning(id);
    setSelected(id);
    try {
      const { result } = await runAlertNow(id);
      if (result.status === 'waiting') toast.error('Not run', result.message || 'The search limit was reached.');
      else if (result.status === 'error') toast.error('Search failed', result.message || 'The search engines could not be reached.');
      else toast.success('Checked', `${result.newMatches} new match${result.newMatches === 1 ? '' : 'es'} from ${result.checked} results.`);
    } catch (e) {
      toast.error('Not run', e instanceof Error ? e.message : 'The alert could not be run.');
    } finally {
      setRunning(null);
      refreshStatus();
    }
  }, [toast, refreshStatus]);

  const remove = async (a: Alert) => {
    const ok = await confirm({ title: 'Delete alert?', message: `"${a.name}" and its saved matches will be deleted. No more emails will be sent for it.`, confirmLabel: 'Delete', variant: 'warning' });
    if (!ok) return;
    await deleteAlert(a.id).then(() => toast.success('Alert deleted', a.name), () => toast.error('Not deleted', 'Please try again.'));
    if (selected === a.id) setSelected(null);
  };

  const togglePause = (a: Alert) => setAlertActive(a, !a.active)
    .then(() => toast.success(a.active ? 'Alert paused' : 'Alert resumed', a.name), () => toast.error('Not changed', 'Please try again.'));

  const test = async () => {
    setTesting(true);
    try {
      const r = await sendTestEmail();
      toast.success('Test email sent', `Check ${r.sentTo}.`);
    } catch (e) {
      toast.error('Email not sent', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setTesting(false);
    }
  };

  const notConfigured = status && !status.configured;

  return (
    <ExplorePage title="Alerts" subtitle="Get an email when news or public posts mention your keywords. Each alert first shows what is already published, then checks again on a schedule and emails only you about new results."
      actions={<>
        <button type="button" className="ex-btn ex-btn-ghost" onClick={test} disabled={testing || !status?.emailConfigured}>
          {testing ? <Loader2 size={15} className="ex-spin" /> : <Mail size={15} />} Send test email
        </button>
        <button type="button" className="ex-btn ex-btn-primary" onClick={() => setEditing('new')} disabled={Boolean(notConfigured)}><Plus size={16} /> New alert</button>
      </>}>

      <div className="al-status ex-muted ex-small">
        {notConfigured ? <span className="ex-notice">Alerts are not configured on the server yet.</span> : status ? <>
          Alert searches today: <b>{status.usedToday ?? 0}</b> of {status.budgetPerDay ?? '—'}
          {typeof status.searchesLeft === 'number' && <> · SerpApi searches left this month: <b>{status.searchesLeft}</b></>}
          {!status.emailConfigured && <> · <span className="ex-notice">Email is not configured — matches show here only.</span></>}
        </> : 'Checking the alert service…'}
      </div>

      <details className="ex-card al-help" open={alerts !== null && alerts.length === 0}>
        <summary><Info size={16} /> How alerts work, and where to find the emails</summary>
        <ol>
          <li><b>Create an alert</b> with keywords, sources and how often to check.</li>
          <li><b>The first check</b> shows what is already published (last 7 days) here and emails it to you.</li>
          <li><b>Later checks</b> run on schedule and email you <b>only new results</b>. Every match also stays listed on this page.</li>
        </ol>
        <p>
          Emails go only to your account email{auth.currentUser?.email ? <> (<b>{auth.currentUser.email}</b>)</> : ''}
          {status?.sender ? <>, from <b>{status.senderName || 'OSINT Alerts'}</b> &lt;{status.sender}&gt;</> : ''}.
        </p>
        <p className="al-help-spam">
          <b>Can’t find an email?</b> Check your <b>Spam</b> (or Junk / Promotions) folder. Open the email and click <b>“Not spam”</b>
          (Gmail: “Report not spam”), then add the sender to your contacts — future alerts will arrive in your inbox.
        </p>
      </details>

      {editing && <AlertForm initial={editing === 'new' ? undefined : editing} budgetPerDay={status?.budgetPerDay} onDone={id => { setEditing(null); if (id) run(id); }} />}

      {alerts === null ? <div className="ex-pad ex-muted">Loading alerts…</div> : alerts.length === 0 && !editing ? (
        <EmptyState icon={<Bell size={24} />} title="No alerts yet">
          Create an alert with keywords such as a hashtag, a place and an event ("#OccupyAccra", "Accra protest"). You will see what is already published and get an email when something new appears.
        </EmptyState>
      ) : (
        <div className="al-list">
          {alerts.map(a => (
            <div key={a.id} className={`ex-card al-item ${selected === a.id ? 'on' : ''}`}>
              <button type="button" className="al-item-main" onClick={() => setSelected(s => (s === a.id ? null : a.id))} aria-expanded={selected === a.id}>
                <div className="al-item-title">{a.active ? <Bell size={16} /> : <BellOff size={16} />} {a.name} {statusPill(a)}</div>
                <div className="al-kws">{a.keywords.map(k => <span key={k} className="al-kw sm">{k}</span>)}</div>
                <div className="ex-row-meta">
                  <span>{a.sources.map(sourceLabel).join(', ')}</span>
                  {a.country && <span>{COUNTRY_OPTIONS.find(c => c.code === a.country)?.label || a.country.toUpperCase()}</span>}
                  <span>{FREQUENCY_LABEL[a.frequency]}{a.emailEnabled ? ' · email on' : ' · email off'}</span>
                  <span>{a.matchCount || 0} match{a.matchCount === 1 ? '' : 'es'}</span>
                  <span>{a.lastRunAt ? `Last checked ${fmtDate(a.lastRunAt, true)}` : 'Not checked yet'}</span>
                  {a.active && a.lastRunAt && <span>Next {fmtDate(a.nextRunAt, true)}</span>}
                </div>
                {a.lastResult?.message && <div className="ex-notice ex-small">{a.lastResult.message}</div>}
              </button>
              <div className="al-item-actions">
                <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" onClick={() => run(a.id)} disabled={running !== null}>
                  {running === a.id ? <Loader2 size={14} className="ex-spin" /> : <RefreshCw size={14} />} Check now
                </button>
                <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" onClick={() => togglePause(a)}>{a.active ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}</button>
                <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm" onClick={() => setEditing(a)}><Pencil size={14} /> Edit</button>
                <button type="button" className="ex-btn ex-btn-ghost ex-btn-sm al-danger" onClick={() => remove(a)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {current && <Matches alert={current} />}
    </ExplorePage>
  );
};
