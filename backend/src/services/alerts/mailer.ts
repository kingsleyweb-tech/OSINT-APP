import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Alert emails through Gmail SMTP (or any SMTP server) with Nodemailer. Credentials come from
 * SMTP_USER / SMTP_PASS in the environment and are never logged; failures are reported generically.
 */
let transport: Transporter | null = null;

/**
 * Two ways to send:
 *  - BREVO_API_KEY set: Brevo's HTTPS email API (port 443). Use this on hosts that block outgoing SMTP
 *    ports 25/465/587, such as Render's free plan. The sender (MAIL_FROM or SMTP_USER) must be a sender
 *    verified in Brevo.
 *  - otherwise SMTP (Gmail by default) with Nodemailer.
 * Short timeouts so a blocked connection fails in seconds instead of hanging.
 */
const useBrevo = () => Boolean(process.env.BREVO_API_KEY);
const senderAddress = () => process.env.MAIL_FROM || process.env.SMTP_USER || '';
const senderName = () => (process.env.SMTP_FROM_NAME || 'OSINT Alerts').replace(/"/g, '');

export function mailConfigured(): boolean {
  return useBrevo() ? Boolean(senderAddress()) : Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function mailer(): Transporter {
  if (!mailConfigured()) throw new Error('Email is not configured on the server.');
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000
    });
  }
  return transport;
}

interface Outgoing { to: string; subject: string; text: string; html: string }

/** Sends one email by the configured method. Errors carry a short code only (never credentials). */
async function deliver(m: Outgoing): Promise<void> {
  if (!mailConfigured()) throw new Error('Email is not configured on the server.');
  if (useBrevo()) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY as string, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { name: senderName(), email: senderAddress() }, to: [{ email: m.to }], subject: m.subject, textContent: m.text, htmlContent: m.html }),
        signal: ctrl.signal
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`[Mail] Brevo refused the email (HTTP ${res.status}${body?.code ? `, ${body.code}` : ''}).`);
        throw new Error('The email service refused the message.');
      }
    } finally {
      clearTimeout(timer);
    }
    return;
  }
  try {
    await mailer().sendMail({ from: fromHeader(), ...m });
  } catch (e: any) {
    console.error(`[Mail] SMTP send failed (${e?.code || 'error'}${e?.command ? ` during ${e.command}` : ''}). If the host blocks SMTP ports, set BREVO_API_KEY to send over HTTPS.`);
    throw new Error('The email could not be sent.');
  }
}

export interface MailMatch {
  title: string;
  url: string;
  source: string;
  snippet?: string;
  publishedText?: string;
  keyword: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
/** A site address reduced to its origin ("https://host"), or '' when it is not a valid http(s) address. */
function origin(u?: string): string {
  try {
    const x = new URL(String(u || '').trim());
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.origin : '';
  } catch {
    return '';
  }
}
const isLocal = (o: string) => /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(o);

/**
 * Where email links point: the site the alert was used on (stored by the app) or APP_URL — a public
 * address is preferred over localhost, so a local APP_URL on the server cannot break links.
 */
export function linkBase(siteUrl?: string): string {
  const options = [origin(siteUrl), origin(process.env.APP_URL)].filter(Boolean);
  return options.find(o => !isLocal(o)) || options[0] || '';
}
const fromHeader = () => `"${senderName()}" <${senderAddress()}>`;

/** One email per alert run, to the alert's owner only. */
export async function sendAlertEmail(to: string, alertName: string, matches: MailMatch[], firstRun: boolean, alertId?: string, siteUrl?: string): Promise<void> {
  const shown = matches.slice(0, 20);
  const more = matches.length - shown.length;
  const intro = firstRun
    ? `Your new alert "${alertName}" found ${matches.length} result${matches.length === 1 ? '' : 's'} already published:`
    : `${matches.length} new result${matches.length === 1 ? '' : 's'} for your alert "${alertName}":`;
  // Opens this alert's own page: every result, with the ones from this email marked NEW.
  const base = linkBase(siteUrl);
  const manage = base ? `${base}/alerts${alertId ? `/${encodeURIComponent(alertId)}` : ''}` : '';

  const text = [
    intro, '',
    ...shown.map(m => `- ${m.title}\n  ${m.source}${m.publishedText ? ` · ${m.publishedText}` : ''} · keyword: ${m.keyword}\n  ${m.url}`),
    more > 0 ? `\n…and ${more} more in the app.` : '',
    '',
    manage ? `View all results of this alert: ${manage}` : '',
    'You receive this email because you created this alert. Results come from public search engines; open each link to check it.'
  ].join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;color:#1c1917">
  <div style="background:#8c4b27;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0;font-weight:bold">OSINT Alerts · ${esc(alertName)}</div>
  <div style="border:1px solid #e7e5e4;border-top:0;padding:16px 18px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 14px">${esc(intro)}</p>
    ${shown.map(m => `<div style="padding:10px 0;border-top:1px solid #f0eeec">
      <a href="${esc(m.url)}" style="color:#8c4b27;font-weight:bold;text-decoration:none">${esc(m.title)}</a>
      <div style="font-size:12px;color:#78716c;margin-top:3px">${esc(m.source)}${m.publishedText ? ` · ${esc(m.publishedText)}` : ''} · keyword: ${esc(m.keyword)}</div>
      ${m.snippet ? `<div style="font-size:13px;margin-top:4px">${esc(m.snippet.slice(0, 220))}</div>` : ''}
    </div>`).join('')}
    ${more > 0 ? `<p style="font-size:13px;color:#78716c">…and ${more} more in the app.</p>` : ''}
    ${manage ? `<p style="margin-top:16px"><a href="${esc(manage)}" style="background:#8c4b27;color:#fff;padding:9px 14px;border-radius:6px;text-decoration:none;font-size:14px">View all results</a></p>` : ''}
    <p style="font-size:11px;color:#a8a29e;margin-top:18px">You receive this email because you created this alert. Results come from public search engines; open each link to check it.</p>
  </div>
</div>`;

  await deliver({ to, subject: `${firstRun ? 'Alert started' : 'New matches'}: ${alertName}`, text, html });
}

export async function sendTestEmail(to: string): Promise<void> {
  await deliver({
    to,
    subject: 'OSINT Alerts: test email',
    text: 'Email alerts are working. Alert emails are sent only to the account that created the alert.',
    html: '<div style="font-family:Arial,Helvetica,sans-serif"><p><b>Email alerts are working.</b></p><p>Alert emails are sent only to the account that created the alert.</p></div>'
  });
}
