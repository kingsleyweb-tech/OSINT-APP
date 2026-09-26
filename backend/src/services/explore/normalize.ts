import type { ExploreItem, ExploreItemKind } from '../../types/explore';

/**
 * Converts each SerpApi engine's JSON into ExploreItems. Only fields the engine returned are
 * filled; nothing is guessed. Items without a usable http(s) URL are dropped.
 */

type Raw = Record<string, any>;
type Draft = Omit<ExploreItem, 'id' | 'domain' | 'engines' | 'relevance'>;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const decode = (t: string) => t.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) => ENTITIES[e]);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? decode(v.trim()) : undefined);
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[^\d.]/g, '')) : NaN;
  return Number.isFinite(n) ? n : undefined;
};
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []);

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

const PLATFORM_BY_DOMAIN: Array<[RegExp, string]> = [
  [/(^|\.)(x|twitter)\.com$/, 'X'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'YouTube'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)reddit\.com$/, 'Reddit'],
  [/(^|\.)threads\.net$/, 'Threads'],
  [/^t\.me$|(^|\.)telegram\.me$/, 'Telegram'],
  [/(^|\.)whatsapp\.com$/, 'WhatsApp'],
  [/(^|\.)vk\.com$/, 'VK'],
  [/(^|\.)weibo\.com$/, 'Sina Weibo'],
  [/(^|\.)github\.com$/, 'GitHub'],
  [/(^|\.)quora\.com$/, 'Quora'],
  [/(^|\.)pinterest\.[a-z.]+$/, 'Pinterest'],
  [/(^|\.)snapchat\.com$/, 'Snapchat']
];

export function platformOf(domain: string): string | undefined {
  return PLATFORM_BY_DOMAIN.find(([re]) => re.test(domain))?.[1];
}

/** Account handle that the URL itself names, when the platform's URL pattern is unambiguous. */
export function handleFromUrl(url: string): { username?: string; kind?: ExploreItemKind } {
  let u: URL;
  try { u = new URL(url); } catch { return {}; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);
  const first = parts[0] || '';
  if (/(^|\.)(x|twitter)\.com$/.test(host) && first && !['i', 'search', 'hashtag', 'home', 'explore'].includes(first)) {
    return { username: first, kind: parts[1] === 'status' ? 'post' : 'profile' };
  }
  if (/(^|\.)tiktok\.com$/.test(host) && first.startsWith('@')) {
    return { username: first.slice(1), kind: parts[1] === 'video' ? 'video' : 'profile' };
  }
  if (/(^|\.)instagram\.com$/.test(host)) {
    if (['p', 'reel', 'reels', 'tv'].includes(first)) return { kind: 'post' };
    if (first && !['explore', 'stories', 'accounts'].includes(first)) return { username: first, kind: 'profile' };
  }
  if (/(^|\.)reddit\.com$/.test(host)) {
    if (first === 'user' || first === 'u') return { username: parts[1], kind: 'profile' };
    if (first === 'r') return { kind: parts[2] === 'comments' ? 'forum' : 'group' };
  }
  if (/(^|\.)facebook\.com$/.test(host)) {
    if (first === 'groups') return { kind: 'group' };
    if (parts.includes('posts') || parts.includes('videos') || first === 'story.php' || first === 'permalink.php') return { kind: 'post' };
  }
  if (host === 't.me' && first) return { username: first === 's' ? parts[1] : first, kind: 'group' };
  if (host === 'chat.whatsapp.com') return { kind: 'group' };
  if (/(^|\.)youtube\.com$/.test(host)) {
    if (first.startsWith('@')) return { username: first.slice(1), kind: 'profile' };
    if (first === 'watch' || first === 'shorts') return { kind: 'video' };
  }
  if (/(^|\.)linkedin\.com$/.test(host)) {
    if (first === 'in') return { username: parts[1], kind: 'profile' };
    if (first === 'posts' || first === 'pulse') return { kind: 'post' };
  }
  return {};
}

// ─── Dates ───────────────────────────────────────────────────────────────────

