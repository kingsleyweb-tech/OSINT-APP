import { Request, Response, NextFunction } from 'express';

/**
 * In-memory sliding-window limits (no extra dependency). State is per server process, which is enough
 * for a single Render instance; the entries are swept every minute so the maps never grow without bound.
 *
 * Three layers (see requireAuth.ts):
 *   1. Flood ceiling per IP address on every /api request (cheap guard before any token work).
 *   2. Failed or missing sign-in tokens per IP: stops token guessing. Requests with a VALID token are never
 *      blocked by this, so one bad client behind a shared proxy IP cannot lock everybody out.
 *   3. Requests per signed-in user (uid), on top of the existing per-user search limits.
 *
 * Environment (all optional; numbers):
 *   API_IP_RATE_LIMIT_PER_MIN  per-IP flood ceiling         (default 600)
 *   API_RATE_LIMIT_PER_MIN     per signed-in user           (default 120)
 *   AUTH_FAIL_LIMIT            bad tokens per IP / 10 min   (default 20)
 */

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

class SlidingLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly max: () => number, private readonly windowMs: number) {
    setInterval(() => this.sweep(), 60_000).unref();
  }

  private recent(key: string, now: number): number[] {
    const list = (this.hits.get(key) || []).filter(t => now - t < this.windowMs);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  private sweep(): void {
    const now = Date.now();
    for (const key of [...this.hits.keys()]) this.recent(key, now);
  }

  /** Records one hit. Returns whether it exceeded the limit and how many seconds until a slot frees up. */
  hit(key: string, now = Date.now()): { limited: boolean; retryAfter: number } {
    const list = this.recent(key, now);
    list.push(now);
    this.hits.set(key, list);
    const limited = list.length > this.max();
    const oldest = list[Math.max(0, list.length - this.max())] ?? now;
    return { limited, retryAfter: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)) };
  }
}

const ipFlood = new SlidingLimiter(() => num(process.env.API_IP_RATE_LIMIT_PER_MIN, 600), 60_000);
const perUser = new SlidingLimiter(() => num(process.env.API_RATE_LIMIT_PER_MIN, 120), 60_000);
const badTokens = new SlidingLimiter(() => num(process.env.AUTH_FAIL_LIMIT, 20), 10 * 60_000);

export function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function tooMany(res: Response, retryAfter: number, error = 'Too many requests. Please wait a moment and try again.'): void {
  res.setHeader('Retry-After', String(retryAfter));
  res.status(429).json({ error, code: 'rate-limited', retryAfter });
}

/** Layer 1: per-IP flood ceiling for every /api request except health checks and CORS preflights. */
export function floodLimit(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS' || req.path === '/health') return next();
  const { limited, retryAfter } = ipFlood.hit(clientIp(req));
  if (limited) return tooMany(res, retryAfter);
  next();
}

/** A fixed per-IP limit for one route (used for the scheduler endpoint). */
export function ipLimit(max: number, windowMs = 60_000) {
  const limiter = new SlidingLimiter(() => max, windowMs);
  return (req: Request, res: Response, next: NextFunction): void => {
    const { limited, retryAfter } = limiter.hit(clientIp(req));
    if (limited) return tooMany(res, retryAfter);
    next();
  };
}

/** Layer 2: counts a missing/invalid token. Returns the Retry-After seconds once the IP is over its limit, else 0. */
export function recordBadToken(req: Request): number {
  const { limited, retryAfter } = badTokens.hit(clientIp(req));
  return limited ? retryAfter : 0;
}

/** Layer 3: per signed-in user. Returns the Retry-After seconds when over the limit, else 0. */
export function recordUserRequest(uid: string): number {
  const { limited, retryAfter } = perUser.hit(uid);
  return limited ? retryAfter : 0;
}
