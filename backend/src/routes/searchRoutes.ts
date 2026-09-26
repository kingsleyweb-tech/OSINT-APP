import { Router } from 'express';
import { handleOSINTSearch, handleOSINTSearchStream, handleRescanInvestigation } from '../controllers/searchController';
import { handleUsernameDiscoveryStream, handleUsernameDiscovery } from '../controllers/usernameDiscoveryController';
import { checkLinks } from '../services/nameSearch/linkHealth';
import { handleExplore, handleExploreCatalog, handleExplorePlan, handleQuota } from '../controllers/exploreController';
import { handleQueryIntel } from '../controllers/queryIntelController';

const router = Router();

router.post('/search', handleOSINTSearch);
router.post('/search/stream', handleOSINTSearchStream);
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

// Explore capabilities: news, images, videos, reverse image, social posts, places, events, trends
router.post('/explore', handleExplore);
router.post('/explore/plan', handleExplorePlan);
// Search intelligence: typo detection and corrections before a search (1 cached Google probe; none in Precise mode)
router.post('/query-intel', handleQueryIntel);
router.get('/explore/catalog', handleExploreCatalog);
router.get('/quota', handleQuota);

// Username Live Discovery Routes
router.get('/username-discovery/stream', handleUsernameDiscoveryStream);
router.get('/username-discovery', handleUsernameDiscovery);

export default router;



