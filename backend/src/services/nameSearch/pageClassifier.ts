import { PlatformCategory, detectPlatform } from '../search/platformRegistry';

/**
 * Platform-aware classification of a resolved result URL.
 *
 * Every result starts as "unknown". It only becomes a `person_profile` or `channel` when the URL
 * path matches that platform's profile structure; posts, reels, videos, groups, company pages,
 * search/directory pages, hashtags and platform pages are classified as such and never reach the
 * Profiles tab.
 */

export type PageKind =
  | 'person_profile'
  | 'channel'
  | 'organization_page'
  | 'group'
  | 'community'
  | 'post'
  | 'video'
  | 'article'
  | 'repository'
  | 'search_page'
  | 'platform_page'
  | 'website'
  | 'unknown';

export const PAGE_KIND_LABELS: Record<PageKind, string> = {
  person_profile: 'Profile',
  channel: 'Channel',
  organization_page: 'Organization page',
  group: 'Group',
  community: 'Community',
  post: 'Post',
  video: 'Video',
  article: 'Article',
  repository: 'Repository',
  search_page: 'Search / directory page',
  platform_page: 'Platform page',
  website: 'Website',
  unknown: 'Unclassified page'
};

/** Page kinds that may be shown as a person's profile. */
export const PROFILE_KINDS: ReadonlySet<PageKind> = new Set<PageKind>(['person_profile', 'channel']);

export interface ClassifiedPage {
  platformId: string | null;
  platformName: string;
  platformCategory: PlatformCategory | 'web';
  host: string;
  pageKind: PageKind;
  /** Username/handle exactly as it appears in the URL (never derived from a person's name). */
  handle?: string;
  /** Human readable slug for URL formats without a username (e.g. facebook.com/people/<Name>/<id>). */
  urlDisplayName?: string;
}

type Rule = (segs: string[], u: URL, host: string) => { kind: PageKind; handle?: string; urlDisplayName?: string };

const lowerSet = (...items: string[]) => new Set(items.map(i => i.toLowerCase()));

const FB_VIDEO = lowerSet('watch', 'reel', 'reels', 'videos', 'video.php');
const FB_POST = lowerSet('photo', 'photo.php', 'photos', 'permalink.php', 'story.php', 'stories', 'posts', 'notes', 'media', 'share', 'events', 'event');
const FB_SEARCH = lowerSet('public', 'search', 'hashtag', 'directory', 'find-friends', 'people-search');
const FB_PLATFORM = lowerSet(
  'marketplace', 'gaming', 'login', 'login.php', 'help', 'policies', 'privacy', 'legal', 'business', 'ads', 'settings',
  'home.php', 'l.php', 'sharer', 'sharer.php', 'dialog', 'plugins', 'messages', 'bookmarks', 'friends', 'fundraisers',
  'jobs', 'live', 'places', 'recover', 'signup', 'r.php', 'about', 'careers', 'terms', 'watchparty', 'news', 'weather',
  'lite', 'mobile', 'offsite', 'cookie', 'policy.php', 'reg', 'checkpoint', 'unsupportedbrowser', 'feeds', 'notifications'
);

const IG_RESERVED_PLATFORM = lowerSet('accounts', 'direct', 'about', 'developer', 'legal', 'web', 'emails', 'challenge', 'oauth', 'privacy', 'session', 'api', 'static', 'graphql', 'ar', 'press');
const IG_SEARCH = lowerSet('explore', 'popular', 'tags', 'locations', 'topics');

const X_SEARCH = lowerSet('search', 'hashtag', 'explore', 'i');
const X_PLATFORM = lowerSet('home', 'settings', 'messages', 'notifications', 'login', 'signup', 'tos', 'privacy', 'intent', 'share', 'compose', 'account', 'logout', 'download', 'jobs', 'about', 'en', 'rules', 'help', 'x', 'twitter');

const GH_PLATFORM = lowerSet(
  'about', 'features', 'pricing', 'enterprise', 'topics', 'trending', 'collections', 'sponsors', 'orgs', 'marketplace', 'explore',
  'search', 'login', 'join', 'settings', 'notifications', 'issues', 'pulls', 'apps', 'readme', 'customer-stories', 'security',
  'team', 'site', 'contact', 'events', 'organizations', 'codespaces', 'copilot', 'resources', 'solutions', 'signup', 'new', 'dashboard'
);

