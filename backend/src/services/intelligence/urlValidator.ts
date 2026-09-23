export type ResultItemType = 
  | 'profile' 
  | 'post' 
  | 'reel' 
  | 'video' 
  | 'article' 
  | 'news' 
  | 'website' 
  | 'organization' 
  | 'document' 
  | 'search_page' 
  | 'other';

export interface ValidatedUrlInfo {
  canonicalUrl: string;
  domain: string;
  itemType: ResultItemType;
  platformName: string;
  isVerifiedProfileUrl: boolean;
  extractedHandle?: string;
}

export class UrlValidator {
  /**
   * Cleans Google/SerpApi redirect URLs and removes tracking query parameters
   */
  public static normalizeUrl(rawUrl: string): string {
    if (!rawUrl) return '';

    let urlStr = rawUrl.trim();

    // 1. Resolve SerpApi or Google redirect URLs (google.com/url?q=...)
    try {
      if (urlStr.includes('google.com/url?') || urlStr.includes('google.com/search?')) {
        const parsedUrl = new URL(urlStr);
        const targetQ = parsedUrl.searchParams.get('q') || parsedUrl.searchParams.get('url');
        if (targetQ && targetQ.startsWith('http')) {
          urlStr = targetQ;
        }
      }
    } catch (e) {}

    // 2. Remove common tracking query parameters while preserving legitimate params
    try {
      const parsed = new URL(urlStr);
      const paramsToStrip = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'igshid', 'ref', 'ref_src', 'ref_url', '_hsenc', '_hsmi'
      ];

      paramsToStrip.forEach(p => parsed.searchParams.delete(p));

      // Remove trailing slash if path is not root
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }

