import type { Request, Response } from 'express';
import { aiStatus, analyzeInvestigation } from '../services/ai/analysisEngine';
import { AIError } from '../services/ai/provider';
import { researchLimit, researchUsedToday, runResearch } from '../services/ai/research';
import type { AIField } from '../services/ai/types';
import { rateLimited } from './exploreController';

const uidOf = (req: Request) => String((req as any).user?.uid || 'anonymous');

/** GET /api/ai/status — whether AI analysis is set up, the model, and today's usage (no secrets). */
export function handleAiStatus(req: Request, res: Response): void {
  const uid = uidOf(req);
  res.json({ ...aiStatus(uid), researchUsedToday: researchUsedToday(uid), researchLimit: researchLimit() });
}

/** What the case's tabs currently show per field (sent by the app); only short strings or null are kept. */
function knownOf(raw: unknown): Record<string, string | null> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, string | null> = {};
  Object.entries(raw as Record<string, unknown>).slice(0, 40).forEach(([k, v]) => {
    if (!/^[a-z_]{2,20}$/.test(k)) return;
    if (v === null) out[k] = null;
    else if (typeof v === 'string') out[k] = v.slice(0, 600);
  });
  return out;
}

/**
 * POST /api/ai/analyze { investigation } — analyses the evidence the case already holds (no new searches).
 * The browser saves the result on the case, like a re-run. Errors are plain messages without secrets.
 */
export async function handleAiAnalyze(req: Request, res: Response): Promise<void> {
  const inv = req.body?.investigation;
  if (!inv || typeof inv !== 'object' || !inv.targetProfile) {
    res.status(400).json({ error: 'Provide the investigation to analyse.' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ error: 'Too many requests in a short time. Wait a few minutes and try again.', code: 'rate_limited' });
    return;
  }
  try {
    res.json(await analyzeInvestigation(uidOf(req), inv, knownOf(req.body?.known)));
  } catch (e) {
    if (e instanceof AIError) {
      const status = e.code === 'not_configured' ? 503 : e.code === 'rate_limited' ? 429 : e.code === 'timeout' ? 504 : 502;
      console.warn(`[ai/analyze] ${e.code}: ${e.message}`);
      res.status(status).json({ error: e.message, code: e.code });
      return;
    }
    console.error('[ai/analyze]', (e as Error)?.message);
    res.status(500).json({ error: 'The AI analysis could not be completed. The case is unchanged.', code: 'unavailable' });
  }
}

/**
 * POST /api/ai/research { investigation, fields, news } — targeted searches for fields the case's evidence does
 * not cover (at most 4 SerpApi searches, queries built on the server from the case's subject). Returns the
 * results to save on the case as evidence; the browser then re-runs the analysis.
 */
export async function handleAiResearch(req: Request, res: Response): Promise<void> {
  const inv = req.body?.investigation;
  const fields: AIField[] = Array.isArray(req.body?.fields) ? req.body.fields.filter((f: unknown) => typeof f === 'string' && /^[a-z_]{2,20}$/.test(f)).slice(0, 20) : [];
  if (!inv || typeof inv !== 'object' || !inv.targetProfile) {
    res.status(400).json({ error: 'Provide the investigation to search for.' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ error: 'Too many requests in a short time. Wait a few minutes and try again.', code: 'rate_limited' });
    return;
  }
  try {
    res.json(await runResearch(uidOf(req), inv, fields, Boolean(req.body?.news)));
  } catch (e: any) {
    const code = e?.code === 'rate_limited' ? 429 : e?.code === 'bad_request' ? 400 : 502;
    if (code === 502) console.error('[ai/research]', e?.message);
    res.status(code).json({ error: code === 502 ? 'The searches could not be completed. The case is unchanged.' : e.message, code: e?.code || 'unavailable' });
  }
}
