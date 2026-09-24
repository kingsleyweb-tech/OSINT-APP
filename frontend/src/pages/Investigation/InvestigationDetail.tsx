import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Copy, Download, FolderSearch, Loader2, Menu, MoreHorizontal, Plus, RotateCw, User, X, Bookmark } from 'lucide-react';

import type { AuditEvent, EvidenceLevel, Investigation } from '../../types/investigation';
import { getInvestigationFromDb, saveInvestigationToDb } from '../../firebase/firestore';
import { useToast } from '../../components/ui/Toast';
import { useNotifications } from '../../context/NotificationContext';
import { getApiBase } from '../../lib/searchClient';
import {
  downloadFile, fmtDate, fmtTime, LEVEL_LABEL, newAuditEvent, ownerName, safeFileName, searchLogFromTrail
} from '../../lib/workspace';
import { WorkspaceContext, derive, type RecordFindingPrefill, type TabKey, type WorkspaceApi } from '../../components/investigations/workspace/WorkspaceContext';
import { RecordFindingModal } from '../../components/investigations/workspace/RecordFindingModal';
import { OverviewTab } from '../../components/investigations/tabs/OverviewTab';
import { ProfilesTab } from '../../components/investigations/tabs/ProfilesTab';
import { ActivityTab } from '../../components/investigations/tabs/ActivityTab';
import { AssociationsTab } from '../../components/investigations/tabs/AssociationsTab';
import { SourcesTab } from '../../components/investigations/tabs/SourcesTab';
import { WebTab } from '../../components/investigations/tabs/WebTab';
import { NewsTab } from '../../components/investigations/tabs/NewsTab';
import { NotesTab } from '../../components/investigations/tabs/NotesTab';
import { FindingsTab } from '../../components/investigations/tabs/FindingsTab';
import { MetricsTab } from '../../components/investigations/tabs/MetricsTab';
import { AuditTab } from '../../components/investigations/tabs/AuditTab';
import '../../styles/Workspace.css';

