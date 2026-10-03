import { Request, Response } from 'express';
import { getTrends } from '../services/trends/trendsService';
import { TREND_WINDOWS, type TrendSource, type TrendWindow } from '../services/explore/engineCatalog';

// One trends request fans out to several sources, so it has its own, smaller per-user limit.
const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(req: Request): boolean {
  const id = (req as any).user?.uid || String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(id) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(id, recent);
  return recent.length > MAX_PER_WINDOW;
}

const PLATFORMS: TrendSource[] = ['google', 'news', 'x', 'youtube', 'reddit', 'tiktok', 'facebook', 'instagram'];
const CC = /^[a-z]{2}$/i;

/** POST /api/trends { mode, term?, platforms[], window, country?, language?, ai? } */
export const handleTrends = async (req: Request, res: Response): Promise<void> => {
  const b = req.body || {};
  const mode = b.mode === 'topic' ? 'topic' : 'discover';
  const term = typeof b.term === 'string' ? b.term.trim() : '';
  if (mode === 'topic' && term.length < 2) {
    res.status(400).json({ error: 'Enter at least 2 characters to search.' });
    return;
  }
  const window = (Object.keys(TREND_WINDOWS) as TrendWindow[]).includes(b.window) ? b.window as TrendWindow : '24h';
  if (rateLimited(req)) {
    res.status(429).json({ error: 'Too many trend searches in a short time. Wait a few minutes and try again.' });
    return;
  }
  try {
    res.json(await getTrends({
      mode, term, window,
      platforms: Array.isArray(b.platforms) ? b.platforms.filter((p: unknown) => PLATFORMS.includes(p as TrendSource)).slice(0, 8) : [],
      country: CC.test(b.country || '') ? String(b.country).toLowerCase() : undefined,
      language: CC.test(b.language || '') ? String(b.language).toLowerCase() : undefined,
      ai: b.ai !== false
    }));
  } catch (e) {
    console.error('[Trends Error]:', e);
    res.status(500).json({ error: 'The trends could not be loaded. Try again shortly.' });
  }
};
