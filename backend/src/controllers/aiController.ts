import type { Request, Response } from 'express';
import { aiStatus, analyzeInvestigation } from '../services/ai/analysisEngine';
import { AIError } from '../services/ai/provider';
import { rateLimited } from './exploreController';

const uidOf = (req: Request) => String((req as any).user?.uid || 'anonymous');

/** GET /api/ai/status — whether AI analysis is set up, the model, and today's usage (no secrets). */
export function handleAiStatus(req: Request, res: Response): void {
  res.json(aiStatus(uidOf(req)));
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
    res.json(await analyzeInvestigation(uidOf(req), inv));
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
