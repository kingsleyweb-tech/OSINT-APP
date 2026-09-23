import { BaseSearchProvider } from './baseProvider';
import { NormalizedResultItem, OSINTQuery } from '../../types/search';
import { TieredQueryEngine, GeneratedQueryBatch } from './tieredQueryEngine';
import { RelevanceEngine } from '../intelligence/relevanceEngine';
import { UrlValidator } from '../intelligence/urlValidator';
import { PlatformEntry } from './platformRegistry';

export class SerpApiProvider extends BaseSearchProvider {
  name = 'SerpApi Google Search Engine';

  /**
   * Directly fetch a single SerpApi Google Search page with pagination (start index)
   */
  public async fetchSerpPage(queryStr: string, start: number = 0): Promise<any> {
    const apiKey = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
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
      console.warn(`[SerpApiProvider] Fetch page error for "${queryStr}" (start=${start}):`, e);
    }
    return null;
  }

  async search(query: OSINTQuery): Promise<NormalizedResultItem[]> {
    const results: NormalizedResultItem[] = [];
    const targetName = (query.name || query.queryValue || query.username || query.email || query.domain || '').trim();

    if (!targetName) return results;

    const apiKey = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
    if (!apiKey) {
      console.log('[SerpApiProvider] SERPAPI_KEY environment variable not set. Skipping SerpApi direct call.');
      return results;
    }

    try {
      const queryBatches: GeneratedQueryBatch[] = TieredQueryEngine.generateQueries(query, 8);
      console.log(`[SerpApiProvider] Executing ${queryBatches.length} exact-match queries for "${targetName}"`);

      const fetchPromises = queryBatches.map(async (batch) => {
        const data = await this.fetchSerpPage(batch.query, 0);
        return data ? { data, platform: batch.platform } : null;
      });

      const responses = await Promise.all(fetchPromises);
      const seenCanonicalUrls = new Set<string>();

      responses.forEach((resItem) => {
        if (!resItem || !resItem.data) return;
        const { data, platform } = resItem;

        // Process Organic Search Results
        const organic = data.organic_results || [];

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
