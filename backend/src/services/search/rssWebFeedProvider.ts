import { BaseSearchProvider } from './baseProvider';
import { NormalizedResultItem, OSINTQuery } from '../../types/search';

export class RssWebFeedProvider extends BaseSearchProvider {
  name = 'RssWebFeed';

  async search(query: OSINTQuery): Promise<NormalizedResultItem[]> {
    const results: NormalizedResultItem[] = [];
    const queryTerm = query.website || query.username || query.name || query.email;

    if (!queryTerm) return results;

    // 1. Direct RSS/URL Fetching if user enters a website or feed URL
    if (queryTerm.startsWith('http://') || queryTerm.startsWith('https://') || queryTerm.includes('.com') || queryTerm.includes('.org') || queryTerm.includes('.dev') || queryTerm.includes('/feed') || queryTerm.includes('.xml')) {
      try {
        let feedUrl = queryTerm;
        if (!feedUrl.startsWith('http')) feedUrl = `https://${feedUrl}`;

        const res = await fetch(feedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Platform/1.0' }
        });

        if (res.ok) {
          const text = await res.text();
          // Extract RSS / Atom channel title & items
          const channelTitleMatch = text.match(/<title>(.*?)<\/title>/i);
          const channelTitle = channelTitleMatch ? channelTitleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : 'Web Feed Source';

          const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?(?:<description>(.*?)<\/description>)?[\s\S]*?<\/item>/gi;
          let match;
          let count = 0;
          while ((match = itemRegex.exec(text)) !== null && count < 5) {
            count++;
            const title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
            const link = match[2].trim();
            const desc = match[3] ? match[3].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() : '';

            results.push(this.createResultItem({
              source: 'RSS Feed',
              sourceType: 'Websites & News',
              title: title || 'Feed Article',
              description: desc || `Published article on ${channelTitle}`,
              url: link || feedUrl,
              confidence: 95,
              metadata: { channelTitle, feedUrl }
            }));
          }

          if (results.length === 0) {
            results.push(this.createResultItem({
              source: 'Web Source',
              sourceType: 'Websites & News',
              title: `Domain Intelligence: ${channelTitle}`,
              description: `Target domain ${feedUrl} is active and serving public content.`,
              url: feedUrl,
              confidence: 90
            }));
          }
        }
      } catch (err) {
        console.warn("[RssWebFeedProvider] Fetch error:", err);
      }
    }

    return results;
  }
}
