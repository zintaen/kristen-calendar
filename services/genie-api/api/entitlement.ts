import { getSupabaseClient, getServiceSupabaseClient } from "../lib/supabase";
import { getEntitlement, TIER_FEATURES, Tier, FeatureGate } from "../lib/entitlement";

export interface EntitlementResponse {
  tier: Tier;
  features: FeatureGate;
  genieUsedThisMonth: number;
  validUntil: string | null;
  trialAvailable: boolean;
  gracePeriodEndsAt: string | null;
}

function getUserJwt(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

export async function handleGetEntitlement(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = getSupabaseClient(jwt);
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const entitlement = await getEntitlement(user.id);
    const now = new Date();
    const yearMonth = now.toISOString().substring(0, 7);

    const { data: usageRow } = await client
      .from("genie_usage_monthly")
      .select("call_count")
      .eq("user_id", user.id)
      .eq("year_month", yearMonth)
      .single();

    const used = usageRow ? usageRow.call_count : 0;

    let gracePeriodEndsAt = null;
    if (entitlement.validUntil && new Date(entitlement.validUntil).getTime() < now.getTime()) {
      const graceEnd = new Date(entitlement.validUntil);
      graceEnd.setDate(graceEnd.getDate() + 30);
      gracePeriodEndsAt = graceEnd.toISOString();
    }

    const response: EntitlementResponse = {
      tier: entitlement.tier,
      features: TIER_FEATURES[entitlement.tier],
      genieUsedThisMonth: used,
      validUntil: entitlement.validUntil,
      trialAvailable: !entitlement.trialUsed,
      gracePeriodEndsAt
    };

    return Response.json(response);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleStartTrial(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = getSupabaseClient(jwt);
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const entitlement = await getEntitlement(user.id);
    if (entitlement.trialUsed) {
      return Response.json({ error: "Trial already used" }, { status: 409 });
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const serviceClient = getServiceSupabaseClient();
    const { error: upsertErr } = await serviceClient
      .from("user_entitlements")
      .upsert({
        user_id: user.id,
        tier: "premium",
        valid_until: validUntil.toISOString(),
        source: "trial",
        trial_used: true
      }, { onConflict: "user_id" });

    if (upsertErr) throw upsertErr;

    return Response.json({ success: true, validUntil: validUntil.toISOString() });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