const REL_UNITS: Record<string, number> = {
  second: 1e3, sec: 1e3, minute: 6e4, min: 6e4, hour: 36e5, hr: 36e5, day: 864e5,
  week: 6048e5, month: 2592e6, year: 31536e6
};

/** Parses absolute dates and "3 hours ago" style text. Returns undefined when it can't be sure. */
export function parseDate(text?: string, now = Date.now()): string | undefined {
  if (!text) return undefined;
  const t = text.trim();
  const rel = t.match(/^(\d+)\s*(second|sec|minute|min|hour|hr|day|week|month|year)s?\s+ago$/i);
  if (rel) return new Date(now - Number(rel[1]) * REL_UNITS[rel[2].toLowerCase()]).toISOString();
  if (/^yesterday$/i.test(t)) return new Date(now - 864e5).toISOString();
  const short = t.match(/^(\d+)\s*(y|mo|w|d|h|m)\s+ago$/i);
  if (short) {
    const unit: Record<string, number> = { y: 31536e6, mo: 2592e6, w: 6048e5, d: 864e5, h: 36e5, m: 6e4 };
    return new Date(now - Number(short[1]) * unit[short[2].toLowerCase()]).toISOString();
  }
  // Google News: "09/24/2026, 07:00 AM, +0000 UTC"
  const gn = t.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (gn) {
    let h = Number(gn[4]) % 12;
    if (/pm/i.test(gn[6])) h += 12;
    return new Date(Date.UTC(Number(gn[3]), Number(gn[1]) - 1, Number(gn[2]), h, Number(gn[5]))).toISOString();
  }
  if (/\d{4}/.test(t)) {
    const ms = Date.parse(t);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  return undefined;
}

// ─── Engine normalizers ──────────────────────────────────────────────────────

function draft(engine: string, kind: ExploreItemKind, r: Raw, extra: Partial<Draft> = {}): Draft | null {
  const url = str(extra.url) || str(r.link) || str(r.url);
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const title = str(extra.title) || str(r.title) || url;
  const publishedText = str(extra.publishedText) || str(r.date) || str(r.published_date);
  return {
    kind,
    title,
    url,
    engine,
    snippet: str(r.snippet) || str(r.description),
    thumbnail: typeof r.thumbnail === 'string' ? r.thumbnail : str(r.thumbnail?.static),
    publishedText,
    publishedAt: str(r.iso_date) || parseDate(publishedText),
    ...extra
  } as Draft;
}

function googleNews(data: Raw, engine: string): Draft[] {
  const out: Draft[] = [];
  const add = (r: Raw) => {
    const d = draft(engine, 'news', r, {
      author: str(r.source?.name) || (typeof r.source === 'string' ? r.source : undefined),
      metadata: { publication: str(r.source?.name) || str(r.source), authors: r.source?.authors }
    });
    if (d) out.push(d);
  };
  arr(data.news_results).forEach(r => {
    // Clustered stories come back as a highlight plus a list of stories.
    if (r.highlight) add(r.highlight);
    arr(r.stories).forEach(add);
    if (r.link) add(r);
  });
  return out;
}

function bingNews(data: Raw, engine: string): Draft[] {
  return arr(data.organic_results).map(r => draft(engine, 'news', r, {
    author: str(r.source),
    metadata: { publication: str(r.source) }
  })).filter(Boolean) as Draft[];
}

function images(data: Raw, engine: string): Draft[] {
  return arr(data.images_results).map(r => draft(engine, 'image', r, {
    image: str(r.original),
    thumbnail: str(r.thumbnail),
    author: str(r.source),
    metadata: { width: r.original_width, height: r.original_height, source: str(r.source) }
  })).filter(Boolean) as Draft[];
}

function youtube(data: Raw, engine: string): Draft[] {
  const out: Draft[] = [];
  arr(data.video_results).forEach(r => {
    const d = draft(engine, 'video', r, {
      platform: 'YouTube',
      author: str(r.channel?.name),
      authorUrl: str(r.channel?.link),
      metadata: { views: r.views, length: str(r.length), verified: Boolean(r.channel?.verified) }
    });
    if (d) out.push(d);
  });
  arr(data.channel_results).forEach(r => {
    const d = draft(engine, 'profile', r, { platform: 'YouTube', metadata: { subscribers: r.subscribers, handle: str(r.handle) } });
    if (d) out.push(d);
  });
  return out;
}

function googleVideos(data: Raw, engine: string): Draft[] {
  return arr(data.video_results).map(r => draft(engine, 'video', r, {
    thumbnail: typeof r.thumbnail === 'string' ? r.thumbnail : undefined,
    author: str(r.channel) || str(r.source),
    publishedText: str(r.date) || str(r.rich_snippet?.top?.detected_extensions?.date),
    metadata: { duration: str(r.duration), displayedLink: str(r.displayed_link) }
  })).filter(Boolean) as Draft[];
}

function lens(data: Raw, engine: string): Draft[] {
  return [...arr(data.exact_matches), ...arr(data.visual_matches)].map(r => draft(engine, 'visual_match', r, {
    thumbnail: str(r.thumbnail),
    image: str(r.image),
    author: str(r.source),
    metadata: { source: str(r.source), price: r.price?.value }
  })).filter(Boolean) as Draft[];
}

function reverseImage(data: Raw, engine: string): Draft[] {
  return [
    ...arr(data.image_results).map(r => draft(engine, 'visual_match', r, { metadata: { displayedLink: str(r.displayed_link) } })),
    ...arr(data.inline_images).map(r => draft(engine, 'visual_match', r, { url: str(r.link), thumbnail: str(r.thumbnail), title: str(r.title) || str(r.source) }))
  ].filter(Boolean) as Draft[];
}

function organic(data: Raw, engine: string, fallback: ExploreItemKind): Draft[] {
  return arr(data.organic_results).map(r => {
    const link = str(r.link) || '';
    const h = handleFromUrl(link);
    return draft(engine, h.kind || fallback, r, {
      username: h.username,
      thumbnail: str(r.thumbnail),
      publishedText: str(r.date) || str(r.rich_snippet?.top?.detected_extensions?.date),
      metadata: {
        displayedLink: str(r.displayed_link),
        source: str(r.source),
        answers: num(r.answers),
        sitelinks: undefined
      }
    });
  }).filter(Boolean) as Draft[];
}

function googleNewsTab(data: Raw, engine: string): Draft[] {
  return arr(data.news_results).map(r => draft(engine, 'news', r, {
    author: str(r.source),
    metadata: { publication: str(r.source) }
  })).filter(Boolean) as Draft[];
}

function mapsUrl(r: Raw): string | undefined {
  if (r.place_id) return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(r.place_id)}`;
  const g = r.gps_coordinates;
  if (g?.latitude != null && g?.longitude != null) return `https://www.google.com/maps/search/?api=1&query=${g.latitude},${g.longitude}`;
  return undefined;
}

