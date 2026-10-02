import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Copy, Download, Eye, FileText, FolderSearch, Link2, Loader2, Menu, MoreHorizontal, RotateCw, Share2, User, X, Bookmark, BookmarkCheck } from 'lucide-react';

import type { AuditEvent, EvidenceLevel, Investigation } from '../../types/investigation';
import {
  getInvestigationFromDb, getSharedCaseFromDb, saveInvestigationToDb, shareInvestigationInDb, stopSharingInDb, untrackPersonInDb
} from '../../firebase/firestore';
import { useToast } from '../../components/ui/Toast';
import { useNotifications } from '../../context/NotificationContext';
import { getApiBase } from '../../lib/searchClient';
import { apiFetch } from '../../lib/apiAuth';
import {
  downloadFile, toCsv, fmtDate, fmtTime, LEVEL_LABEL, newAuditEvent, ownerName, safeFileName, searchLogFromTrail
} from '../../lib/workspace';
import { WorkspaceContext, derive, type TabKey, type WorkspaceApi } from '../../components/investigations/workspace/WorkspaceContext';
import { OverviewTab } from '../../components/investigations/tabs/OverviewTab';
import { ProfilesTab } from '../../components/investigations/tabs/ProfilesTab';
import { ActivityTab } from '../../components/investigations/tabs/ActivityTab';
import { AssociationsTab } from '../../components/investigations/tabs/AssociationsTab';
import { SourcesTab } from '../../components/investigations/tabs/SourcesTab';
import { WebTab } from '../../components/investigations/tabs/WebTab';
import { NewsTab } from '../../components/investigations/tabs/NewsTab';
import { ImagesTab } from '../../components/investigations/tabs/ImagesTab';
import { LocationTab } from '../../components/investigations/tabs/LocationTab';
import { ContactTab } from '../../components/investigations/tabs/ContactTab';
import { OrganizationTab } from '../../components/investigations/tabs/OrganizationTab';
import { useOrgPipelineAutoRun } from '../../components/investigations/workspace/useOrgPipeline';

/** Runs the organisation data pipeline for organisation cases (renders nothing). */
const OrgPipelineRunner: React.FC = () => { useOrgPipelineAutoRun(); return null; };
import { SearchLoader } from '../../components/ui/SearchLoader';
import { RadarLoader } from '../../components/ui/RadarLoader';
import { MetricsTab } from '../../components/investigations/tabs/MetricsTab';
import { AuditTab } from '../../components/investigations/tabs/AuditTab';
import { AiTab } from '../../components/investigations/tabs/AiTab';
import { aiCompletedEvent, getAiRun, markAiRunApplied, subscribeAiRun, type AiRun } from '../../lib/aiClient';
import '../../styles/Workspace.css';

const TABS: Array<{ key: TabKey; label: string; group: 'Summary' | 'Evidence' | 'Record' }> = [
  { key: 'overview', label: 'Overview', group: 'Summary' },
  { key: 'organization', label: 'Organisation', group: 'Summary' },
  { key: 'ai', label: 'AI Analysis', group: 'Summary' },
  { key: 'profiles', label: 'Profiles', group: 'Evidence' },
  { key: 'activity', label: 'Activity', group: 'Evidence' },
  { key: 'associations', label: 'Associations', group: 'Evidence' },
  { key: 'sources', label: 'Sources', group: 'Evidence' },
  { key: 'web', label: 'Web', group: 'Evidence' },
  { key: 'news', label: 'News', group: 'Evidence' },
  { key: 'images', label: 'Images', group: 'Evidence' },
  { key: 'location', label: 'Location', group: 'Evidence' },
  { key: 'contact', label: 'Contact', group: 'Evidence' },
  { key: 'metrics', label: 'Metrics', group: 'Record' },
  { key: 'audit', label: 'Audit', group: 'Record' }
];

const TAB_ALIASES: Record<string, TabKey> = { webnews: 'web', stats: 'metrics' };

