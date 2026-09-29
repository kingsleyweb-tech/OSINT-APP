import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Mail, Phone, RotateCw, ExternalLink } from 'lucide-react';
import { useSearchRun } from '../../explore/useSearchRun';
import { SearchLoader } from '../../ui/SearchLoader';
import { fmtDate, newAuditEvent, openUrl, shortUrl } from '../../../lib/workspace';
import {
  STATUS_TEXT, allContacts, checkedContactResults, contactQuery, contactsFromSearch, summariseContacts,
  type ContactRef, type ContactStatus
} from '../../../lib/contactEvidence';
import { subjectMatcher } from '../../../lib/locationEvidence';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Empty, ReadOnlyNote, SectionHead, SourceLogo } from '../workspace/ui';

const STATUS_CLASS: Record<ContactStatus, string> = { stated: 'ok', linked: 'ok', unconfirmed: 'warn' };
const ENGINE_LABEL: Record<string, string> = { google: 'Google', bing: 'Bing', duckduckgo: 'DuckDuckGo' };

/**
 * Searches Google, Bing, DuckDuckGo and social profiles once for the person's public contact details
 * (4 SerpApi searches, run the first time the tab is opened; again on request). The results are only
 * used to extract contact details; nothing else is added to the case.
 */
function useContactScan() {
  const { inv, commit, readOnly } = useWorkspace();
  const { run, cancel, running, steps } = useSearchRun();
  const started = useRef(false);

  const scan = useCallback(async () => {
    if (readOnly) return;
    const query = contactQuery(inv);
    const at = new Date().toISOString();
    let result: NonNullable<typeof inv.contactScan>;
    try {
      const out = await run([{ key: 'c', label: 'Contact details', capability: 'contacts', query }]);
      if (!out) return; // cancelled
      const r = out.c;
      const refs = contactsFromSearch(inv, r.items);
      result = {
        checkedAt: at, query, resultsChecked: r.items.length, refs,
        results: checkedContactResults(inv, r.items, refs),
        sources: r.engines.map(e => ({
          label: e.label,
          status: e.status === 'error' || e.status === 'quota' ? 'failed' as const : e.returned ? 'ok' as const : 'empty' as const,
          results: e.returned,
          ...(e.error ? { error: e.error } : {})
        }))
      };
    } catch (e) {
      result = { checkedAt: at, query, resultsChecked: 0, refs: [], sources: [], error: e instanceof Error ? e.message : 'The contact search could not be run.' };
    }
    const done = result;
    commit(
      current => ({ ...current, contactScan: done }),
      [newAuditEvent({
        action: 'Contact search', object: query, group: 'Searches', kind: 'system',
        detail: done.error ? `Failed: ${done.error}` : `${done.resultsChecked} results checked · ${done.refs.length} contact reference${done.refs.length === 1 ? '' : 's'}`
      })]
    );
  }, [inv, run, commit, readOnly]);

  useEffect(() => {
    if (started.current || inv.contactScan || readOnly) return undefined;
    started.current = true;
    const t = setTimeout(() => { scan(); }, 0);
    return () => clearTimeout(t);
  }, [inv.contactScan, scan, readOnly]);

  return { scan, cancel, running, steps };
}

