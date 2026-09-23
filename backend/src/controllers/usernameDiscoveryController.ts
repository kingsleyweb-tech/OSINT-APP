import { Request, Response } from 'express';
import { usernameDiscoveryService } from '../services/intelligence/usernameDiscoveryService';

export const handleUsernameDiscoveryStream = async (req: Request, res: Response): Promise<void> => {
  const username = (req.query.username as string || '').trim();

  if (!username || username.length < 3) {
    res.status(400).json({ error: 'Username parameter must be at least 3 characters long.' });
    return;
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Helper to send SSE messages
  const sendSSE = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendSSE('discovery_start', { username, timestamp: new Date().toISOString() });

    const { summary } = await usernameDiscoveryService.discoverUsernames(username, (platformItem) => {
      sendSSE('platform_update', platformItem);
    });

    sendSSE('discovery_complete', summary);
    res.end();
  } catch (err: any) {
    console.error('[UsernameDiscoveryController] Error during stream:', err);
    sendSSE('discovery_error', { error: err.message || 'Discovery processing error' });
    res.end();
  }
};

export const handleUsernameDiscovery = async (req: Request, res: Response): Promise<void> => {
  const username = (req.query.username as string || '').trim();

  if (!username || username.length < 3) {
    res.status(400).json({ error: 'Username parameter must be at least 3 characters long.' });
    return;
  }

  try {
    const items: any[] = [];
    const { items: allItems, summary } = await usernameDiscoveryService.discoverUsernames(username, (item) => {
      items.push(item);
    });

    res.json({
      success: true,
      summary,
      results: allItems
    });
  } catch (err: any) {
    console.error('[UsernameDiscoveryController] Error:', err);
    res.status(500).json({ error: 'Failed to discover username profiles.' });
  }
};
