import { DiscoveryResultItem, DiscoveryCategory, UsernameDiscoverySummary } from '../../types/discovery';

interface PlatformConfig {
  id: string;
  name: string;
  category: DiscoveryCategory;
  domain: string;
  checker: (username: string) => Promise<Partial<DiscoveryResultItem>>;
}

// In-Memory Cache (TTL: 5 minutes)
interface CacheEntry {
  items: DiscoveryResultItem[];
  summary: UsernameDiscoverySummary;
  timestamp: number;
}

const DISCOVERY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export class UsernameDiscoveryService {
  private platforms: PlatformConfig[] = [
    // ----------------------------------------------------
    // DEVELOPER PLATFORMS
    // ----------------------------------------------------
    {
      id: 'github',
      name: 'GitHub',
      category: 'Developer',
      domain: 'github.com',
      checker: async (username) => {
        const headers: Record<string, string> = {
          'User-Agent': 'OSINT-Username-Discovery/1.0',
          'Accept': 'application/vnd.github.v3+json'
        };
        if (process.env.GITHUB_TOKEN) {
          headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
        if (res.status === 200) {
          const data = await res.json();
          return {
            status: 'found',
            displayName: data.name || data.login,
            profileUrl: data.html_url,
            profileImage: data.avatar_url,
            confidence: 'confirmed',
            source: 'GitHub API',
            metadata: { publicRepos: data.public_repos, followers: data.followers, bio: data.bio, location: data.location || undefined, company: data.company || undefined }
          };
        } else if (res.status === 404) {
          return { status: 'no_match', source: 'GitHub API', confidence: 'unconfirmed' };
        }
        return { status: 'provider_unavailable', source: 'GitHub API', confidence: 'unconfirmed' };
      }
    },
    {
      id: 'dockerhub',
      name: 'Docker Hub',
      category: 'Developer',
      domain: 'hub.docker.com',
      checker: async (username) => {
        const res = await fetch(`https://hub.docker.com/v2/users/${encodeURIComponent(username)}`, {
          headers: { 'User-Agent': 'OSINT-Username-Discovery/1.0' }
        });
        if (res.status === 200) {
          const data = await res.json();
          if (data && data.username) {
            return {
              status: 'found',
              displayName: data.full_name || data.username,
              profileUrl: `https://hub.docker.com/u/${data.username}`,
              profileImage: data.gravatar_url,
              confidence: 'confirmed',
              source: 'Docker Hub API',
              metadata: { location: data.location || undefined, company: data.company || undefined }
            };
          }
        } else if (res.status === 404) {
          return { status: 'no_match', source: 'Docker Hub API', confidence: 'unconfirmed' };
        }
        return { status: 'provider_unavailable', source: 'Docker Hub API', confidence: 'unconfirmed' };
      }
    },
    {
      id: 'npm',
      name: 'NPM Registry',
      category: 'Developer',
      domain: 'npmjs.com',
      checker: async (username) => {
        const res = await fetch(`https://registry.npmjs.org/-/user/org.couchdb.user:${encodeURIComponent(username)}`, {
          headers: { 'User-Agent': 'OSINT-Username-Discovery/1.0' }
        });
        if (res.status === 200) {
          const data = await res.json();
          if (data && data.name) {
            return {
              status: 'found',
              displayName: data.name,
              profileUrl: `https://www.npmjs.com/~${data.name}`,
              confidence: 'confirmed',
              source: 'NPM Registry API'
            };
          }
        } else if (res.status === 404) {
          return { status: 'no_match', source: 'NPM Registry API', confidence: 'unconfirmed' };
        }
        return { status: 'provider_unavailable', source: 'NPM Registry API', confidence: 'unconfirmed' };
      }
    },

    // ----------------------------------------------------
    // COMMUNITIES & PUBLISHING
    // ----------------------------------------------------
    {
      id: 'reddit',
      name: 'Reddit',
      category: 'Communities & Publishing',
      domain: 'reddit.com',
      checker: async (username) => {
        const res = await fetch(`https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Platform-Bot/1.0' }
        });
        if (res.status === 200) {
          const data = await res.json();
          if (data && data.data && data.data.name) {
            const uData = data.data;
            return {
              status: 'found',
              displayName: uData.subreddit?.title || `u/${uData.name}`,
              profileUrl: `https://www.reddit.com/user/${uData.name}`,
              profileImage: uData.icon_img?.split('?')[0],
              confidence: 'confirmed',
              source: 'Reddit User API',
              metadata: { karma: uData.total_karma }
            };
          }
        } else if (res.status === 404) {
          return { status: 'no_match', source: 'Reddit User API', confidence: 'unconfirmed' };
        }
        return { status: 'provider_unavailable', source: 'Reddit User API', confidence: 'unconfirmed' };
      }
    },
    {
      id: 'devto',
      name: 'Dev.to',
      category: 'Communities & Publishing',
      domain: 'dev.to',
      checker: async (username) => {
        const res = await fetch(`https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`, {
          headers: { 'User-Agent': 'OSINT-Username-Discovery/1.0' }
        });
        if (res.status === 200) {
          const data = await res.json();
          if (data && data.username) {
            return {
              status: 'found',
              displayName: data.name || data.username,
              profileUrl: `https://dev.to/${data.username}`,
              profileImage: data.profile_image,
              confidence: 'confirmed',
              source: 'Dev.to API',
              metadata: { location: data.location || undefined, bio: data.summary || undefined }
            };
          }
        } else if (res.status === 404) {
          return { status: 'no_match', source: 'Dev.to API', confidence: 'unconfirmed' };
        }
        return { status: 'provider_unavailable', source: 'Dev.to API', confidence: 'unconfirmed' };
      }
    },
    {
      id: 'wikipedia',
      name: 'Wikipedia',
      category: 'Communities & Publishing',
      domain: 'wikipedia.org',
      checker: async (username) => {
        const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=users&ususers=${encodeURIComponent(username)}&usprop=registration|editcount|gender&format=json`, {
          headers: { 'User-Agent': 'OSINT-Username-Discovery/1.0' }
        });
        if (res.status === 200) {
          const data = await res.json();
          const userObj = data?.query?.users?.[0];
          if (userObj && userObj.userid) {
            return {
              status: 'found',
              displayName: userObj.name,
              profileUrl: `https://en.wikipedia.org/wiki/User:${encodeURIComponent(userObj.name)}`,
              confidence: 'confirmed',
              source: 'Wikipedia API',
              metadata: { editCount: userObj.editcount, registration: userObj.registration }
            };
          } else if (userObj && userObj.missing !== undefined) {
            return { status: 'no_match', source: 'Wikipedia API', confidence: 'unconfirmed' };
          }
        }
        return { status: 'provider_unavailable', source: 'Wikipedia API', confidence: 'unconfirmed' };
      }
    },
    {
      id: 'medium',
      name: 'Medium',
      category: 'Communities & Publishing',
      domain: 'medium.com',
      checker: async (username) => {
        try {
          const cleanUser = username.startsWith('@') ? username : `@${username}`;
          const res = await fetch(`https://medium.com/${encodeURIComponent(cleanUser)}`, {
            method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36' }
          });
          if (res.status === 200) {
            return {
              status: 'found',
              displayName: username,
              profileUrl: `https://medium.com/${cleanUser}`,
              confidence: 'possible',
              source: 'Medium HTTP Check'
            };
          } else if (res.status === 404) {
            return { status: 'no_match', source: 'Medium HTTP Check', confidence: 'unconfirmed' };
          }
        } catch (e) {}
        return { status: 'unverified', source: 'Medium Check', confidence: 'unconfirmed' };
      }
    },
    {
      id: 'telegram',
      name: 'Telegram',
      category: 'Communities & Publishing',
      domain: 't.me',
      checker: async (username) => {
        try {
          const clean = username.replace(/^@/, '');
          const res = await fetch(`https://t.me/s/${encodeURIComponent(clean)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36' }
          });
          if (res.status === 200) {
            const html = await res.text();
            if (html.includes('tgme_page_title') || html.includes('tgme_header_title')) {
              return {
                status: 'found',
                displayName: `@${clean}`,
                profileUrl: `https://t.me/${clean}`,
                confidence: 'confirmed',
                source: 'Telegram Public Web'
              };
            }
          } else if (res.status === 404) {
            return { status: 'no_match', source: 'Telegram Check', confidence: 'unconfirmed' };
          }
        } catch (e) {}
        return { status: 'unverified', source: 'Telegram Check', confidence: 'unconfirmed' };
      }
    },

    // ----------------------------------------------------
    // SOCIAL MEDIA PLATFORMS (FEDERATED / OPEN APIS)
    // ----------------------------------------------------
    {
      id: 'mastodon',
      name: 'Mastodon',
      category: 'Social Media',
      domain: 'mastodon.social',
      checker: async (username) => {
        const res = await fetch(`https://mastodon.social/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`, {
          headers: { 'User-Agent': 'OSINT-Username-Discovery/1.0' }
        });
        if (res.status === 200) {
          const data = await res.json();
          if (data && data.username) {
            return {
              status: 'found',
              displayName: data.display_name || data.username,
              profileUrl: data.url,
              profileImage: data.avatar,
              confidence: 'confirmed',
              source: 'Mastodon API'
            };
          }
        } else if (res.status === 404) {
          return { status: 'no_match', source: 'Mastodon API', confidence: 'unconfirmed' };
        }
        return { status: 'provider_unavailable', source: 'Mastodon API', confidence: 'unconfirmed' };
      }
    },
    {
      id: 'bluesky',
      name: 'Bluesky',
      category: 'Social Media',
      domain: 'bsky.app',
      checker: async (username) => {
        const handle = username.includes('.') ? username : `${username}.bsky.social`;
        const res = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`, {
          headers: { 'User-Agent': 'OSINT-Username-Discovery/1.0' }
        });
        if (res.status === 200) {
          const data = await res.json();
          if (data && data.did) {
            return {
              status: 'found',
              displayName: `@${handle}`,
              profileUrl: `https://bsky.app/profile/${handle}`,
              confidence: 'confirmed',
              source: 'Bluesky ATProto API'
            };
          }
        } else if (res.status === 400 || res.status === 404) {
          return { status: 'no_match', source: 'Bluesky API', confidence: 'unconfirmed' };
        }
        return { status: 'provider_unavailable', source: 'Bluesky API', confidence: 'unconfirmed' };
      }
    },

    // ----------------------------------------------------
    // VIDEO & STREAMING PLATFORMS
    // ----------------------------------------------------
    {
      id: 'twitch',
      name: 'Twitch',
      category: 'Video & Streaming',
      domain: 'twitch.tv',
      checker: async (username) => {
        try {
          const res = await fetch(`https://passport.twitch.tv/usernames/${encodeURIComponent(username)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (res.status === 200) {
            const data = await res.json();
            // taken: true means username exists on Twitch
            if (data && data.taken === true) {
              return {
                status: 'found',
                displayName: username,
                profileUrl: `https://www.twitch.tv/${username}`,
                confidence: 'confirmed',
                source: 'Twitch Registry API'
              };
            } else if (data && data.taken === false) {
              return { status: 'no_match', source: 'Twitch Registry API', confidence: 'unconfirmed' };
            }
          }
        } catch (e) {}
        return { status: 'unverified', source: 'Twitch Check', confidence: 'unconfirmed' };
      }
    },
    {
      id: 'youtube',
      name: 'YouTube',
      category: 'Video & Streaming',
      domain: 'youtube.com',
      checker: async (username) => {
        try {
          const cleanUser = username.startsWith('@') ? username : `@${username}`;
          const res = await fetch(`https://www.youtube.com/${encodeURIComponent(cleanUser)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36' }
          });
          if (res.status === 200) {
            const html = await res.text();
            if (html.includes('canonical') && (html.includes('youtube.com/@') || html.includes('itemprop="name"'))) {
              return {
                status: 'found',
                displayName: cleanUser,
                profileUrl: `https://www.youtube.com/${cleanUser}`,
                confidence: 'confirmed',
                source: 'YouTube Handle Verification'
              };
            }
          } else if (res.status === 404) {
            return { status: 'no_match', source: 'YouTube Handle Check', confidence: 'unconfirmed' };
          }
        } catch (e) {}
        return { status: 'unverified', source: 'YouTube Check', confidence: 'unconfirmed' };
      }
    },
    {
      id: 'vimeo',
      name: 'Vimeo',
      category: 'Video & Streaming',
      domain: 'vimeo.com',
      checker: async (username) => {
        try {
          const res = await fetch(`https://vimeo.com/${encodeURIComponent(username)}`, {
            method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36' }
          });
          if (res.status === 200) {
            return {
              status: 'found',
              displayName: username,
              profileUrl: `https://vimeo.com/${username}`,
              confidence: 'possible',
              source: 'Vimeo Verification'
            };
          } else if (res.status === 404) {
            return { status: 'no_match', source: 'Vimeo Check', confidence: 'unconfirmed' };
          }
        } catch (e) {}
        return { status: 'unverified', source: 'Vimeo Check', confidence: 'unconfirmed' };
      }
    }
  ];

  /**
   * Search for platforms via DuckDuckGo Web Engine matching domain & handle
   */
  private async searchPlatformWebEngine(domain: string, username: string, platformName: string, category: DiscoveryCategory): Promise<Partial<DiscoveryResultItem>> {
    try {
      const query = `site:${domain} "${username}"`;
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const html = await res.text();
        const regex = /<h2[^>]*class="result__title"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
          const rawUrl = match[1].replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, '').split('&')[0];
          const decodedUrl = decodeURIComponent(rawUrl);
          const title = match[2].replace(/<[^>]+>/g, '').trim();

          if (decodedUrl.toLowerCase().includes(domain.toLowerCase())) {
            return {
              status: 'found',
              displayName: title || `@${username}`,
              profileUrl: decodedUrl,
              confidence: 'possible',
              source: 'Web Search Engine Index'
            };
          }
        }
      }
    } catch (e) {
      // web engine check failed
    }
    return { status: 'no_match', source: 'Web Search Engine Index', confidence: 'unconfirmed' };
  }

  /**
   * Verified Major Social Media Platforms (Instagram, TikTok, X, Snapchat, LinkedIn, Threads, Pinterest)
   */
  private socialMediaSearchConfigs: { id: string; name: string; category: DiscoveryCategory; domain: string }[] = [
    { id: 'instagram', name: 'Instagram', category: 'Social Media', domain: 'instagram.com' },
    { id: 'tiktok', name: 'TikTok', category: 'Social Media', domain: 'tiktok.com' },
    { id: 'x', name: 'X (Twitter)', category: 'Social Media', domain: 'x.com' },
    { id: 'snapchat', name: 'Snapchat', category: 'Social Media', domain: 'snapchat.com' },
    { id: 'linkedin', name: 'LinkedIn', category: 'Social Media', domain: 'linkedin.com' },
    { id: 'threads', name: 'Threads', category: 'Social Media', domain: 'threads.net' },
    { id: 'pinterest', name: 'Pinterest', category: 'Social Media', domain: 'pinterest.com' },
    { id: 'facebook', name: 'Facebook', category: 'Social Media', domain: 'facebook.com' }
  ];

  /**
   * Helper to generate useful username variations
   */
  public generateVariations(username: string): string[] {
    const raw = username.trim().toLowerCase();
    const list: string[] = [];

    // Remove underscores / dots / hyphens
    const stripped = raw.replace(/[._-]/g, '');
    if (stripped && stripped !== raw && stripped.length >= 3) {
      list.push(stripped);
    }

    // Replace underscore with dot
    if (raw.includes('_')) {
      list.push(raw.replace(/_/g, '.'));
      list.push(raw.replace(/_/g, '-'));
    }

    // Replace dot with underscore
    if (raw.includes('.')) {
      list.push(raw.replace(/\./g, '_'));
      list.push(raw.replace(/\./g, '-'));
    }

    // Common numeric suffixes
    if (!/\d+$/.test(raw)) {
      list.push(`${raw}123`);
      list.push(`${raw}01`);
    }

    return Array.from(new Set(list)).slice(0, 4); // Limit to top 4 variations
  }

  /**
   * Orchestrate progressive live discovery stream
   */
  public async discoverUsernames(
    username: string,
    onProgress: (item: DiscoveryResultItem) => void
  ): Promise<{ items: DiscoveryResultItem[]; summary: UsernameDiscoverySummary }> {
    const cleanUser = username.trim().toLowerCase();

    // Check cache
    const cached = DISCOVERY_CACHE.get(cleanUser);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      // Emit cached items immediately
      cached.items.forEach(item => onProgress(item));
      return { items: cached.items, summary: cached.summary };
    }

    const allDiscoveredItems: DiscoveryResultItem[] = [];
    const nowIso = new Date().toISOString();

    // 1. Prepare initial items for direct API platforms
    const tasks = this.platforms.map(async (platform) => {
      const initItem: DiscoveryResultItem = {
        id: `${platform.id}-${cleanUser}`,
        platformId: platform.id,
        platform: platform.name,
        category: platform.category,
        username: cleanUser,
        status: 'searching',
        source: 'Pending Check',
        confidence: 'unconfirmed',
        discoveredAt: nowIso
      };
      onProgress(initItem);

      try {
        const checkResult = await platform.checker(cleanUser);
        const updatedItem: DiscoveryResultItem = {
          ...initItem,
          ...checkResult,
          status: checkResult.status || 'no_match'
        };
        allDiscoveredItems.push(updatedItem);
        onProgress(updatedItem);
      } catch (err) {
        const errorItem: DiscoveryResultItem = {
          ...initItem,
          status: 'error',
          source: 'System Error',
          confidence: 'unconfirmed'
        };
        allDiscoveredItems.push(errorItem);
        onProgress(errorItem);
      }
    });

    // 2. Prepare Web Engine Search tasks for complex social platforms
    const socialTasks = this.socialMediaSearchConfigs.map(async (platform) => {
      const initItem: DiscoveryResultItem = {
        id: `${platform.id}-${cleanUser}`,
        platformId: platform.id,
        platform: platform.name,
        category: platform.category,
        username: cleanUser,
        status: 'searching',
        source: 'Web Search Engine Index',
        confidence: 'unconfirmed',
        discoveredAt: nowIso
      };
      onProgress(initItem);

      try {
        const checkResult = await this.searchPlatformWebEngine(platform.domain, cleanUser, platform.name, platform.category);
        const updatedItem: DiscoveryResultItem = {
          ...initItem,
          ...checkResult,
          status: checkResult.status || 'no_match'
        };
        allDiscoveredItems.push(updatedItem);
        onProgress(updatedItem);
      } catch (err) {
        const errorItem: DiscoveryResultItem = {
          ...initItem,
          status: 'unverified',
          source: 'Search Engine Timeout',
          confidence: 'unconfirmed'
        };
        allDiscoveredItems.push(errorItem);
        onProgress(errorItem);
      }
    });

    await Promise.all([...tasks, ...socialTasks]);

    // 3. Username Variations check on GitHub & Reddit (quick verification)
    const variations = this.generateVariations(cleanUser);
    let variationsFound = 0;

    for (const variation of variations) {
      try {
        const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(variation)}`, {
          headers: { 'User-Agent': 'OSINT-Username-Discovery/1.0' }
        });
        if (ghRes.status === 200) {
          const data = await ghRes.json();
          variationsFound++;
          const varItem: DiscoveryResultItem = {
            id: `github-variation-${variation}`,
            platformId: 'github',
            platform: 'GitHub',
            category: 'Developer',
            username: variation,
            displayName: data.name || data.login,
            profileUrl: data.html_url,
            profileImage: data.avatar_url,
            status: 'found',
            source: 'GitHub API',
            confidence: 'possible',
            discoveredAt: nowIso,
            isVariation: true,
            variationLabel: 'Suggested username'
          };
          allDiscoveredItems.push(varItem);
          onProgress(varItem);
        }
      } catch (e) {}
    }

    const totalSourcesChecked = this.platforms.length + this.socialMediaSearchConfigs.length;
    const totalProfilesFound = allDiscoveredItems.filter(i => i.status === 'found' && !i.isVariation).length;

    const summary: UsernameDiscoverySummary = {
      username: cleanUser,
      totalSourcesChecked,
      totalProfilesFound,
      variationsChecked: variations.length,
      variationsFound,
      completedAt: new Date().toISOString()
    };

    // Cache results
    DISCOVERY_CACHE.set(cleanUser, {
      items: allDiscoveredItems,
      summary,
      timestamp: Date.now()
    });

    return { items: allDiscoveredItems, summary };
  }
}

export const usernameDiscoveryService = new UsernameDiscoveryService();
