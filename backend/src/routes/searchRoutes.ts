import { Router } from 'express';
import { handleOSINTSearch, handleRescanInvestigation } from '../controllers/searchController';
import { handleUsernameDiscoveryStream, handleUsernameDiscovery } from '../controllers/usernameDiscoveryController';
import { checkLinks } from '../services/nameSearch/linkHealth';

const router = Router();

router.post('/search', handleOSINTSearch);
router.post('/investigations/rescan', handleRescanInvestigation);

// Server-side reachability check for discovered profile URLs (registry hosts only).
router.post('/link-health', async (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
  if (urls.length === 0) {
    res.status(400).json({ error: 'Provide a non-empty "urls" array.' });
    return;
  }
  res.json({ results: await checkLinks(urls) });
});

// Username Live Discovery Routes
router.get('/username-discovery/stream', handleUsernameDiscoveryStream);
router.get('/username-discovery', handleUsernameDiscovery);

export default router;



