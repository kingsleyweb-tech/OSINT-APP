/**
 * AI analysis client. The analysis runs on the server (the Gemini key never reaches the browser) and
 * only reads the evidence the case already holds — it never runs new searches.
 *
 * Runs are kept here, outside React, one per case: the investigator can switch tabs (or leave the case)
 * while it runs. The case page applies the result when it finishes; if the page is no longer open, the
 * result is saved straight to the case.
 */
import type { AIAnalysis, AIField, AIResearch, Investigation } from '../types/investigation';
import { orgKnown } from './organizationProfile';
import { apiFetch } from './apiAuth';
import { getApiBase } from './searchClient';
import { getInvestigationFromDb, saveInvestigationToDb } from '../firebase/firestore';
import { newAuditEvent } from './workspace';
import { mergeAiFindings } from './personFacts';

export interface AiStatus { configured: boolean; provider: string; model: string; usedToday: number; dailyLimit: number; researchUsedToday?: number; researchLimit?: number }

export interface AiRun {
  status: 'running' | 'done' | 'error';
  startedAt: string;
  analysis?: AIAnalysis;
  cached?: boolean;
  error?: string;
  code?: string;
  /** Set once the case page (or the fallback save) has stored the result. */
  applied?: boolean;
}

const runs = new Map<string, AiRun>();
const listeners = new Map<string, Set<(r: AiRun | undefined) => void>>();
const emit = (id: string) => listeners.get(id)?.forEach(fn => fn(runs.get(id)));

export const getAiRun = (caseId: string) => runs.get(caseId);

export function subscribeAiRun(caseId: string, fn: (r: AiRun | undefined) => void): () => void {
  if (!listeners.has(caseId)) listeners.set(caseId, new Set());
  listeners.get(caseId)!.add(fn);
  return () => { listeners.get(caseId)?.delete(fn); };
}

export function markAiRunApplied(caseId: string): void {
  const r = runs.get(caseId);
  if (r) runs.set(caseId, { ...r, applied: true });
}

export async function fetchAiStatus(): Promise<AiStatus | null> {
  try {
    const res = await apiFetch(`${getApiBase()}/ai/status`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Starts an analysis of the case (no-op while one is already running for it). */
export function startAiAnalysis(inv: Investigation): void {
  if (runs.get(inv.id)?.status === 'running') return;
  runs.set(inv.id, { status: 'running', startedAt: new Date().toISOString() });
  emit(inv.id);
  (async () => {
    try {
      const res = await apiFetch(`${getApiBase()}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // An organisation: what its tab shows after cross-checking, so findings are compared with that.
        body: JSON.stringify({ investigation: inv, ...(inv.entityKind === 'organization' ? { known: orgKnown(inv) } : {}) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.analysis) {
        runs.set(inv.id, { ...runs.get(inv.id)!, status: 'error', error: data.error || 'The AI analysis could not be completed. The case is unchanged.', code: data.code });
      } else {
        runs.set(inv.id, { ...runs.get(inv.id)!, status: 'done', analysis: data.analysis, cached: Boolean(data.cached) });
      }
    } catch {
      runs.set(inv.id, { ...runs.get(inv.id)!, status: 'error', error: 'The AI service could not be reached. The case is unchanged.', code: 'unavailable' });
    }
    emit(inv.id);
    // Nobody has the case open: save the result to it directly.
    const r = runs.get(inv.id)!;
    if (r.status === 'done' && !r.applied && !(listeners.get(inv.id)?.size)) {
      const fresh = await getInvestigationFromDb(inv.id);
      if (fresh && r.analysis) {
        await saveInvestigationToDb({ ...mergeAiFindings({ ...fresh, aiAnalysis: r.analysis }, r.analysis), auditLog: [aiCompletedEvent(r.analysis, r.cached), ...(fresh.auditLog || [])] }).catch(() => undefined);
        markAiRunApplied(inv.id);
      }
    }
  })();
}

export function aiCompletedEvent(a: AIAnalysis, cached?: boolean) {
  const m = a.metrics;
  return newAuditEvent({
    action: 'AI analysis completed',
    object: a.subject,
    detail: `${m.evidenceReviewed} evidence items reviewed · ${m.findings} findings · ${m.timeline} dated events · ${m.relationships} relationships · ${m.conflicts} conflicts · ${m.discarded} unsupported statements discarded · ${a.model}${cached ? ' (same evidence as before: saved result reused)' : ''}`,
    group: 'Investigation',
    kind: 'system'
  });
}

/**
 * Targeted searches for missing fields (only when the investigator asks). The server builds the queries from
 * the case's subject and keeps results that name it; they are returned to be saved on the case, and the next
 * analysis reads them like any other source.
 */
export async function runAiResearch(inv: Investigation, fields: AIField[], news: boolean): Promise<{ research: AIResearch; run: AIResearch['runs'][number] }> {
  let res: Response;
  try {
    res = await apiFetch(`${getApiBase()}/ai/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investigation: inv, fields, news })
    });
  } catch {
    throw new Error('The search service could not be reached. The case is unchanged.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.research) throw new Error(data.error || 'The searches could not be run. The case is unchanged.');
  return data;
}