export const ContactTab: React.FC = () => {
  const { inv, readOnly } = useWorkspace();
  const { scan, cancel, running, steps } = useContactScan();
  const refs = useMemo(() => allContacts(inv), [inv]);
  const summary = useMemo(() => summariseContacts(refs), [refs]);
  const confirmed = refs.filter(r => r.status !== 'unconfirmed');
  const unconfirmed = refs.filter(r => r.status === 'unconfirmed');
  const scanInfo = inv.contactScan;
  const everyFailed = Boolean(scanInfo?.error) || (scanInfo !== undefined && scanInfo.sources.length > 0 && scanInfo.sources.every(s => s.status === 'failed'));
  const subject = subjectMatcher(inv).label;

  if (running) return <SearchLoader title={`Searching Google, Bing, DuckDuckGo and social profiles for ${subject}'s public contact details`} steps={steps} onCancel={cancel} />;

  return (
    <div className="ws-loc">
      <SectionHead title="Public contact details" count={summary.length} noRule right={readOnly ? undefined :
        <button type="button" className="ws-btn ws-btn-sm" onClick={scan}><RotateCw size={14} /> Search again</button>
      } />
      <p className="ws-sub ws-loc-intro">
        Email addresses and phone numbers that public sources show for {subject}: on their own profiles (bios, public email fields,
        business contact fields) and next to their name on pages tied to them. Nothing is guessed or generated — an address or number
        is listed only when a source shows it.
      </p>

      <div className="ws-loc-status-line">
        {scanInfo ? (
          <div className="ws-loc-run">
            <span className="ws-sub"><b>Contact search</b> · {fmtDate(scanInfo.checkedAt, true)} · {scanInfo.resultsChecked} result{scanInfo.resultsChecked === 1 ? '' : 's'} checked · plus this case’s profiles and pages</span>
            {scanInfo.error ? <span className="ws-loc-warn">Unable to retrieve contact details: {scanInfo.error}</span> : (
              <span className="ws-loc-sources-line">
                {scanInfo.sources.map(s => (
                  <span key={s.label} className={`ws-loc-src ${s.status}`} title={s.error}>
                    {s.label}: {s.status === 'ok' ? `${s.results} result${s.results === 1 ? '' : 's'}` : s.status === 'empty' ? 'nothing found' : 'unable to retrieve'}
                  </span>
                ))}
              </span>
            )}
          </div>
        ) : readOnly ? <ReadOnlyNote what="The contact search" /> : <span className="ws-sub">Uses 4 SerpApi searches (Google, Bing, DuckDuckGo, social profiles), plus this case’s profiles and pages.</span>}
      </div>

      {summary.length === 0 ? (
        <Empty title="No public contact details found">
          <span className="ws-sub" style={{ display: 'block', lineHeight: 1.6 }}>
            {everyFailed
              ? 'The contact search could not be completed, and this case’s profiles and pages show no email address or phone number. Try Search again later.'
              : `The profiles and public pages checked do not show an email address or phone number for ${subject}. Private contact details are never accessed.`}
          </span>
        </Empty>
      ) : (
        <table className="ws-table ws-loc-table">
          <thead><tr><th>Contact</th><th>Where it appears</th><th>Sources</th><th /></tr></thead>
          <tbody>
            {summary.map(s => (
              <tr key={s.key}>
                <td>
                  <b className="ws-loc-place">{s.kind === 'email' ? <Mail size={14} /> : <Phone size={14} />} {s.value}</b>
                  {s.emailType && <div className="ws-sub">{s.emailType === 'personal' ? 'Personal-style address (webmail)' : 'Organisation address'}</div>}
                </td>
                <td>{STATUS_TEXT[s.best.status]}<div className="ws-sub">{s.best.sourceKind}</div></td>
                <td><b className="ws-mono">{s.sites.length}</b><div className="ws-sub ws-loc-sites" title={s.sites.join(', ')}>{s.sites.join(' · ')}</div></td>
                <td><button type="button" className="ws-link" onClick={() => openUrl(s.best.url)}>Source <ExternalLink size={12} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmed.length > 0 && (
        <section className="ws-loc-section">
          <SectionHead title="Evidence" count={confirmed.length} />
          <div className="ws-loc-list">{confirmed.map(r => <ContactRow key={r.id} r={r} />)}</div>
        </section>
      )}

      {unconfirmed.length > 0 && (
        <section className="ws-loc-section">
          <SectionHead title="Same-name pages (not linked to this identity)" count={unconfirmed.length} />
          <p className="ws-sub ws-loc-intro">
            These pages name someone called {subject} but nothing ties them to this person’s profiles, usernames or organisations.
            The contact details may belong to a different person and are not listed above.
          </p>
          <div className="ws-loc-list">{unconfirmed.map(r => <ContactRow key={r.id} r={r} />)}</div>
        </section>
      )}

      {(scanInfo?.results || []).length > 0 && (
        <section className="ws-loc-section">
          <SectionHead title="Results checked" count={scanInfo!.results!.length} />
          <details className="ws-loc-results" open={summary.length === 0}>
            <summary><b>Google, Bing, DuckDuckGo and social profiles</b> <span className="ws-sub">· {scanInfo!.results!.length} results</span></summary>
            {scanInfo!.results!.map(r => (
              <div key={r.url} className="ws-loc-result">
                <div className="ws-loc-result-head">
                  <SourceLogo url={r.url} />
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="ws-loc-result-title">{r.title || shortUrl(r.url)}</a>
                  {r.source && <span className="ws-sub">· {ENGINE_LABEL[r.source] || r.source}</span>}
                </div>
                {r.snippet && <div className="ws-sub ws-loc-result-snippet">{r.snippet}</div>}
                <div className={`ws-loc-result-note${r.linked ? ' ok' : r.values.length ? ' warn' : ''}`}>
                  {r.values.length > 0 && <b>{r.values.join(' · ')} — </b>}{r.note}
                </div>
              </div>
            ))}
          </details>
        </section>
      )}

      <p className="ws-sub ws-loc-intro" style={{ marginTop: 28 }}>
        Use contact details only for lawful, authorised purposes. A public address or number can belong to an organisation, an agent
        or someone else with the same name — verify before relying on it.
      </p>
    </div>
  );
};

const ContactRow: React.FC<{ r: ContactRef }> = ({ r }) => (
  <div className="ws-loc-ref">
    <div className="ws-loc-ref-head">
      <b className="ws-loc-place">{r.kind === 'email' ? <Mail size={14} /> : <Phone size={14} />} {r.value}</b>
      <span className="ws-tag">{r.kind === 'email' ? 'Email' : 'Phone'}</span>
      <span className={`ws-loc-status ${STATUS_CLASS[r.status]}`}>{STATUS_TEXT[r.status]}</span>
    </div>
    <div className="ws-loc-ref-body">
      <div className="ws-sub"><SourceLogo url={r.url} platform={r.sourceName} /> {r.sourceKind}</div>
      <blockquote className="ws-loc-quote">“{r.evidence}”</blockquote>
      <div className="ws-sub ws-loc-rel">{r.relationship}</div>
      <button type="button" className="ws-url" onClick={() => openUrl(r.url)} title={r.url}>{shortUrl(r.url)}</button>
    </div>
  </div>
);
