type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function assertRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): void {
  const now = Date.now();
  pruneExpired(now);

  const existing = buckets.get(input.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return;
  }

  if (existing.count >= input.limit) {
    throw new Error("RATE_LIMITED");
  }

  existing.count += 1;
}

/**
 * Drops a throttle counter after the caller proves they are legitimate. Without
 * this, a candidate whose earlier verification code simply expired stays locked out
 * for the rest of the window even once they authenticate successfully.
 */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
