import { processProactiveZnsBatch } from "../lib/proactive-zns.js";

/**
 * Proactive ZNS cron handler.
 * Called by Vercel Cron (or local dev trigger) daily at 08:00 AM.
 *
 * Security: Protected by CRON_SECRET bearer token.
 */
export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await processProactiveZnsBatch(new Date());
    return Response.json(result);
  } catch (error: any) {
    console.error("[Proactive ZNS] Fatal error:", error);
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
