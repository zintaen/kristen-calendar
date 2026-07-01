import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { SYSTEM_PROMPT_BLOCK } from "../lib/system-prompt";
import { buildGenieMessages, sanitizeQuestion, GenieContext } from "../lib/prompt-builder";
import { checkAndIncrementGenieUsage } from "../lib/rate-limiter";
import { getEntitlement, isFeatureAllowed, TIER_FEATURES, Tier } from "../lib/entitlement";
import { stripSensitiveFields, checkCrossBorderTransfer } from "../lib/data-minimization";

export interface GenieRequest {
  question: string;
  context: GenieContext;
  ttsRequested?: boolean;
}

export interface GenieResponse {
  answer: string;
  questionType: string;
  requestId: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
}

export interface GenieErrorResponse {
  error: "RATE_LIMITED" | "UPSTREAM_ERROR" | "INVALID_REQUEST" | "AUTH_ERROR" | "feature_not_allowed" | "quota_exceeded";
  message?: string;
  retryAfter?: number;
  retryable?: boolean;
  requestId?: string;
  feature?: string;
  tier?: string;
  quota?: number;
  used?: number;
  resetAt?: string;
}

// We allow injecting an anthropic client and supabase client for testing
export async function POST(
  request: Request, 
  deps?: { anthropic?: Anthropic, supabaseClient?: any }
): Promise<Response> {
  const requestId = uuidv4();
  
  try {
    // 1. Auth & Validation
    const authHeader = request.headers.get("Authorization");
    // For now we assume some dummy session token if not in testing, but if it's strictly required
    // we would check it. Let's just accept it and hash it.
    let userId = "anonymous";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      userId = authHeader.substring(7);
    }
    
    // Hash userId to avoid logging PII
    const userIdHash = crypto.createHash("sha256").update(userId).digest("hex");

    // 2. Entitlement & Rate-limit check
    let tier: Tier = "free";
    
    if (userId !== "anonymous") {
      const entitlement = await getEntitlement(userId, deps?.supabaseClient);
      tier = entitlement.tier;
    }
    
    if (!isFeatureAllowed(tier, "genieAI")) {
      return Response.json({
        error: "feature_not_allowed",
        feature: "genieAI",
        tier,
      }, { status: 403 });
    }

    const quota = TIER_FEATURES[tier].genieMonthlyQuota;
    const rlResult = await checkAndIncrementGenieUsage(userId, quota, deps?.supabaseClient);
    
    if (!rlResult.allowed) {
      const retryAfter = Math.ceil((new Date(rlResult.resetAt).getTime() - Date.now()) / 1000);
      return Response.json(
        {
          error: "quota_exceeded",
          feature: "genieAI",
          quota,
          used: quota,
          resetAt: rlResult.resetAt
        },
        { 
          status: 429,
          headers: { 
            "Retry-After": String(retryAfter > 0 ? retryAfter : 0),
            "X-RateLimit-Remaining": "0"
          }
        }
      );
    }

    // 3. Validate + sanitize body
    const body = await request.json() as GenieRequest;
    
    if (!body.question || body.question.length > 500) {
      return Response.json(
        {
          error: "INVALID_REQUEST",
          message: "Cau hoi khong duoc de trong va khong qua 500 ky tu.",
          requestId
        } satisfies GenieErrorResponse,
        { status: 400 }
      );
    }

    if (body.context?.reminder && body.context.reminder.type === "GIO") {
      const cbCheck = checkCrossBorderTransfer("gio_reminder", "us-east-1");
      if (!cbCheck.allowed) {
        return Response.json(
          {
            error: "INVALID_REQUEST",
            message: cbCheck.reason,
            requestId
          } satisfies GenieErrorResponse,
          { status: 403 }
        );
      }
      body.context.reminder = stripSensitiveFields(body.context.reminder) as any;
    }

    const sanitizedQuestion = sanitizeQuestion(body.question);
    const { system, messages } = buildGenieMessages(body.context, sanitizedQuestion);

    // 4. Gọi Claude API
    const anthropic = deps?.anthropic || new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const startTime = Date.now();
    
    // Note: in testing, this might throw if mock is configured to throw
    const completion = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: system, // System prompt block has ephemeral cache_control
      messages: messages as Anthropic.MessageParam[],
    });

    const latencyMs = Date.now() - startTime;
    
    const answer = completion.content[0].type === "text" ? completion.content[0].text : "";
    
    // Add fail-safe footer if missing
    const footer = "Tham khao theo phong tuc dan gian";
    const finalAnswer = answer.includes("Tham khao") || answer.includes(footer) 
      ? answer 
      : `${answer}\n\n(*) ${footer} - co the khac nhau tuy vung mien.`;

    const usage = {
      inputTokens: completion.usage.input_tokens,
      outputTokens: completion.usage.output_tokens,
      cacheReadInputTokens: (completion.usage as any).cache_read_input_tokens || 0,
      cacheCreationInputTokens: (completion.usage as any).cache_creation_input_tokens || 0,
    };

    // Logging only safe fields
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      userIdHash,
      questionType: body.context.questionType,
      latencyMs,
      tokenUsage: usage
    }));

    return Response.json({
      answer: finalAnswer,
      questionType: body.context.questionType,
      requestId,
      tokenUsage: usage,
    } satisfies GenieResponse);
    
  } catch (error: any) {
    console.error("Upstream Error:", error.message || error);
    return Response.json(
      {
        error: "UPSTREAM_ERROR",
        message: "Loi ket noi voi Claude API",
        retryable: true,
        requestId,
      } satisfies GenieErrorResponse,
      { status: 502 }
    );
  }
}
