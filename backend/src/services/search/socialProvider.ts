import { BaseSearchProvider } from './baseProvider';
import { NormalizedResultItem, OSINTQuery } from '../../types/search';
import crypto from 'crypto';

export class SocialProvider extends BaseSearchProvider {
  name = 'SocialProfiles';

  async search(query: OSINTQuery): Promise<NormalizedResultItem[]> {
    const results: NormalizedResultItem[] = [];

    // 1. Gravatar Email Lookup
    if (query.email) {
      try {
        const emailClean = query.email.trim().toLowerCase();
        const hash = crypto.createHash('md5').update(emailClean).digest('hex');
        const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404`;
        const res = await fetch(gravatarUrl, { method: 'HEAD' });
        if (res.ok) {
          results.push(this.createResultItem({
            source: 'Gravatar',
            sourceType: 'Email Intelligence',
            title: `Gravatar Profile Associated with Email`,
            description: `Public avatar registered for ${query.email}`,
            url: `https://en.gravatar.com/${hash}`,
            confidence: 94,
            metadata: { avatarUrl: `https://www.gravatar.com/avatar/${hash}` }
          }));
        }
      } catch (e) {
        // Gravatar check failed
      }
    }

    // 2. Dev.to Public User API Check
    if (query.username) {
      try {
        const res = await fetch(`https://dev.to/api/users/by_username?url=${encodeURIComponent(query.username)}`);
        if (res.ok) {
          const devUser = await res.json();
          if (devUser && devUser.username) {
            results.push(this.createResultItem({
              source: 'Dev.to',
              sourceType: 'Developer & Code',
              title: `Dev.to Developer Profile (${devUser.username})`,
              description: devUser.summary || `Public developer profile for ${devUser.name || devUser.username}. Joined: ${devUser.joined_at || 'N/A'}`,
              url: `https://dev.to/${devUser.username}`,
              username: devUser.username,
              possibleName: devUser.name,
              location: devUser.location || undefined,
              confidence: 90,
              metadata: {
                summary: devUser.summary,
                profileImage: devUser.profile_image
              }
            }));
          }
        }
      } catch (e) {
        // Dev.to check failed
      }
    }

    // 3. Reddit Public User Verification Lookup
    if (query.username) {
      try {
        const rRes = await fetch(`https://www.reddit.com/user/${encodeURIComponent(query.username)}/about.json`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Platform-Bot/1.0' }
        });
        if (rRes.ok) {
          const rData = await rRes.json();
          if (rData && rData.data && rData.data.name) {
            const uData = rData.data;
            results.push(this.createResultItem({
              source: 'Reddit',
              sourceType: 'Communities',
              title: `Reddit Public Account u/${uData.name}`,
              description: uData.subreddit?.public_description || `Verified Reddit user account. Total Karma: ${uData.total_karma || 0}.`,
              url: `https://www.reddit.com/user/${uData.name}`,
              username: uData.name,
              possibleName: uData.subreddit?.title || uData.name,
              confidence: 88,
              metadata: {
                totalKarma: uData.total_karma,
                isGold: uData.is_gold,
                iconImg: uData.icon_img
              }
            }));
          }
        }
      } catch (e) {
        // Reddit check failed
      }
    }

    return results;
  }
}
