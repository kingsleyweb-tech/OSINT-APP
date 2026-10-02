import { Router } from 'express';
import { handleOSINTSearch, handleOSINTSearchStream, handleRescanInvestigation } from '../controllers/searchController';
import { handleUsernameDiscoveryStream, handleUsernameDiscovery } from '../controllers/usernameDiscoveryController';
import { checkLinks } from '../services/nameSearch/linkHealth';
import { handleExplore, handleExploreCatalog, handleExplorePlan, handleQuota } from '../controllers/exploreController';
import { handleQueryIntel } from '../controllers/queryIntelController';
import { handleAlertsStatus, handleRunAlert, handleTestEmail } from '../controllers/alertsController';
import { rateLimited } from '../controllers/exploreController';
import { readOrganizationWebsite } from '../services/organization/websiteIntel';
import { enrichOrganization, suggestEntities } from '../services/organization/orgEnrichment';

const router = Router();

router.post('/search', handleOSINTSearch);
router.post('/search/stream', handleOSINTSearchStream);
router.post('/investigations/rescan', handleRescanInvestigation);

// Server-side reachability check for discovered profile URLs (registry hosts only).
// Suggestions while typing a name (Wikidata search; free, cached). Not rate limited per keystroke, but short.
router.get('/organization/suggest', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  if (q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }
  try {
    res.json({ suggestions: await suggestEntities(q) });
  } catch {
    res.json({ suggestions: [] });
  }
});

// Organisation enrichment: Google Maps, Google and Bing web, social platforms, videos (5 SerpApi searches) and Wikidata (free).
router.post('/organization/enrich', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 200) : '';
  const websites = Array.isArray(req.body?.websites) ? req.body.websites.filter((x: unknown) => typeof x === 'string').map((x: string) => x.slice(0, 300)).slice(0, 5) : [];
  if (name.length < 2) {
    res.status(400).json({ error: 'Provide the organisation name.' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ error: 'Too many requests in a short time. Wait a few minutes and try again.' });
    return;
  }
  try {
    console.log(`[organization/enrich] "${name}"`);
    res.json(await enrichOrganization(name, websites));
  } catch (e) {
    console.error('[organization/enrich]', (e as Error)?.message);
    res.status(500).json({ error: 'The organisation sources could not be searched.' });
  }
});

// Organisation website intelligence: reads the public pages of an organisation's website (no SerpApi searches).
router.post('/organization/website', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim().slice(0, 500) : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 200) : '';
  if (!url || !name) {
    res.status(400).json({ error: 'Provide the website address and the organisation name.' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ error: 'Too many requests in a short time. Wait a few minutes and try again.' });
    return;
  }
  try {
    const listedBy = Array.isArray(req.body?.listedBy)
      ? req.body.listedBy.filter((x: unknown) => typeof x === 'string').map((x: string) => x.slice(0, 80)).slice(0, 5)
      : req.body?.fromKnowledgePanel === true ? ['Google’s knowledge panel'] : [];
    res.json(await readOrganizationWebsite(url, name, listedBy));
  } catch (e) {
    console.error('[organization/website]', (e as Error)?.message);
    res.status(500).json({ error: 'The website could not be read.' });
  }
});

router.post('/link-health', async (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
  if (urls.length === 0) {
    res.status(400).json({ error: 'Provide a non-empty "urls" array.' });
    return;
  }
  res.json({ results: await checkLinks(urls) });
});

// Explore capabilities: news, images, videos, social posts, places, events, trends
router.post('/explore', handleExplore);
router.post('/explore/plan', handleExplorePlan);
// Search intelligence: typo detection and corrections before a search (1 cached Google probe; none in Precise mode)
router.post('/query-intel', handleQueryIntel);
router.get('/explore/catalog', handleExploreCatalog);
router.get('/quota', handleQuota);

// Keyword alerts (signed-in users; each alert belongs to its creator)
router.get('/alerts/status', handleAlertsStatus);
router.post('/alerts/test-email', handleTestEmail);
router.post('/alerts/:id/run', handleRunAlert);

// Username Live Discovery Routes
router.get('/username-discovery/stream', handleUsernameDiscoveryStream);
router.get('/username-discovery', handleUsernameDiscovery);

export default router;