function places(data: Raw, engine: string): Draft[] {
  const list = arr(data.local_results);
  if (list.length === 0 && data.place_results && typeof data.place_results === 'object') list.push(data.place_results);
  return list.map(r => draft(engine, 'place', r, {
    url: mapsUrl(r),
    snippet: str(r.description) || str(r.type),
    thumbnail: str(r.thumbnail),
    rating: num(r.rating),
    reviewsCount: num(r.reviews),
    location: {
      address: str(r.address),
      lat: num(r.gps_coordinates?.latitude),
      lng: num(r.gps_coordinates?.longitude)
    },
    metadata: {
      dataId: str(r.data_id),
      placeId: str(r.place_id),
      type: str(r.type),
      types: r.types,
      phone: str(r.phone),
      website: str(r.website),
      hours: str(r.hours) || str(r.open_state)
    }
  })).filter(Boolean) as Draft[];
}

function reviews(data: Raw, engine: string): Draft[] {
  const placeUrl = mapsUrl(data.place_info || {}) || str(data.search_metadata?.google_maps_reviews_url);
  return arr(data.reviews).map((r, i) => draft(engine, 'review', r, {
    url: str(r.link) || (placeUrl ? `${placeUrl}#review-${i}` : undefined),
    title: str(r.user?.name) ? `Review by ${r.user.name}` : 'Review',
    author: str(r.user?.name),
    authorUrl: str(r.user?.link),
    thumbnail: str(r.user?.thumbnail),
    snippet: str(r.snippet) || str(r.extracted_snippet?.original),
    rating: num(r.rating),
    publishedText: str(r.date),
    publishedAt: str(r.iso_date) || parseDate(str(r.date)),
    metadata: { likes: r.likes, localGuide: Boolean(r.user?.local_guide), contributorReviews: r.user?.reviews }
  })).filter(Boolean) as Draft[];
}

