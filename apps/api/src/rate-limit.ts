export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export interface RateLimiter {
  check(input: { key: string; route: string }): Promise<RateLimitDecision>;
}

export const allowAllRateLimiter: RateLimiter = {
  async check() {
    return { allowed: true };
  },
};
