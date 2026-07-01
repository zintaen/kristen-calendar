import { getServiceSupabaseClient } from "../../lib/supabase.js";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const event = body.event;
    
    if (!event || !event.app_user_id || !event.type) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { type, app_user_id, product_id, entitlement_ids, expiration_at_ms } = event;
    const supabase = getServiceSupabaseClient();
    const traceId = uuidv4();

    // Determine new tier
    let newTier = 'free';
    if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
      newTier = 'premium';
    } else if (type === 'CANCELLATION' || type === 'EXPIRATION') {
      newTier = 'free';
    }

    // Determine validity
    let validUntil = null;
    if (expiration_at_ms) {
      validUntil = new Date(expiration_at_ms).toISOString();
    }

    // Update user_entitlements
    // FR-LUNAR-020 created this table with user_id, tier, valid_until, source
    const { error: entitlementError } = await supabase
      .from('user_entitlements')
      .upsert({
        user_id: app_user_id,
        tier: newTier,
        valid_until: validUntil,
        source: 'app_store' // or 'play_store', we can generalize
      }, { onConflict: 'user_id' });

    if (entitlementError) {
      console.error("[RevenueCat Webhook] Failed to update entitlement:", entitlementError);
      return Response.json({ error: "Database error" }, { status: 500 });
    }

    // Log the successful transaction in genie_action_log (FR-LUNAR-024)
    if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
      await supabase.from("genie_action_log").insert({
        user_id: app_user_id,
        event_kind: "monetization.purchase_success",
        payload: {
          product_id: product_id,
          entitlement_ids: entitlement_ids,
          event_type: type
        },
        trace_id: traceId
      });
    }

    return Response.json({ ok: true, traceId });
  } catch (error: any) {
    console.error("[RevenueCat Webhook] Server error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