function events(data: Raw, engine: string): Draft[] {
  return arr(data.events_results).map(r => {
    const address = Array.isArray(r.address) ? r.address.join(', ') : str(r.address);
    // Google's events block often has no event page link; then the link is a Google search for the event, flagged as such.
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent([str(r.title), address].filter(Boolean).join(' '))}`;
    return draft(engine, 'event', r, {
    url: str(r.link) || searchUrl,
    snippet: str(r.description) || str(r.type),
    thumbnail: str(r.thumbnail) || str(r.image),
    publishedText: str(r.date?.when) || str(r.date?.start_date) || [str(r.date), str(r.time)].filter(Boolean).join(' · ') || undefined,
    publishedAt: undefined,
    location: { address },
    metadata: {
      when: str(r.date?.when) || str(r.date),
      startDate: str(r.date?.start_date),
      time: str(r.time),
      venue: str(r.venue?.name) || (Array.isArray(r.address) ? str(r.address[0]) : undefined),
      linkIsSearch: !str(r.link),
      tickets: arr(r.ticket_info).map(t => ({ source: str(t.source), link: str(t.link) }))
    }
  });
  }).filter(Boolean) as Draft[];
}

function autocomplete(data: Raw, engine: string): Draft[] {
  return arr(data.suggestions).map(r => {
    const lat = num(r.latitude), lng = num(r.longitude);
    const name = str(r.value) || '';
    const url = lat != null && lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, str(r.subtext)].filter(Boolean).join(', '))}`;
    return draft(engine, 'location', r, {
      url, title: name, snippet: str(r.subtext),
      location: { address: [name, str(r.subtext)].filter(Boolean).join(', '), lat, lng },
      metadata: { type: str(r.type), dataId: str(r.data_id), subtext: str(r.subtext) }
    });
  }).filter(Boolean) as Draft[];
}

/** Picks the normalizer for an engine call. */
export function normalizeEngine(engine: string, params: Record<string, string | number>, data: Raw): Draft[] {
  if (!data) return [];
  switch (engine) {
    case 'google_news': return googleNews(data, engine);
    case 'bing_news': return bingNews(data, engine);
    case 'google_images':
    case 'bing_images': return images(data, engine);
    case 'youtube': return youtube(data, engine);
    case 'google_videos': return googleVideos(data, engine);
    case 'google_lens': return lens(data, engine);
    case 'google_reverse_image': return reverseImage(data, engine);
    case 'google_maps': return places(data, engine);
    case 'google_maps_reviews': return reviews(data, engine);
    case 'google_events': return events(data, engine);
    case 'google_maps_autocomplete': return autocomplete(data, engine);
    case 'bing': return organic(data, engine, 'web');
    case 'google_forums': return organic(data, engine, 'forum');
    case 'google':
      if (params.tbm === 'nws') return googleNewsTab(data, engine);
      if (params.events) return events(data, engine);
      return organic(data, engine, 'web');
    default: return [];
  }
}

/** Number of raw entries an engine returned (before filtering), for the engine status list. */
export function rawCount(engine: string, data: Raw | null): number {
  if (!data) return 0;
  const keys = ['news_results', 'organic_results', 'images_results', 'video_results', 'visual_matches',
    'image_results', 'local_results', 'reviews', 'events_results', 'trending_searches', 'suggestions'];
  let n = keys.reduce((sum, k) => sum + (Array.isArray(data[k]) ? data[k].length : 0), 0);
  if (engine === 'google_maps' && n === 0 && data.place_results) n = 1;
  if (engine === 'google_trends') n = (data.interest_over_time?.timeline_data?.length || 0) + (data.related_queries?.top?.length || 0) + (data.related_queries?.rising?.length || 0);
  return n;
}
