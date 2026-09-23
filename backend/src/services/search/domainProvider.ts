import dns from 'dns';
import https from 'https';
import http from 'http';
import { BaseSearchProvider } from './baseProvider';
import { OSINTQuery, NormalizedResultItem } from '../../types/search';

export class DomainProvider extends BaseSearchProvider {
  name = 'Domain OSINT Provider';

  async search(query: OSINTQuery): Promise<NormalizedResultItem[]> {
    const rawTarget = query.domain || query.website || query.queryValue || query.name || '';
    if (!rawTarget) return [];

    // Clean domain target (e.g. https://example.com/path -> example.com)
    let domain = rawTarget.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];

    if (!domain || !domain.includes('.')) {
      return [];
    }

    const results: NormalizedResultItem[] = [];

    // 1. DNS Resolution (A, AAAA, MX, TXT, NS)
    try {
      const dnsPromises = dns.promises;
      
      // A records
      try {
        const aRecords = await dnsPromises.resolve4(domain);
        if (aRecords && aRecords.length > 0) {
          results.push(this.createResultItem({
            source: 'DNS Lookup (A Record)',
            sourceType: 'Domain Intelligence',
            title: `A Records for ${domain}`,
            description: `IP Address(es): ${aRecords.join(', ')}`,
            url: `https://${domain}`,
            confidence: 95,
            confidenceLevel: 'High',
            metadata: { ipAddresses: aRecords, recordType: 'A' }
          }));
        }
      } catch (err) {
        // DNS A record resolution silent fail or no record
      }

      // MX records (Mail Servers)
      try {
        const mxRecords = await dnsPromises.resolveMx(domain);
        if (mxRecords && mxRecords.length > 0) {
          const mxList = mxRecords.map(r => `${r.exchange} (prio:${r.priority})`).join(', ');
          results.push(this.createResultItem({
            source: 'DNS Lookup (MX Record)',
            sourceType: 'Domain Intelligence',
            title: `Mail Servers (MX) for ${domain}`,
            description: `Configured Mail Exchanges: ${mxList}`,
            url: `https://${domain}`,
            confidence: 95,
            confidenceLevel: 'High',
            metadata: { mxRecords, recordType: 'MX' }
          }));
        }
      } catch (err) {
        // Silent fail if no MX record
      }

      // TXT records (SPF, Verification, DMARC)
      try {
        const txtRecords = await dnsPromises.resolveTxt(domain);
        if (txtRecords && txtRecords.length > 0) {
          const txtFlattened = txtRecords.map(r => r.join(' ')).join(' | ');
          results.push(this.createResultItem({
            source: 'DNS Lookup (TXT Record)',
            sourceType: 'Domain Intelligence',
            title: `TXT Records for ${domain}`,
            description: `Public Records / SPF / Verification: ${txtFlattened.substring(0, 300)}`,
            url: `https://${domain}`,
            confidence: 95,
            confidenceLevel: 'High',
            metadata: { txtRecords: txtFlattened, recordType: 'TXT' }
          }));
        }
      } catch (err) {
        // Silent fail
      }

      // NS records (Nameservers)
      try {
        const nsRecords = await dnsPromises.resolveNs(domain);
        if (nsRecords && nsRecords.length > 0) {
          results.push(this.createResultItem({
            source: 'DNS Lookup (NS Record)',
            sourceType: 'Domain Intelligence',
            title: `Nameservers (NS) for ${domain}`,
            description: `Delegated Nameservers: ${nsRecords.join(', ')}`,
            url: `https://${domain}`,
            confidence: 95,
            confidenceLevel: 'High',
            metadata: { nameservers: nsRecords, recordType: 'NS' }
          }));
        }
      } catch (err) {
        // Silent fail
      }

    } catch (err) {
      console.warn(`[DomainProvider] DNS resolution error for ${domain}:`, err);
    }

    // 2. HTTP/HTTPS Header & Security Audit
    try {
      const headerInfo = await this.inspectDomainHeaders(domain);
      if (headerInfo) {
        results.push(this.createResultItem({
          source: 'HTTP Server Inspection',
          sourceType: 'Domain Intelligence',
          title: `Web Server & Security Headers for ${domain}`,
          description: `Server: ${headerInfo.server || 'Undisclosed'} | Status: ${headerInfo.statusCode} | HTTPS Active: ${headerInfo.isHttps ? 'Yes' : 'No'}`,
          url: `https://${domain}`,
          confidence: 90,
          confidenceLevel: 'High',
          metadata: headerInfo
        }));
      }
    } catch (err) {
      console.warn(`[DomainProvider] HTTP inspection warning for ${domain}:`, err);
    }

    return results;
  }

  private async inspectDomainHeaders(domain: string): Promise<any | null> {
    return new Promise((resolve) => {
      const req = https.get(`https://${domain}`, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Bot/1.0' } }, (res) => {
        resolve({
          statusCode: res.statusCode,
          server: res.headers['server'] || res.headers['via'] || null,
          contentType: res.headers['content-type'] || null,
          strictTransportSecurity: !!res.headers['strict-transport-security'],
          contentSecurityPolicy: !!res.headers['content-security-policy'],
          isHttps: true
        });
      });

      req.on('error', () => {
        // Fallback to HTTP
        const httpReq = http.get(`http://${domain}`, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT-Bot/1.0' } }, (res) => {
          resolve({
            statusCode: res.statusCode,
            server: res.headers['server'] || null,
            contentType: res.headers['content-type'] || null,
            isHttps: false
          });
        });
        httpReq.on('error', () => resolve(null));
        httpReq.end();
      });

      req.end();
    });
  }
}
