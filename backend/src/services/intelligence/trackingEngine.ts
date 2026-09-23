import { NormalizedResultItem } from '../../types/search';
import { ScanHistoryItem } from '../../types/intelligence';

export class TrackingEngine {
  /**
   * Compare previous investigation items against new search scan items
   */
  public static compareScans(
    previousUrls: string[],
    newItems: NormalizedResultItem[]
  ): {
    newItemsCount: number;
    changesSummary: string[];
    scanHistoryItem: ScanHistoryItem;
  } {
    const prevSet = new Set(previousUrls || []);
    const newDiscovered = newItems.filter(item => !prevSet.has(item.url));

    const changesSummary: string[] = [];

    const newProfiles = newDiscovered.filter(i => i.sourceType === 'Social Media' || i.sourceType === 'Developer & Code');
    const newArticles = newDiscovered.filter(i => i.sourceType === 'Websites & News');
    const newKnowledge = newDiscovered.filter(i => i.sourceType === 'Knowledge & Wikipedia');

    if (newProfiles.length > 0) {
      changesSummary.push(`+ ${newProfiles.length} new public profile(s) discovered (${newProfiles.map(p => p.source).join(', ')})`);
    }
    if (newArticles.length > 0) {
      changesSummary.push(`+ ${newArticles.length} new news article(s) / web mention(s) index updated`);
    }
    if (newKnowledge.length > 0) {
      changesSummary.push(`+ ${newKnowledge.length} new knowledge record(s) verified`);
    }

    if (changesSummary.length === 0) {
      if (newDiscovered.length > 0) {
        changesSummary.push(`+ ${newDiscovered.length} new public web finding(s) indexed`);
      } else {
        changesSummary.push('No new public findings detected since previous scan');
      }
    }

    const scanHistoryItem: ScanHistoryItem = {
      scanId: `scan-${Date.now()}`,
      scannedAt: new Date().toISOString(),
      newFindingsCount: newDiscovered.length,
      totalFindingsCount: newItems.length,
      changesSummary
    };

    return {
      newItemsCount: newDiscovered.length,
      changesSummary,
      scanHistoryItem
    };
  }
}
