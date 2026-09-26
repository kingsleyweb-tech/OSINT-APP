import { Request, Response } from 'express';
import { explore, quotaStatus, ExploreInputError } from '../services/explore/exploreService';
import { SOCIAL_PLATFORMS, DEFAULT_SOCIAL_PLATFORMS, planLabels } from '../services/explore/engineCatalog';
import type { ExploreCapability } from '../types/explore';

const CAPABILITIES: ExploreCapability[] = [
  'news', 'images', 'videos', 'reverseImage', 'social', 'forums', 'places', 'placeReviews', 'events', 'trends', 'trendingNow',
  'web', 'webBing', 'placeLookup'
];

// Simple per-client limit so a runaway page cannot drain the monthly SerpApi quota.
const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, number[]>();

export function rateLimited(req: Request): boolean {
  const id = (req as any).user?.uid || String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(id) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(id, recent);
  return recent.length > MAX_PER_WINDOW;
}

const CC = /^[a-z]{2}$/i;
const TIMEFRAMES = ['now 1-H', 'now 4-H', 'now 1-d', 'now 7-d', 'today 1-m', 'today 3-m', 'today 12-m', 'today 5-y', 'all'];

export const handleExplore = async (req: Request, res: Response): Promise<void> => {
  const body = req.body || {};
  const capability = body.capability as ExploreCapability;
  if (!CAPABILITIES.includes(capability)) {
    res.status(400).json({ error: 'Unsupported search type.' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ error: 'Too many searches in a short time. Wait a few minutes and try again.' });
    return;
  }
  const o = body.options || {};
  const options = {
    when: ['h', 'd', 'w', 'm', 'y'].includes(o.when) ? o.when : undefined,
    country: CC.test(o.country || '') ? String(o.country).toLowerCase() : undefined,
    language: CC.test(o.language || '') ? String(o.language).toLowerCase() : undefined,
    platforms: Array.isArray(o.platforms) ? o.platforms.filter((p: unknown) => typeof p === 'string' && SOCIAL_PLATFORMS[p as string]).slice(0, 12) : undefined,
    page: Number.isInteger(o.page) ? o.page : 0,
    imageUrl: typeof o.imageUrl === 'string' ? o.imageUrl.trim().slice(0, 2000) : undefined,
    dataId: typeof o.dataId === 'string' && /^[\w:.-]{3,200}$/.test(o.dataId) ? o.dataId : undefined,
    timeframe: TIMEFRAMES.includes(o.timeframe) ? o.timeframe : undefined,
    callIndex: Number.isInteger(o.callIndex) && o.callIndex >= 0 && o.callIndex < 10 ? o.callIndex : undefined
  };
  try {
    res.json(await explore({ capability, query: body.query, options }));
  } catch (e: any) {
    if (e instanceof ExploreInputError) {
      res.status(400).json({ error: e.message });
      return;
    }
    console.error('[Explore Error]:', e);
    res.status(500).json({ error: 'The search could not be completed.' });
  }
};

/** The engine calls a search would make, so the page can list them before running (no SerpApi call). */
export const handleExplorePlan = (req: Request, res: Response): void => {
  const body = req.body || {};
  const capability = body.capability as ExploreCapability;
  if (!CAPABILITIES.includes(capability)) {
    res.status(400).json({ error: 'Unsupported search type.' });
    return;
  }
  try {
    res.json({ calls: planLabels(capability, String(body.query || ''), body.options || {}) });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Invalid search request.' });
  }
};

export const handleExploreCatalog = (_req: Request, res: Response): void => {
  res.json({
    capabilities: CAPABILITIES,
    socialPlatforms: Object.entries(SOCIAL_PLATFORMS).map(([id, p]) => ({ id, label: p.label, default: DEFAULT_SOCIAL_PLATFORMS.includes(id) })),
    trendTimeframes: TIMEFRAMES
  });
};

export const handleQuota = async (_req: Request, res: Response): Promise<void> => {
  res.json(await quotaStatus());
};
