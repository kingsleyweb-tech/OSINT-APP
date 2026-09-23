import dns from 'dns';
import https from 'https';
import http from 'http';
import { SerpApiProvider } from './serpApiProvider';
import { UrlValidator } from '../intelligence/urlValidator';

export interface DomainSuggestion {
  domain: string;
  tld: string;
  status: 'Active (Resolves)' | 'Registered' | 'Available';
  ipAddress?: string;
}

export interface DiscoveredPage {
  title: string;
  url: string;
  pageType: 'Home' | 'About' | 'Contact' | 'Products / Services' | 'Blog' | 'Docs' | 'Pricing' | 'Other';
  snippet?: string;
}

export interface DomainTechnology {
  category: 'Framework' | 'CMS' | 'Hosting / CDN' | 'Web Server' | 'Analytics' | 'Library';
  name: string;
  confidence: number;
}

export interface DomainInvestigationResult {
  id: string;
  domain: string;
  rawInput: string;
  isPartialQuery: boolean;
  suggestions: DomainSuggestion[];
  status: 'Online' | 'Offline / Unreachable' | 'Unregistered / Available';
  ipAddresses: string[];
  nameservers: string[];
  mxRecords: string[];
  txtRecords: string[];
  httpInfo: {
    statusCode?: number;
    server?: string;
    isHttps: boolean;
    contentType?: string;
    strictTransportSecurity?: boolean;
  };
  websiteInfo: {
    title: string;
    description: string;
    faviconUrl?: string;
    detectedCategory: string;
    detectedBrand: string;
    aboutSummary: string;
    contactInfo?: string;
  };
  technologies: DomainTechnology[];
  pages: DiscoveredPage[];
  newsAndMentions: Array<{
    title: string;
    snippet: string;
    url: string;
    source: string;
    publishedDate?: string;
  }>;
  sources: Array<{
    title: string;
    url: string;
    sourceType: string;
  }>;
  summary: string;
}

export class DomainInvestigationService {
  private static COMMON_TLDS = ['shop', 'com', 'org', 'net', 'store', 'io', 'dev', 'co', 'gh'];

  /**
   * Main entry point for investigating a domain or partial domain query
   */
  public static async investigateDomain(rawQuery: string): Promise<DomainInvestigationResult> {
    const cleanInput = rawQuery.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const isPartial = !cleanInput.includes('.');
    
    let targetDomain = cleanInput;
    let suggestions: DomainSuggestion[] = [];

    if (isPartial) {
      // 1. Partial Domain Search: probe TLD candidates
      suggestions = await this.discoverDomainSuggestions(cleanInput);
      const activeMatch = suggestions.find(s => s.status === 'Active (Resolves)');
      targetDomain = activeMatch ? activeMatch.domain : `${cleanInput}.shop`;
    }

    // 2. DNS Intelligence Gathering
    const dnsData = await this.resolveDnsRecords(targetDomain);

    // 3. HTTP Header & HTML Metadata Inspection
    const httpData = await this.inspectHttpAndMetadata(targetDomain);

    // 4. Technology Detection
    const technologies = this.detectTechnologies(httpData);

    // 5. Indexed Pages & News Mentions via SerpApi
    const { pages, newsAndMentions } = await this.fetchIndexedPagesAndNews(targetDomain, cleanInput);

    // 6. Generate Clean Summary
    const statusStr = dnsData.ipAddresses.length > 0 || httpData.statusCode ? 'Online' : 'Offline / Unreachable';
    const summary = this.generateDomainSummary(targetDomain, httpData, dnsData, technologies, pages);

    // 7. Sources
    const sources = [
      { title: `DNS Resolution for ${targetDomain}`, url: `https://${targetDomain}`, sourceType: 'DNS Lookup' },
      { title: `HTTP Inspection for ${targetDomain}`, url: `https://${targetDomain}`, sourceType: 'Web Server Header' },
      ...newsAndMentions.map(n => ({ title: n.title, url: n.url, sourceType: 'Public News & Mentions' }))
    ];

    return {
      id: `domain-inv-${Date.now()}`,
      domain: targetDomain,
      rawInput: rawQuery,
      isPartialQuery: isPartial,
      suggestions,
      status: statusStr,
      ipAddresses: dnsData.ipAddresses,
      nameservers: dnsData.nameservers,
      mxRecords: dnsData.mxRecords,
      txtRecords: dnsData.txtRecords,
      httpInfo: {
        statusCode: httpData.statusCode,
        server: httpData.server,
        isHttps: httpData.isHttps,
        contentType: httpData.contentType,
        strictTransportSecurity: httpData.strictTransportSecurity
      },
      websiteInfo: {
        title: httpData.title || `Website for ${targetDomain}`,
        description: httpData.description || `Public web application accessible at ${targetDomain}.`,
        faviconUrl: `https://${targetDomain}/favicon.ico`,
        detectedCategory: httpData.detectedCategory || 'Web Application / E-Commerce Platform',
        detectedBrand: httpData.detectedBrand || targetDomain.split('.')[0].toUpperCase(),
        aboutSummary: httpData.aboutSummary || `Public online platform operating on ${targetDomain}.`,
        contactInfo: httpData.contactInfo
      },
      technologies,
      pages,
      newsAndMentions,
      sources,
      summary
    };
  }

