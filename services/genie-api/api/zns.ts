import { runZNSCron, type SchedulerReminder } from "../lib/zns-scheduler.js";

/**
 * ZNS cron handler.
 * Called by Vercel Cron (or local dev trigger) to scan reminders and send ZNS notifications.
 *
 * Security: Protected by CRON_SECRET bearer token.
 * Framework: Uses the standard Request/Response API for compatibility with Hono and Vercel.
 */
export async function POST(request: Request): Promise<Response> {
  // Authenticate with CRON_SECRET.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // In production, read reminders from Supabase:
    //   SELECT * FROM reminders WHERE channels @> '["ZNS"]' AND enabled = true;
    // For now, accept reminders from the request body (dev/test) or default to empty.
    let reminders: SchedulerReminder[] = [];
    try {
      const body = await request.json();
      if (Array.isArray(body.reminders)) {
        reminders = body.reminders;
      }
    } catch {
      // No body or invalid JSON -> scan all reminders from DB (not implemented yet).
      reminders = [];
    }

    const cronResult = await runZNSCron(reminders);
    return Response.json({ ok: true, ...cronResult });
  } catch (error: any) {
    console.error("[ZNS cron] Fatal error:", error);
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
