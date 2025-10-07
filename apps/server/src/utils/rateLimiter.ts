interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  windowMs: number;
}

class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  private refillBucket(bucket: TokenBucket, now: number): void {
    const timePassed = (now - bucket.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * this.config.refillRate;
    
    bucket.tokens = Math.min(this.config.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  private cleanupExpiredBuckets(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > this.config.windowMs) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.buckets.delete(key);
    }
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    
    // Clean up expired buckets periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanupExpiredBuckets();
    }

    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = {
        tokens: this.config.maxTokens - 1, // Start with one less token
        lastRefill: now
      };
      this.buckets.set(key, bucket);
      return true;
    }

    this.refillBucket(bucket, now);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  getRemainingTokens(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.config.maxTokens;
    
    const now = Date.now();
    this.refillBucket(bucket, now);
    
    return Math.floor(bucket.tokens);
  }
}

// Rate limiters for different operations
export const joinRateLimiter = new RateLimiter({
  maxTokens: 5, // 5 join attempts
  refillRate: 1, // 1 token per second
  windowMs: 60000 // 1 minute window
});

export const accusationRateLimiter = new RateLimiter({
  maxTokens: 3, // 3 accusations per game
  refillRate: 0.5, // 1 token every 2 seconds
  windowMs: 300000 // 5 minute window
});
