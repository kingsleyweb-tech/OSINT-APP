import { OSINTQuery } from '../../types/search';

export type PlatformCategory = 
  | 'social'
  | 'professional'
  | 'developer'
  | 'video'
  | 'streaming'
  | 'community'
  | 'publishing'
  | 'academic'
  | 'music'
  | 'creative'
  | 'business'
  | 'news'
  | 'messaging'
  | 'documents'
  | 'general';

export interface PlatformEntry {
  id: string;
  name: string;
  category: PlatformCategory;
  domains: string[];
  tier: 1 | 2 | 3;
  searchPattern?: (target: string) => string;
  usernameSearchPattern?: (username: string) => string;
}

export const PLATFORM_REGISTRY: PlatformEntry[] = [
  // ─── GENERAL WEB (TIER 1) ───
  {
    id: 'gen-broad',
    name: 'General Web Search',
    category: 'general',
    domains: [],
    tier: 1,
    searchPattern: (t) => `"${t}"`,
    usernameSearchPattern: (u) => `"${u}"`
  },
  {
    id: 'gen-profile',
    name: 'Public Biography & Profile',
    category: 'general',
    domains: [],
    tier: 1,
    searchPattern: (t) => `"${t}" profile OR "${t}" biography`,
    usernameSearchPattern: (u) => `"${u}" profile OR "${u}" account`
  },
  {
    id: 'gen-website',
    name: 'Personal Website & Links',
    category: 'general',
    domains: [],
    tier: 1,
    searchPattern: (t) => `"${t}" website OR "${t}" official`,
    usernameSearchPattern: (u) => `"${u}" website OR "${u}" homepage`
  },

  // ─── PROFESSIONAL (TIER 1 & 2) ───
  {
    id: 'prof-linkedin',
    name: 'LinkedIn',
    category: 'professional',
    domains: ['linkedin.com/in', 'linkedin.com/pub'],
    tier: 1,
    searchPattern: (t) => `site:linkedin.com/in/ "${t}"`,
    usernameSearchPattern: (u) => `site:linkedin.com/in/ "${u}"`
  },
  {
    id: 'prof-indeed',
    name: 'Indeed',
    category: 'professional',
    domains: ['indeed.com'],
    tier: 2,
    searchPattern: (t) => `site:indeed.com "${t}"`,
    usernameSearchPattern: (u) => `site:indeed.com "${u}"`
  },
  {
    id: 'prof-crunchbase',
    name: 'Crunchbase',
    category: 'business',
    domains: ['crunchbase.com'],
    tier: 2,
    searchPattern: (t) => `site:crunchbase.com "${t}"`,
    usernameSearchPattern: (u) => `site:crunchbase.com "${u}"`
  },
  {
    id: 'prof-glassdoor',
    name: 'Glassdoor',
    category: 'business',
    domains: ['glassdoor.com'],
    tier: 3,
    searchPattern: (t) => `site:glassdoor.com "${t}"`,
    usernameSearchPattern: (u) => `site:glassdoor.com "${u}"`
  },

  // ─── SOCIAL MEDIA (TIER 1 & 2) ───
  {
    id: 'soc-x',
    name: 'X (Twitter)',
    category: 'social',
    domains: ['x.com', 'twitter.com'],
    tier: 1,
    searchPattern: (t) => `site:x.com "${t}" OR site:twitter.com "${t}"`,
    usernameSearchPattern: (u) => `site:x.com "${u}" OR site:twitter.com "${u}"`
  },
  {
    id: 'soc-facebook',
    name: 'Facebook',
    category: 'social',
    domains: ['facebook.com'],
    tier: 1,
    searchPattern: (t) => `site:facebook.com "${t}" -site:facebook.com/groups -site:facebook.com/pages`,
    usernameSearchPattern: (u) => `site:facebook.com "${u}"`
  },
  {
    id: 'soc-instagram',
    name: 'Instagram',
    category: 'social',
    domains: ['instagram.com'],
    tier: 1,
    searchPattern: (t) => `site:instagram.com "${t}"`,
    usernameSearchPattern: (u) => `site:instagram.com "${u}"`
  },
  {
    id: 'soc-tiktok',
    name: 'TikTok',
    category: 'social',
    domains: ['tiktok.com'],
    tier: 1,
    searchPattern: (t) => `site:tiktok.com "${t}"`,
    usernameSearchPattern: (u) => `site:tiktok.com "${u}"`
  },
  {
    id: 'soc-reddit',
    name: 'Reddit',
    category: 'social',
    domains: ['reddit.com'],
    tier: 1,
    searchPattern: (t) => `site:reddit.com "${t}"`,
    usernameSearchPattern: (u) => `site:reddit.com/user/ "${u}" OR site:reddit.com "${u}"`
  },
  {
    id: 'soc-snapchat',
    name: 'Snapchat',
    category: 'social',
    domains: ['snapchat.com'],
    tier: 2,
    searchPattern: (t) => `site:snapchat.com "${t}"`,
    usernameSearchPattern: (u) => `site:snapchat.com/add/ "${u}" OR site:snapchat.com "${u}"`
  },
  {
    id: 'soc-threads',
    name: 'Threads',
    category: 'social',
    domains: ['threads.net'],
    tier: 2,
    searchPattern: (t) => `site:threads.net "${t}"`,
    usernameSearchPattern: (u) => `site:threads.net "@${u}" OR site:threads.net "${u}"`
  },
  {
    id: 'soc-pinterest',
    name: 'Pinterest',
    category: 'social',
    domains: ['pinterest.com'],
    tier: 2,
    searchPattern: (t) => `site:pinterest.com "${t}"`,
    usernameSearchPattern: (u) => `site:pinterest.com "${u}"`
  },
  {
    id: 'soc-bluesky',
    name: 'Bluesky',
    category: 'social',
    domains: ['bluesky.app', 'bsky.app'],
    tier: 2,
    searchPattern: (t) => `site:bsky.app "${t}"`,
    usernameSearchPattern: (u) => `site:bsky.app "${u}"`
  },
  {
    id: 'soc-mastodon',
    name: 'Mastodon',
    category: 'social',
    domains: ['mastodon.social'],
    tier: 2,
    searchPattern: (t) => `site:mastodon.social "${t}"`,
    usernameSearchPattern: (u) => `site:mastodon.social "@${u}" OR site:mastodon.social "${u}"`
  },
  {
    id: 'soc-tumblr',
    name: 'Tumblr',
    category: 'social',
    domains: ['tumblr.com'],
    tier: 2,
    searchPattern: (t) => `site:tumblr.com "${t}"`,
    usernameSearchPattern: (u) => `site:tumblr.com "${u}"`
  },
  {
    id: 'soc-telegram',
    name: 'Telegram Public Pages',
    category: 'messaging',
    domains: ['t.me', 'telegram.me'],
    tier: 2,
    searchPattern: (t) => `site:t.me "${t}"`,
    usernameSearchPattern: (u) => `site:t.me "${u}"`
  },

  // ─── DEVELOPER & TECHNICAL (TIER 1 & 2) ───
  {
    id: 'dev-github',
    name: 'GitHub',
    category: 'developer',
    domains: ['github.com'],
    tier: 1,
    searchPattern: (t) => `site:github.com "${t}"`,
    usernameSearchPattern: (u) => `site:github.com "${u}"`
  },
  {
    id: 'dev-gitlab',
    name: 'GitLab',
    category: 'developer',
    domains: ['gitlab.com'],
    tier: 2,
    searchPattern: (t) => `site:gitlab.com "${t}"`,
    usernameSearchPattern: (u) => `site:gitlab.com "${u}"`
  },
  {
    id: 'dev-stackoverflow',
    name: 'Stack Overflow',
    category: 'developer',
    domains: ['stackoverflow.com'],
    tier: 2,
    searchPattern: (t) => `site:stackoverflow.com/users "${t}"`,
    usernameSearchPattern: (u) => `site:stackoverflow.com/users "${u}"`
  },
  {
    id: 'dev-devto',
    name: 'Dev.to',
    category: 'developer',
    domains: ['dev.to'],
    tier: 2,
    searchPattern: (t) => `site:dev.to "${t}"`,
    usernameSearchPattern: (u) => `site:dev.to "${u}"`
  },
  {
    id: 'dev-hashnode',
    name: 'Hashnode',
    category: 'developer',
    domains: ['hashnode.com'],
    tier: 2,
    searchPattern: (t) => `site:hashnode.com "${t}"`,
    usernameSearchPattern: (u) => `site:hashnode.com "${u}"`
  },
  {
    id: 'dev-codepen',
    name: 'CodePen',
    category: 'developer',
    domains: ['codepen.io'],
    tier: 2,
    searchPattern: (t) => `site:codepen.io "${t}"`,
    usernameSearchPattern: (u) => `site:codepen.io "${u}"`
  },

  // ─── VIDEO & STREAMING (TIER 1 & 2) ───
  {
    id: 'vid-youtube',
    name: 'YouTube',
    category: 'video',
    domains: ['youtube.com'],
    tier: 1,
    searchPattern: (t) => `site:youtube.com "${t}"`,
    usernameSearchPattern: (u) => `site:youtube.com "@${u}" OR site:youtube.com "${u}"`
  },
  {
    id: 'vid-vimeo',
    name: 'Vimeo',
    category: 'video',
    domains: ['vimeo.com'],
    tier: 2,
    searchPattern: (t) => `site:vimeo.com "${t}"`,
    usernameSearchPattern: (u) => `site:vimeo.com "${u}"`
  },
  {
    id: 'vid-dailymotion',
    name: 'Dailymotion',
    category: 'video',
    domains: ['dailymotion.com'],
    tier: 2,
    searchPattern: (t) => `site:dailymotion.com "${t}"`,
    usernameSearchPattern: (u) => `site:dailymotion.com "${u}"`
  },
  {
    id: 'str-twitch',
    name: 'Twitch',
    category: 'streaming',
    domains: ['twitch.tv'],
    tier: 2,
    searchPattern: (t) => `site:twitch.tv "${t}"`,
    usernameSearchPattern: (u) => `site:twitch.tv "${u}"`
  },
  {
    id: 'str-kick',
    name: 'Kick',
    category: 'streaming',
    domains: ['kick.com'],
    tier: 2,
    searchPattern: (t) => `site:kick.com "${t}"`,
    usernameSearchPattern: (u) => `site:kick.com "${u}"`
  },
  {
    id: 'str-rumble',
    name: 'Rumble',
    category: 'streaming',
    domains: ['rumble.com'],
    tier: 2,
    searchPattern: (t) => `site:rumble.com "${t}"`,
    usernameSearchPattern: (u) => `site:rumble.com "${u}"`
  },

  // ─── PUBLISHING & WRITING (TIER 2) ───
  {
    id: 'pub-medium',
    name: 'Medium',
    category: 'publishing',
    domains: ['medium.com'],
    tier: 2,
    searchPattern: (t) => `site:medium.com "${t}"`,
    usernameSearchPattern: (u) => `site:medium.com "@${u}" OR site:medium.com "${u}"`
  },
  {
    id: 'pub-substack',
    name: 'Substack',
    category: 'publishing',
    domains: ['substack.com'],
    tier: 2,
    searchPattern: (t) => `site:substack.com "${t}"`,
    usernameSearchPattern: (u) => `site:substack.com "${u}"`
  },
  {
    id: 'pub-wordpress',
    name: 'WordPress',
    category: 'publishing',
    domains: ['wordpress.com'],
    tier: 2,
    searchPattern: (t) => `site:wordpress.com "${t}"`,
    usernameSearchPattern: (u) => `site:wordpress.com "${u}"`
  },
  {
    id: 'pub-blogspot',
    name: 'Blogger',
    category: 'publishing',
    domains: ['blogspot.com'],
    tier: 2,
    searchPattern: (t) => `site:blogspot.com "${t}"`,
    usernameSearchPattern: (u) => `site:blogspot.com "${u}"`
  },

  // ─── ACADEMIC & RESEARCH (TIER 2 & 3) ───
  {
    id: 'acad-scholar',
    name: 'Google Scholar',
    category: 'academic',
    domains: ['scholar.google.com'],
    tier: 2,
    searchPattern: (t) => `site:scholar.google.com "${t}"`,
    usernameSearchPattern: (u) => `site:scholar.google.com "${u}"`
  },
  {
    id: 'acad-researchgate',
    name: 'ResearchGate',
    category: 'academic',
    domains: ['researchgate.net'],
    tier: 2,
    searchPattern: (t) => `site:researchgate.net "${t}"`,
    usernameSearchPattern: (u) => `site:researchgate.net "${u}"`
  },
  {
    id: 'acad-academia',
    name: 'Academia.edu',
    category: 'academic',
    domains: ['academia.edu'],
    tier: 2,
    searchPattern: (t) => `site:academia.edu "${t}"`,
    usernameSearchPattern: (u) => `site:academia.edu "${u}"`
  },
  {
    id: 'acad-orcid',
    name: 'ORCID',
    category: 'academic',
    domains: ['orcid.org'],
    tier: 3,
    searchPattern: (t) => `site:orcid.org "${t}"`,
    usernameSearchPattern: (u) => `site:orcid.org "${u}"`
  },

  // ─── CREATIVE & PORTFOLIO (TIER 3) ───
  {
    id: 'cre-behance',
    name: 'Behance',
    category: 'creative',
    domains: ['behance.net'],
    tier: 3,
    searchPattern: (t) => `site:behance.net "${t}"`,
    usernameSearchPattern: (u) => `site:behance.net "${u}"`
  },
  {
    id: 'cre-dribbble',
    name: 'Dribbble',
    category: 'creative',
    domains: ['dribbble.com'],
    tier: 3,
    searchPattern: (t) => `site:dribbble.com "${t}"`,
    usernameSearchPattern: (u) => `site:dribbble.com "${u}"`
  },
  {
    id: 'cre-artstation',
    name: 'ArtStation',
    category: 'creative',
    domains: ['artstation.com'],
    tier: 3,
    searchPattern: (t) => `site:artstation.com "${t}"`,
    usernameSearchPattern: (u) => `site:artstation.com "${u}"`
  },
  {
    id: 'cre-deviantart',
    name: 'DeviantArt',
    category: 'creative',
    domains: ['deviantart.com'],
    tier: 3,
    searchPattern: (t) => `site:deviantart.com "${t}"`,
    usernameSearchPattern: (u) => `site:deviantart.com "${u}"`
  },
  {
    id: 'cre-flickr',
    name: 'Flickr',
    category: 'creative',
    domains: ['flickr.com'],
    tier: 3,
    searchPattern: (t) => `site:flickr.com "${t}"`,
    usernameSearchPattern: (u) => `site:flickr.com "${u}"`
  },
  {
    id: 'cre-500px',
    name: '500px',
    category: 'creative',
    domains: ['500px.com'],
    tier: 3,
    searchPattern: (t) => `site:500px.com "${t}"`,
    usernameSearchPattern: (u) => `site:500px.com "${u}"`
  },

  // ─── MUSIC & AUDIO (TIER 3) ───
  {
    id: 'mus-spotify',
    name: 'Spotify',
    category: 'music',
    domains: ['spotify.com'],
    tier: 3,
    searchPattern: (t) => `site:spotify.com "${t}"`,
    usernameSearchPattern: (u) => `site:spotify.com "${u}"`
  },
  {
    id: 'mus-soundcloud',
    name: 'SoundCloud',
    category: 'music',
    domains: ['soundcloud.com'],
    tier: 3,
    searchPattern: (t) => `site:soundcloud.com "${t}"`,
    usernameSearchPattern: (u) => `site:soundcloud.com "${u}"`
  },
  {
    id: 'mus-bandcamp',
    name: 'Bandcamp',
    category: 'music',
    domains: ['bandcamp.com'],
    tier: 3,
    searchPattern: (t) => `site:bandcamp.com "${t}"`,
    usernameSearchPattern: (u) => `site:bandcamp.com "${u}"`
  },
  {
    id: 'mus-mixcloud',
    name: 'Mixcloud',
    category: 'music',
    domains: ['mixcloud.com'],
    tier: 3,
    searchPattern: (t) => `site:mixcloud.com "${t}"`,
    usernameSearchPattern: (u) => `site:mixcloud.com "${u}"`
  },

  // ─── COMMUNITY & CREATOR (TIER 3) ───
  {
    id: 'com-quora',
    name: 'Quora',
    category: 'community',
    domains: ['quora.com'],
    tier: 3,
    searchPattern: (t) => `site:quora.com "${t}"`,
    usernameSearchPattern: (u) => `site:quora.com/profile/ "${u}" OR site:quora.com "${u}"`
  },
  {
    id: 'com-patreon',
    name: 'Patreon',
    category: 'community',
    domains: ['patreon.com'],
    tier: 3,
    searchPattern: (t) => `site:patreon.com "${t}"`,
    usernameSearchPattern: (u) => `site:patreon.com "${u}"`
  },
  {
    id: 'com-kofi',
    name: 'Ko-fi',
    category: 'community',
    domains: ['ko-fi.com'],
    tier: 3,
    searchPattern: (t) => `site:ko-fi.com "${t}"`,
    usernameSearchPattern: (u) => `site:ko-fi.com "${u}"`
  },

  // ─── NEWS & MEDIA (TIER 1) ───
  {
    id: 'news-main',
    name: 'News & Media Mentions',
    category: 'news',
    domains: [],
    tier: 1,
    searchPattern: (t) => `"${t}" news OR "${t}" interview`,
    usernameSearchPattern: (u) => `"${u}" news OR "${u}" interview`
  },
  {
    id: 'news-events',
    name: 'Speeches & Conferences',
    category: 'news',
    domains: [],
    tier: 1,
    searchPattern: (t) => `"${t}" speech OR "${t}" conference OR "${t}" event`,
    usernameSearchPattern: (u) => `"${u}" speech OR "${u}" conference`
  },

  // ─── PUBLIC DOCUMENTS (TIER 3) ───
  {
    id: 'doc-pdf',
    name: 'Public Indexed PDFs & Documents',
    category: 'documents',
    domains: [],
    tier: 3,
    searchPattern: (t) => `"${t}" filetype:pdf`,
    usernameSearchPattern: (u) => `"${u}" filetype:pdf`
  }
];
