import { createClient } from "@supabase/supabase-js";

const supabaseUrlRaw = process.env.SUPABASE_URL;
const supabaseUrl = supabaseUrlRaw ? supabaseUrlRaw.replace("host.docker.internal", "localhost") : undefined;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in root .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  console.log("Seeding Master User kristen@master.com...");

  // 1. Create or get user
  let userId: string;
  const { data: existingUser } = await supabase.auth.admin.listUsers();
  const kristenUser = existingUser?.users.find(u => u.email === "kristen@master.com");

  if (kristenUser) {
    console.log("User kristen@master.com already exists. Updating password to padded master password...");
    const { error: updateErr } = await supabase.auth.admin.updateUserById(kristenUser.id, {
      password: "1991_master_kristen",
      email_confirm: true,
    });
    if (updateErr) {
      console.error("Failed to update user password:", updateErr);
      process.exit(1);
    }
    userId = kristenUser.id;
  } else {
    console.log("Creating user kristen@master.com...");
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: "kristen@master.com",
      password: "1991_master_kristen",
      email_confirm: true,
    });
    if (createErr || !newUser.user) {
      console.error("Failed to create user:", createErr);
      process.exit(1);
    }
    userId = newUser.user.id;
  }

  // 2. Assign premium entitlement
  console.log(`Assigning lifetime premium entitlement for user ${userId}...`);
  const validUntil = new Date();
  validUntil.setFullYear(2099);

  const { error: upsertErr } = await supabase
    .from("user_entitlements")
    .upsert({
      user_id: userId,
      tier: "premium",
      valid_until: validUntil.toISOString(),
      source: "manual",
      trial_used: false
    }, { onConflict: "user_id" });

  if (upsertErr) {
    console.error("Failed to assign entitlement:", upsertErr);
    process.exit(1);
  }

  console.log("Master user successfully seeded! You can now log in with kristen / 1991.");
}

run().catch(console.error);
