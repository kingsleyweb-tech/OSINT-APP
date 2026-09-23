import { BaseSearchProvider } from './baseProvider';
import { NormalizedResultItem, OSINTQuery } from '../../types/search';

export class WikipediaProvider extends BaseSearchProvider {
  name = 'Wikipedia & Wikidata Provider';

  async search(query: OSINTQuery): Promise<NormalizedResultItem[]> {
    const results: NormalizedResultItem[] = [];
    const searchTerm = (query.name || query.queryValue || query.username || '').trim();

    if (!searchTerm) return results;

    const headers = { 'User-Agent': 'OSINT-Platform-Bot/1.0 (https://github.com/osint-app)' };

    // 1. Wikipedia Search API
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
      const res = await fetch(wikiUrl, { headers });

      if (res.ok) {
        const data = await res.json();
        const searchItems = data?.query?.search || [];

        searchItems.slice(0, 3).forEach((item: any) => {
          const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '').trim();
          const pageTitle = item.title;
          const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}`;

          // Higher confidence if page title matches query exact name
          const isExactTitle = pageTitle.toLowerCase() === searchTerm.toLowerCase();

          results.push(this.createResultItem({
            source: 'Wikipedia',
            sourceType: 'Knowledge & Wikipedia',
            title: `Wikipedia Entry: ${pageTitle}`,
            description: cleanSnippet || `Public Wikipedia biographical / entity article for ${pageTitle}.`,
            url: articleUrl,
            possibleName: pageTitle,
            confidence: isExactTitle ? 95 : 75,
            confidenceLevel: isExactTitle ? 'High' : 'Medium',
            metadata: {
              pageid: item.pageid,
              wordcount: item.wordcount,
              snippet: cleanSnippet
            }
          }));
        });
      }
    } catch (err) {
      console.warn('[WikipediaProvider] Wikipedia API error:', err);
    }

    // 2. Wikidata Search API
    try {
      const wikidataUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searchTerm)}&language=en&format=json&origin=*`;
      const wdRes = await fetch(wikidataUrl, { headers });

      if (wdRes.ok) {
        const wdData = await wdRes.json();
        const wdEntities = wdData?.search || [];

        wdEntities.slice(0, 2).forEach((entity: any) => {
          const entityLabel = entity.label || entity.id;
          const description = entity.description || 'Public Wikidata item entity record.';
          const conceptUri = entity.concepturi || `https://www.wikidata.org/wiki/${entity.id}`;

          const isExact = entityLabel.toLowerCase() === searchTerm.toLowerCase();

          results.push(this.createResultItem({
            source: 'Wikidata',
            sourceType: 'Knowledge & Wikipedia',
            title: `Wikidata Entity: ${entityLabel} (${entity.id})`,
            description: description,
            url: conceptUri,
            possibleName: entityLabel,
            confidence: isExact ? 92 : 72,
            confidenceLevel: isExact ? 'High' : 'Medium',
            metadata: {
              wikidataId: entity.id,
              conceptUri: entity.concepturi
            }
          }));
        });
      }
    } catch (err) {
      console.warn('[WikipediaProvider] Wikidata API error:', err);
    }

    return results;
  }
}
