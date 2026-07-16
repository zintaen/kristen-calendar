import { getServiceSupabaseClient } from "../lib/supabase";
import crypto from "crypto";

/** App Store Server Notifications V2 body: a single signed JWS in `signedPayload`. */
export interface AppStoreServerNotificationV2 {
  signedPayload: string;
}

// Notification types that grant/extend access vs. revoke it (App Store Server Notifications V2).
const APP_STORE_GRANT_TYPES = new Set(["SUBSCRIBED", "DID_RENEW", "OFFER_REDEEMED", "RESUBSCRIBE"]);
const APP_STORE_REVOKE_TYPES = new Set(["EXPIRED", "REFUND", "REVOKE", "GRACE_PERIOD_EXPIRED"]);

/** Map an App Store productId to an entitlement tier. Override via APP_STORE_PRODUCT_TIERS (JSON). */
function tierForAppStoreProduct(productId: string): "premium" | "family" | null {
  const raw = process.env.APP_STORE_PRODUCT_TIERS;
  if (raw) {
    try {
      const map = JSON.parse(raw) as Record<string, string>;
      const t = map[productId];
      if (t === "premium" || t === "family") return t;
    } catch {
      // fall through to the heuristic
    }
  }
  const p = productId.toLowerCase();
  if (p.includes("family")) return "family";
  if (p.includes("premium") || p.includes("pro")) return "premium";
  return null;
}

/**
 * Load Apple's root certificate(s) (DER/PEM) used to anchor the JWS x5c chain. Defaults to
 * services/genie-api/certs/apple/ (download Apple Root CA - G3 there). Returns [] if none found,
 * which forces the handler to fail closed rather than trust an unverifiable payload.
 */
async function loadAppleRootCertificates(): Promise<Buffer[]> {
  const fs = await import("fs/promises");
  const dir = process.env.APPLE_ROOT_CERTS_DIR || new URL("../certs/apple/", import.meta.url).pathname;
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const certs: Buffer[] = [];
  for (const f of files) {
    if (/\.(cer|der|pem|crt)$/i.test(f)) {
      certs.push(await fs.readFile(`${dir}/${f}`));
    }
  }
  return certs;
}

export interface ZaloPayWebhookPayload {
  data: string;
  mac: string;
}

/** Timing-safe hex string compare (avoids leaking the MAC via response timing). */
function safeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export async function processPaymentConfirmation(
  userId: string,
  tier: "premium" | "family",
  validUntil: string,
  source: "app_store" | "zalo_pay"
): Promise<void> {
  const serviceClient = getServiceSupabaseClient();
  const { error } = await serviceClient
    .from("user_entitlements")
    .upsert({
      user_id: userId,
      tier,
      valid_until: validUntil,
      source
    }, { onConflict: "user_id" });

  if (error) throw error;
}

/**
 * App Store Server Notifications V2 (TASK-020).
 *
 * Verifies Apple's signed JWS (ES256, x5c chain rooted at an Apple root CA) with the official
 * `@apple/app-store-server-library` BEFORE granting anything. Fail-closed at every step: a bad
 * body is 400, a missing/malformed JWS is 401, a verification failure is 401, and a missing
 * library or root certificate is 500 (so Apple retries) - never a grant. The entitlement is
 * written only after the transaction is cryptographically verified.
 *
 * Operational prerequisites (see certs/apple/README.md and .env.example):
 *   - `@apple/app-store-server-library` installed (it is a dependency).
 *   - Apple Root CA - G3 placed in certs/apple/ (or APPLE_ROOT_CERTS_DIR).
 *   - APPLE_BUNDLE_ID, APPLE_APP_APPLE_ID, APP_STORE_ENVIRONMENT set.
 *   - The app must set appAccountToken to the user's Supabase id at purchase, so the
 *     verified transaction carries the user identity.
 */
