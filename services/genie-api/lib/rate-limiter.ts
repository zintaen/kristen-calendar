import { getServiceSupabaseClient } from "./supabase";
import Redis from "ioredis";

// Create a singleton Redis client
const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { family: 4 }) : null;

if (redisClient) {
  redisClient.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string; // ISO string for the next month
}

export interface RateLimiter {
  check(hashedUserId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; dateStr: string }>();

  constructor(private readonly limitPerDay: number = 20) {}

  async check(hashedUserId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    // Determine current date in Asia/Ho_Chi_Minh
    const now = new Date();
    const tzOffset = 7 * 60; // UTC+7
    const localTime = new Date(now.getTime() + tzOffset * 60 * 1000);
    const dateStr = localTime.toISOString().split("T")[0]; // YYYY-MM-DD in UTC+7

    const entry = this.store.get(hashedUserId);
    if (!entry || entry.dateStr !== dateStr) {
      this.store.set(hashedUserId, { count: 1, dateStr });
      return { allowed: true, remaining: this.limitPerDay - 1, resetAt: this.getResetAt() };
    }

    if (entry.count >= this.limitPerDay) {
      return { allowed: false, remaining: 0, resetAt: this.getResetAt() };
    }

    entry.count += 1;
    return { allowed: true, remaining: this.limitPerDay - entry.count, resetAt: this.getResetAt() };
  }

  private getResetAt(): Date {
    const now = new Date();
    const tzOffset = 7 * 60; // UTC+7
    const localTime = new Date(now.getTime() + tzOffset * 60 * 1000);
    localTime.setUTCHours(24, 0, 0, 0); // Next midnight in UTC+7
    return new Date(localTime.getTime() - tzOffset * 60 * 1000); // Back to UTC
  }
}

export class VercelKVRateLimiter implements RateLimiter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly kv: any, private readonly limitPerDay: number = 20) {}

  async check(hashedUserId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    // Stub implementation for now until Vercel KV is actually configured
    // For FR-015, we'll just use InMemoryRateLimiter or this stub.
    return { allowed: true, remaining: this.limitPerDay - 1, resetAt: new Date() };
  }
}

export async function checkAndIncrementGenieUsage(
  userId: string,
  quota: number,
  dbClient?: any
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const yearMonth = now.toISOString().substring(0, 7);

  if (quota <= 0) {
    return { allowed: false, remaining: 0, resetAt };
  }

  if (redisClient) {
    const key = `genie_usage:${yearMonth}:${userId}`;
    const count = await redisClient.incr(key);
    
    // Set expiry for 32 days if this is the first increment to auto-cleanup
    if (count === 1) {
      await redisClient.expire(key, 32 * 24 * 60 * 60);
    }

    if (count > quota) {
      return { allowed: false, remaining: 0, resetAt };
    }

    // Fire and forget to Supabase to keep long term analytical data (optional, but good practice)
    // We do this async to avoid blocking the fast redis response
    Promise.resolve().then(async () => {
      const client = dbClient || getServiceSupabaseClient();
      await client.from("genie_usage_monthly").upsert({
        user_id: userId,
        year_month: yearMonth,
        call_count: count
      }, { onConflict: "user_id,year_month" });
    }).catch(console.error);

    return { allowed: true, remaining: quota - count, resetAt };
  }

  // Fallback to DB if redis is not configured (e.g. tests)
  const client = dbClient || getServiceSupabaseClient();

  if (client.increment) {
    const count = await client.getCount();
    if (count >= quota) return { allowed: false, remaining: 0, resetAt };
    await client.increment();
    return { allowed: true, remaining: quota - (count + 1), resetAt };
  }

  const { data, error } = await client.rpc("increment_genie_usage", {
    p_user_id: userId,
    p_year_month: yearMonth,
    p_quota: quota
  });

  if (error) {
    console.error("RPC increment_genie_usage error:", error);
    return { allowed: false, remaining: 0, resetAt };
  }

  const newCount = data as number;
  
  if (newCount > quota) {
    return { allowed: false, remaining: 0, resetAt };
  }
  
  return { allowed: true, remaining: quota - newCount, resetAt };
}
