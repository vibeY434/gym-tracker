import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const gymTrackerOrigin = process.env.NEXT_PUBLIC_GYM_TRACKER_ORIGIN?.trim();
const requireGymTrackerAuth = process.env.NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH === "true";

export const supabaseConfigMissing = !supabaseUrl || !supabaseAnonKey;
export const supabaseConfigured = !supabaseConfigMissing;
export const privateAppOrigin = gymTrackerOrigin || "";
export const gymTrackerAuthRequired = requireGymTrackerAuth;

if (supabaseConfigMissing && typeof window !== "undefined") {
  console.warn(
    "Supabase env vars fehlen: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = supabaseConfigMissing
  ? null
  : createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
