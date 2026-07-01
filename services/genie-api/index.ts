import "./lib/sentry";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import * as Sentry from "@sentry/node";
import { cors } from "hono/cors";
import { POST as geniePost } from "./api/genie";
import { POST as znsPost } from "./api/zns";
import { 
  handlePush, 
  handlePull, 
  handleShare, 
  handleInvite, 
  handleInviteAccept, 
  handleDeleteAccount 
} from "./api/sync";
import {
  handleConsentUpdate,
  handleConsentGet,
  handleConsentRevoke
} from "./api/consent";
import { handleGetEntitlement, handleStartTrial } from "./api/entitlement";
import { handleAppStoreWebhook, handleZaloPayWebhook } from "./api/webhook-payment";

const app = new Hono();

app.use("*", cors());

// Sentry Error Handler
app.onError((err, c) => {
  Sentry.captureException(err);
  return c.text("Internal Server Error", 500);
});

// Map the API route to the edge-compatible POST handler
app.post("/api/genie", async (c) => {
  const response = await geniePost(c.req.raw);
  return response;
});

// ZNS cron endpoint (FR-LUNAR-017)
app.post("/api/zns", async (c) => {
  const response = await znsPost(c.req.raw);
  return response;
});

// Cloud Sync endpoints (FR-LUNAR-018)
app.post("/api/sync/push", async (c) => handlePush(c.req.raw));
app.get("/api/sync/pull", async (c) => handlePull(c.req.raw));
app.patch("/api/sync/share", async (c) => handleShare(c.req.raw));
app.post("/api/sync/invite", async (c) => handleInvite(c.req.raw));
app.post("/api/sync/invite/accept", async (c) => handleInviteAccept(c.req.raw));
app.delete("/api/sync/account", async (c) => handleDeleteAccount(c.req.raw));

// Consent endpoints (FR-LUNAR-019)
app.post("/api/consent", async (c) => handleConsentUpdate(c.req.raw));
app.get("/api/consent", async (c) => handleConsentGet(c.req.raw));
app.delete("/api/consent/:type", async (c) => handleConsentRevoke(c.req.raw, c.req.param("type")));

// Entitlement & Payment endpoints (FR-LUNAR-020)
app.get("/api/entitlement", async (c) => handleGetEntitlement(c.req.raw));
app.post("/api/entitlement/trial", async (c) => handleStartTrial(c.req.raw));
app.post("/api/webhook/payment/appstore", async (c) => handleAppStoreWebhook(c.req.raw));
app.post("/api/webhook/payment/zalopay", async (c) => handleZaloPayWebhook(c.req.raw));

app.get("/health", (c) => c.text("OK"));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
