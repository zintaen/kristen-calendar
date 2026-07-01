import { getSupabaseClient, getServiceSupabaseClient } from "../lib/supabase";
import { ConsentFlags, DEFAULT_CONSENT_FLAGS, ConsentType, CONSENT_POLICY_VERSION } from "../lib/consent";
import crypto from "crypto";

function getUserJwt(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

function getIpHash(request: Request): string {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  return crypto.createHash("sha256").update(ip + "SALT123").digest("hex");
}

export interface ConsentLogEntry {
  type: ConsentType;
  action: "grant" | "revoke";
  policyVersion: string;
  timestamp: string;
  ipHash: string;
}

export async function handleConsentGet(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return new Response("Unauthorized", { status: 401 });

  try {
    const client = getSupabaseClient(jwt);
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user) return new Response("Unauthorized", { status: 401 });

    const { data: logs, error: logsErr } = await client
      .from("consent_log")
      .select("*")
      .order("created_at", { ascending: true });

    if (logsErr) throw logsErr;

    const history: ConsentLogEntry[] = (logs || []).map(row => ({
      type: row.consent_type as ConsentType,
      action: row.action as "grant" | "revoke",
      policyVersion: row.policy_version,
      timestamp: row.created_at,
      ipHash: row.ip_hash
    }));

    // Reconstruct flags from history
    const flags: ConsentFlags = { ...DEFAULT_CONSENT_FLAGS };
    for (const log of history) {
      if (log.action === "grant") {
        flags[log.type] = true;
        flags.policyVersion = log.policyVersion;
        flags.consentedAt = log.timestamp;
      } else if (log.action === "revoke") {
        flags[log.type] = false;
      }
    }

    return Response.json({ flags, history });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleConsentUpdate(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await request.json() as { type: ConsentType; grant: boolean; policyVersion: string };
    
    const client = getSupabaseClient(jwt);
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user) return new Response("Unauthorized", { status: 401 });

    const action = body.grant ? "grant" : "revoke";
    const serviceClient = getServiceSupabaseClient();
    
    const { error: insertErr } = await serviceClient
      .from("consent_log")
      .insert({
        user_id: user.id,
        consent_type: body.type,
        action,
        policy_version: body.policyVersion || CONSENT_POLICY_VERSION,
        ip_hash: getIpHash(request)
      });

    if (insertErr) throw insertErr;

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleConsentRevoke(request: Request, type: string): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return new Response("Unauthorized", { status: 401 });

  try {
    const client = getSupabaseClient(jwt);
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user) return new Response("Unauthorized", { status: 401 });

    const serviceClient = getServiceSupabaseClient();
    
    const { error: insertErr } = await serviceClient
      .from("consent_log")
      .insert({
        user_id: user.id,
        consent_type: type,
        action: "revoke",
        policy_version: CONSENT_POLICY_VERSION,
        ip_hash: getIpHash(request)
      });

    if (insertErr) throw insertErr;

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
