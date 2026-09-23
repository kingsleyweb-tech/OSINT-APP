import { ISearchProvider, NormalizedResultItem, OSINTQuery } from '../../types/search';

export abstract class BaseSearchProvider implements ISearchProvider {
  abstract name: string;
  abstract search(query: OSINTQuery): Promise<NormalizedResultItem[]>;

  protected createResultItem(partial: Partial<NormalizedResultItem> & { source: string; title: string; url: string }): NormalizedResultItem {
    const confidence = partial.confidence ?? 70;
    let confidenceLevel: 'High' | 'Medium' | 'Low' = 'Medium';
    if (confidence >= 85) confidenceLevel = 'High';
    else if (confidence < 60) confidenceLevel = 'Low';

    return {
      id: `${this.name.toLowerCase()}-${Math.random().toString(36).substring(2, 9)}`,
      source: partial.source,
      sourceType: partial.sourceType || 'Other',
      title: partial.title,
      description: partial.description || '',
      url: partial.url,
      username: partial.username,
      possibleName: partial.possibleName,
      location: partial.location,
      discoveredAt: new Date().toISOString(),
      confidence,
      confidenceLevel,
      metadata: partial.metadata || {}
    };
  }
}
