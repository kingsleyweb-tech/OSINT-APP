import { OSINTQuery } from '../../types/search';
import { UrlValidator, ResultItemType } from './urlValidator';

export interface RawSearchItem {
  title?: string;
  link?: string;
  url?: string;
  snippet?: string;
  displayed_link?: string;
  position?: number;
  date?: string;
  source?: string;
  sourceType?: string;
  location?: string;
  company?: string;
  author?: string;
}

export interface RelevanceScoreResult {
  score: number;
  confidenceLabel: 'Exact Match' | 'Strong Match' | 'Possible Match' | 'Related' | 'Rejected';
  accepted: boolean;
  rejectReason?: string;
  nameMatched: boolean;
  matchDetails: {
    titleMatchScore: number;
    snippetMatchScore: number;
    urlMatchScore: number;
    contextMatchScore: number;
    isExactNameMatch: boolean;
    isExactUsernameMatch: boolean;
    tokenCoveragePercent: number;
  };
  itemType: ResultItemType;
  canonicalUrl: string;
  domain: string;
  platformName: string;
  isVerifiedProfileUrl: boolean;
}

export class RelevanceEngine {
  /**
   * Standardizes text for string and token comparison
   */
  public static normalizeText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics / accents
      .replace(/[^a-z0-9\s]/gi, ' ')   // replace non-alphanumeric with space
      .replace(/\s+/g, ' ')            // normalize whitespace
      .trim();
  }

  /**
   * Tokenizes string into distinct word tokens (filtering out short stop words)
   */
  public static tokenize(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'in', 'on', 'at', 'to', 'from', 'with', 'by', 'is', 'at']);
    return this.normalizeText(text)
      .split(' ')
      .filter(w => w.length > 1 && !stopWords.has(w));
  }

  /**
   * Evaluates if target person name matches text using word-boundary token matching.
   * Prevents partial-word prefix collisions (e.g. "King" matching "Kingsley").
   */
  public static matchPersonName(targetName: string, text: string): { 
    isExactPhrase: boolean; 
    allTokensMatched: boolean; 
    tokenCoveragePercent: number;
    matchedTokenCount: number;
    totalTokenCount: number;
  } {
    const normTarget = this.normalizeText(targetName);
    const normText = this.normalizeText(text);

    if (!normTarget || !normText) {
      return { isExactPhrase: false, allTokensMatched: false, tokenCoveragePercent: 0, matchedTokenCount: 0, totalTokenCount: 0 };
    }

    // 1. Exact phrase match check (using word boundaries)
    const exactRegex = new RegExp(`\\b${normTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const isExactPhrase = exactRegex.test(normText);

    // 2. Token set match check (word boundary exact tokens)
    const targetTokens = this.tokenize(targetName);
    const textTokens = new Set(this.tokenize(text));

    if (targetTokens.length === 0) {
      return { isExactPhrase: false, allTokensMatched: false, tokenCoveragePercent: 0, matchedTokenCount: 0, totalTokenCount: 0 };
    }

    let matchedCount = 0;
    targetTokens.forEach(tToken => {
      if (textTokens.has(tToken)) {
        matchedCount++;
      }
    });

    const tokenCoveragePercent = Math.round((matchedCount / targetTokens.length) * 100);
    const allTokensMatched = matchedCount === targetTokens.length;

    return {
      isExactPhrase,
      allTokensMatched,
      tokenCoveragePercent,
      matchedTokenCount: matchedCount,
      totalTokenCount: targetTokens.length
    };
  }

  /**
   * Evaluates if target username matches text or extracted handle
   */
  public static matchUsername(targetUsername: string, text: string, extractedHandle?: string): {
    isExactMatch: boolean;
    isVariationMatch: boolean;
    isPartialMatch: boolean;
  } {
    const normTarget = this.normalizeText(targetUsername).replace(/\s+/g, '');
    const normText = this.normalizeText(text);
    const normHandle = extractedHandle ? this.normalizeText(extractedHandle).replace(/\s+/g, '') : '';

    if (!normTarget) {
      return { isExactMatch: false, isVariationMatch: false, isPartialMatch: false };
    }

    // 1. Check extracted handle
    if (normHandle) {
      if (normHandle === normTarget) {
        return { isExactMatch: true, isVariationMatch: false, isPartialMatch: false };
      }
      // Check normalized variation (ignoring underscores/dots)
      if (normHandle.replace(/[^a-z0-9]/g, '') === normTarget.replace(/[^a-z0-9]/g, '')) {
        return { isExactMatch: false, isVariationMatch: true, isPartialMatch: false };
      }
    }

    // 2. Check in text
    if (normText.includes(normTarget)) {
      return { isExactMatch: true, isVariationMatch: false, isPartialMatch: false };
    }

    const cleanTarget = normTarget.replace(/[^a-z0-9]/g, '');
    const cleanText = normText.replace(/[^a-z0-9]/g, '');
    if (cleanTarget.length > 3 && cleanText.includes(cleanTarget)) {
      return { isExactMatch: false, isVariationMatch: true, isPartialMatch: false };
    }

    return { isExactMatch: false, isVariationMatch: false, isPartialMatch: false };
  }

  /**
   * Evaluates a raw search item and generates a multi-signal relevance score
   */
  public static evaluateItem(query: OSINTQuery, item: RawSearchItem): RelevanceScoreResult {
    const rawUrl = item.link || item.url || '';
    const urlValidation = UrlValidator.validateAndClassify(rawUrl);
    const canonicalUrl = urlValidation.canonicalUrl;

    const isUsernameSearch = query.searchType === 'username';
    const targetName = (query.name || query.queryValue || '').trim();
    const targetUsername = (query.username || query.queryValue || '').trim();
    const targetStr = isUsernameSearch ? targetUsername : targetName;

    const title = item.title || '';
    const snippet = item.snippet || '';
    const location = query.location || item.location || '';
    const organization = query.organization || item.company || '';

    // 1. Reject generic search engine results or auth landing pages
    if (
      urlValidation.itemType === 'search_page' ||
      canonicalUrl.includes('/search?') ||
      canonicalUrl.includes('/hashtag/') ||
      title.toLowerCase().startsWith('google search') ||
      title.toLowerCase().startsWith('sign in') ||
      title.toLowerCase().startsWith('login')
    ) {
      return this.buildResult(0, false, 'Generic search page or auth landing page rejected', false, {
        titleMatchScore: 0, snippetMatchScore: 0, urlMatchScore: 0, contextMatchScore: 0, isExactNameMatch: false, isExactUsernameMatch: false, tokenCoveragePercent: 0
      }, urlValidation);
    }

    let isExactNameMatch = false;
    let isExactUsernameMatch = false;
    let titleMatchScore = 0;
    let snippetMatchScore = 0;
    let urlMatchScore = 0;
    let contextMatchScore = 0;
    let tokenCoverage = 0;

    if (isUsernameSearch) {
      // USERNAME SEARCH SCORING
      const uTitleMatch = this.matchUsername(targetUsername, title, urlValidation.extractedHandle);
      const uSnippetMatch = this.matchUsername(targetUsername, snippet, urlValidation.extractedHandle);
      const uUrlMatch = this.matchUsername(targetUsername, canonicalUrl, urlValidation.extractedHandle);

      if (uUrlMatch.isExactMatch || uTitleMatch.isExactMatch || uSnippetMatch.isExactMatch) {
        isExactUsernameMatch = true;
        titleMatchScore = 45;
        snippetMatchScore = 25;
        urlMatchScore = urlValidation.isVerifiedProfileUrl ? 30 : 15;
        tokenCoverage = 100;
      } else if (uUrlMatch.isVariationMatch || uTitleMatch.isVariationMatch || uSnippetMatch.isVariationMatch) {
        titleMatchScore = 25;
        snippetMatchScore = 15;
        urlMatchScore = urlValidation.isVerifiedProfileUrl ? 20 : 10;
        tokenCoverage = 75;
      } else {
        // Penalty if username target not found
        titleMatchScore = 0;
        snippetMatchScore = 0;
        urlMatchScore = 0;
        tokenCoverage = 0;
      }
    } else {
      // PERSON / NAME SEARCH SCORING
      const titleMatch = this.matchPersonName(targetStr, title);
      const snippetMatch = this.matchPersonName(targetStr, snippet);
      const urlMatch = this.matchPersonName(targetStr, canonicalUrl);

      if (titleMatch.isExactPhrase) titleMatchScore = 45;
      else if (titleMatch.allTokensMatched) titleMatchScore = 38;
      else if (titleMatch.tokenCoveragePercent >= 50) titleMatchScore = 20;

      if (snippetMatch.isExactPhrase) snippetMatchScore = 30;
      else if (snippetMatch.allTokensMatched) snippetMatchScore = 24;
      else if (snippetMatch.tokenCoveragePercent >= 50) snippetMatchScore = 12;

      if (urlMatch.isExactPhrase || urlMatch.allTokensMatched) urlMatchScore = 25;
      else if (urlValidation.isVerifiedProfileUrl && urlValidation.extractedHandle) {
        const handleMatch = this.matchPersonName(targetStr, urlValidation.extractedHandle);
        if (handleMatch.matchedTokenCount > 0) urlMatchScore = 20;
      }

      isExactNameMatch = titleMatch.isExactPhrase || titleMatch.allTokensMatched || snippetMatch.isExactPhrase;
      tokenCoverage = Math.max(titleMatch.tokenCoveragePercent, snippetMatch.tokenCoveragePercent);

      // Verified profile URL bonus: if the URL is a real profile page and the title contains the
      // full name (exact phrase), grant a large bonus regardless of snippet coverage.
      // This prevents Facebook/Instagram/YouTube profiles from being incorrectly rejected.
      if (urlValidation.isVerifiedProfileUrl && titleMatch.isExactPhrase) {
        urlMatchScore = Math.max(urlMatchScore, 22);
      }
    }

    // Contextual signals (location, org)
    if (location && this.normalizeText(`${title} ${snippet}`).includes(this.normalizeText(location))) {
      contextMatchScore += 12;
    }
    if (organization && this.normalizeText(`${title} ${snippet}`).includes(this.normalizeText(organization))) {
      contextMatchScore += 12;
    }

    // Combine initial relevance score
    let score = titleMatchScore + snippetMatchScore + urlMatchScore + contextMatchScore;

    // Direct bonus for verified profile URLs matching the target
    if (urlValidation.isVerifiedProfileUrl && (isExactNameMatch || isExactUsernameMatch)) {
      score += 15;
    }

    // Penalty for partial word collisions or missing tokens.
    // Only apply when title, snippet AND url all show < 50% coverage.
    // Do NOT penalize verified profile URLs where the title has the name — the profile IS real.
    const profileUrlWithNameTitle = urlValidation.isVerifiedProfileUrl && titleMatchScore > 0;
    if (!isExactNameMatch && !isExactUsernameMatch && tokenCoverage < 50 && !profileUrlWithNameTitle) {
      score = Math.max(0, score - 50);
    }

    // Cap score range [0, 99]
    score = Math.min(99, Math.max(0, Math.round(score)));

    // Rejection Threshold (< 50)
    let accepted = score >= 50;
    let rejectReason: string | undefined = undefined;

    if (!accepted) {
      rejectReason = `Relevance score (${score}) fell below minimum acceptance threshold (50) for "${targetStr}".`;
    }

    return this.buildResult(score, accepted, rejectReason, isExactNameMatch, {
      titleMatchScore,
      snippetMatchScore,
      urlMatchScore,
      contextMatchScore,
      isExactNameMatch,
      isExactUsernameMatch,
      tokenCoveragePercent: tokenCoverage
    }, urlValidation);
  }

  private static buildResult(
    score: number, 
    accepted: boolean, 
    rejectReason: string | undefined,
    nameMatched: boolean,
    matchDetails: RelevanceScoreResult['matchDetails'],
    urlValidation: ReturnType<typeof UrlValidator.validateAndClassify>
  ): RelevanceScoreResult {
    let confidenceLabel: RelevanceScoreResult['confidenceLabel'] = 'Rejected';
    if (accepted) {
      if (score >= 88) confidenceLabel = 'Exact Match';
      else if (score >= 72) confidenceLabel = 'Strong Match';
      else if (score >= 55) confidenceLabel = 'Possible Match';
      else confidenceLabel = 'Related';
    }

    return {
      score,
      confidenceLabel,
      accepted,
      rejectReason,
      nameMatched,
      matchDetails,
      itemType: urlValidation.itemType,
      canonicalUrl: urlValidation.canonicalUrl,
      domain: urlValidation.domain,
      platformName: urlValidation.platformName,
      isVerifiedProfileUrl: urlValidation.isVerifiedProfileUrl
    };
  }
}
