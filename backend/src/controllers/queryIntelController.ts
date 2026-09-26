import { Request, Response } from 'express';
import { analyze } from '../services/queryIntel/intelService';
import { rateLimited } from './exploreController';

const KINDS = ['name', 'username', 'topic'];

export const handleQueryIntel = async (req: Request, res: Response): Promise<void> => {
  const b = req.body || {};
  const query = typeof b.query === 'string' ? b.query : '';
  if (!query.trim()) {
    res.status(400).json({ error: 'Enter something to search.' });
    return;
  }
  if (!KINDS.includes(b.kind)) {
    res.status(400).json({ error: 'Unsupported search type.' });
    return;
  }
  if (b.mode !== 'precise' && rateLimited(req)) {
    res.status(429).json({ error: 'Too many searches in a short time. Wait a few minutes and try again.' });
    return;
  }
  const knownNames = Array.isArray(b.knownNames) ? b.knownNames.filter((n: unknown) => typeof n === 'string').slice(0, 300) : [];
  res.json(await analyze({
    query,
    kind: b.kind,
    mode: b.mode === 'precise' ? 'precise' : 'intelligent',
    country: /^[a-z]{2}$/i.test(b.country || '') ? String(b.country).toLowerCase() : undefined,
    knownNames
  }));
};
