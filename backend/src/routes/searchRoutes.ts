import { Router } from 'express';
import { handleOSINTSearch, handleRescanInvestigation } from '../controllers/searchController';
import { handleUsernameDiscoveryStream, handleUsernameDiscovery } from '../controllers/usernameDiscoveryController';

const router = Router();

router.post('/search', handleOSINTSearch);
router.post('/investigations/rescan', handleRescanInvestigation);

// Username Live Discovery Routes
router.get('/username-discovery/stream', handleUsernameDiscoveryStream);
router.get('/username-discovery', handleUsernameDiscovery);

export default router;



