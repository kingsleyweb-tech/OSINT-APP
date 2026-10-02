import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Alert emails through Gmail SMTP (or any SMTP server) with Nodemailer. Credentials come from
 * SMTP_USER / SMTP_PASS in the environment and are never logged; failures are reported generically.
 */
let transport: Transporter | null = null;

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function mailer(): Transporter {
  if (!mailConfigured()) throw new Error('Email is not configured on the server.');
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transport;
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
const appUrl = () => (process.env.APP_URL || '').replace(/\/+$/, '');
const fromHeader = () => `"${(process.env.SMTP_FROM_NAME || 'OSINT Alerts').replace(/"/g, '')}" <${process.env.SMTP_USER}>`;

/** One email per alert run, to the alert's owner only. */
export async function sendAlertEmail(to: string, alertName: string, matches: MailMatch[], firstRun: boolean): Promise<void> {
  const shown = matches.slice(0, 20);
  const more = matches.length - shown.length;
  const intro = firstRun
    ? `Your new alert "${alertName}" found ${matches.length} result${matches.length === 1 ? '' : 's'} already published:`
    : `${matches.length} new result${matches.length === 1 ? '' : 's'} for your alert "${alertName}":`;
  const manage = appUrl() ? `${appUrl()}/alerts` : '';

  const text = [
    intro, '',
    ...shown.map(m => `- ${m.title}\n  ${m.source}${m.publishedText ? ` · ${m.publishedText}` : ''} · keyword: ${m.keyword}\n  ${m.url}`),
    more > 0 ? `\n…and ${more} more in the app.` : '',
    '',
    manage ? `Manage this alert: ${manage}` : '',
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
    ${manage ? `<p style="margin-top:16px"><a href="${esc(manage)}" style="background:#8c4b27;color:#fff;padding:9px 14px;border-radius:6px;text-decoration:none;font-size:14px">Manage this alert</a></p>` : ''}
    <p style="font-size:11px;color:#a8a29e;margin-top:18px">You receive this email because you created this alert. Results come from public search engines; open each link to check it.</p>
  </div>
</div>`;

  await mailer().sendMail({ from: fromHeader(), to, subject: `${firstRun ? 'Alert started' : 'New matches'}: ${alertName}`, text, html });
}

export async function sendTestEmail(to: string): Promise<void> {
  await mailer().sendMail({
    from: fromHeader(),
    to,
    subject: 'OSINT Alerts: test email',
    text: 'Email alerts are working. Alert emails are sent only to the account that created the alert.',
    html: '<div style="font-family:Arial,Helvetica,sans-serif"><p><b>Email alerts are working.</b></p><p>Alert emails are sent only to the account that created the alert.</p></div>'
  });
}
