import { Hono } from "hono";
import { requireApiKey } from "./middleware.js";
import { getServiceSupabaseClient } from "../../lib/supabase.js";
import { convertSolar2Lunar } from "@cyberskill/amlich-core";

export const b2bApp = new Hono();

// Apply middleware to all routes in this app
b2bApp.use("*", requireApiKey);

async function logUsage(partnerId: string, endpoint: string, statusCode: number, computeMs: number) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const supabase = getServiceSupabaseClient();
  
  await supabase.from("b2b_usage_logs").insert({
    partner_id: partnerId,
    year_month: yearMonth,
    endpoint,
    status_code: statusCode,
    compute_ms: computeMs
  });
}

function safeWaitUntil(c: any, promise: Promise<any>) {
  try {
    if (c.executionCtx) {
      c.executionCtx.waitUntil(promise);
      return;
    }
  } catch (e) {
    // Ignore getter throw
  }
  // In tests or environments without executionCtx, just swallow it or await it in background
  promise.catch(console.error);
}

// GET /v1/b2b/lunar/convert
b2bApp.get("/lunar/convert", async (c) => {
  const startMs = Date.now();
  const dateStr = c.req.query('date');
  const partnerId = c.get('partner_id');
  const remaining = c.get('quota_remaining');

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const computeMs = Date.now() - startMs;
    safeWaitUntil(c, logUsage(partnerId, "/v1/b2b/lunar/convert", 400, computeMs));
    return c.json({ error: "Missing or invalid 'date' parameter. Use YYYY-MM-DD" }, 400);
  }

  const [yy, mm, dd] = dateStr.split('-').map(Number);
  
  try {
    const [lunarDay, lunarMonth, lunarYear, lunarLeap] = convertSolar2Lunar(dd, mm, yy);
    const computeMs = Date.now() - startMs;
    
    safeWaitUntil(c, logUsage(partnerId, "/v1/b2b/lunar/convert", 200, computeMs));

    return c.json({
      status: "success",
      data: {
        solar_date: dateStr,
        lunar_date: `${lunarYear}-${String(lunarMonth).padStart(2, '0')}-${String(lunarDay).padStart(2, '0')}`,
        lunar_day: lunarDay,
        lunar_month: lunarMonth,
        lunar_year: lunarYear,
        is_leap: lunarLeap === 1
      },
      meta: {
        quota_remaining: remaining,
        compute_time_ms: computeMs
      }
    });
  } catch (error) {
    const computeMs = Date.now() - startMs;
    safeWaitUntil(c, logUsage(partnerId, "/v1/b2b/lunar/convert", 500, computeMs));
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// GET /v1/b2b/lunar/events
b2bApp.get("/lunar/events", async (c) => {
  const startMs = Date.now();
  const monthStr = c.req.query('month');
  const partnerId = c.get('partner_id');
  const remaining = c.get('quota_remaining');

  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    const computeMs = Date.now() - startMs;
    safeWaitUntil(c, logUsage(partnerId, "/v1/b2b/lunar/events", 400, computeMs));
    return c.json({ error: "Missing or invalid 'month' parameter. Use YYYY-MM" }, 400);
  }

  const [yy, mm] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const events = [];

  for (let dd = 1; dd <= daysInMonth; dd++) {
    const [lDay, lMonth, lYear, lLeap] = convertSolar2Lunar(dd, mm, yy);
    
    let eventName = null;
    let isMajor = false;

    if (lDay === 1) {
      eventName = "Mùng 1";
      isMajor = true;
    } else if (lDay === 15) {
      if (lMonth === 7 && lLeap === 0) {
        eventName = "Rằm Tháng Bảy (Vu Lan)";
      } else if (lMonth === 8 && lLeap === 0) {
        eventName = "Rằm Trung Thu";
      } else if (lMonth === 1 && lLeap === 0) {
        eventName = "Rằm Tháng Giêng (Tết Nguyên Tiêu)";
      } else {
        eventName = "Rằm";
      }
      isMajor = true;
    } else if (lDay === 1 && lMonth === 1 && lLeap === 0) {
      eventName = "Tết Nguyên Đán";
      isMajor = true;
    }

    if (eventName) {
      events.push({
        solar_date: `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
        lunar_date: `${lYear}-${String(lMonth).padStart(2, '0')}-${String(lDay).padStart(2, '0')}`,
        event_name: eventName,
        is_major: isMajor
      });
    }
  }

  const computeMs = Date.now() - startMs;
  safeWaitUntil(c, logUsage(partnerId, "/v1/b2b/lunar/events", 200, computeMs));

  return c.json({
    status: "success",
    data: events,
    meta: {
      quota_remaining: remaining,
      compute_time_ms: computeMs
    }
  });
});
