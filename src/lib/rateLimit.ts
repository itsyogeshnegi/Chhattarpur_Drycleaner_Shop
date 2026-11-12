import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __alharamRateLimitStore?: Map<string, RateLimitEntry>;
};

const store: Map<string, RateLimitEntry> =
  globalForRateLimit.__alharamRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalForRateLimit.__alharamRateLimitStore) {
  globalForRateLimit.__alharamRateLimitStore = store;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown-client';
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();

  if (store.size > 500) {
    for (const [entryKey, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(entryKey);
      }
    }
  }

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds,
  };
}

export function rateLimitResponse(message: string, retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

