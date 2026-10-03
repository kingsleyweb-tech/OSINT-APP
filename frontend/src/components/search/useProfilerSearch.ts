import { useCallback, useMemo } from 'react';
import { getPageState, setPageState, usePageState } from '../../lib/pageState';
import type { LoaderStep } from '../ui/SearchLoader';
import type { DiscoveredIdentity } from './PossibleIdentitiesView';
import { runSearch, SearchError, type ProfilerSearchType, type SearchProgressEvent } from '../../lib/searchClient';
import { recordSearch } from '../../lib/history';
import { intelHistoryFields } from '../../lib/queryIntelClient';
import { useQueryIntel } from './useIntelligentSearch';
import { useConfirm } from '../ui/ConfirmModal';
import type { SearchHistoryResult, SearchMode } from '../../types/user';

export interface ProfilerRunOptions {
  mode?: SearchMode;
  /** The investigator's own cases (for "you already have a case" and the correction check). */
  cases?: Array<{
    id: string; name: string; searchType?: string; lastSearched?: string; createdAt?: string;
    socialProfiles?: unknown[]; sources?: unknown[]; webAndNews?: unknown[];
  }>;
  keepOriginal?: boolean;
  chosen?: string;
}

export interface ProfilerRunResult {
  identities: DiscoveredIdentity[];
  /** The query that was searched (the original, or a confident correction). */
  searchQuery: string;
  /** Set when the investigator chose to open an existing case instead of searching again. */
  openCaseId?: string;
}

const DAY_MS = 24 * 3600 * 1000;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const controllers = new Map<string, AbortController>();

/**
 * Name / username search with the intelligence check, live per-source progress, cancel, and history saving.
 * `page` keeps the progress, banner and history link when leaving the page mid-search
 * ("dashboard" and "profiler" are separate pages with their own searches).
 */
