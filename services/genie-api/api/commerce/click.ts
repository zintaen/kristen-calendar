import { getServiceSupabaseClient } from "../../lib/supabase.js";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { offerId, eventId, userId, region } = body;
    
    if (!offerId || !eventId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getServiceSupabaseClient();
    const traceId = uuidv4();

    // Fallback user ID if not provided (e.g. anonymous visitor)
    const logUserId = userId || null;

    const { error } = await supabase.from("genie_action_log").insert({
      user_id: logUserId,
      event_kind: "commerce.affiliate_click",
      payload: {
        offer_id: offerId,
        event_id: eventId,
        region: region || "VN"
      },
      trace_id: traceId
    });

    if (error) {
      console.error("[Affiliate Click Log] Failed to insert:", error);
      // We still return 200 so the client proceeds with the redirect
      return Response.json({ ok: false, error: "Database error" }, { status: 500 });
    }

    return Response.json({ ok: true, traceId });
  } catch (error: any) {
    console.error("[Affiliate Click Log] Server error:", error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