function toTabKey(raw?: string): TabKey {
  const k = (raw || 'overview').toLowerCase();
  if (TAB_ALIASES[k]) return TAB_ALIASES[k];
  return (TABS.some(t => t.key === k) ? k : 'overview') as TabKey;
}

interface InvestigationDetailPageProps {
  activeTabRoute?: string;
}

export const InvestigationDetailPage: React.FC<InvestigationDetailPageProps> = ({ activeTabRoute }) => {
  const { id, tab, token } = useParams<{ id: string; tab?: string; token?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { addNotification } = useNotifications();

  // Opened from a view-only share link (/shared/:token): load the shared copy, change nothing.
  const readOnly = Boolean(token);
  const [sharedBy, setSharedBy] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  // PDF report: built from the saved case only (no searches), then offered for download.
  const [report, setReport] = useState<{ url: string; fileName: string; pages: number } | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  useEffect(() => () => { if (report) URL.revokeObjectURL(report.url); }, [report]);

  const currentTab = toTabKey(activeTabRoute || tab);

  const [investigation, setInvestigation] = useState<Investigation | null>(() => {
    if (token) return null;
    const fromState = (location.state as any)?.investigation;
    if (fromState) return fromState;
    if (id) {
      try {
        const saved = sessionStorage.getItem(`osint_inv_${id}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(!investigation);
  const [isRescanning, setIsRescanning] = useState(false);
  const [focus, setFocus] = useState<string | null>((location.state as any)?.focus || null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const invRef = useRef(investigation);
  invRef.current = investigation;

  useEffect(() => {
    if (token) {
      getSharedCaseFromDb(token).then(shared => {
        if (shared) { setInvestigation(shared.investigation); setSharedBy(shared.ownerName); }
        setLoading(false);
      });
    } else if (id && !investigation) {
      getInvestigationFromDb(id).then(data => {
        if (data) setInvestigation(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (investigation && id && !readOnly) {
      try { sessionStorage.setItem(`osint_inv_${id}`, JSON.stringify(investigation)); } catch { /* quota */ }
    }
  }, [investigation, id, readOnly]);

  const persist = useCallback((next: Investigation) => {
    if (readOnly) return;
    setInvestigation(next);
    saveInvestigationToDb(next).catch(() => toast.error('Not saved', 'The change could not be saved to the database.'));
  }, [toast, readOnly]);

  const commit = useCallback((mutate: (inv: Investigation) => Investigation, events: AuditEvent[] = []) => {
    const current = invRef.current;
    if (!current || readOnly) return;
    const changed = mutate(current);
    persist({
      ...changed,
      auditLog: [...events, ...(changed.auditLog || [])],
      updatedAt: new Date().toISOString()
    });
  }, [persist, readOnly]);

  // AI analysis runs outside this page (lib/aiClient), so tab changes do not stop it; its result is saved here.
  useEffect(() => {
    if (!id || readOnly) return;
    const apply = (r?: AiRun) => {
      if (!r || r.applied || r.status === 'running') return;
      markAiRunApplied(id);
      if (r.status === 'done' && r.analysis) {
        const a = r.analysis;
        commit(inv => ({ ...inv, aiAnalysis: a }), [aiCompletedEvent(a, r.cached)]);
        toast.success('AI analysis complete', `${a.metrics.findings} finding${a.metrics.findings === 1 ? '' : 's'}, ${a.metrics.timeline} dated events and ${a.metrics.relationships} relationships to review.`);
      } else if (r.status === 'error') {
        commit(inv => inv, [newAuditEvent({ action: 'AI analysis failed', object: invRef.current?.name || id, detail: `${r.code || 'error'}: ${r.error || ''} (case unchanged)`, group: 'Investigation', kind: 'system' })]);
        toast.error('AI analysis not completed', r.error || 'The case is unchanged.');
      }
    };
    apply(getAiRun(id));
    return subscribeAiRun(id, apply);
  }, [id, readOnly, commit, toast]);

  const goTab = useCallback((key: TabKey, focusKey?: string) => {
    setFocus(focusKey || null);
    setSheetOpen(false);
    if (token) navigate(`/shared/${token}/${key}`, { state: { focus: focusKey || null } });
    else if (id) navigate(`/investigations/${id}/${key}`, { state: { investigation: invRef.current, focus: focusKey || null } });
  }, [id, token, navigate]);

  const setLevel = useCallback((key: string, level: EvidenceLevel, label: string, object: string) => {
    const current = invRef.current;
    if (!current) return;
    const before = current.review?.[key] || 'relevant';
    if (before === level) return;
    commit(
      inv => ({ ...inv, review: { ...(inv.review || {}), [key]: level } }),
      [newAuditEvent({
        action: level === 'validated' ? 'Result validated' : 'Result level changed',
        object,
        detail: `${label} · ${LEVEL_LABEL[before]} → ${LEVEL_LABEL[level]}`,
        group: 'Results',
        kind: level === 'raw' ? 'removal' : 'investigator'
      })]
    );
  }, [commit]);

  // Cases created from a search (not a name/username search) have nothing to re-run.
  const canRerun = Boolean(investigation?.searchInputs?.searchType || investigation?.searchType);

  const rerun = useCallback(async () => {
    const current = invRef.current;
    if (!current || readOnly) return;
    setIsRescanning(true);
    try {
      const response = await apiFetch(`${getApiBase()}/investigations/rescan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigation: current, searchDepth: current.searchDepth || 'deep' })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.investigation) {
        toast.error('Re-run failed', data.error || 'Public sources could not be refreshed. Nothing was changed.');
        return;
      }
      const now = new Date().toISOString();
      const log = current.searchLog || [];
      const batch = log.reduce((m, s) => Math.max(m, s.batch), 0) + 1;
      const fresh: Investigation = data.investigation;
      const summary = (data.changesSummary || []).join(' | ') || 'No new public findings';
      const next: Investigation = {
        ...fresh,
        review: current.review,
        searchLog: [...log, ...searchLogFromTrail(fresh.auditTrail, { firstRun: log.length + 1, batch, at: now, coverage: fresh.searchCoverage })],
        auditLog: [
          newAuditEvent({ action: 'Searches re-run', object: current.id, detail: summary, group: 'Investigation', kind: 'investigator' }),
          ...(current.auditLog || [])
        ],
        updatedAt: now
      };
      persist(next);
      toast.success('Searches re-run', summary);
      addNotification({ type: 'scan_completed', title: 'Re-run completed', message: `"${current.name}": ${summary}`, targetInvestigationId: current.id });
    } catch {
      toast.error('Re-run failed', 'The search service could not be reached.');
    } finally {
      setIsRescanning(false);
    }
  }, [persist, toast, addNotification, readOnly]);

  const shareUrl = investigation?.shareToken ? `${window.location.origin}/shared/${investigation.shareToken}` : '';

  const createShareLink = async () => {
    const current = invRef.current;
    if (!current || readOnly) return;
    setShareBusy(true);
    try {
      const shared = await shareInvestigationInDb(current, ownerName(current));
      commit(
        () => shared,
        [newAuditEvent({ action: 'View-only link created', object: current.id, detail: 'Anyone with the link can view this case', group: 'Investigation', kind: 'investigator' })]
      );
      toast.success('Link created', 'Anyone with the link can view this case, but cannot change anything.');
    } catch {
      toast.error('Link not created', 'The view-only link could not be created. Please try again.');
    } finally {
      setShareBusy(false);
    }
  };

  const stopSharing = async () => {
    const current = invRef.current;
    if (!current?.shareToken || readOnly) return;
    setShareBusy(true);
    try {
      const next = await stopSharingInDb(current);
      commit(
        () => next,
        [newAuditEvent({ action: 'View-only link removed', object: current.id, detail: 'The shared link no longer works', group: 'Investigation', kind: 'investigator' })]
      );
      toast.success('Sharing stopped', 'The link no longer opens this case.');
    } catch {
      toast.error('Not changed', 'Sharing could not be stopped. Please try again.');
    } finally {
      setShareBusy(false);
    }
  };

  const copyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(() => toast.success('Copied', 'View-only link copied.'), () => undefined);
  };

  /** One CSV with every saved profile, web/news result, activity, association and source. */
  const exportCsv = () => {
    if (!investigation) return;
    const rows: Array<Array<string | number>> = [['Section', 'Title', 'Platform / source', 'URL', 'Published', 'Discovered', 'Detail']];
    (investigation.socialProfiles || []).forEach(p => rows.push(['Profile', p.profileName || p.title || p.username, p.platform, p.profileUrl || p.url, '', p.discoveredAt || '', p.confidenceLabel || p.confidenceLevel]));
    (investigation.webAndNews || []).forEach(w => rows.push(['Web & news', w.title, w.source, w.url, String(w.metadata?.publishedAt || w.metadata?.date || ''), w.discoveredAt || '', w.sourceType]));
    (investigation.activities || []).forEach(a => rows.push(['Activity', a.title, a.sourceName, a.sourceUrl, a.date, a.foundAt || '', a.category]));
    (investigation.associations || []).forEach(a => rows.push(['Association', a.name, a.sourceName || '', a.sourceUrl || '', '', '', `${a.category} · ${a.evidenceState}`]));
    (investigation.sources || []).forEach(s => rows.push(['Source', s.title, s.sourceName, s.url, s.publishedDate || '', s.discoveredDate, s.sourceType]));
    downloadFile(`OSINT-${safeFileName(investigation.name)}-${Date.now()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  const exportPdf = async () => {
    const current = invRef.current;
    if (!current || readOnly || reportBusy) return;
    setReportBusy(true);
    setShareOpen(false);
    try {
      const [{ buildCaseReport }, { renderCaseReportPdf }] = await Promise.all([import('../../lib/caseReport'), import('../../lib/reportPdf')]);
      const model = buildCaseReport(current, ownerName(current));
      const { blob, pages } = await renderCaseReportPdf(model);
      setReport({ url: URL.createObjectURL(blob), fileName: model.fileName, pages });
    } catch (e) {
      console.error('Report not generated:', e);
      toast.error('Report not generated', 'The PDF report could not be created. Please try again.');
    } finally {
      setReportBusy(false);
    }
  };

  const exportJson = () => {
    if (!investigation) return;
    downloadFile(`OSINT-${safeFileName(investigation.name)}-${Date.now()}.json`, JSON.stringify(investigation, null, 2), 'application/json');
  };

  const d = useMemo(() => (investigation ? derive(investigation) : null), [investigation]);

  const api: WorkspaceApi | null = investigation && d ? {
    inv: investigation,
    d,
    focus,
    goTab,
    commit,
    setLevel,
    rerun,
    isRescanning,
    readOnly
  } : null;

  if (loading) {
    return <div className="ws-root"><div className="ws-empty" style={{ marginTop: 40 }}><RadarLoader size={72} /><b>Loading investigation…</b></div></div>;
  }

  if (!investigation || !api || !d) {
    if (readOnly) {
      return (
        <div className="ws-root">
          <div className="ws-empty" style={{ marginTop: 40 }}>
            <FolderSearch size={36} />
            <b>This link is no longer active</b>
            The investigation was not found. The owner may have stopped sharing it or deleted it.
            <div><Link className="ws-btn" style={{ marginTop: 14 }} to="/">Go to the homepage</Link></div>
          </div>
        </div>
      );
    }
    return (
      <div className="ws-root">
        <div className="ws-empty" style={{ marginTop: 40 }}>
          <FolderSearch size={36} />
          <b>Investigation not found</b>
          No record exists for this investigation ID. Run a new search to create one.
          <div><Link className="ws-btn" style={{ marginTop: 14 }} to="/investigations">Back to investigations</Link></div>
        </div>
      </div>
    );
  }

  const isUsername = investigation.searchType === 'username';
  const place = investigation.targetProfile?.location && investigation.targetProfile.location !== 'Not specified'
    ? investigation.targetProfile.location
    : null;
  const trackLabel = investigation.entityKind === 'organization' ? 'Track organisation' : 'Track person';
  const statusText = investigation.isTracked ? 'Tracked' : investigation.status || 'Completed';

  const copyId = () => {
    navigator.clipboard?.writeText(investigation.id).then(() => toast.success('Copied', 'Investigation ID copied.'), () => undefined);
  };

  const toggleTrack = () => {
    setMenuOpen(false);
    // Tracking is saved with the investigation; the trackedPeople record is written (or removed) alongside it.
    if (investigation.isTracked) untrackPersonInDb(investigation.id).catch(() => toast.error('Not saved', 'Tracking could not be updated.'));
    commit(
      inv => ({ ...inv, isTracked: !inv.isTracked }),
      [newAuditEvent({ action: investigation.isTracked ? 'Tracking stopped' : 'Person tracked', object: investigation.id, detail: investigation.name, group: 'Investigation', kind: 'investigator' })]
    );
    if (investigation.isTracked) toast.success('Tracking stopped', `${investigation.name} was removed from People.`);
    else toast.success('Person tracked', `${investigation.name} now appears on the People page.`);
  };

  // The Organisation tab only exists for organisation cases.
  const tabs = TABS.filter(t => t.key !== 'organization' || investigation.entityKind === 'organization');
  const tabButton = (t: typeof TABS[number], i: number) => {
    const count = d.counts[t.key];
    const gap = i > 0 && tabs[i - 1].group !== t.group && t.group !== 'Evidence';
    return (
      <button
        key={t.key}
        type="button"
        className={`ws-tab${currentTab === t.key ? ' active' : ''}${gap ? ' ws-tab-gap' : ''}`}
        onClick={() => goTab(t.key)}
      >
        {t.label}
        {count !== undefined && count > 0 && <span className="ws-count">{count}</span>}
      </button>
    );
  };

  return (
    <WorkspaceContext.Provider value={api}>
      {investigation.entityKind === 'organization' && !readOnly && <OrgPipelineRunner />}
      <div className="ws-root">
        {readOnly ? (
          <div className="ws-shared-note">
            <Eye size={16} />
            <span><b>View only.</b> Shared by {sharedBy || 'the investigator'}. You can look through every tab, but nothing can be searched or changed.</span>
          </div>
        ) : (
          <nav className="ws-crumb" aria-label="Breadcrumb">
            <Link to="/investigations"><ChevronLeft size={16} /> Investigations</Link>
            <span>/</span>
            <span className="ws-mono">{investigation.id}</span>
            <button type="button" className="ws-copy" onClick={copyId} aria-label="Copy investigation ID"><Copy size={14} /></button>
          </nav>
        )}

        <header className="ws-head">
          <div className="ws-head-main">
            <div className="ws-avatar"><User size={26} /></div>
            <div style={{ minWidth: 0 }}>
              <div className="ws-title-row">
                <h1 className="ws-title">{isUsername ? `@${investigation.name.replace(/^@/, '')}` : investigation.name}</h1>
                <span className="ws-pill ws-pill-status">{statusText}</span>
                <span className="ws-pill">{isUsername ? 'Username investigation' : 'Person investigation'}</span>
              </div>
              <div className="ws-meta">
                {place && <span>{place}</span>}
                <span>Created <b>{fmtDate(investigation.createdAt, true)}</b></span>
                <span>Updated <b>{fmtDate(investigation.updatedAt || investigation.createdAt, true)}</b></span>
                <span>Owner <b>{readOnly ? sharedBy || 'Investigator' : ownerName(investigation)}</b></span>
              </div>
              <div className="ws-mobile-meta ws-sub" style={{ marginTop: 4 }}>
                Created {fmtDate(investigation.createdAt, true)} · Updated {fmtTime(investigation.updatedAt)}
              </div>
            </div>
          </div>
          {readOnly ? (
            <div className="ws-actions"><span className="ws-pill"><Eye size={13} /> View only</span></div>
          ) : (
          <div className="ws-actions">
            <button type="button" className={`ws-btn${investigation.shareToken ? ' ws-btn-shared' : ''}`} onClick={() => setShareOpen(o => !o)} aria-expanded={shareOpen}>
              <Share2 size={16} /> <span className="hide-mobile">{investigation.shareToken ? 'Shared' : 'Share'}</span>
            </button>
            <button type="button" className="ws-btn hide-mobile" onClick={exportPdf} disabled={reportBusy}>
              {reportBusy ? <Loader2 size={16} className="spinning" /> : <Download size={16} />} {reportBusy ? 'Preparing…' : 'Export'}
            </button>
            {canRerun && <button type="button" className="ws-btn hide-mobile" onClick={rerun} disabled={isRescanning}>
              {isRescanning ? <Loader2 size={16} className="spinning" /> : <RotateCw size={16} />} {isRescanning ? 'Re-running…' : 'Re-run searches'}
            </button>}
            <button type="button" className="ws-btn ws-icon-btn" onClick={() => setMenuOpen(o => !o)} aria-label="More actions" aria-expanded={menuOpen}>
              <MoreHorizontal size={18} />
            </button>
            <button type="button" className={`ws-btn hide-mobile${investigation.isTracked ? '' : ' ws-btn-primary'}`} onClick={toggleTrack} aria-pressed={Boolean(investigation.isTracked)}>
              {investigation.isTracked ? <><BookmarkCheck size={16} /> Tracked</> : <><Bookmark size={16} /> {trackLabel}</>}
            </button>
            {menuOpen && (
              <div className="ws-menu" onMouseLeave={() => setMenuOpen(false)}>
                <button type="button" onClick={toggleTrack}><Bookmark size={15} /> {investigation.isTracked ? 'Stop tracking' : trackLabel}</button>
                {canRerun && <button type="button" onClick={() => { setMenuOpen(false); rerun(); }} disabled={isRescanning}><RotateCw size={15} /> Re-run searches</button>}
                <button type="button" onClick={() => { setMenuOpen(false); exportPdf(); }} disabled={reportBusy}><FileText size={15} /> Export PDF report</button>
                <button type="button" onClick={() => { setMenuOpen(false); exportCsv(); }}><Download size={15} /> Export CSV (spreadsheet)</button>
                <button type="button" onClick={() => { setMenuOpen(false); exportJson(); }}><Download size={15} /> Export JSON</button>
                <button type="button" onClick={() => { setMenuOpen(false); setShareOpen(true); }}><Share2 size={15} /> Share view-only link</button>
                <button type="button" onClick={() => { setMenuOpen(false); copyId(); }}><Copy size={15} /> Copy investigation ID</button>
              </div>
            )}
          </div>
          )}
        </header>

        {report && !readOnly && (
          <section className="ws-share" aria-label="PDF report">
            <div className="ws-share-head">
              <div>
                <div className="ws-h2"><FileText size={16} /> Investigation report ready</div>
                <p className="ws-sub">
                  {report.pages} page{report.pages === 1 ? '' : 's'} · built from the data saved in this case (no new searches).
                  Missing details are marked “Not found”, and search, tracking, image and duplicate links were left out.
                </p>
              </div>
              <button type="button" className="ws-btn ws-btn-ghost ws-icon-btn" onClick={() => setReport(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="ws-share-row">
              <a className="ws-btn ws-btn-primary" href={report.url} download={report.fileName}><Download size={15} /> Download PDF</a>
              <a className="ws-btn" href={report.url} target="_blank" rel="noopener noreferrer"><Eye size={15} /> Open preview</a>
            </div>
          </section>
        )}

        {shareOpen && !readOnly && (
          <section className="ws-share" aria-label="Share view-only link">
            <div className="ws-share-head">
              <div>
                <div className="ws-h2"><Link2 size={16} /> View-only link</div>
                <p className="ws-sub">
                  Anyone with this link can open the case and see every tab, the searches that were run and all the data found.
                  They cannot search, change, track, re-run or export anything. The link shows your latest changes.
                </p>
              </div>
              <button type="button" className="ws-btn ws-btn-ghost ws-icon-btn" onClick={() => setShareOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            {investigation.shareToken ? (
              <>
                <div className="ws-share-row">
                  <input className="ws-input ws-share-url" value={shareUrl} readOnly onFocus={e => e.currentTarget.select()} aria-label="View-only link" />
                  <button type="button" className="ws-btn ws-btn-primary" onClick={copyShareLink}><Copy size={15} /> Copy link</button>
                </div>
                <button type="button" className="ws-btn ws-share-stop" onClick={stopSharing} disabled={shareBusy}>
                  {shareBusy ? <Loader2 size={15} className="spinning" /> : <X size={15} />} Stop sharing
                </button>
              </>
            ) : (
              <button type="button" className="ws-btn ws-btn-primary" onClick={createShareLink} disabled={shareBusy}>
                {shareBusy ? <Loader2 size={15} className="spinning" /> : <Link2 size={15} />} Create view-only link
              </button>
            )}
          </section>
        )}

        <div className="ws-tabs" role="tablist">{tabs.map(tabButton)}</div>

        <div className="ws-mobile-tabs">
          <button type="button" className="menu" onClick={() => setSheetOpen(true)} aria-label="Jump to section"><Menu size={17} /></button>
          {tabs.map(t => {
            const count = d.counts[t.key];
            return (
              <button key={t.key} type="button" className={currentTab === t.key ? 'active' : ''} onClick={() => goTab(t.key)}>
                {t.label}{count ? ` ${count}` : ''}
              </button>
            );
          })}
        </div>

        <div className="ws-body">
          {currentTab === 'overview' && <OverviewTab />}
          {currentTab === 'organization' && <OrganizationTab />}
          {currentTab === 'profiles' && <ProfilesTab />}
          {currentTab === 'activity' && <ActivityTab />}
          {currentTab === 'associations' && <AssociationsTab />}
          {currentTab === 'sources' && <SourcesTab />}
          {currentTab === 'web' && <WebTab />}
          {isRescanning && <SearchLoader overlay title={`Re-running searches for ${investigation.name}`} />}
          {currentTab === 'news' && <NewsTab />}
          {currentTab === 'images' && <ImagesTab />}
          {currentTab === 'location' && <LocationTab />}
          {currentTab === 'contact' && <ContactTab />}
          {currentTab === 'metrics' && <MetricsTab />}
          {currentTab === 'audit' && <AuditTab />}
          {currentTab === 'ai' && <AiTab />}
        </div>

        {!readOnly && <div className="ws-mobile-bar">
          {canRerun && <button type="button" className="ws-btn" onClick={rerun} disabled={isRescanning}>{isRescanning ? 'Re-running…' : 'Re-run searches'}</button>}
          <button type="button" className={`ws-btn${investigation.isTracked ? '' : ' ws-btn-primary'}`} onClick={toggleTrack}>{investigation.isTracked ? 'Tracked ✓' : trackLabel}</button>
        </div>}

        {sheetOpen && (
          <div className="ws-sheet-backdrop" onMouseDown={e => e.target === e.currentTarget && setSheetOpen(false)}>
            <div className="ws-sheet" role="dialog" aria-label="Jump to section">
              <div className="ws-sheet-grip" />
              <div className="ws-sheet-head">
                <div>
                  <div className="ws-h2">Jump to section</div>
                  <div className="ws-sub">{investigation.name} · {statusText}</div>
                </div>
                <button type="button" className="ws-btn ws-btn-ghost ws-icon-btn" onClick={() => setSheetOpen(false)} aria-label="Close"><X size={20} /></button>
              </div>
              {(['Summary', 'Evidence', 'Record'] as const).map(group => (
                <div key={group}>
                  <div className="ws-sheet-group ws-label">{group}</div>
                  {tabs.filter(t => t.group === group).map(t => (
                    <button key={t.key} type="button" className={`ws-sheet-item${currentTab === t.key ? ' active' : ''}`} onClick={() => goTab(t.key)}>
                      {t.label}
                      <span className="n">{currentTab === t.key ? '✓' : d.counts[t.key] ?? ''}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </WorkspaceContext.Provider>
  );
};

