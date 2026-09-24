import { BaseSearchProvider } from './baseProvider';
import { NormalizedResultItem, OSINTQuery } from '../../types/search';
import { TieredQueryEngine, GeneratedQueryBatch } from './tieredQueryEngine';
import { RelevanceEngine } from '../intelligence/relevanceEngine';
import { UrlValidator } from '../intelligence/urlValidator';
import { PlatformEntry } from './platformRegistry';

export class SerpApiProvider extends BaseSearchProvider {
  name = 'SerpApi Multi-Engine Intelligence Provider';

  private getApiKey(): string | null {
    return process.env.SERPAPI_KEY || process.env.SERP_API_KEY || null;
  }

  /**
   * Fetch a Google Search page via SerpApi
   */
  public async fetchSerpPage(queryStr: string, start: number = 0): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const serpUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(queryStr)}&start=${start}&num=10&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(serpUrl, {
        headers: { 'User-Agent': 'OSINT-Platform-Bot/1.0' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`[SerpApiProvider] Google Search fetch error for "${queryStr}" (start=${start}):`, e);
    }
    return null;
  }

  /**
   * Fetch a Bing Search page via SerpApi
   */
  public async fetchBingPage(queryStr: string, first: number = 1): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const serpUrl = `https://serpapi.com/search.json?engine=bing&q=${encodeURIComponent(queryStr)}&first=${first}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(serpUrl, {
        headers: { 'User-Agent': 'OSINT-Platform-Bot/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        // Normalize Bing organic results format so it matches processOrganicItems
        return data;
      }
    } catch (e) {
      console.warn(`[SerpApiProvider] Bing Search fetch error for "${queryStr}":`, e);
    }
    return null;
  }

  /**
   * Fetch YouTube Search results via SerpApi YouTube API
   */
  public async fetchYouTubeSearch(queryStr: string): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const serpUrl = `https://serpapi.com/search.json?engine=youtube&search_query=${encodeURIComponent(queryStr)}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(serpUrl, {
        headers: { 'User-Agent': 'OSINT-Platform-Bot/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        const organicItems: any[] = [];

        // Convert channel results into organic-like items
        if (data.channel_results) {
          data.channel_results.forEach((c: any) => {
            organicItems.push({
              title: c.title || c.channel_name,
              link: c.link || c.url,
              snippet: c.description || `YouTube Channel for ${c.title || c.channel_name}`,
              thumbnail: c.thumbnail
            });
          });
        }

        // Convert video results into organic-like items
        if (data.video_results) {
          data.video_results.forEach((v: any) => {
            organicItems.push({
              title: v.title,
              link: v.link,
              snippet: v.description || `YouTube Video: ${v.title}`,
              publication_date: v.published_date
            });
          });
        }

        return { organic_results: organicItems };
      }
    } catch (e) {
      console.warn(`[SerpApiProvider] YouTube Search fetch error for "${queryStr}":`, e);
    }
    return null;
  }

  /**
   * Fetch Facebook Profile details via SerpApi Facebook Profile API
   */
  public async fetchFacebookProfile(profileId: string): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const serpUrl = `https://serpapi.com/search.json?engine=facebook_profile&profile_id=${encodeURIComponent(profileId)}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(serpUrl, {
        headers: { 'User-Agent': 'OSINT-Platform-Bot/1.0' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`[SerpApiProvider] Facebook Profile fetch error for "${profileId}":`, e);
    }
    return null;
  }

  /**
   * Fetch Instagram Profile details via SerpApi Instagram Profile API
   */
  public async fetchInstagramProfile(profileId: string): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const serpUrl = `https://serpapi.com/search.json?engine=instagram_profile&profile_id=${encodeURIComponent(profileId)}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(serpUrl, {
        headers: { 'User-Agent': 'OSINT-Platform-Bot/1.0' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`[SerpApiProvider] Instagram Profile fetch error for "${profileId}":`, e);
    }
    return null;
  }

  async search(query: OSINTQuery): Promise<NormalizedResultItem[]> {
    const results: NormalizedResultItem[] = [];
    const targetName = (query.name || query.queryValue || query.username || query.email || query.domain || '').trim();

    if (!targetName) return results;

    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.log('[SerpApiProvider] SERPAPI_KEY environment variable not set. Skipping SerpApi direct call.');
      return results;
    }

    try {
      const queryBatches: GeneratedQueryBatch[] = TieredQueryEngine.generateQueries(query, 8);
      console.log(`[SerpApiProvider] Executing ${queryBatches.length} exact-match queries across Google & Bing for "${targetName}"`);

      // Run Google & Bing in parallel for high coverage
      const fetchPromises = queryBatches.map(async (batch) => {
        const [gData, bData] = await Promise.all([
          this.fetchSerpPage(batch.query, 0),
          this.fetchBingPage(batch.query, 1)
        ]);
        
        const combinedOrganic = [
          ...(gData?.organic_results || []),
          ...(bData?.organic_results || [])
        ];

        return { organic: combinedOrganic, platform: batch.platform };
      });

      const responses = await Promise.all(fetchPromises);
      const seenCanonicalUrls = new Set<string>();

      responses.forEach((resItem) => {
        if (!resItem) return;
        const { organic, platform } = resItem;

        organic.forEach((item: any) => {
          const rawLink = item.link || item.url;
          if (!rawLink) return;

          const canonicalUrl = UrlValidator.normalizeUrl(rawLink);
          if (!canonicalUrl || seenCanonicalUrls.has(canonicalUrl)) return;

          const assessment = RelevanceEngine.evaluateItem(query, item);
          if (!assessment.accepted) return;

          seenCanonicalUrls.add(canonicalUrl);

          const title = item.title || `Public Result for ${targetName}`;
          const snippet = item.snippet || item.snippet_highlighted_words?.join(' ') || `Public search finding for ${targetName}.`;

          let sourceType: any = 'Websites & News';
          if (assessment.itemType === 'profile') {
            if (platform.category === 'developer' || assessment.domain.includes('github.com')) {
              sourceType = 'Developer & Code';
            } else if (platform.category === 'professional' || assessment.domain.includes('linkedin.com')) {
              sourceType = 'Organizations';
            } else {
              sourceType = 'Social Media';
            }
          } else if (assessment.itemType === 'video' || assessment.itemType === 'reel') {
            sourceType = 'Video & Streaming';
          } else if (assessment.itemType === 'article' || assessment.itemType === 'news') {
            sourceType = 'Websites & News';
          } else if (assessment.itemType === 'document') {
            sourceType = 'Knowledge & Wikipedia';
          } else if (assessment.itemType === 'organization') {
            sourceType = 'Organizations';
          }

          results.push(this.createResultItem({
            source: platform.name !== 'General Web Search' ? platform.name : `SerpApi (${assessment.domain})`,
            sourceType,
            title,
            description: snippet,
            url: canonicalUrl,
            possibleName: targetName,
            location: query.location,
            confidence: assessment.score,
            metadata: {
              platform: platform.name,
              category: platform.category,
              domain: assessment.domain,
              displayedLink: item.displayed_link,
              position: item.position,
              date: item.date || item.publication_date,
              itemType: assessment.itemType,
              isVerifiedProfileUrl: assessment.isVerifiedProfileUrl,
              confidenceLabel: assessment.confidenceLabel,
              nameMatched: assessment.nameMatched
            }
          }));
        });
      });
    } catch (err) {
      console.warn('[SerpApiProvider] Error during SerpApi search call:', err);
    }

    return results;
  }
}