  /**
   * Probe common TLDs for partial domain queries (e.g. campuscart -> campuscart.shop, campuscart.com, etc.)
   */
  private static async discoverDomainSuggestions(baseName: string): Promise<DomainSuggestion[]> {
    const promises = this.COMMON_TLDS.map(async (tld) => {
      const fullDomain = `${baseName}.${tld}`;
      try {
        const ips = await dns.promises.resolve4(fullDomain);
        if (ips && ips.length > 0) {
          return {
            domain: fullDomain,
            tld,
            status: 'Active (Resolves)' as const,
            ipAddress: ips[0]
          };
        }
      } catch (e) {
        // Unresolved or no A record
      }

      // Check MX as fallback
      try {
        const mx = await dns.promises.resolveMx(fullDomain);
        if (mx && mx.length > 0) {
          return {
            domain: fullDomain,
            tld,
            status: 'Registered' as const
          };
        }
      } catch (e) {}

      return {
        domain: fullDomain,
        tld,
        status: 'Available' as const
      };
    });

    const results = await Promise.all(promises);
    return results.filter(r => r.status !== 'Available' || r.tld === 'shop' || r.tld === 'com');
  }

  /**
   * Resolve A, MX, NS, TXT DNS records
   */
  private static async resolveDnsRecords(domain: string) {
    const ipAddresses: string[] = [];
    const nameservers: string[] = [];
    const mxRecords: string[] = [];
    const txtRecords: string[] = [];

    const dnsPromises = dns.promises;

    try {
      const a = await dnsPromises.resolve4(domain);
      if (a) ipAddresses.push(...a);
    } catch (e) {}

    try {
      const ns = await dnsPromises.resolveNs(domain);
      if (ns) nameservers.push(...ns);
    } catch (e) {}

    try {
      const mx = await dnsPromises.resolveMx(domain);
      if (mx) mxRecords.push(...mx.map(r => `${r.exchange} (Prio: ${r.priority})`));
    } catch (e) {}

    try {
      const txt = await dnsPromises.resolveTxt(domain);
      if (txt) txtRecords.push(...txt.map(r => r.join(' ')));
    } catch (e) {}

    return { ipAddresses, nameservers, mxRecords, txtRecords };
  }

