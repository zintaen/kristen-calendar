import { createClient } from "@supabase/supabase-js";

const client = createClient(
  process.env.SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy"
);

async function test() {
  const { data, error } = await client.from("user_entitlements").select("*").limit(1);
  if (error) {
    console.error("Test Error:", error);
  } else {
    console.log("Test Success, Rows:", data.length);
  }
}
test();