const singleSegProfile = (reserved: Set<string>, pattern: RegExp, deeper: PageKind = 'post'): Rule => segs => {
  if (segs.length === 0) return { kind: 'platform_page' };
  if (reserved.has(segs[0].toLowerCase())) return { kind: 'platform_page' };
  if (segs.length === 1 && pattern.test(segs[0])) return { kind: 'person_profile', handle: segs[0] };
  return { kind: deeper };
};

const atHandleProfile = (deeper: PageKind = 'post'): Rule => segs => {
  if (segs[0]?.startsWith('@') && segs[0].length > 1) {
    return segs.length === 1 ? { kind: 'person_profile', handle: segs[0].slice(1) } : { kind: deeper };
  }
  return { kind: segs.length === 0 ? 'platform_page' : 'unknown' };
};

const subdomainRoot = (base: string, rootKind: PageKind, deeper: PageKind): Rule => (segs, _u, host) => {
  const sub = host.endsWith(`.${base}`) ? host.slice(0, -(base.length + 1)).replace(/^www\.?/, '') : '';
  if (sub && !sub.includes('.')) return segs.length === 0 ? { kind: rootKind, handle: sub } : { kind: deeper };
  return { kind: 'platform_page' };
};

const RULES: Record<string, Rule> = {
  'soc-facebook': (segs, u) => {
    const first = (segs[0] || '').toLowerCase();
    if (first === 'profile.php') {
      const id = u.searchParams.get('id');
      return id && /^\d+$/.test(id) ? { kind: 'person_profile', handle: undefined, urlDisplayName: undefined } : { kind: 'platform_page' };
    }
    if (!first) return { kind: 'platform_page' };
    if (first === 'people' && segs[1]) {
      return segs.length <= 3 ? { kind: 'person_profile', urlDisplayName: decodeURIComponent(segs[1]).replace(/-/g, ' ') } : { kind: 'post' };
    }
    if (first === 'p' && segs[1]) {
      return segs.length === 2 ? { kind: 'person_profile', urlDisplayName: decodeURIComponent(segs[1]).replace(/-\d+$/, '').replace(/-/g, ' ') } : { kind: 'post' };
    }
    if (first === 'groups') return { kind: 'group' };
    if (first === 'pages') return { kind: 'organization_page' };
    if (FB_VIDEO.has(first)) return { kind: 'video' };
    if (FB_POST.has(first)) return { kind: 'post' };
    if (FB_SEARCH.has(first)) return { kind: 'search_page' };
    if (FB_PLATFORM.has(first)) return { kind: 'platform_page' };
    if (segs.length === 1 && /^[A-Za-z0-9.\-]{3,80}$/.test(segs[0])) return { kind: 'person_profile', handle: segs[0] };
    const second = (segs[1] || '').toLowerCase();
    if (FB_VIDEO.has(second)) return { kind: 'video' };
    if (FB_POST.has(second)) return { kind: 'post' };
    return { kind: 'unknown' };
  },

  'soc-instagram': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (!first) return { kind: 'platform_page' };
    if (first === 'p' || first === 'tv' || first === 'stories') return { kind: 'post' };
    if (first === 'reel' || first === 'reels') return { kind: 'video' };
    if (IG_SEARCH.has(first)) return { kind: 'search_page' };
    if (IG_RESERVED_PLATFORM.has(first)) return { kind: 'platform_page' };
    if (segs.length === 1 && /^[A-Za-z0-9._]{1,30}$/.test(segs[0])) return { kind: 'person_profile', handle: segs[0] };
    const second = (segs[1] || '').toLowerCase();
    if (second === 'reel' || second === 'reels') return { kind: 'video' };
    if (second === 'p' || second === 'tv') return { kind: 'post' };
    return { kind: 'unknown' };
  },

  'soc-x': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (!first) return { kind: 'platform_page' };
    if (X_SEARCH.has(first)) return { kind: 'search_page' };
    if (X_PLATFORM.has(first)) return { kind: 'platform_page' };
    if (segs.length === 1 && /^[A-Za-z0-9_]{1,15}$/.test(segs[0])) return { kind: 'person_profile', handle: segs[0] };
    if ((segs[1] || '').toLowerCase() === 'status') return { kind: 'post' };
    return { kind: 'unknown' };
  },

  'prof-linkedin': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (first === 'in' && segs[1]) return segs.length === 2 ? { kind: 'person_profile', handle: decodeURIComponent(segs[1]) } : { kind: 'unknown' };
    if (first === 'pub' && (segs[1] || '').toLowerCase() === 'dir') return { kind: 'search_page' };
    if (first === 'pub' && segs[1]) return { kind: 'person_profile', handle: decodeURIComponent(segs[1]) };
    if (first === 'company' || first === 'school' || first === 'showcase') return { kind: 'organization_page' };
    if (first === 'pulse') return { kind: 'article' };
    if (first === 'posts' || first === 'feed' || first === 'events') return { kind: 'post' };
    if (['jobs', 'learning', 'search', 'directory', 'people-search', 'title', 'salary', 'top-content'].includes(first)) return { kind: 'search_page' };
    return { kind: 'platform_page' };
  },

  'soc-tiktok': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (first.startsWith('@') && first.length > 1) {
      if (segs.length === 1) return { kind: 'person_profile', handle: segs[0].slice(1) };
      return { kind: (segs[1] || '').toLowerCase() === 'video' ? 'video' : 'post' };
    }
    if (['discover', 'tag', 'music', 'search', 'explore', 'foryou', 'trending', 'live', 'channel'].includes(first)) return { kind: 'search_page' };
    return { kind: 'platform_page' };
  },

  'vid-youtube': (segs, _u, host) => {
    if (host.endsWith('youtu.be')) return { kind: 'video' };
    const first = (segs[0] || '').toLowerCase();
    const channelTabs = ['videos', 'featured', 'about', 'shorts', 'streams', 'playlists', 'community', 'podcasts'];
    if (first.startsWith('@') && first.length > 1) {
      return segs.length === 1 || channelTabs.includes((segs[1] || '').toLowerCase())
        ? { kind: 'channel', handle: segs[0].slice(1) }
        : { kind: 'unknown' };
    }
    if ((first === 'channel' || first === 'c' || first === 'user') && segs[1]) {
      return segs.length === 2 || channelTabs.includes((segs[2] || '').toLowerCase())
        ? { kind: 'channel', handle: first === 'channel' ? undefined : segs[1] }
        : { kind: 'unknown' };
    }
    if (['watch', 'shorts', 'live', 'embed', 'clip'].includes(first)) return { kind: 'video' };
    if (['results', 'hashtag', 'feed', 'playlist', 'gaming', 'premium'].includes(first)) return { kind: 'search_page' };
    return { kind: 'platform_page' };
  },

  'dev-github': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (!first) return { kind: 'platform_page' };
    if (GH_PLATFORM.has(first)) return { kind: first === 'search' || first === 'topics' || first === 'trending' || first === 'explore' ? 'search_page' : 'platform_page' };
    if (segs.length === 1 && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(segs[0])) return { kind: 'person_profile', handle: segs[0] };
    return { kind: 'repository' };
  },

  'soc-reddit': segs => {
    const first = (segs[0] || '').toLowerCase();
    if ((first === 'user' || first === 'u') && segs[1]) {
      return segs.length === 2 ? { kind: 'person_profile', handle: segs[1] } : { kind: 'post' };
    }
    if (first === 'r' && segs[1]) return segs.length === 2 ? { kind: 'community' } : { kind: 'post' };
    if (first === 'search') return { kind: 'search_page' };
    return { kind: 'platform_page' };
  },

  'pub-medium': (segs, _u, host) => {
    if (host === 'medium.com' || host === 'www.medium.com') {
      if (segs[0]?.startsWith('@') && segs[0].length > 1) {
        return segs.length === 1 ? { kind: 'person_profile', handle: segs[0].slice(1) } : { kind: 'article' };
      }
      return { kind: segs.length === 0 ? 'platform_page' : 'article' };
    }
    return subdomainRoot('medium.com', 'person_profile', 'article')(segs, _u, host);
  },

  'soc-threads': atHandleProfile('post'),
  'soc-mastodon': atHandleProfile('post'),
  'dev-hashnode': atHandleProfile('article'),

  'soc-bluesky': segs => {
    if ((segs[0] || '').toLowerCase() === 'profile' && segs[1]) {
      return segs.length === 2 ? { kind: 'person_profile', handle: segs[1] } : { kind: 'post' };
    }
    return { kind: segs.length === 0 ? 'platform_page' : (segs[0] === 'search' ? 'search_page' : 'platform_page') };
  },

  'soc-telegram': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (!first || ['s', 'joinchat', 'addstickers', 'share', 'proxy', 'socks', 'iv', 'addlist'].includes(first) || first.startsWith('+')) {
      return { kind: 'platform_page' };
    }
    return segs.length === 1 && /^[A-Za-z0-9_]{5,32}$/.test(segs[0]) ? { kind: 'channel', handle: segs[0] } : { kind: 'post' };
  },

  'soc-pinterest': singleSegProfile(lowerSet('pin', 'ideas', 'search', 'today', 'business', '_', 'categories', 'topics', 'login', 'about'), /^[A-Za-z0-9_]{3,30}$/, 'post'),

  'soc-snapchat': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (first === 'add' && segs[1]) return segs.length === 2 ? { kind: 'person_profile', handle: segs[1] } : { kind: 'unknown' };
    if (first.startsWith('@') && first.length > 1 && segs.length === 1) return { kind: 'person_profile', handle: segs[0].slice(1) };
    return { kind: 'platform_page' };
  },

  'soc-tumblr': (segs, u, host) => {
    if (host === 'tumblr.com' || host === 'www.tumblr.com') {
      return singleSegProfile(lowerSet('tagged', 'search', 'explore', 'dashboard', 'login', 'register', 'about', 'policy'), /^[A-Za-z0-9-]{1,32}$/, 'post')(segs, u, host);
    }
    return subdomainRoot('tumblr.com', 'person_profile', 'post')(segs, u, host);
  },

  'str-twitch': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (!first || ['directory', 'downloads', 'jobs', 'p', 'turbo', 'search', 'videos', 'settings', 'subscriptions', 'prime', 'store'].includes(first)) {
      return { kind: first === 'videos' ? 'video' : 'platform_page' };
    }
    if (segs.length === 1) return { kind: 'channel', handle: segs[0] };
    return { kind: ['videos', 'clip', 'v'].includes((segs[1] || '').toLowerCase()) ? 'video' : 'unknown' };
  },

  'str-kick': singleSegProfile(lowerSet('categories', 'search', 'following', 'browse', 'video'), /^[A-Za-z0-9_]{3,25}$/, 'video'),

  'str-rumble': segs => {
    const first = (segs[0] || '').toLowerCase();
    if ((first === 'c' || first === 'user') && segs[1] && segs.length === 2) return { kind: 'channel', handle: segs[1] };
    return { kind: first.startsWith('v') ? 'video' : 'platform_page' };
  },

  'vid-vimeo': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (!first) return { kind: 'platform_page' };
    if (/^\d+$/.test(first)) return { kind: 'video' };
    if (['channels', 'groups', 'search', 'watch', 'categories', 'blog', 'features', 'upgrade', 'ondemand', 'join', 'log_in', 'about', 'showcase'].includes(first)) {
      return { kind: first === 'search' ? 'search_page' : 'platform_page' };
    }
    return segs.length === 1 && /^[A-Za-z0-9_]{2,}$/.test(segs[0]) ? { kind: 'person_profile', handle: segs[0] } : { kind: 'video' };
  },

  'vid-dailymotion': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (first === 'video') return { kind: 'video' };
    if (['search', 'tag', 'playlist'].includes(first)) return { kind: 'search_page' };
    return segs.length === 1 ? { kind: 'channel', handle: segs[0] } : { kind: 'platform_page' };
  },

  'dev-gitlab': singleSegProfile(lowerSet('explore', 'search', 'users', 'help', 'dashboard', 'groups', 'projects', 'admin', 'pricing'), /^[A-Za-z0-9_.\-]{2,}$/, 'repository'),

  'dev-stackoverflow': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (first === 'users' && segs[1] && /^\d+$/.test(segs[1])) return { kind: 'person_profile', handle: segs[2] ? decodeURIComponent(segs[2]) : undefined };
    if (first === 'questions') return { kind: 'post' };
    return { kind: first === 'search' ? 'search_page' : 'platform_page' };
  },

  'dev-devto': singleSegProfile(lowerSet('latest', 'top', 'search', 'tags', 't', 'podcasts', 'videos', 'listings', 'about', 'faq', 'enter', 'settings', 'dashboard'), /^[A-Za-z0-9_]{2,}$/, 'article'),
  'dev-codepen': singleSegProfile(lowerSet('pen', 'search', 'trending', 'challenges', 'spark', 'login', 'signup', 'features'), /^[A-Za-z0-9_\-]{2,}$/, 'post'),

  'pub-substack': (segs, u, host) => {
    if (host === 'substack.com' || host === 'www.substack.com') {
      return segs[0]?.startsWith('@') && segs.length === 1 ? { kind: 'person_profile', handle: segs[0].slice(1) } : { kind: 'platform_page' };
    }
    if (segs[0] === 'p') return { kind: 'article' };
    return subdomainRoot('substack.com', 'person_profile', 'article')(segs, u, host);
  },

  'acad-scholar': (segs, u) => {
    if ((segs[0] || '').toLowerCase() === 'citations' && u.searchParams.get('user')) return { kind: 'person_profile' };
    return { kind: 'search_page' };
  },

  'acad-researchgate': segs => {
    const first = (segs[0] || '').toLowerCase();
    if ((first === 'profile' || first === 'scientific-contributions') && segs[1]) {
      return segs.length === 2 ? { kind: 'person_profile', urlDisplayName: decodeURIComponent(segs[1]).replace(/[-_]\d+$/, '').replace(/[-_]/g, ' ') } : { kind: 'unknown' };
    }
    if (first === 'publication') return { kind: 'article' };
    return { kind: first === 'search' ? 'search_page' : 'platform_page' };
  },

  'acad-academia': (segs, _u, host) => {
    const isSub = host !== 'academia.edu' && host !== 'www.academia.edu';
    if (isSub && segs.length === 1 && !/^\d+$/.test(segs[0])) {
      return { kind: 'person_profile', urlDisplayName: decodeURIComponent(segs[0]).replace(/([a-z])([A-Z])/g, '$1 $2') };
    }
    return { kind: segs.length === 0 ? 'platform_page' : 'article' };
  },

  'acad-orcid': segs => (segs.length === 1 && /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(segs[0]) ? { kind: 'person_profile' } : { kind: 'platform_page' }),

  'cre-behance': singleSegProfile(lowerSet('search', 'galleries', 'gallery', 'joblist', 'hire', 'assets', 'blog', 'onboarding'), /^[A-Za-z0-9_\-]{2,}$/, 'post'),
  'cre-dribbble': singleSegProfile(lowerSet('shots', 'designers', 'jobs', 'search', 'tags', 'stories', 'pro', 'signup', 'session', 'hiring'), /^[A-Za-z0-9_\-]{2,}$/, 'post'),
  'cre-artstation': singleSegProfile(lowerSet('artwork', 'search', 'learning', 'marketplace', 'jobs', 'blogs', 'prints', 'channels'), /^[A-Za-z0-9_\-]{2,}$/, 'post'),
  'cre-deviantart': singleSegProfile(lowerSet('search', 'tag', 'topic', 'daily-deviations', 'watch', 'about', 'join', 'users'), /^[A-Za-z0-9_\-]{2,}$/, 'post'),

  'cre-flickr': segs => {
    const first = (segs[0] || '').toLowerCase();
    if ((first === 'people' || first === 'photos') && segs[1] && segs.length === 2) return { kind: 'person_profile', handle: segs[1] };
    return { kind: first === 'search' ? 'search_page' : 'post' };
  },

  'cre-500px': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (first === 'p' && segs[1] && segs.length === 2) return { kind: 'person_profile', handle: segs[1] };
    return { kind: first === 'photo' ? 'post' : 'platform_page' };
  },

  'mus-spotify': segs => {
    const first = (segs[0] || '').toLowerCase().startsWith('intl-') ? (segs[1] || '').toLowerCase() : (segs[0] || '').toLowerCase();
    if (first === 'artist') return { kind: 'channel' };
    if (first === 'user') return { kind: 'person_profile' };
    return { kind: ['track', 'album', 'playlist', 'episode', 'show'].includes(first) ? 'post' : 'platform_page' };
  },

  'mus-soundcloud': (segs, u, host) => ((segs[0] || '').toLowerCase() === 'people' || (segs[0] || '').toLowerCase() === 'search'
    ? { kind: 'search_page' }
    : singleSegProfile(lowerSet('discover', 'stream', 'upload', 'charts', 'you', 'pages', 'terms-of-use', 'jobs', 'mobile', 'pro', 'popular'), /^[A-Za-z0-9_\-]{2,}$/, 'post')(segs, u, host)),
  'mus-bandcamp': subdomainRoot('bandcamp.com', 'person_profile', 'post'),
  'mus-mixcloud': singleSegProfile(lowerSet('discover', 'search', 'live', 'upload', 'select', 'about'), /^[A-Za-z0-9_\-]{2,}$/, 'post'),

  'com-quora': segs => {
    if ((segs[0] || '').toLowerCase() === 'profile' && segs[1] && segs.length === 2) {
      return { kind: 'person_profile', urlDisplayName: decodeURIComponent(segs[1]).replace(/-\d+$/, '').replace(/-/g, ' ') };
    }
    return { kind: (segs[0] || '').toLowerCase() === 'search' ? 'search_page' : 'article' };
  },

  'com-patreon': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (first === 'c' && segs[1] && segs.length === 2) return { kind: 'person_profile', handle: segs[1] };
    if (first === 'posts') return { kind: 'post' };
    if (['search', 'login', 'signup', 'explore', 'about', 'pricing'].includes(first)) return { kind: 'platform_page' };
    return segs.length === 1 ? { kind: 'person_profile', handle: segs[0] } : { kind: 'post' };
  },

  'com-kofi': singleSegProfile(lowerSet('explore', 'search', 'manage', 'account', 'home', 'shop'), /^[A-Za-z0-9_]{2,}$/, 'post'),

  'prof-crunchbase': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (first === 'person') return { kind: 'person_profile' };
    if (first === 'organization') return { kind: 'organization_page' };
    return { kind: first.startsWith('search') || first === 'discover' ? 'search_page' : 'platform_page' };
  },

  'prof-indeed': segs => {
    const first = (segs[0] || '').toLowerCase();
    if (first === 'cmp') return { kind: 'organization_page' };
    return { kind: ['jobs', 'q', 'viewjob', 'm'].includes(first) || first.startsWith('q-') ? 'search_page' : 'platform_page' };
  },

  'prof-glassdoor': segs => ({ kind: (segs[0] || '').toLowerCase() === 'overview' ? 'organization_page' : 'platform_page' })
};

const NEWS_PATH = /\/(news|article|articles|story|stories|politics|business|sports|entertainment|opinion|world|local)\/|\/20\d{2}\/\d{1,2}\/|-\d{5,}\.html?$/i;

export function classifyUrl(url: string): ClassifiedPage {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { platformId: null, platformName: 'Web', platformCategory: 'web', host: '', pageKind: 'unknown' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const segs = parsed.pathname.split('/').filter(Boolean);
  const platform = detectPlatform(host);

  if (!platform) {
    let pageKind: PageKind = 'website';
    if (host.endsWith('wikipedia.org')) pageKind = 'article';
    else if (NEWS_PATH.test(parsed.pathname)) pageKind = 'article';
    return { platformId: null, platformName: host, platformCategory: 'web', host, pageKind };
  }

  const rule = RULES[platform.id];
  const res = rule ? rule(segs, parsed, host) : { kind: 'unknown' as PageKind };

  return {
    platformId: platform.id,
    platformName: platform.name,
    platformCategory: platform.category,
    host,
    pageKind: res.kind,
    handle: res.handle ? res.handle.replace(/^@+/, '') : undefined,
    urlDisplayName: res.urlDisplayName
  };
}
