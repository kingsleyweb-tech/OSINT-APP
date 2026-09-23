import { BaseSearchProvider } from './baseProvider';
import { NormalizedResultItem, OSINTQuery } from '../../types/search';

export class UsernameProvider extends BaseSearchProvider {
  name = 'UsernameEngine';

  async search(query: OSINTQuery): Promise<NormalizedResultItem[]> {
    const results: NormalizedResultItem[] = [];
    const targetHandle = query.username || (query.name ? query.name.replace(/\s+/g, '').toLowerCase() : null);

    if (!targetHandle) return results;

    const u = targetHandle.trim();
    const headers = { 'User-Agent': 'OSINT-Platform-Bot/1.0' };

    // 1. Docker Hub User Lookup (Verified API Response Only)
    try {
      const dhRes = await fetch(`https://hub.docker.com/v2/users/${encodeURIComponent(u)}`, { headers });
      if (dhRes.ok) {
        const dh = await dhRes.json();
        if (dh && dh.username) {
          results.push(this.createResultItem({
            source: 'Docker Hub',
            sourceType: 'Developer & Code',
            title: `Docker Hub Profile (${dh.username})`,
            description: dh.full_name || `Public container registry account for @${dh.username}.`,
            url: `https://hub.docker.com/u/${dh.username}`,
            username: dh.username,
            possibleName: dh.full_name,
            confidence: 88,
            metadata: {
              company: dh.company,
              location: dh.location,
              gravatarUrl: dh.gravatar_url
            }
          }));
        }
      }
    } catch (e) {
      // Skip
    }

    // 3. NPM Package Registry User Lookup
    try {
      const npmRes = await fetch(`https://registry.npmjs.org/-/user/org.couchdb.user:${encodeURIComponent(u)}`, { headers });
      if (npmRes.ok) {
        const npmUser = await npmRes.json();
        if (npmUser && npmUser.name) {
          results.push(this.createResultItem({
            source: 'NPM Registry',
            sourceType: 'Developer & Code',
            title: `NPM Publisher Account (${npmUser.name})`,
            description: `JavaScript package publisher active on npm registry as ~${npmUser.name}.`,
            url: `https://www.npmjs.com/~${npmUser.name}`,
            username: npmUser.name,
            confidence: 88,
            metadata: { email: npmUser.email }
          }));
        }
      }
    } catch (e) {
      // Skip
    }

    return results;
  }
}
