import { OSINTQuery } from '../../types/search';

export class QueryGenerator {
  /**
   * Generates dynamic search query variations for broad public web investigations.
   */
  static generateWebQueries(query: OSINTQuery): string[] {
    const rawTarget = (query.name || query.username || query.queryValue || '').trim();
    if (!rawTarget) return [];

    const cleanTarget = rawTarget.replace(/"/g, '').replace(/^@/, '');
    const queries: string[] = [];

    // 1. Broad Exact Match
    queries.push(`"${cleanTarget}"`);

    // 2. Personal Website & Portfolio Discovery (e.g. kingdev-aa.vercel.app, personal domains)
    queries.push(`"${cleanTarget}" portfolio OR "personal website" OR "official website" OR developer OR founder OR "about me"`);

    // 3. Platform & Cloud Hosting Subdomains (Vercel, Netlify, GitHub Pages, Bio Links)
    queries.push(`"${cleanTarget}" (site:vercel.app OR site:netlify.app OR site:github.io OR site:about.me OR site:linktr.ee)`);

    // 4. News, Press & Media Mentions
    queries.push(`"${cleanTarget}" news OR interview OR article OR press OR announcement`);

    // 5. Official / Institutional Registries & Organizations
    queries.push(`"${cleanTarget}" (site:gov OR site:edu OR site:org)`);

    // 6. Contextual location or organization query if provided
    if (query.location) {
      queries.push(`"${cleanTarget}" "${query.location}"`);
    }

    if (query.organization) {
      queries.push(`"${cleanTarget}" "${query.organization}"`);
    }

    return queries;
  }
}
