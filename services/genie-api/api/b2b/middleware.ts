import { Context, Next } from "hono";
import crypto from "crypto";
import { getServiceSupabaseClient } from "../../lib/supabase.js";

export async function requireApiKey(c: Context, next: Next) {
  const apiKey = c.req.header('x-api-key');
  if (!apiKey) {
    return c.json({ error: "Missing x-api-key header" }, 401);
  }

  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase.rpc('increment_b2b_usage', {
    p_hash: hash,
    p_year_month: yearMonth
  });

  if (error || !data) {
    console.error("[B2B API] RPC error:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }

  if (!data.valid) {
    if (data.reason === 'invalid_key') {
      return c.json({ error: "Invalid or revoked API Key" }, 401);
    } else if (data.reason === 'quota_exceeded') {
      return c.json({ error: "Monthly quota exceeded" }, 429);
    }
  }

  // Inject partner info into Context for downstream logging
  c.set('partner_id', data.partner_id);
  c.set('quota_remaining', data.remaining);

  await next();
}
