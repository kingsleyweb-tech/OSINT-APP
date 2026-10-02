import crypto from 'crypto';
import { Request, Response } from 'express';
import { adminAuth, adminConfigured, adminDb } from '../services/alerts/admin';
import { mailConfigured, missingMailSettings, sendTestEmail } from '../services/alerts/mailer';
import { alertsStatus, runAlert, runDueAlerts } from '../services/alerts/alertRunner';
import { rateLimited } from './exploreController';

const uidOf = (req: Request): string | undefined => (req as any).user?.uid;

/** Scheduler entry point (cron-job.org): needs the x-cron-secret header; answers at once and runs in the background. */
let cronRunning = false;
export const handleAlertsCron = (req: Request, res: Response): void => {
  const secret = process.env.ALERTS_CRON_SECRET || '';
  const given = String(req.headers['x-cron-secret'] || '');
  const ok = secret.length >= 16 && given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) {
    res.status(401).json({ error: 'Not allowed.' });
    return;
  }
  if (!adminConfigured()) {
    res.status(503).json({ error: 'Alerts are not configured on the server.' });
    return;
  }
  res.status(202).json({ accepted: true, alreadyRunning: cronRunning });
  if (cronRunning) return;
  cronRunning = true;
  runDueAlerts()
    .then(r => console.log(`[Alerts] cron: ${r.ran} ran, ${r.waiting} waiting`))
    .catch(() => console.error('[Alerts] cron run failed.'))
    .finally(() => { cronRunning = false; });
};

/** "Run now" for one alert — only its owner may run it. */
export const handleRunAlert = async (req: Request, res: Response): Promise<void> => {
  const uid = uidOf(req);
  const id = String(req.params.id || '');
  if (!uid || !/^[\w-]{6,64}$/.test(id)) {
    res.status(400).json({ error: 'Invalid alert.' });
    return;
  }
  if (!adminConfigured()) {
    res.status(503).json({ error: 'Alerts are not configured on the server.' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ error: 'Too many searches in a short time. Wait a few minutes and try again.' });
    return;
  }
  try {
    const snap = await adminDb().collection('alerts').doc(id).get();
    if (!snap.exists || snap.get('ownerUid') !== uid) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }
    res.json({ result: await runAlert(id, { manual: true }) });
  } catch {
    res.status(500).json({ error: 'The alert could not be run. Please try again.' });
  }
};

/** Test email to the signed-in user's own account email only. */
export const handleTestEmail = async (req: Request, res: Response): Promise<void> => {
  const uid = uidOf(req);
  if (!uid || !adminConfigured() || !mailConfigured()) {
    const missing = missingMailSettings();
    res.status(503).json({ error: missing.length ? `Email is not set up on the server: add ${missing.join(' and ')} and redeploy.` : 'Email is not configured on the server.' });
    return;
  }
  try {
    const user = await adminAuth().getUser(uid);
    if (!user.email) {
      res.status(400).json({ error: 'Your account has no email address.' });
      return;
    }
    await sendTestEmail(user.email);
    res.json({ sentTo: user.email });
  } catch (e) {
    // The mailer's messages say what went wrong (e.g. Brevo blocked the IP) and never contain credentials.
    res.status(502).json({ error: e instanceof Error ? e.message : 'The test email could not be sent.' });
  }
};

export const handleAlertsStatus = async (_req: Request, res: Response): Promise<void> => {
  const configured = adminConfigured();
  // The sender address is shown on the page so users know which emails to look for (and rescue from Spam).
  const sender = process.env.MAIL_FROM || process.env.SMTP_USER || '';
  const base = { configured, emailConfigured: mailConfigured(), ...(sender ? { sender, senderName: process.env.SMTP_FROM_NAME || 'OSINT Alerts' } : {}) };
  if (!configured) {
    res.json(base);
    return;
  }
  try {
    res.json({ ...base, ...(await alertsStatus()) });
  } catch {
    res.json(base);
  }
};