  /**
   * Fetch HTTP headers and metadata from target domain
   */
  private static async inspectHttpAndMetadata(domain: string): Promise<any> {
    return new Promise((resolve) => {
      const options = {
        timeout: 4000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Bot/1.0' }
      };

      const req = https.get(`https://${domain}`, options, (res) => {
        let html = '';
        res.on('data', chunk => { if (html.length < 50000) html += chunk.toString(); });
        res.on('end', () => {
          const parsed = DomainInvestigationService.parseHtmlMetadata(html, domain);
          resolve({
            statusCode: res.statusCode,
            server: res.headers['server'] || res.headers['via'] || null,
            contentType: res.headers['content-type'] || null,
            strictTransportSecurity: !!res.headers['strict-transport-security'],
            isHttps: true,
            htmlHead: html.substring(0, 5000),
            ...parsed
          });
        });
      });

      req.on('error', () => {
        const httpReq = http.get(`http://${domain}`, options, (res) => {
          let html = '';
          res.on('data', chunk => { if (html.length < 50000) html += chunk.toString(); });
          res.on('end', () => {
            const parsed = DomainInvestigationService.parseHtmlMetadata(html, domain);
            resolve({
              statusCode: res.statusCode,
              server: res.headers['server'] || null,
              contentType: res.headers['content-type'] || null,
              isHttps: false,
              htmlHead: html.substring(0, 5000),
              ...parsed
            });
          });
        });
        httpReq.on('error', () => resolve({ isHttps: false }));
        httpReq.end();
      });

      req.end();
    });
  }

  /**
   * Parse HTML metadata for title, description, category, and brand hints
   */
  private static parseHtmlMetadata(html: string, domain: string) {
    let title = '';
    let description = '';

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (metaDescMatch) description = metaDescMatch[1].trim();

    if (!description) {
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (ogDescMatch) description = ogDescMatch[1].trim();
    }

    const brandName = title ? title.split(/[-|–:]/)[0].trim() : domain.split('.')[0].toUpperCase();
    const textLower = `${title} ${description} ${html.substring(0, 2000)}`.toLowerCase();

    let detectedCategory = 'Public Web Platform';
    if (textLower.includes('cart') || textLower.includes('shop') || textLower.includes('store') || textLower.includes('vendor') || textLower.includes('product')) {
      detectedCategory = 'E-Commerce Marketplace';
    } else if (textLower.includes('blog') || textLower.includes('article') || textLower.includes('news')) {
      detectedCategory = 'Content & Media Portal';
    } else if (textLower.includes('software') || textLower.includes('saas') || textLower.includes('api') || textLower.includes('app')) {
      detectedCategory = 'SaaS / Technology Service';
    }

    return {
      title: title || domain,
      description: description || `Official web presence for ${brandName}.`,
      detectedBrand: brandName,
      detectedCategory,
      aboutSummary: description ? `${brandName} is a ${detectedCategory.toLowerCase()}. ${description}` : `${brandName} operates as a ${detectedCategory.toLowerCase()} hosted at ${domain}.`
    };
  }

  /**
   * Detect web technology stack from HTTP headers and HTML content
   */
  private static detectTechnologies(httpData: any): DomainTechnology[] {
    const techs: DomainTechnology[] = [];
    const html = httpData.htmlHead || '';
    const server = (httpData.server || '').toLowerCase();

    // Hosting / CDN
    if (server.includes('cloudflare')) techs.push({ category: 'Hosting / CDN', name: 'Cloudflare CDN', confidence: 95 });
    if (server.includes('vercel')) techs.push({ category: 'Hosting / CDN', name: 'Vercel Edge Network', confidence: 95 });
    if (server.includes('nginx')) techs.push({ category: 'Web Server', name: 'Nginx Web Server', confidence: 90 });
    if (server.includes('apache')) techs.push({ category: 'Web Server', name: 'Apache HTTP Server', confidence: 90 });

    // Frameworks & Libraries
    if (html.includes('_next') || html.includes('__NEXT_DATA__')) {
      techs.push({ category: 'Framework', name: 'Next.js (React)', confidence: 98 });
    } else if (html.includes('react') || html.includes('reactdom')) {
      techs.push({ category: 'Framework', name: 'React.js', confidence: 90 });
    }

    if (html.includes('vue') || html.includes('__vue__')) {
      techs.push({ category: 'Framework', name: 'Vue.js', confidence: 90 });
    }

    if (html.includes('wp-content') || html.includes('wordpress')) {
      techs.push({ category: 'CMS', name: 'WordPress', confidence: 95 });
    }

    if (html.includes('shopify')) {
      techs.push({ category: 'CMS', name: 'Shopify E-Commerce', confidence: 95 });
    }

    if (html.includes('google-analytics') || html.includes('gtag')) {
      techs.push({ category: 'Analytics', name: 'Google Analytics', confidence: 90 });
    }

    if (techs.length === 0) {
      techs.push({ category: 'Hosting / CDN', name: 'Standard Web Host', confidence: 70 });
      techs.push({ category: 'Web Server', name: httpData.server || 'HTTP/2 Gateway', confidence: 75 });
    }

    return techs;
  }

