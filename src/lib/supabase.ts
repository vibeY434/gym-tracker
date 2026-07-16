import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const gymTrackerOrigin = process.env.NEXT_PUBLIC_GYM_TRACKER_ORIGIN?.trim();
const privateGateOriginEnv = process.env.NEXT_PUBLIC_W3YH_PRIVATE_GATE_ORIGIN?.trim();
const requireGymTrackerAuth = process.env.NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH === "true";

export const supabaseConfigMissing = !supabaseUrl || !supabaseAnonKey;
export const supabaseConfigured = !supabaseConfigMissing;
export const privateAppOrigin = gymTrackerOrigin || "";
export const privateGateOrigin = privateGateOriginEnv || "https://private.w3yh.xyz";
export const gymTrackerAuthRequired = requireGymTrackerAuth;

if (supabaseConfigMissing && typeof window !== "undefined") {
  console.warn(
    "Supabase env vars fehlen: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

function createGymBrowserClient() {
  if (!browserClient && !supabaseConfigMissing) {
    browserClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  }

  return browserClient;
}

export const supabase = typeof window === "undefined" ? null : createGymBrowserClient();