export function useProfilerSearch(page = 'profiler') {
  const [running, setRunning] = usePageState<boolean>(`${page}:run:running`, false);
  const [steps, setSteps] = usePageState<LoaderStep[]>(`${page}:run:steps`, []);
  // History entry of the latest search (read when a case is created from it).
  const historyIdRef = useMemo(() => ({
    get current(): string | null { return getPageState<string | null>(`${page}:historyId`) ?? null; }
  }), [page]);
  const qi = useQueryIntel(`${page}:qi`);
  const confirm = useConfirm();

  const onProgress = useCallback((e: SearchProgressEvent) => {
    if (e.type === 'plan' || e.type === 'add') {
      const added = e.steps.map(s => ({ id: s.id, label: s.label, state: 'active' as const }));
      setSteps(prev => (e.type === 'plan' ? [...prev.filter(s => s.id === 'intel'), ...added] : [...prev, ...added]));
    } else {
      setSteps(prev => prev.map(s => (s.id !== e.id ? s : {
        ...s,
        state: e.status === 'failed' ? 'failed' : e.status === 'empty' ? 'empty' : 'done',
        note: e.note
      })));
    }
  }, [setSteps]);

  const cancel = useCallback(() => {
    qi.cancel();
    controllers.get(page)?.abort();
    controllers.delete(page);
    setRunning(false);
    setSteps([]);
  }, [qi, page, setRunning, setSteps]);

  const run = useCallback(async (query: string, type: ProfilerSearchType, depth?: 'quick' | 'standard' | 'deep', opts: ProfilerRunOptions = {}): Promise<ProfilerRunResult> => {
    controllers.get(page)?.abort();
    const controller = new AbortController();
    controllers.set(page, controller);
    const kind = type.toLowerCase() as 'name' | 'username' | 'email' | 'phone';
    // Emails and phone numbers are searched exactly as entered (no spelling check), like usernames.
    const checkKind = kind === 'name' ? 'name' : 'username';
    const mode = opts.mode || 'intelligent';

    // Investigation memory: the same name/username searched in the last 24 hours already has a case.
    // Only a case from the same kind of search that holds evidence is offered — never an empty placeholder.
    if (!opts.keepOriginal && !opts.chosen) {
      const recent = (opts.cases || []).find(c =>
        norm(c.name).replace(/^@/, '') === norm(query).replace(/^@/, '') &&
        c.searchType === kind &&
        ((c.socialProfiles || []).length > 0 || (c.sources || []).length > 0 || (c.webAndNews || []).length > 0) &&
        Date.now() - Date.parse(c.lastSearched || c.createdAt || '') < DAY_MS);
      if (recent) {
        const openCase = await confirm({
          title: 'Existing Case Found',
          message: `You already searched <strong>"${recent.name}"</strong> in the last 24 hours.<br/>Would you like to open that case instead of using another search?`,
          confirmLabel: 'Open Existing Case',
          cancelLabel: 'Search Again',
          hint: 'Opening the existing case won\'t use any searches.',
          variant: 'info',
        });
        if (openCase) {
          controllers.delete(page);
          return { identities: [], searchQuery: query, openCaseId: recent.id };
        }
      }
    }

    setRunning(true);
    setSteps([{ id: 'intel', label: kind === 'name' && mode === 'intelligent' ? 'Checking spelling and meaning' : 'Planning the search', state: 'active' }]);
    try {
      const checked = await qi.check(query, checkKind, mode, { knownNames: (opts.cases || []).map(c => c.name), keepOriginal: opts.keepOriginal, chosen: opts.chosen });
      if (!checked || controller.signal.aborted) throw new SearchError('The search was cancelled.', 'Search cancelled');
      setSteps(prev => prev.map(s => (s.id === 'intel' ? {
        ...s, state: 'done',
        note: checked.intel?.applied ? `Searching "${checked.query}"` : checked.intel?.corrections.length ? 'Suggestions found' : 'Looks correct'
      } : s)));

      const identities = await runSearch(checked.query, type, depth, { onProgress, signal: controller.signal });
      const top: SearchHistoryResult[] = identities.slice(0, 8).map(i => {
        const p = i.investigation?.socialProfiles?.[0];
        return {
          title: `${i.fullName}${i.publicRole && !/not stated/i.test(i.publicRole) ? ` · ${i.publicRole}` : ''}`,
          url: p?.profileUrl || p?.url || '',
          source: `${i.profilesCount} profile${i.profilesCount === 1 ? '' : 's'} · ${i.sourcesCount} source${i.sourcesCount === 1 ? '' : 's'}`,
          ...(i.avatarUrl ? { thumbnail: i.avatarUrl } : {})
        };
      });
      // Saved in the background so the results appear without waiting for Firestore.
      setPageState<string | null>(`${page}:historyId`, null);
      recordSearch({
        ...intelHistoryFields(checked.intel),
        category: kind, query,
        detail: `${identities.length} possible ${identities.length === 1 ? 'person' : 'people'}`,
        resultCount: identities.reduce((n, i) => n + i.profilesCount, 0),
        topResults: top,
        params: { q: query, type }
      }, { page, payload: { query, searchQuery: checked.query, type, identities, intel: checked.intel } }).then(id => setPageState<string | null>(`${page}:historyId`, id));
      if (kind === 'name' && mode === 'intelligent') {
        const names = identities.flatMap(i => (i.investigation?.socialProfiles || []).map((p: { profileName?: string; title?: string }) => p.profileName || p.title || ''));
        qi.learnFromResults(checked.query, [...names, ...identities.map(i => i.fullName)], 'profiles');
      }
      if (kind === 'username' && mode === 'intelligent') {
        // Handles named by the results: profile usernames and the @handle / x.com/handle in result links.
        const handles: string[] = [];
        identities.forEach(i => {
          (i.investigation?.socialProfiles || []).forEach((p: { username?: string }) => { if (p.username) handles.push(p.username); });
          (i.investigation?.webAndNews || []).forEach((w: { url?: string }) => {
            const m = (w.url || '').match(/(?:tiktok\.com|youtube\.com)\/@([\w.]+)|(?:x|twitter|instagram)\.com\/([\w.]+)/i);
            if (m) handles.push(m[1] || m[2]);
          });
        });
        qi.learnHandleFromResults(checked.query, handles);
      }
      return { identities, searchQuery: checked.query };
    } finally {
      if (controllers.get(page) === controller) {
        controllers.delete(page);
        setRunning(false);
      }
    }
  }, [onProgress, qi, page, setRunning, setSteps, confirm]);

  return { run, cancel, running, steps, historyId: historyIdRef, intel: qi.intel, setIntel: qi.setIntel };
}
