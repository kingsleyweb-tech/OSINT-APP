import React from 'react';

interface PlatformIconProps {
  platform?: string;
  domain?: string;
  size?: number;
  className?: string;
}

const getDomainForPlatform = (p: string, domainProp?: string): string => {
  if (domainProp) return domainProp;
  const name = p.toLowerCase();
  if (name.includes('youtube')) return 'youtube.com';
  if (name.includes('snapchat')) return 'snapchat.com';
  if (name.includes('github')) return 'github.com';
  if (name.includes('gitlab')) return 'gitlab.com';
  if (name.includes('x') || name.includes('twitter')) return 'x.com';
  if (name.includes('facebook')) return 'facebook.com';
  if (name.includes('instagram')) return 'instagram.com';
  if (name.includes('linkedin')) return 'linkedin.com';
  if (name.includes('tiktok')) return 'tiktok.com';
  if (name.includes('reddit')) return 'reddit.com';
  if (name.includes('threads')) return 'threads.net';
  if (name.includes('bluesky') || name.includes('bsky')) return 'bsky.app';
  if (name.includes('mastodon')) return 'joinmastodon.org';
  if (name.includes('telegram')) return 'telegram.org';
  if (name.includes('tumblr')) return 'tumblr.com';
  if (name.includes('indeed')) return 'indeed.com';
  if (name.includes('crunchbase')) return 'crunchbase.com';
  if (name.includes('glassdoor')) return 'glassdoor.com';
  if (name.includes('stackoverflow') || name.includes('stack overflow')) return 'stackoverflow.com';
  if (name.includes('dev.to')) return 'dev.to';
  if (name.includes('hashnode')) return 'hashnode.com';
  if (name.includes('codepen')) return 'codepen.io';
  if (name.includes('twitch')) return 'twitch.tv';
  if (name.includes('vimeo')) return 'vimeo.com';
  if (name.includes('kick')) return 'kick.com';
  if (name.includes('rumble')) return 'rumble.com';
  if (name.includes('dailymotion')) return 'dailymotion.com';
  if (name.includes('medium')) return 'medium.com';
  if (name.includes('substack')) return 'substack.com';
  if (name.includes('wordpress')) return 'wordpress.com';
  if (name.includes('blogger') || name.includes('blogspot')) return 'blogspot.com';
  if (name.includes('google scholar') || name.includes('scholar')) return 'scholar.google.com';
  if (name.includes('researchgate')) return 'researchgate.net';
  if (name.includes('academia')) return 'academia.edu';
  if (name.includes('orcid')) return 'orcid.org';
  if (name.includes('behance')) return 'behance.net';
  if (name.includes('dribbble')) return 'dribbble.com';
  if (name.includes('artstation')) return 'artstation.com';
  if (name.includes('deviantart')) return 'deviantart.com';
  if (name.includes('flickr')) return 'flickr.com';
  if (name.includes('500px')) return '500px.com';
  if (name.includes('spotify')) return 'spotify.com';
  if (name.includes('soundcloud')) return 'soundcloud.com';
  if (name.includes('bandcamp')) return 'bandcamp.com';
  if (name.includes('mixcloud')) return 'mixcloud.com';
  return '';
};

