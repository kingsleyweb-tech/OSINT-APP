import { useCallback, useEffect, useRef } from 'react';
import { apiFetch } from '../../../lib/apiAuth';
import { getApiBase } from '../../../lib/searchClient';
import { newAuditEvent } from '../../../lib/workspace';
import { usePageState } from '../../../lib/pageState';
import { bestWebsite } from '../../../lib/organizationProfile';
import type { Investigation, OrgEnrichment, WebsiteIntel } from '../../../types/investigation';
import { useWorkspace } from './WorkspaceContext';

/** Case ids with a request in flight in this tab (the saved running flag can be stale after a reload). */
const inflight = new Set<string>();

/** Must match ENRICHMENT_VERSION in backend/src/services/organization/orgEnrichment.ts. */
const ENRICHMENT_VERSION = 2;

const hostOf = (u?: string) => { try { return new URL(String(u)).hostname.replace(/^www\./, ''); } catch { return ''; } };

async function postJson<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const response = await apiFetch(`${getApiBase()}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : fallback);
  return data as T;
}

/**
 * The organisation data pipeline of a case: (1) enrichment — Google Maps, Google and Bing web, social
 * platforms, YouTube and Wikidata; (2) the official website — the address most sources list, read and
 * verified. Results are saved on the case; everything else (Overview, Organisation, Contact, Location)
 * is computed from them.
 */
export function useOrgPipeline() {
  const { inv, commit } = useWorkspace();
  const [running, setRunning] = usePageState<'' | 'enrich' | 'website'>(`orgpipe:${inv.id}`, '');
  const org = inv.organization;

  const enrich = useCallback(async () => {
    if (!org) return;
    setRunning('enrich');
    inflight.add(inv.id);
    let result: OrgEnrichment;
    try {
      result = await postJson<OrgEnrichment>('/organization/enrich', { name: org.name, websites: org.website ? [org.website.url] : [] }, 'The organisation sources could not be searched.');
    } catch (e) {
      result = {
        name: org.name, checkedAt: new Date().toISOString(), claims: [], mapsListings: [], mentions: [], videos: [], sources: [],
        error: e instanceof Error ? e.message : 'The organisation sources could not be searched.'
      };
    }
    inflight.delete(inv.id);
    setRunning('');
    const facts = result.claims.length;
    commit(
      current => ({ ...current, orgEnrich: result }),
      [newAuditEvent({
        action: 'Organisation sources searched', object: org.name, group: 'Searches', kind: 'system',
        detail: result.error ? `Failed: ${result.error}` : `${facts} fact${facts === 1 ? '' : 's'} · ${result.mapsListings.length} map listing(s) · ${result.sources.map(s => `${s.label}: ${s.status}`).join(', ')}`
      })]
    );
  }, [inv.id, org, commit, setRunning]);

  const readSite = useCallback(async () => {
    if (!org) return;
    const target = bestWebsite(inv);
    if (!target) return;
    setRunning('website');
    inflight.add(inv.id);
    let intel: WebsiteIntel;
    try {
      intel = await postJson<WebsiteIntel>('/organization/website', { url: target.url, name: org.name, listedBy: target.listedBy }, 'The website could not be read.');
    } catch (e) {
      intel = {
        requestedUrl: target.url, reachable: false, error: e instanceof Error ? e.message : 'The website could not be read.',
        verification: { status: 'unverified', reasons: [] }, pages: [], structured: [], socialLinks: [], emails: [], phones: [], addresses: [],
        fetchedAt: new Date().toISOString()
      };
    }
    inflight.delete(inv.id);
    setRunning('');
    commit(
      current => ({ ...current, websiteIntel: intel }),
      [newAuditEvent({
        action: 'Website read', object: intel.requestedUrl, group: 'Searches', kind: 'system',
        detail: intel.reachable ? `${intel.pages.length} page(s) read · ${intel.verification.status}` : `Failed: ${intel.error || 'unreachable'}`
      })]
    );
  }, [inv, org, commit, setRunning]);

  return { running, enrich, readSite };
}

/**
 * The saved enrichment is missing, failed (not run, or most sources could not be reached — e.g. the search
 * quota was used up or Wikidata was busy), or older than the case's last "Re-run searches".
 */
export function needsEnrichment(inv: Investigation): boolean {
  const e = inv.orgEnrich;
  if (!e) return true;
  if (e.error) return true;
  // Searched by an earlier version (without units, people and the newer sources): refresh once.
  if ((e.version || 1) < ENRICHMENT_VERSION) return true;
  const failed = e.sources.filter(s => s.status === 'failed').length;
  if (e.sources.length === 0 || failed * 2 >= e.sources.length) return true;
  return Boolean(inv.lastSearched && new Date(inv.lastSearched).getTime() > new Date(e.checkedAt).getTime());
}

/** Runs the pipeline once for an organisation case: enrichment first, then the website it points to. */
export function useOrgPipelineAutoRun(): void {
  const { inv } = useWorkspace();
  const { running: saved, enrich, readSite } = useOrgPipeline();
  const running = saved && inflight.has(inv.id) ? saved : '';
  const done = useRef<{ enrich: boolean; site: string }>({ enrich: false, site: '' });

  useEffect(() => {
    if (inv.entityKind !== 'organization' || !inv.organization || running) return undefined;
    // The "already started" marks are set when the request actually starts (inside the timer): an effect
    // cleanup (React's development double-run, or a quick re-render) cancels the timer, and the next run
    // must then be allowed to schedule it again.
    if (needsEnrichment(inv)) {
      if (done.current.enrich) return undefined;
      const t = setTimeout(() => { done.current.enrich = true; enrich(); }, 0);
      return () => clearTimeout(t);
    }
    // Read the website the sources point to (again if the enrichment found a better-supported address).
    const target = bestWebsite(inv);
    const read = inv.websiteIntel;
    if (!target || done.current.site === target.url) return undefined;
    // Already read — unless by the earlier reader, which did not collect people and related sites (read once more, free).
    const outdated = Boolean(read?.reachable && (read.people === undefined || read.units === undefined));
    if (read && !outdated && (hostOf(read.requestedUrl) === hostOf(target.url) || hostOf(read.finalUrl) === hostOf(target.url))) return undefined;
    const t = setTimeout(() => { done.current.site = target.url; readSite(); }, 0);
    return () => clearTimeout(t);
  }, [inv, running, enrich, readSite]);
}
