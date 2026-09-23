import { BaseSearchProvider } from './baseProvider';
import { NormalizedResultItem, OSINTQuery } from '../../types/search';

export class GithubProvider extends BaseSearchProvider {
  name = 'GitHub';

  async search(query: OSINTQuery): Promise<NormalizedResultItem[]> {
    const results: NormalizedResultItem[] = [];
    const headers: Record<string, string> = {
      'User-Agent': 'OSINT-Platform-Bot/1.0',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {

      if (query.username) {
        const uRes = await fetch(`https://api.github.com/users/${encodeURIComponent(query.username)}`, { headers });
        if (uRes.ok) {
          const u = await uRes.json();
          results.push(this.createResultItem({
            source: 'GitHub',
            sourceType: 'Social Media',
            title: `GitHub Profile (${u.login})`,
            description: u.bio || `Public GitHub developer profile. Repos: ${u.public_repos}, Followers: ${u.followers}.`,
            url: u.html_url,
            username: u.login,
            possibleName: u.name || u.login,
            location: u.location || undefined,
            confidence: 96,
            metadata: {
              avatarUrl: u.avatar_url,
              bio: u.bio,
              publicRepos: u.public_repos,
              followers: u.followers,
              company: u.company,
              blog: u.blog,
              email: u.email,
              createdAt: u.created_at
            }
          }));

          // Fetch public repos
          const rRes = await fetch(`https://api.github.com/users/${encodeURIComponent(query.username)}/repos?sort=updated&per_page=5`, { headers });
          if (rRes.ok) {
            const repos = await rRes.json();
            if (Array.isArray(repos)) {
              repos.forEach((r: any) => {
                results.push(this.createResultItem({
                  source: 'GitHub',
                  sourceType: 'Developer & Code',
                  title: `Repository: ${r.name}`,
                  description: r.description || `Public repository maintained by ${r.owner.login}. Primary language: ${r.language || 'N/A'}.`,
                  url: r.html_url,
                  username: r.owner.login,
                  confidence: 92,
                  metadata: {
                    language: r.language,
                    stars: r.stargazers_count,
                    forks: r.forks_count,
                    updatedAt: r.updated_at
                  }
                }));
              });
            }
          }
        }
      }

      // 2. Real name search across GitHub Users API
      if (query.name) {
        const searchRes = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(query.name)}+in:name`, { headers });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.items && Array.isArray(searchData.items)) {
            // Fetch detailed profile for top 4 matches
            const topMatches = searchData.items.slice(0, 4);
            for (const item of topMatches) {
              if (query.username && item.login.toLowerCase() === query.username.toLowerCase()) {
                continue; // already fetched above
              }
              const detailRes = await fetch(`https://api.github.com/users/${encodeURIComponent(item.login)}`, { headers });
              if (detailRes.ok) {
                const u = await detailRes.json();
                results.push(this.createResultItem({
                  source: 'GitHub',
                  sourceType: 'Social Media',
                  title: `GitHub Account: ${u.name || u.login} (@${u.login})`,
                  description: u.bio || `Public GitHub account matching name '${query.name}'. Location: ${u.location || 'Not specified'}. Repos: ${u.public_repos}.`,
                  url: u.html_url,
                  username: u.login,
                  possibleName: u.name || u.login,
                  location: u.location || undefined,
                  confidence: 86,
                  metadata: {
                    avatarUrl: u.avatar_url,
                    bio: u.bio,
                    publicRepos: u.public_repos,
                    followers: u.followers,
                    company: u.company,
                    blog: u.blog,
                    createdAt: u.created_at
                  }
                }));
              }
            }
          }
        }
      }

    } catch (err) {
      console.warn("[GithubProvider] Real search error:", err);
    }

    return results;
  }
}
