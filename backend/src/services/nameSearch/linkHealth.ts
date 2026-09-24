import { detectPlatform } from '../search/platformRegistry';

/**
 * Lightweight, server-side link health check for discovered profile URLs.
 *
 * - Only URLs on hosts in the platform registry are fetched (no arbitrary/internal hosts).
 * - An HTTP 200 alone does not mean the profile exists: login walls, consent and challenge pages,
 *   and platform "page not found" bodies served with 200 are detected.
 * - Platforms that block automated requests yield "unverifiable", never "unavailable".
 * - Nothing here ever replaces the URL; the result is only a status.
 */

export type LinkHealthStatus = 'reachable' | 'unavailable' | 'unverifiable';

export interface LinkHealthResult {
  url: string;
  status: LinkHealthStatus;
  httpStatus?: number;
  reason: string;
  checkedAt: string;
}

const SOFT_404_MARKERS: RegExp[] = [
  /this content isn['’]t available/i,
  /this page isn['’]t available/i,
  /sorry, this page isn['’]t available/i,
  /the link you followed may be broken/i,
  /couldn['’]t find this account/i,
  /this account doesn['’]t exist/i,
  /this channel (does not exist|isn['’]t available)/i
];

const WALL_URL = /(\/login|\/signin|\/sign-in|\/checkpoint|\/challenge|\/authwall|\/accounts\/login|consent\.|\/uas\/login)/i;
const WALL_BODY = /(log in to continue|sign in to continue|join linkedin|log into facebook|please enable javascript|verify you are human|captcha)/i;

export async function checkLink(url: string): Promise<LinkHealthResult> {
  const checkedAt = new Date().toISOString();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, status: 'unavailable', reason: 'Malformed URL', checkedAt };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { url, status: 'unavailable', reason: 'Unsupported URL scheme', checkedAt };
  }
  if (!detectPlatform(parsed.hostname)) {
    return { url, status: 'unverifiable', reason: 'Host is not a supported profile platform; not checked', checkedAt };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(parsed.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.8'
      }
    });

    if (res.status === 404 || res.status === 410) {
      return { url, status: 'unavailable', httpStatus: res.status, reason: `Platform returned HTTP ${res.status}`, checkedAt };
    }
    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 999 || res.status >= 500) {
      return { url, status: 'unverifiable', httpStatus: res.status, reason: `Platform blocked the automated check (HTTP ${res.status})`, checkedAt };
    }
    if (WALL_URL.test(res.url) && !WALL_URL.test(parsed.toString())) {
      return { url, status: 'unverifiable', httpStatus: res.status, reason: 'Platform redirected to a login/consent page', checkedAt };
    }

    const body = (await res.text()).slice(0, 200_000);
    if (SOFT_404_MARKERS.some(r => r.test(body)) && !/og:title|"@type":\s*"(Person|ProfilePage)"/i.test(body.slice(0, 50_000))) {
      return { url, status: 'unavailable', httpStatus: res.status, reason: 'Platform shows a "page not available" message', checkedAt };
    }
    if (WALL_BODY.test(body.slice(0, 20_000)) && !/og:title/i.test(body)) {
      return { url, status: 'unverifiable', httpStatus: res.status, reason: 'Platform served a login/challenge page', checkedAt };
    }
    if (res.ok) {
      return { url, status: 'reachable', httpStatus: res.status, reason: 'Page loaded (reachability only; it does not confirm identity)', checkedAt };
    }
    return { url, status: 'unverifiable', httpStatus: res.status, reason: `Unexpected HTTP ${res.status}`, checkedAt };
  } catch (e: any) {
    return { url, status: 'unverifiable', reason: e?.name === 'AbortError' ? 'Check timed out' : 'Network error during check', checkedAt };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkLinks(urls: string[]): Promise<LinkHealthResult[]> {
  const unique = Array.from(new Set(urls.filter(u => typeof u === 'string'))).slice(0, 25);
  return Promise.all(unique.map(checkLink));
}
