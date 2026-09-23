import crypto from 'crypto';
import { SearchType as TargetType } from '../../types/search';

export interface NormalizedQuery {
  raw: string;
  targetType: TargetType;
  primaryValue: string;
  permutations: string[];
  hashes?: {
    md5?: string;
    sha256?: string;
  };
  domain?: string;
}

export class QueryNormalizer {
  static normalize(rawInput: string, specifiedType?: TargetType): NormalizedQuery {
    const raw = rawInput.trim();
    let targetType: TargetType = specifiedType || 'name';

    if (!specifiedType) {
      if (raw.includes('@')) {
        targetType = 'email';
      } else if (/^\+?[0-9\s-]{7,}$/.test(raw)) {
        targetType = 'phone';
      } else if (!raw.includes(' ') && raw.length > 2 && !raw.includes('.')) {
        targetType = 'username';
      } else {
        targetType = 'name';
      }
    }

    const permutations: string[] = [];
    let primaryValue = raw;
    let domain: string | undefined = undefined;
    let hashes: { md5?: string; sha256?: string } | undefined = undefined;

    if (targetType === 'email') {
      const parts = raw.toLowerCase().split('@');
      primaryValue = raw.toLowerCase();
      const usernamePart = parts[0];
      domain = parts[1];

      permutations.push(primaryValue);
      permutations.push(usernamePart);

      const md5 = crypto.createHash('md5').update(primaryValue).digest('hex');
      const sha256 = crypto.createHash('sha256').update(primaryValue).digest('hex');
      hashes = { md5, sha256 };
    } else if (targetType === 'phone') {
      // E.164 normalization
      const digitsOnly = raw.replace(/\D/g, '');
      primaryValue = raw.startsWith('+') ? `+${digitsOnly}` : `+${digitsOnly}`;
      permutations.push(primaryValue);
      permutations.push(digitsOnly);
    } else if (targetType === 'username') {
      primaryValue = raw.replace(/^@/, '').toLowerCase();
      permutations.push(primaryValue);
      permutations.push(primaryValue.replace(/_/g, '.'));
      permutations.push(primaryValue.replace(/\./g, '_'));
    } else {
      // Name permutations
      primaryValue = raw;
      const clean = raw.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      const nameParts = clean.split(/\s+/).filter(Boolean);

      permutations.push(raw);
      if (nameParts.length >= 2) {
        const first = nameParts[0];
        const last = nameParts[nameParts.length - 1];
        permutations.push(`${first}${last}`);
        permutations.push(`${first}_${last}`);
        permutations.push(`${first}.${last}`);
        permutations.push(`${first[0]}${last}`);
      }
    }

    return {
      raw,
      targetType,
      primaryValue,
      permutations: Array.from(new Set(permutations)),
      hashes,
      domain
    };
  }
}
