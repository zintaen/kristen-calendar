import { createClient } from "@supabase/supabase-js";

// Use environment variables or fallback for local development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY4NzYxMzk1NiwiZXhwIjoxOTAzMTg5OTU2fQ.examplekey";

// We create a single shared client instance for the browser context
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // For polls we only care about anonymous operations right now
  }
});