const TABS: Array<{ key: TabKey; label: string; group: 'Summary' | 'Evidence' | 'Analysis' | 'Record' }> = [
  { key: 'overview', label: 'Overview', group: 'Summary' },
  { key: 'profiles', label: 'Profiles', group: 'Evidence' },
  { key: 'activity', label: 'Activity', group: 'Evidence' },
  { key: 'associations', label: 'Associations', group: 'Evidence' },
  { key: 'sources', label: 'Sources', group: 'Evidence' },
  { key: 'web', label: 'Web', group: 'Evidence' },
  { key: 'news', label: 'News', group: 'Evidence' },
  { key: 'notes', label: 'Notes', group: 'Analysis' },
  { key: 'findings', label: 'Findings', group: 'Analysis' },
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
  const { id, tab } = useParams<{ id: string; tab?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { addNotification } = useNotifications();

  const currentTab = toTabKey(activeTabRoute || tab);

  const [investigation, setInvestigation] = useState<Investigation | null>(() => {
    const fromState = (location.state as any)?.investigation;
    if (fromState) return fromState;
    if (id) {
      try {
        const saved = sessionStorage.getItem(`osint_inv_${id}`);
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return null;
  });
  const [loading, setLoading] = useState(!investigation);
  const [isRescanning, setIsRescanning] = useState(false);
  const [focus, setFocus] = useState<string | null>((location.state as any)?.focus || null);
  const [findingPrefill, setFindingPrefill] = useState<RecordFindingPrefill | null>(null);
  const [noteDraftLinks, setNoteDraftLinks] = useState<string[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const invRef = useRef(investigation);
  invRef.current = investigation;

  useEffect(() => {
    if (id && !investigation) {
      getInvestigationFromDb(id).then(data => {
        if (data) setInvestigation(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (investigation && id) {
      try { sessionStorage.setItem(`osint_inv_${id}`, JSON.stringify(investigation)); } catch { /* quota */ }
    }
  }, [investigation, id]);

  const persist = useCallback((next: Investigation) => {
    setInvestigation(next);
    saveInvestigationToDb(next).catch(() => toast.error('Not saved', 'The change could not be saved to the database.'));
  }, [toast]);

  const commit = useCallback((mutate: (inv: Investigation) => Investigation, events: AuditEvent[] = []) => {
    const current = invRef.current;
    if (!current) return;
    const changed = mutate(current);
    persist({
      ...changed,
      auditLog: [...events, ...(changed.auditLog || [])],
      updatedAt: new Date().toISOString()
    });
  }, [persist]);

  const goTab = useCallback((key: TabKey, focusKey?: string) => {
    setFocus(focusKey || null);
    setSheetOpen(false);
    if (id) navigate(`/investigations/${id}/${key}`, { state: { investigation: invRef.current, focus: focusKey || null } });
  }, [id, navigate]);

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

  const rerun = useCallback(async () => {
    const current = invRef.current;
    if (!current) return;
    setIsRescanning(true);
    try {
      const response = await fetch(`${getApiBase()}/investigations/rescan`, {
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
        findings: current.findings,
        review: current.review,
        notes: fresh.notes || current.notes,
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
  }, [persist, toast, addNotification]);

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
    openRecordFinding: prefill => setFindingPrefill(prefill || {}),
    newNote: links => {
      setNoteDraftLinks(links || []);
      goTab('notes');
    },
    rerun,
    isRescanning
  } : null;

  if (loading) {
    return <div className="ws-root"><div className="ws-empty" style={{ marginTop: 40 }}><Loader2 size={22} className="spinning" /><b>Loading investigation…</b></div></div>;
  }

  if (!investigation || !api || !d) {
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
  const statusText = investigation.isTracked ? 'Tracked' : investigation.status || 'Completed';

  const copyId = () => {
    navigator.clipboard?.writeText(investigation.id).then(() => toast.success('Copied', 'Investigation ID copied.'), () => undefined);
  };

  const toggleTrack = () => {
    setMenuOpen(false);
    commit(
      inv => ({ ...inv, isTracked: !inv.isTracked }),
      [newAuditEvent({ action: investigation.isTracked ? 'Tracking stopped' : 'Person tracked', object: investigation.id, detail: investigation.name, group: 'Investigation', kind: 'investigator' })]
    );
  };

  const tabButton = (t: typeof TABS[number], i: number) => {
    const count = d.counts[t.key];
    const gap = i > 0 && TABS[i - 1].group !== t.group && t.group !== 'Evidence';
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
      <div className="ws-root">
        <nav className="ws-crumb" aria-label="Breadcrumb">
          <Link to="/investigations"><ChevronLeft size={16} /> Investigations</Link>
          <span>/</span>
          <span className="ws-mono">{investigation.id}</span>
          <button type="button" className="ws-copy" onClick={copyId} aria-label="Copy investigation ID"><Copy size={14} /></button>
        </nav>

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
                <span>Owner <b>{ownerName(investigation)}</b></span>
              </div>
              <div className="ws-mobile-meta ws-sub" style={{ marginTop: 4 }}>
                Created {fmtDate(investigation.createdAt, true)} · Updated {fmtTime(investigation.updatedAt)}
              </div>
            </div>
          </div>
          <div className="ws-actions">
            <button type="button" className="ws-btn hide-mobile" onClick={exportJson}><Download size={16} /> Export</button>
            <button type="button" className="ws-btn hide-mobile" onClick={rerun} disabled={isRescanning}>
              {isRescanning ? <Loader2 size={16} className="spinning" /> : <RotateCw size={16} />} {isRescanning ? 'Re-running…' : 'Re-run searches'}
            </button>
            <button type="button" className="ws-btn ws-icon-btn" onClick={() => setMenuOpen(o => !o)} aria-label="More actions" aria-expanded={menuOpen}>
              <MoreHorizontal size={18} />
            </button>
            <button type="button" className="ws-btn ws-btn-primary hide-mobile" onClick={() => setFindingPrefill({})}><Plus size={16} /> Record finding</button>
            {menuOpen && (
              <div className="ws-menu" onMouseLeave={() => setMenuOpen(false)}>
                <button type="button" onClick={toggleTrack}><Bookmark size={15} /> {investigation.isTracked ? 'Stop tracking' : 'Track person'}</button>
                <button type="button" onClick={() => { setMenuOpen(false); rerun(); }} disabled={isRescanning}><RotateCw size={15} /> Re-run searches</button>
                <button type="button" onClick={() => { setMenuOpen(false); exportJson(); }}><Download size={15} /> Export JSON</button>
                <button type="button" onClick={() => { setMenuOpen(false); copyId(); }}><Copy size={15} /> Copy investigation ID</button>
              </div>
            )}
          </div>
        </header>

        <div className="ws-tabs" role="tablist">{TABS.map(tabButton)}</div>

        <div className="ws-mobile-tabs">
          <button type="button" className="menu" onClick={() => setSheetOpen(true)} aria-label="Jump to section"><Menu size={17} /></button>
          {TABS.map(t => {
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
          {currentTab === 'profiles' && <ProfilesTab />}
          {currentTab === 'activity' && <ActivityTab />}
          {currentTab === 'associations' && <AssociationsTab />}
          {currentTab === 'sources' && <SourcesTab />}
          {currentTab === 'web' && <WebTab />}
          {currentTab === 'news' && <NewsTab />}
          {currentTab === 'notes' && <NotesTab draftLinks={noteDraftLinks} onDraftConsumed={() => setNoteDraftLinks(null)} />}
          {currentTab === 'findings' && <FindingsTab />}
          {currentTab === 'metrics' && <MetricsTab />}
          {currentTab === 'audit' && <AuditTab />}
        </div>

        <div className="ws-mobile-bar">
          <button type="button" className="ws-btn" onClick={() => api.newNote([])}>Add note</button>
          <button type="button" className="ws-btn ws-btn-primary" onClick={() => setFindingPrefill({})}>Record finding</button>
        </div>

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
              {(['Summary', 'Evidence', 'Analysis', 'Record'] as const).map(group => (
                <div key={group}>
                  <div className="ws-sheet-group ws-label">{group}</div>
                  {TABS.filter(t => t.group === group).map(t => (
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

        {findingPrefill && <RecordFindingModal prefill={findingPrefill} onClose={() => setFindingPrefill(null)} />}
      </div>
    </WorkspaceContext.Provider>
  );
};

