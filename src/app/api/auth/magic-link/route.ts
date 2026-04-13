import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAllowedEmails() {
  const raw = process.env.GYM_ALLOWED_EMAILS?.trim();

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const redirectOrigin = process.env.NEXT_PUBLIC_GYM_TRACKER_ORIGIN?.trim();
  const allowedEmails = getAllowedEmails();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase ist nicht konfiguriert." },
      { status: 500 },
    );
  }

  if (!allowedEmails.length) {
    return NextResponse.json(
      { error: "GYM_ALLOWED_EMAILS fehlt noch auf dem Server." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { error: "Mailadresse fehlt." },
      { status: 400 },
    );
  }

  if (!allowedEmails.includes(email)) {
    return NextResponse.json({
      message: "Wenn die Adresse freigeschaltet ist, ist der Magic Link unterwegs.",
    });
  }

  const origin = redirectOrigin || new URL(request.url).origin;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/private`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.error("Magic-Link-Request fehlgeschlagen", error);
    return NextResponse.json(
      { error: "Magic Link konnte nicht gesendet werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Wenn die Adresse freigeschaltet ist, ist der Magic Link unterwegs.",
  });
}
