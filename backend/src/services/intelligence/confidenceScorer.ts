import { NormalizedResultItem, OSINTQuery } from '../../types/search';

export class ConfidenceScorer {
  static calculateOverallConfidence(query: OSINTQuery, results: NormalizedResultItem[]): { score: number; level: 'High' | 'Medium' | 'Low' } {
    if (results.length === 0) return { score: 0, level: 'Low' };

    let baseScore = 50;

    // Direct username match on high authority platforms (GitHub, Dev.to, Gravatar)
    const hasHighAuthProfile = results.some(r => r.confidence >= 90 && (r.source === 'GitHub' || r.source === 'Dev.to' || r.source === 'Gravatar'));
    if (hasHighAuthProfile) baseScore += 25;

    // Cross-platform presence
    const distinctSources = new Set(results.map(r => r.source)).size;
    baseScore += Math.min(distinctSources * 5, 20);

    // Multi-identifier alignment (e.g., both username & name or location match)
    if (query.name && query.username) baseScore += 10;
    if (query.location) baseScore += 5;

    const finalScore = Math.min(Math.max(baseScore, 40), 98);
    let level: 'High' | 'Medium' | 'Low' = 'Medium';
    if (finalScore >= 85) level = 'High';
    else if (finalScore < 60) level = 'Low';

    return { score: finalScore, level };
  }
}
