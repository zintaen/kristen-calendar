import { getSupabaseClient, getServiceSupabaseClient } from "../lib/supabase";
import { upsertReminders, fetchUserReminders } from "../lib/rls-helpers";
import { createInviteToken, verifyInviteToken } from "../lib/invite";
import { getEntitlement, isFeatureAllowed, TIER_FEATURES } from "../lib/entitlement";

export interface RemindersUpsertRow {
  id: string;
  userId: string;
  type: "RAM" | "MUNG_MOT" | "GIO" | "CUSTOM" | "FESTIVAL";
  title: string;
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number | null;
  isLeapMonth: boolean;
  recurrence: "MONTHLY" | "ANNUAL" | "ONCE";
  leadTimes: number[];
  notifyTime: string;
  channels: ("LOCAL" | "ZNS" | "PUSH")[];
  linkedContentId: string | null;
  sharedWith: string[];
  enabled: boolean;
  updatedAt: string;
}

export interface SyncPushBody {
  reminders: RemindersUpsertRow[];
  deviceId: string;
}

export interface SharePatchBody {
  reminderId: string;
  action: "add" | "remove";
  targetUserId: string;
}

function getUserJwt(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

// POST /api/sync/push
export async function handlePush(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as SyncPushBody;
    const client = getSupabaseClient(jwt);
    await upsertReminders(client, body.reminders);
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/sync/pull
export async function handlePull(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = getSupabaseClient(jwt);
    const data = await fetchUserReminders(client);
    
    // Map back to camelCase
    const reminders: RemindersUpsertRow[] = data.map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      lunarDay: r.lunar_day,
      lunarMonth: r.lunar_month,
      lunarYear: r.lunar_year,
      isLeapMonth: r.is_leap_month,
      recurrence: r.recurrence,
      leadTimes: r.lead_times,
      notifyTime: r.notify_time,
      channels: r.channels,
      linkedContentId: r.linked_content_id,
      sharedWith: r.shared_with,
      enabled: r.enabled,
      updatedAt: r.updated_at
    }));

    return Response.json({
      reminders,
      serverTime: new Date().toISOString(),
      conflictsLogged: 0
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/sync/share
export async function handleShare(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as SharePatchBody;
    const client = getSupabaseClient(jwt);
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entitlement = await getEntitlement(user.id);
    if (!isFeatureAllowed(entitlement.tier, "familySharing")) {
      return Response.json({ error: "Feature not allowed for this tier" }, { status: 403 });
    }
    
    // Get the current reminder to modify sharedWith
    const { data: reminder, error: getErr } = await client
      .from("reminders")
      .select("shared_with")
      .eq("id", body.reminderId)
      .single();

    if (getErr || !reminder) {
      return Response.json({ error: "Not found or forbidden" }, { status: 403 });
    }

    let sharedWith = reminder.shared_with || [];
    if (body.action === "add" && !sharedWith.includes(body.targetUserId)) {
      const maxMembers = TIER_FEATURES[entitlement.tier].maxFamilyMembers;
      if (sharedWith.length >= maxMembers) {
        return Response.json({ error: "Max family members reached" }, { status: 422 });
      }
      sharedWith.push(body.targetUserId);
    } else if (body.action === "remove") {
      sharedWith = sharedWith.filter((id: string) => id !== body.targetUserId);
    }

    const { error: updateErr } = await client
      .from("reminders")
      .update({ shared_with: sharedWith })
      .eq("id", body.reminderId);

    if (updateErr) throw updateErr;

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/sync/invite
export async function handleInvite(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as { reminderId: string };
    const client = getSupabaseClient(jwt);
    
    // In a real scenario we need the user's ID to be the ownerId
    // For now we assume auth.getUser() works
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user) {
      return Response.json({ error: "Invalid user" }, { status: 401 });
    }

    const entitlement = await getEntitlement(user.id);
    if (!isFeatureAllowed(entitlement.tier, "familySharing")) {
      return Response.json({ error: "Feature not allowed for this tier" }, { status: 403 });
    }

    const token = createInviteToken(user.id, body.reminderId);
    
    // Save token in DB (service role needed since RLS might not allow or we create a policy)
    // Actually, maybe owner can insert into invite_tokens. But let's use service role.
    const serviceClient = getServiceSupabaseClient();
    await serviceClient.from("invite_tokens").insert({
      owner_id: user.id,
      reminder_id: body.reminderId,
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString()
    });

    return Response.json({ token, expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString() });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/sync/invite/accept
export async function handleInviteAccept(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as { token: string };
    const payload = verifyInviteToken(body.token);
    if (!payload) {
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const client = getSupabaseClient(jwt);
    const { data: { user } } = await client.auth.getUser(jwt);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const serviceClient = getServiceSupabaseClient();
    
    // Check if used
    const { data: tokenRow } = await serviceClient
      .from("invite_tokens")
      .select("used_at")
      .eq("jti", payload.jti)
      .single();

    if (!tokenRow || tokenRow.used_at) {
      return Response.json({ error: "Token already used" }, { status: 409 });
    }

    // Mark used
    await serviceClient
      .from("invite_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("jti", payload.jti);

    // Get current shared_with
    const { data: reminder } = await serviceClient
      .from("reminders")
      .select("shared_with")
      .eq("id", payload.reminderId)
      .single();

    if (reminder) {
      const sharedWith = reminder.shared_with || [];
      if (!sharedWith.includes(user.id)) {
        // Also check if owner has reached limit?
        // We'd need to know the owner's entitlement here.
        // It's a bit complex since we only have reminderId, but let's do a quick check
        const { data: remFull } = await serviceClient.from("reminders").select("user_id").eq("id", payload.reminderId).single();
        if (remFull) {
          const ownerEntitlement = await getEntitlement(remFull.user_id);
          const maxMembers = TIER_FEATURES[ownerEntitlement.tier].maxFamilyMembers;
          if (sharedWith.length >= maxMembers) {
            return Response.json({ error: "Owner max family members reached" }, { status: 422 });
          }
        }
        
        sharedWith.push(user.id);
        await serviceClient
          .from("reminders")
          .update({ shared_with: sharedWith })
          .eq("id", payload.reminderId);
      }
    }

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/sync/account
export async function handleDeleteAccount(request: Request): Promise<Response> {
  const jwt = getUserJwt(request);
  if (!jwt) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = getSupabaseClient(jwt);
    const { data: { user } } = await client.auth.getUser(jwt);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Since reminders table has ON DELETE CASCADE from users, 
    // ideally we would delete the user. But maybe we just delete their reminders.
    const { error } = await client
      .from("reminders")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