      urlStr = `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}${parsed.hash}`;
    } catch (e) {}

    return urlStr;
  }

  /**
   * Inspects URL and platform domain to determine the exact result type
   * and verify whether it represents an authentic user profile.
   */
  public static validateAndClassify(rawUrl: string): ValidatedUrlInfo {
    const canonicalUrl = this.normalizeUrl(rawUrl);
    let domain = 'Web';
    try {
      domain = new URL(canonicalUrl).hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {}

    const lowerUrl = canonicalUrl.toLowerCase();

    // Default classification
    let itemType: ResultItemType = 'website';
    let platformName = domain;
    let isVerifiedProfileUrl = false;
    let extractedHandle: string | undefined = undefined;

    const nonProfilePaths = new Set([
      'explore', 'reels', 'reel', 'p', 'tv', 'stories', 'about', 'developer', 
      'privacy', 'legal', 'help', 'search', 'terms', 'login', 'signup', 'home',
      'notifications', 'messages', 'settings', 'tos', 'intent', 'share', 'jobs',
      'learning', 'company', 'groups', 'pages', 'watch', 'videos', 'permalink.php',
      'story.php', 'events', 'topics', 'trending', 'collections', 'sponsors', 'orgs',
      'enterprise', 'pricing', 'features', 'comments', 'community', 'blog', 'news'
    ]);

    // 1. INSTAGRAM
    if (domain.includes('instagram.com')) {
      platformName = 'Instagram';
      if (lowerUrl.includes('/reel/') || lowerUrl.includes('/reels/')) {
        itemType = 'reel';
      } else if (lowerUrl.includes('/p/') || lowerUrl.includes('/tv/') || lowerUrl.includes('/stories/')) {
        itemType = 'post';
      } else if (lowerUrl.includes('/explore/') || lowerUrl.includes('/tags/') || lowerUrl.includes('/accounts/')) {
        itemType = 'search_page';
      } else {
        const igMatch = canonicalUrl.match(/instagram\.com\/([a-zA-Z0-9_\.]+)\/?$/i);
        if (igMatch && igMatch[1] && !nonProfilePaths.has(igMatch[1].toLowerCase())) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = igMatch[1];
        } else {
          itemType = 'website';
        }
      }
    }

    // 2. YOUTUBE
    else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      platformName = 'YouTube';
      if (lowerUrl.includes('/watch') || lowerUrl.includes('youtu.be/')) {
        itemType = 'video';
      } else if (lowerUrl.includes('/shorts/')) {
        itemType = 'reel';
      } else if (lowerUrl.includes('/playlist') || lowerUrl.includes('/results')) {
        itemType = 'search_page';
      } else {
        const ytMatch = canonicalUrl.match(/youtube\.com\/(?:@([a-zA-Z0-9_\-\.]+)|channel\/([a-zA-Z0-9_\-]+)|c\/([a-zA-Z0-9_\-\.]+)|user\/([a-zA-Z0-9_\-\.]+))\/?$/i);
        if (ytMatch) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = ytMatch[1] || ytMatch[2] || ytMatch[3] || ytMatch[4];
        } else {
          itemType = 'video';
        }
      }
    }

    // 3. TIKTOK
    else if (domain.includes('tiktok.com')) {
      platformName = 'TikTok';
      if (lowerUrl.includes('/video/') || lowerUrl.includes('/v/')) {
        itemType = 'video';
      } else if (lowerUrl.includes('/tag/') || lowerUrl.includes('/music/') || lowerUrl.includes('/discover')) {
        itemType = 'search_page';
      } else {
        const ttMatch = canonicalUrl.match(/tiktok\.com\/@([a-zA-Z0-9_\-\.]+)\/?$/i);
        if (ttMatch && ttMatch[1]) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = ttMatch[1];
        } else {
          itemType = 'reel';
        }
      }
    }

    // 4. X (TWITTER)
    else if (domain.includes('twitter.com') || domain.includes('x.com')) {
      platformName = 'X (Twitter)';
      if (lowerUrl.includes('/status/') || lowerUrl.includes('/statuses/')) {
        itemType = 'post';
      } else if (lowerUrl.includes('/hashtag/') || lowerUrl.includes('/search') || lowerUrl.includes('/explore') || lowerUrl.includes('/i/')) {
        itemType = 'search_page';
      } else {
        const xMatch = canonicalUrl.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/?$/i);
        if (xMatch && xMatch[1] && !nonProfilePaths.has(xMatch[1].toLowerCase())) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = xMatch[1];
        } else {
          itemType = 'post';
        }
      }
    }

    // 5. LINKEDIN
    else if (domain.includes('linkedin.com')) {
      platformName = 'LinkedIn';
      if (lowerUrl.includes('/posts/') || lowerUrl.includes('/pulse/') || lowerUrl.includes('/activity/')) {
        itemType = 'post';
      } else if (lowerUrl.includes('/jobs/') || lowerUrl.includes('/search/') || lowerUrl.includes('/learning/')) {
        itemType = 'search_page';
      } else if (lowerUrl.includes('linkedin.com/company/')) {
        itemType = 'organization';
      } else {
        const liMatch = canonicalUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_\-\%]+)\/?$/i);
        if (liMatch && liMatch[1]) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = decodeURIComponent(liMatch[1]);
        } else {
          itemType = 'website';
        }
      }
    }

    // 6. GITHUB
    else if (domain.includes('github.com')) {
      platformName = 'GitHub';
      if (
        lowerUrl.includes('/issues') || 
        lowerUrl.includes('/pull/') || 
        lowerUrl.includes('/commit/') || 
        lowerUrl.includes('/releases') ||
        lowerUrl.includes('/blob/') ||
        lowerUrl.includes('/raw/')
      ) {
        itemType = 'post';
      } else if (lowerUrl.includes('/search')) {
        itemType = 'search_page';
      } else {
        const ghUserMatch = canonicalUrl.match(/github\.com\/([a-zA-Z0-9\-_]+)\/?$/i);
        if (ghUserMatch && ghUserMatch[1] && !nonProfilePaths.has(ghUserMatch[1].toLowerCase())) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = ghUserMatch[1];
        } else if (canonicalUrl.match(/github\.com\/[a-zA-Z0-9\-_]+\/[a-zA-Z0-9\-_.]+/i)) {
          itemType = 'document';
        } else {
          itemType = 'website';
        }
      }
    }

    // 7. REDDIT
    else if (domain.includes('reddit.com')) {
      platformName = 'Reddit';
      if (lowerUrl.includes('/comments/') || lowerUrl.includes('/s/')) {
        itemType = 'post';
      } else if (lowerUrl.includes('/r/')) {
        itemType = 'organization';
      } else {
        const redMatch = canonicalUrl.match(/reddit\.com\/user\/([a-zA-Z0-9_\-]+)\/?$/i);
        if (redMatch && redMatch[1]) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = redMatch[1];
        } else {
          itemType = 'post';
        }
      }
    }

    // 8. FACEBOOK
    else if (domain.includes('facebook.com')) {
      platformName = 'Facebook';
      if (lowerUrl.includes('/groups/') || lowerUrl.includes('/pages/')) {
        itemType = 'organization';
      } else if (lowerUrl.includes('/watch/') || lowerUrl.includes('/videos/') || lowerUrl.includes('/reel/')) {
        itemType = 'video';
      } else if (lowerUrl.includes('/posts/') || lowerUrl.includes('/permalink.php') || lowerUrl.includes('/story.php')) {
        itemType = 'post';
      } else {
        const fbMatch = canonicalUrl.match(/facebook\.com\/([a-zA-Z0-9\.]+)\/?$/i);
        if (fbMatch && fbMatch[1] && !nonProfilePaths.has(fbMatch[1].toLowerCase())) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = fbMatch[1];
        } else if (lowerUrl.includes('profile.php?id=')) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
        } else {
          itemType = 'website';
        }
      }
    }

    // 9. MEDIUM
    else if (domain.includes('medium.com')) {
      platformName = 'Medium';
      if (lowerUrl.includes('/p/') || lowerUrl.match(/medium\.com\/@[^\/]+\/[a-zA-Z0-9\-]+/)) {
        itemType = 'article';
      } else {
        const medMatch = canonicalUrl.match(/medium\.com\/@([a-zA-Z0-9_\-\.]+)\/?$/i);
        if (medMatch && medMatch[1]) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = medMatch[1];
        } else {
          itemType = 'article';
        }
      }
    }

    // 10. SUBSTACK
    else if (domain.includes('substack.com')) {
      platformName = 'Substack';
      if (lowerUrl.includes('/p/')) {
        itemType = 'article';
      } else {
        const subMatch = canonicalUrl.match(/(?:([a-zA-Z0-9_\-]+)\.substack\.com|substack\.com\/@([a-zA-Z0-9_\-]+))\/?$/i);
        if (subMatch && (subMatch[1] || subMatch[2])) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = subMatch[1] || subMatch[2];
        } else {
          itemType = 'article';
        }
      }
    }

    // 11. DEV.TO
    else if (domain.includes('dev.to')) {
      platformName = 'Dev.to';
      const devMatch = canonicalUrl.match(/dev\.to\/([a-zA-Z0-9_\-]+)\/?$/i);
      if (devMatch && devMatch[1] && !['latest', 'top', 'podcasts', 'videos', 'listings'].includes(devMatch[1])) {
        itemType = 'profile';
        isVerifiedProfileUrl = true;
        extractedHandle = devMatch[1];
      } else {
        itemType = 'article';
      }
    }

    // 12. BEHANCE
    else if (domain.includes('behance.net')) {
      platformName = 'Behance';
      if (lowerUrl.includes('/gallery/')) {
        itemType = 'post';
      } else {
        const behMatch = canonicalUrl.match(/behance\.net\/([a-zA-Z0-9_\-]+)\/?$/i);
        if (behMatch && behMatch[1] && !['search', 'hire'].includes(behMatch[1])) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = behMatch[1];
        } else {
          itemType = 'website';
        }
      }
    }

    // 13. DRIBBBLE
    else if (domain.includes('dribbble.com')) {
      platformName = 'Dribbble';
      if (lowerUrl.includes('/shots/')) {
        itemType = 'post';
      } else {
        const dribMatch = canonicalUrl.match(/dribbble\.com\/([a-zA-Z0-9_\-]+)\/?$/i);
        if (dribMatch && dribMatch[1] && !['shots', 'designers', 'jobs'].includes(dribMatch[1])) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = dribMatch[1];
        } else {
          itemType = 'website';
        }
      }
    }

    // 14. PINTEREST
    else if (domain.includes('pinterest.com')) {
      platformName = 'Pinterest';
      if (lowerUrl.includes('/pin/')) {
        itemType = 'post';
      } else {
        const pinMatch = canonicalUrl.match(/pinterest\.com\/([a-zA-Z0-9_\-]+)\/?$/i);
        if (pinMatch && pinMatch[1] && !['ideas', 'today', 'news'].includes(pinMatch[1])) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = pinMatch[1];
        } else {
          itemType = 'website';
        }
      }
    }

    // 15. SPOTIFY
    else if (domain.includes('spotify.com')) {
      platformName = 'Spotify';
      if (lowerUrl.includes('/track/') || lowerUrl.includes('/album/') || lowerUrl.includes('/playlist/')) {
        itemType = 'post';
      } else {
        const spMatch = canonicalUrl.match(/spotify\.com\/(?:user|artist)\/([a-zA-Z0-9_\-]+)\/?$/i);
        if (spMatch && spMatch[1]) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = spMatch[1];
        } else {
          itemType = 'website';
        }
      }
    }

    // 16. SOUNDCLOUD
    else if (domain.includes('soundcloud.com')) {
      platformName = 'SoundCloud';
      const scMatch = canonicalUrl.match(/soundcloud\.com\/([a-zA-Z0-9_\-]+)\/?$/i);
      if (scMatch && scMatch[1] && !['discover', 'stream', 'upload', 'search', 'terms'].includes(scMatch[1])) {
        itemType = 'profile';
        isVerifiedProfileUrl = true;
        extractedHandle = scMatch[1];
      } else {
        itemType = 'post';
      }
    }

    // 17. TWITCH
    else if (domain.includes('twitch.tv')) {
      platformName = 'Twitch';
      if (lowerUrl.includes('/videos/') || lowerUrl.includes('/clip/')) {
        itemType = 'video';
      } else {
        const twMatch = canonicalUrl.match(/twitch\.tv\/([a-zA-Z0-9_\-]+)\/?$/i);
        if (twMatch && twMatch[1] && !['directory', 'downloads', 'jobs', 'p', 'turbo'].includes(twMatch[1])) {
          itemType = 'profile';
          isVerifiedProfileUrl = true;
          extractedHandle = twMatch[1];
        } else {
          itemType = 'video';
        }
      }
    }

    // 18. QUORA
    else if (domain.includes('quora.com')) {
      platformName = 'Quora';
      const qMatch = canonicalUrl.match(/quora\.com\/profile\/([a-zA-Z0-9_\-\%]+)\/?$/i);
      if (qMatch && qMatch[1]) {
        itemType = 'profile';
        isVerifiedProfileUrl = true;
        extractedHandle = decodeURIComponent(qMatch[1]);
      } else {
        itemType = 'article';
      }
    }

    // 19. WIKIPEDIA
    else if (domain.includes('wikipedia.org') || domain.includes('wikidata.org')) {
      platformName = 'Wikipedia';
      itemType = 'article';
    }

    // 20. GENERIC NEWS & ARTICLES
    else if (
      lowerUrl.includes('/news/') || 
      lowerUrl.includes('/article/') || 
      lowerUrl.includes('/story/') || 
      lowerUrl.includes('/post/') || 
      lowerUrl.includes('/blog/')
    ) {
      itemType = 'news';
    }

    return {
      canonicalUrl,
      domain,
      itemType,
      platformName,
      isVerifiedProfileUrl,
      extractedHandle
    };
  }
}
