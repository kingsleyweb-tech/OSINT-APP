import { createContext, useContext } from 'react';
import type { AuditEvent, EvidenceLevel, Finding, Investigation } from '../../../types/investigation';
import {
  indexSources, noteIds, pipelineCounts, profileKey, urlKey, webByBucket, allAuditEvents,
  type IndexedSource, type PipelineCounts, type WebBucket, type WebItem
} from '../../../lib/workspace';

export type TabKey =
  | 'overview' | 'profiles' | 'activity' | 'associations' | 'sources'
  | 'web' | 'news' | 'notes' | 'findings' | 'metrics' | 'audit';

export interface Derived {
  sources: IndexedSource[];
  sourceByKey: Map<string, IndexedSource>;
  buckets: Record<WebBucket, WebItem[]>;
  webByKey: Map<string, WebItem>;
  profileKeys: Set<string>;
  noteIds: Map<string, string>;
  /** Finding ids that cite each source key. */
  findingsByKey: Map<string, string[]>;
  pipeline: PipelineCounts;
  auditCount: number;
  counts: Record<TabKey, number | undefined>;
}

export function derive(inv: Investigation): Derived {
  const { list, byKey } = indexSources(inv);
  const buckets = webByBucket(inv);
  const webByKey = new Map<string, WebItem>();
  (inv.webAndNews || []).forEach(w => webByKey.set(urlKey(w.url), w));
  const findingsByKey = new Map<string, string[]>();
  (inv.findings || []).forEach(f => f.sourceKeys.forEach(k => findingsByKey.set(k, [...(findingsByKey.get(k) || []), f.id])));
  const auditCount = allAuditEvents(inv).length;
  const profiles = inv.socialProfiles || [];

  return {
    sources: list,
    sourceByKey: byKey,
    buckets,
    webByKey,
    profileKeys: new Set(profiles.map(profileKey)),
    noteIds: noteIds(inv.notes || []),
    findingsByKey,
    pipeline: pipelineCounts(inv),
    auditCount,
    // Each count is the length of exactly the list its tab renders.
    counts: {
      overview: undefined,
      profiles: profiles.length + buckets.page.length,
      activity: (inv.activities || []).length,
      associations: (inv.associations || []).length,
      sources: list.length,
      web: buckets.web.length,
      news: buckets.news.length,
      notes: (inv.notes || []).length,
      findings: (inv.findings || []).length,
      metrics: undefined,
      audit: auditCount
    }
  };
}

export interface RecordFindingPrefill {
  finding?: Finding;
  sourceKeys?: string[];
  title?: string;
  statement?: string;
}

export interface WorkspaceApi {
  inv: Investigation;
  d: Derived;
  focus: string | null;
  goTab: (tab: TabKey, focus?: string) => void;
  /** Applies a change, records audit events and saves the investigation. */
  commit: (mutate: (inv: Investigation) => Investigation, events?: AuditEvent[]) => void;
  setLevel: (key: string, level: EvidenceLevel, label: string, object: string) => void;
  openRecordFinding: (prefill?: RecordFindingPrefill) => void;
  newNote: (links?: string[]) => void;
  rerun: () => void;
  isRescanning: boolean;
}

export const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside the investigation workspace');
  return ctx;
}