  /**
   * Discover indexed pages and brand news/mentions via SerpApi
   */
  private static async fetchIndexedPagesAndNews(domain: string, baseBrand: string) {
    const pages: DiscoveredPage[] = [
      { title: `Homepage (${domain})`, url: `https://${domain}`, pageType: 'Home', snippet: `Primary entrance and landing page for ${domain}.` }
    ];
    const newsAndMentions: Array<{ title: string; snippet: string; url: string; source: string }> = [];

    try {
      const serp = new SerpApiProvider();

      // Indexed site pages search
      const siteResults = await serp.search({ domain, website: domain, searchType: 'domain' });
      siteResults.forEach(item => {
        const urlLower = item.url.toLowerCase();
        let pageType: DiscoveredPage['pageType'] = 'Other';

        if (urlLower.includes('/about')) pageType = 'About';
        else if (urlLower.includes('/contact')) pageType = 'Contact';
        else if (urlLower.includes('/product') || urlLower.includes('/shop') || urlLower.includes('/service')) pageType = 'Products / Services';
        else if (urlLower.includes('/blog') || urlLower.includes('/news')) pageType = 'Blog';
        else if (urlLower.includes('/doc') || urlLower.includes('/api') || urlLower.includes('/help')) pageType = 'Docs';
        else if (urlLower.includes('/price') || urlLower.includes('/plan')) pageType = 'Pricing';

        if (!pages.some(p => p.url === item.url)) {
          pages.push({
            title: item.title,
            url: item.url,
            pageType,
            snippet: item.description
          });
        }
      });

      // Brand mentions search
      const mentionResults = await serp.fetchSerpPage(`"${domain}" OR "${baseBrand}" website OR store`, 0);
      if (mentionResults && mentionResults.organic_results) {
        mentionResults.organic_results.forEach((item: any) => {
          if (!item.link || item.link.includes(domain)) return;
          const canonical = UrlValidator.normalizeUrl(item.link);
          if (!newsAndMentions.some(m => m.url === canonical)) {
            newsAndMentions.push({
              title: item.title || `Public Mention of ${baseBrand}`,
              snippet: item.snippet || `Mention found on web for ${baseBrand}`,
              url: canonical,
              source: item.displayed_link || 'Public Web'
            });
          }
        });
      }
    } catch (e) {
      console.warn(`[DomainInvestigationService] SerpApi fetch warning for ${domain}:`, e);
    }

    return { pages: pages.slice(0, 10), newsAndMentions: newsAndMentions.slice(0, 8) };
  }

  /**
   * Synthesize clean human-readable domain overview summary
   */
  private static generateDomainSummary(
    domain: string, 
    httpData: any, 
    dnsData: any, 
    techs: DomainTechnology[], 
    pages: DiscoveredPage[]
  ): string {
    const brand = httpData.detectedBrand || domain;
    const cat = httpData.detectedCategory || 'web platform';
    const status = dnsData.ipAddresses.length > 0 || httpData.statusCode ? 'Online & Operational' : 'Offline / Unreachable';
    const sslStr = httpData.isHttps ? 'enforces encrypted HTTPS communication' : 'operates without HTTPS';
    const techStr = techs.map(t => t.name).join(', ');

    return `${brand} (${domain}) is an ${status.toLowerCase()} ${cat.toLowerCase()}. The website ${sslStr}. Active nameservers include ${dnsData.nameservers.slice(0, 2).join(', ') || 'standard DNS'}. Detected tech stack includes: ${techStr}. Discovered ${pages.length} public indexed pages.`;
  }
}
