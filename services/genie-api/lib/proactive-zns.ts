import { convertSolar2Lunar, VN_TZ, AffiliateResolverImpl } from "@cyberskill/amlich-core";
import { getServiceSupabaseClient } from "./supabase.js";
import { sendZNS, type ZNSPayload } from "./zns-client.js";
import { ensureFreshToken } from "./oa-token.js";
import Anthropic from "@anthropic-ai/sdk";

export interface ProactiveZnsWorkerConfig {
  batchSize: number;
  maxRetries: number;
  claudeTimeoutMs: number;
}

const DEFAULT_CONFIG: ProactiveZnsWorkerConfig = {
  batchSize: 50,
  maxRetries: 3,
  claudeTimeoutMs: 5000,
};

function getTomorrowEventName(today: Date): string | null {
  const tomorrow = new Date(today.getTime() + 86400000);
  
  // Convert to VN timezone parts
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  
  const parts = formatter.formatToParts(tomorrow);
  const dd = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const mm = parseInt(parts.find(p => p.type === 'month')?.value || '1');
  const yy = parseInt(parts.find(p => p.type === 'year')?.value || '2026');

  const [lunarDay, lunarMonth] = convertSolar2Lunar(dd, mm, yy, VN_TZ);

  if (lunarDay === 1) return "Mùng 1";
  if (lunarDay === 15) return "Rằm";
  
  // Custom logic for Tet, Vu Lan, etc. could go here.
  return null;
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

async function callClaude(userName: string, eventName: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  const completion = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 100,
    system: "You are Genie, a polite AI assistant. Keep responses under 50 words.",
    messages: [
      {
        role: "user",
        content: `Create a short, personalized greeting and reminder in Vietnamese for user "${userName}" about the upcoming lunar event "${eventName}". Do not use quotes.`
      }
    ],
  });

  return completion.content[0].type === "text" ? completion.content[0].text : "";
}

function redactPhone(phone: string): string {
  if (!phone || phone.length < 5) return "****";
  return phone.substring(0, 2) + "****" + phone.substring(phone.length - 3);
}

export async function processProactiveZnsBatch(
  now: Date = new Date(),
  config: ProactiveZnsWorkerConfig = DEFAULT_CONFIG
) {
  const eventName = getTomorrowEventName(now);
  if (!eventName) {
    return { ok: true, message: "Tomorrow is not a major lunar event." };
  }

  const supabase = getServiceSupabaseClient();
  const accessToken = await ensureFreshToken();
  const targetDateStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
  
  // Fetch users opted in
  const { data: users, error } = await supabase
    .from("users")
    .select("id, display_name, phone")
    .eq("proactive_zns_opt_in", true)
    .not("phone", "is", null);

  if (error || !users) {
    throw new Error(`Failed to fetch eligible users: ${error?.message}`);
  }

  let sentCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < users.length; i += config.batchSize) {
    const batch = users.slice(i, i + config.batchSize);

    await Promise.all(batch.map(async (user) => {
      const trackingId = `proactive-${user.id}-${targetDateStr}`;
      
      // Check idempotency
      const { data: logEntry } = await supabase
        .from("zns_send_log")
        .select("id")
        .eq("tracking_id", trackingId)
        .single();
        
      if (logEntry) {
        skippedCount++;
        return;
      }

      let aiMessage = `Chúc bạn một ngày ${eventName} an lành!`; // Fallback
      let usedClaude = false;

      try {
        aiMessage = await withTimeout(callClaude(user.display_name, eventName), config.claudeTimeoutMs);
        usedClaude = true;
      } catch (e) {
        console.warn(`[Proactive ZNS] Claude timeout/error for user ${user.id}, using fallback.`);
      }

      // TASK-LUNAR-022: Inject Affiliate Link
      const resolver = new AffiliateResolverImpl();
      const offers = resolver.getOffersForEvent(eventName);
      let actionLink = "https://genie.cyberos.vn"; // Fallback to homepage
      if (offers && offers.length > 0) {
        actionLink = offers[0].click_url;
      }

      const payload: ZNSPayload = {
        phone: user.phone,
        templateId: process.env.PROACTIVE_ZNS_TEMPLATE_ID || "ZNS_TMPL_GENIE_002",
        templateData: {
          ten: user.display_name,
          ngay_duong: targetDateStr, // Needs format dd/mm/yyyy but leaving as is for brevity
          dip: eventName,
          ngay_am: eventName, // simplification
          ai_message: aiMessage,
          action_link: actionLink,
        },
        trackingId,
      };

      const sendResult = await sendZNS(payload, accessToken);

      if (sendResult.success) {
        sentCount++;
        await supabase.from("zns_send_log").insert({
          tracking_id: trackingId,
          user_id: user.id,
          phone_redacted: redactPhone(user.phone),
          event: "proactive.zns_sent",
          metadata: {
            target_date: targetDateStr,
            claude_used: usedClaude
          }
        });
      } else {
        console.error(`[Proactive ZNS] Failed to send ZNS to ${user.id}: ${sendResult.errorMessage}`);
      }
    }));

    // rudimentary rate limiting delay between batches
    if (i + config.batchSize < users.length) {
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  return { ok: true, sent: sentCount, skipped: skippedCount };
}