export async function handleAppStoreWebhook(request: Request): Promise<Response> {
  let body: AppStoreServerNotificationV2;
  try {
    body = await request.json() as AppStoreServerNotificationV2;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  // A JWS is three base64url segments separated by dots. Reject anything malformed up front.
  const signedPayload = body?.signedPayload;
  if (typeof signedPayload !== "string" || signedPayload.split(".").length !== 3) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load Apple's verifier lazily so this module imports without the dependency (e.g. in unit
  // tests). If it is absent, fail closed with 500 rather than trusting the payload.
  let lib: any;
  try {
    lib = await import("@apple/app-store-server-library");
  } catch {
    console.error("App Store verification unavailable: @apple/app-store-server-library is not installed");
    return Response.json({ error: "verification unavailable" }, { status: 500 });
  }

  const rootCerts = await loadAppleRootCertificates();
  if (rootCerts.length === 0) {
    console.error("App Store verification unavailable: no Apple root certificates found (set APPLE_ROOT_CERTS_DIR)");
    return Response.json({ error: "verification unavailable" }, { status: 500 });
  }

  const bundleId = process.env.APPLE_BUNDLE_ID || "world.cyberskill.genieamlich";
  const environment = (process.env.APP_STORE_ENVIRONMENT === "Production")
    ? lib.Environment.PRODUCTION
    : lib.Environment.SANDBOX;
  const appAppleId = process.env.APPLE_APP_APPLE_ID ? Number(process.env.APPLE_APP_APPLE_ID) : undefined;
  const enableOnlineChecks = process.env.APP_STORE_ONLINE_CHECKS === "true";

  let notification: any;
  let transaction: any;
  try {
    const verifier = new lib.SignedDataVerifier(rootCerts, enableOnlineChecks, environment, bundleId, appAppleId);
    notification = await verifier.verifyAndDecodeNotification(signedPayload);
    const signedTransactionInfo = notification?.data?.signedTransactionInfo;
    if (signedTransactionInfo) {
      transaction = await verifier.verifyAndDecodeTransaction(signedTransactionInfo);
    }
  } catch (err: any) {
    console.warn("App Store JWS verification failed - grant refused:", err?.message);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verified. Act on the notification type using the verified transaction only.
  try {
    const type = String(notification?.notificationType || "");
    if (transaction) {
      const userId: string | undefined = transaction.appAccountToken;
      const tier = tierForAppStoreProduct(String(transaction.productId || ""));

      if (userId && tier && APP_STORE_GRANT_TYPES.has(type)) {
        const validUntil = transaction.expiresDate
          ? new Date(transaction.expiresDate).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await processPaymentConfirmation(userId, tier, validUntil, "app_store");
      } else if (userId && APP_STORE_REVOKE_TYPES.has(type)) {
        // Expire access immediately on refund/revoke/expiry.
        await processPaymentConfirmation(userId, tier || "premium", new Date().toISOString(), "app_store");
      } else {
        console.log(`App Store notification ${type} verified; no grant action (userId=${!!userId}, tier=${tier})`);
      }
    }
    return Response.json({ success: true });
  } catch (err: any) {
    console.error("App Store post-verification processing failed:", err?.message);
    return Response.json({ error: "processing failed" }, { status: 500 });
  }
}

/**
 * Zalo Pay callback (TASK-020). Verifies the HMAC-SHA256 MAC over `data` with ZALO_PAY_KEY2 BEFORE
 * granting anything. Fails closed if the key is missing in production.
 */
export async function handleZaloPayWebhook(request: Request): Promise<Response> {
  try {
    const body = await request.json() as ZaloPayWebhookPayload;

    // Read the key at call time (testable) and fail closed in production if unset.
    const key = process.env.ZALO_PAY_KEY2;
    if (!key && process.env.NODE_ENV === "production") {
      console.error("ZALO_PAY_KEY2 is not set - refusing to process Zalo Pay callbacks");
      return Response.json({ return_code: 0, return_message: "server misconfigured" }, { status: 500 });
    }
    const signingKey = key || "dummy_key"; // dev/test fallback only; never reached in production

    if (typeof body.data !== "string" || typeof body.mac !== "string") {
      return Response.json({ return_code: -1, return_message: "bad request" }, { status: 400 });
    }

    const expectedMac = crypto.createHmac("sha256", signingKey).update(body.data).digest("hex");
    if (!safeEqualHex(body.mac, expectedMac)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Signature verified. Grant in the background so we can acknowledge Zalo Pay immediately.
    Promise.resolve().then(async () => {
      try {
        const data = JSON.parse(body.data);
        if (data.userId) {
          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + 30);
          await processPaymentConfirmation(data.userId, data.tier || "premium", validUntil.toISOString(), "zalo_pay");
        }
      } catch (err) {
        console.error("Zalo Pay async parsing/processing failed:", err);
      }
    });

    return Response.json({ return_code: 1, return_message: "success" });
  } catch (error: any) {
    return Response.json({ return_code: 0, return_message: error.message }, { status: 500 });
  }
}