export const PlatformIcon: React.FC<PlatformIconProps> = ({ 
  platform = '', 
  domain = '', 
  size = 18, 
  className = '' 
}) => {
  const p = platform.toLowerCase().trim();

  // 1. X (Twitter)
  if (p === 'x' || p === 'twitter' || p.includes('x (twitter)')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
  }

  // 2. YouTube (Red and White)
  if (p.includes('youtube')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
        <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    );
  }

  // 3. Snapchat (Yellow and White with subtle dark border)
  if (p.includes('snapchat')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect width="24" height="24" rx="6" fill="#FFFC00"/>
        <path fill="#FFFFFF" stroke="#000000" strokeWidth="0.8" strokeLinejoin="round" d="M12.004 3.5c-3.882 0-6.49 2.502-6.49 5.86 0 1.258.4 2.54 1.05 3.327-.145.412-.767 1.554-1.897 1.554-.51 0-.846-.17-.998-.266-.1-.06-.217-.076-.324-.035-.11.042-.193.125-.23.238-.1.304.148.882.88 1.408.835.6 2.062.637 2.658.637.24 0 .422-.007.525-.015.557 1.764 2.213 2.76 4.826 2.76 2.613 0 4.27-1 4.826-2.76.103.008.285.015.525.015.596 0 1.823-.037 2.658-.637.732-.526.98-1.104.88-1.408-.037-.113-.12-.196-.23-.238-.107-.04-.224-.025-.324.035-.152.096-.488.266-.998.266-1.13 0-1.752-1.142-1.897-1.554.65-.787 1.05-2.069 1.05-3.327 0-3.358-2.608-5.86-6.49-5.86z"/>
      </svg>
    );
  }

  // 4. Facebook (Official Blue)
  if (p.includes('facebook')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2" className={className}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }

  // 5. Instagram (Official Gradient / Pink)
  if (p.includes('instagram')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#E4405F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    );
  }

  // 6. GitHub (Official Dark/CurrentColor)
  if (p.includes('github')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    );
  }

  // 7. LinkedIn (Official Blue)
  if (p.includes('linkedin')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2" className={className}>
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.64a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z"/>
      </svg>
    );
  }

  // 8. Reddit (Official Orange)
  if (p.includes('reddit')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF4500" className={className}>
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-4.566 3.475a.34.34 0 0 0-.244.58c.703.702 1.83 1.054 3.06 1.054 1.23 0 2.357-.352 3.06-1.054a.34.34 0 0 0-.48-.48c-.571.571-1.503.856-2.58.856-1.077 0-2.009-.285-2.58-.856a.339.339 0 0 0-.236-.1z"/>
      </svg>
    );
  }

  // 9. Telegram (Official Cyan/Blue)
  if (p.includes('telegram')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#26A5E4" className={className}>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm5.262 7.171c.143.007.438.037.43.327-.008.147-.034.3-.06.442l-2.07 9.757c-.15.688-.558.857-1.134.536l-3.17-2.336-1.53 1.472c-.17.17-.313.313-.64.313l.228-3.238 5.894-5.327c.256-.228-.056-.355-.397-.128l-7.288 4.59-3.14-.98c-.683-.213-.697-.683.143-.996l12.27-4.728c.567-.206 1.065.132.864.73z"/>
      </svg>
    );
  }

  // 10. Wikipedia (Black & White Mark)
  if (p.includes('wikipedia')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.09 13.117L8.4 20H4.37L.25 8.924h3.692l2.483 8.358 2.658-6.19-1.636-4.168h3.766l2.128 5.438 2.128-5.438h3.766l-1.636 4.168 2.658 6.19 2.483-8.358h3.692L20.63 20h-4.03l-3.69-6.883z"/>
      </svg>
    );
  }

  // 11. Google (Official Multicolor)
  if (p.includes('google') || p.includes('serpapi')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
    );
  }

  // 12. Twitch (Official Purple)
  if (p.includes('twitch')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#9146FF" className={className}>
        <path d="M11.571 4.714h1.715v5.143h-1.715zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    );
  }

  // 13. TikTok (Black badge with cyan/pink outline)
  if (p.includes('tiktok')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#000000" className={className}>
        <path fill="#00F2FE" d="M12.525 2.003v10.638a3.784 3.784 0 1 1-3.784-3.784c.28 0 .55.031.81.09V6.167a6.57 6.57 0 0 0-.81-.05 6.569 6.569 0 1 0 6.569 6.569V8.472a9.324 9.324 0 0 0 5.44 1.722V7.41a6.54 6.54 0 0 1-4.756-2.072 6.543 6.543 0 0 1-1.684-3.335h-1.785z"/>
        <path fill="#FF0050" d="M13.74 2h1.785a6.543 6.543 0 0 0 1.684 3.335A6.54 6.54 0 0 0 21.965 7.41v2.784a9.324 9.324 0 0 1-5.44-1.722v4.167a6.569 6.569 0 1 1-6.569-6.569c.27 0 .54.018.81.05v2.78a3.784 3.784 0 1 0 3.784 3.784V2z" opacity="0.85"/>
      </svg>
    );
  }

  // 14. Discord (Blurple)
  if (p.includes('discord')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2" className={className}>
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    );
  }

  // 15. RSS Feeds (Orange Broadcast)
  if (p.includes('rss') || p.includes('feed')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFA500" className={className}>
        <circle cx="6.18" cy="17.82" r="2.18"/>
        <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/>
      </svg>
    );
  }

  // 17. Spotify
  if (p.includes('spotify')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954" className={className}>
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.341c-.218.359-.687.472-1.045.253-2.868-1.754-6.478-2.15-10.73-1.178-.407.093-.812-.162-.905-.568-.093-.406.162-.811.568-.905 4.659-1.065 8.647-.611 11.859 1.352.359.219.472.688.253 1.046zm1.472-3.275c-.274.446-.855.588-1.301.314-3.284-2.018-8.291-2.604-12.176-1.425-.502.152-1.031-.137-1.183-.639-.152-.502.137-1.031.639-1.183 4.437-1.347 9.948-.7 13.707 1.612.446.274.588.855.314 1.301zm.126-3.411c-3.939-2.339-10.435-2.556-14.216-1.408-.616.187-1.266-.167-1.453-.783-.187-.617.167-1.267.783-1.454 4.341-1.317 11.517-1.061 16.05 1.629.555.329.739 1.053.41 1.608-.329.555-1.053.739-1.608.411z"/>
      </svg>
    );
  }

  // 18. Medium
  if (p.includes('medium')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42c1.87 0 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
      </svg>
    );
  }

  // 19. Stack Overflow
  if (p.includes('stackoverflow') || p.includes('stack overflow')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#F48024" className={className}>
        <path d="M18.986 21.865v-6.404h2.134V24H1.845v-8.539h2.135v6.404h15.006zM6.111 19.731h10.668v-2.134H6.111v2.134zm.648-5.34l10.228 3.018.61-2.043-10.228-3.018-.61 2.043zm2.146-5.466l8.97 5.864 1.157-1.782-8.97-5.864-1.157 1.782zm4.184-5.32l6.98 8.167 1.614-1.383-6.98-8.167-1.614 1.383zm7.042-4.148l-1.92 1.018 4.793 9.034 1.92-1.018-4.793-9.034z"/>
      </svg>
    );
  }

  // 20. Website Favicon or Clean Fallback
  const targetDomain = getDomainForPlatform(p, domain);

  if (targetDomain) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(targetDomain)}&sz=64`;
    return (
      <img 
        src={faviconUrl} 
        alt={platform || domain} 
        width={size} 
        height={size} 
        className={`platform-favicon-img ${className}`} 
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: '3px' }}
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  // Default clean Globe Icon for unspecified web sources
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
};

