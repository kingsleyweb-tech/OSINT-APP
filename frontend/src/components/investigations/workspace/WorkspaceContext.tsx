import { createContext, useContext } from 'react';
import type { AuditEvent, EvidenceLevel, Investigation } from '../../../types/investigation';
import {
  indexSources, pipelineCounts, profileKey, urlKey, webByBucket, allAuditEvents, isSimilarProfile, isSimilarActivity, similarProfileKeys,
  type IndexedSource, type PipelineCounts, type WebBucket, type WebItem
} from '../../../lib/workspace';
import { allLocationRefs, summarise } from '../../../lib/locationEvidence';

export type TabKey =
  | 'overview' | 'profiles' | 'activity' | 'associations' | 'sources'
  | 'web' | 'news' | 'images' | 'location' | 'metrics' | 'audit';

export interface Derived {
  sources: IndexedSource[];
  sourceByKey: Map<string, IndexedSource>;
  buckets: Record<WebBucket, WebItem[]>;
  webByKey: Map<string, WebItem>;
  profileKeys: Set<string>;
  pipeline: PipelineCounts;
  auditCount: number;
  counts: Record<TabKey, number | undefined>;
}

export function derive(inv: Investigation): Derived {
  const { list, byKey } = indexSources(inv);
  const buckets = webByBucket(inv);
  const webByKey = new Map<string, WebItem>();
  (inv.webAndNews || []).forEach(w => webByKey.set(urlKey(w.url), w));
  const auditCount = allAuditEvents(inv).length;
  const profiles = (inv.socialProfiles || []).filter(p => !isSimilarProfile(p));
  const similarKeys = similarProfileKeys(inv);

  return {
    sources: list,
    sourceByKey: byKey,
    buckets,
    webByKey,
    profileKeys: new Set(profiles.map(profileKey)),
    pipeline: pipelineCounts(inv),
    auditCount,
    // Each count is the length of exactly the list its tab renders.
    counts: {
      overview: undefined,
      profiles: profiles.length + buckets.page.length,
      activity: (inv.activities || []).filter(a => !isSimilarActivity(a, similarKeys)).length,
      associations: (inv.associations || []).length,
      sources: list.length,
      web: buckets.web.length,
      news: buckets.news.length,
      images: (inv.imageResults || []).length,
      // Places in the Location summary (references linked to this identity).
      location: summarise(allLocationRefs(inv)).length,
      metrics: undefined,
      audit: auditCount
    }
  };
}

export interface WorkspaceApi {
  inv: Investigation;
  d: Derived;
  focus: string | null;
  goTab: (tab: TabKey, focus?: string) => void;
  /** Applies a change, records audit events and saves the investigation. */
  commit: (mutate: (inv: Investigation) => Investigation, events?: AuditEvent[]) => void;
  setLevel: (key: string, level: EvidenceLevel, label: string, object: string) => void;
  rerun: () => void;
  isRescanning: boolean;
}

export const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside the investigation workspace');
  return ctx;
}
