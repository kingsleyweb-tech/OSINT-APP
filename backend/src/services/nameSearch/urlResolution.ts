
export interface ResolvedUrl {
  /** The destination URL to open for the user (tracking parameters removed, otherwise untouched). */
  url: string;
  /** Stable key used only for de-duplication (host/path normalised). Always a valid, openable URL. */
  canonicalUrl: string;
  host: string;
}

export interface UrlRejection {
  rejected: true;
  reason: string;
}

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'fbclid', 'gclid', 'dclid', 'msclkid', 'igshid', 'igsh', 'mibextid', 'ref_src', 'ref_url',
  '_hsenc', '_hsmi', '__tn__', '__cft__', 'rdid', 'share_url', 'si', 'feature', 'trk', 'trackingid',
  'lipi', 'originalsubdomain'
]);

// Hosts that are search engines / the API itself. A result pointing here is never a profile.
const SEARCH_ENGINE_HOST = /^(?:www\.)?(?:google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|yandex\.[a-z]+|serpapi\.com)$/i;

function tryParse(raw: string): URL | null {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

/** Bing wraps destinations as `u=a1<base64url(destination)>`. */
function decodeBingRedirect(u: URL): string | null {
  const enc = u.searchParams.get('u');
  if (!enc || !enc.startsWith('a1')) return null;
  try {
    const b64 = enc.slice(2).replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    return tryParse(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function unwrapRedirect(raw: string): string {
  const u = tryParse(raw);
  if (!u) return raw;
  const host = u.hostname.toLowerCase();

  if (/(^|\.)google\.[a-z.]+$/.test(host) && u.pathname === '/url') {
    const target = u.searchParams.get('url') || u.searchParams.get('q');
    if (target && tryParse(target)) return target;
  }
  if (/(^|\.)bing\.com$/.test(host) && u.pathname.startsWith('/ck/a')) {
    const target = decodeBingRedirect(u);
    if (target) return target;
  }
  return raw;
}

/** Host normalisation used for de-duplication only (m.facebook.com and www.facebook.com are the same page). */
function canonicalHost(host: string): string {
  let h = host.toLowerCase().replace(/^(?:www|m|mobile|web|touch|mbasic)\./, '');
  // Country sub-domains of LinkedIn (gh.linkedin.com, uk.linkedin.com) serve the same profile.
  if (/^[a-z]{2}\.linkedin\.com$/.test(h)) h = 'linkedin.com';
  if (h === 'twitter.com') h = 'x.com';
  return h;
}

// Platforms whose handles are case-insensitive, so /Hubert and /hubert are the same profile.
const CASE_INSENSITIVE_HOSTS = /(^|\.)(facebook|instagram|x|tiktok|github|linkedin|reddit|threads|medium|pinterest|twitch|soundcloud)\.(com|net)$/;

// Query params that are part of the identity of the page on specific hosts and must be kept.
const IDENTITY_PARAMS: Array<{ host: RegExp; params: string[] }> = [
  { host: /(^|\.)facebook\.com$/, params: ['id'] },
  { host: /(^|\.)scholar\.google\.[a-z.]+$/, params: ['user'] },
  { host: /(^|\.)youtube\.com$/, params: ['v', 'list'] }
];

export function resolveResultUrl(item: { link?: string; url?: string; redirect_link?: string }): ResolvedUrl | UrlRejection {
  const primary = item.link || item.url || item.redirect_link;
  if (!primary) return { rejected: true, reason: 'Result has no URL' };

  const unwrapped = unwrapRedirect(primary.trim());
  const parsed = tryParse(unwrapped);
  if (!parsed) return { rejected: true, reason: 'Result URL is not a valid http(s) URL' };

  if (SEARCH_ENGINE_HOST.test(parsed.hostname)) {
    return { rejected: true, reason: `Result points to a search engine/API page (${parsed.hostname}), not a destination` };
  }

  // Destination URL: remove tracking params only.
  for (const key of Array.from(parsed.searchParams.keys())) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) parsed.searchParams.delete(key);
  }
  parsed.hash = '';
  const url = parsed.toString();

  // Canonical key: normalised host, no trailing slash, only identity-bearing params.
  const host = canonicalHost(parsed.hostname);
  const keep = IDENTITY_PARAMS.find(r => r.host.test(host))?.params || [];
  const canonParams = new URLSearchParams();
  keep.forEach(k => {
    const v = parsed.searchParams.get(k);
    if (v) canonParams.set(k, v);
  });
  let pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  if (CASE_INSENSITIVE_HOSTS.test(host)) pathname = pathname.toLowerCase();
  const qs = canonParams.toString();
  const canonicalUrl = `https://${host === 'linkedin.com' || host === 'facebook.com' || host === 'instagram.com' || host === 'youtube.com' ? `www.${host}` : host}${pathname}${qs ? `?${qs}` : ''}`;

  return { url, canonicalUrl, host };
}

export function isRejection(r: ResolvedUrl | UrlRejection): r is UrlRejection {
  return (r as UrlRejection).rejected === true;
}
