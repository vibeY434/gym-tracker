import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000;
const MAGIC_LINK_MAX_REQUESTS = 5;
const magicLinkBuckets = new Map<string, number[]>();

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

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(bucketKey: string) {
  const now = Date.now();
  const cutoff = now - MAGIC_LINK_WINDOW_MS;
  const current = magicLinkBuckets.get(bucketKey) ?? [];
  const recent = current.filter((timestamp) => timestamp > cutoff);

  if (recent.length >= MAGIC_LINK_MAX_REQUESTS) {
    magicLinkBuckets.set(bucketKey, recent);
    return true;
  }

  recent.push(now);
  magicLinkBuckets.set(bucketKey, recent);
  return false;
}

function resolveRedirectOrigin(request: NextRequest) {
  const rawOrigin = process.env.NEXT_PUBLIC_GYM_TRACKER_ORIGIN?.trim();

  if (!rawOrigin) {
    return new URL(request.url).origin;
  }

  try {
    const parsed = new URL(rawOrigin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function toPublicAuthError(error: { message?: string; status?: number; code?: string } | null) {
  if (error?.status === 429 || error?.code === "over_email_send_rate_limit") {
    return {
      status: 429,
      message: "Zu viele Magic-Link-Mails. Warte kurz und versuch es dann nochmal.",
    };
  }

  if (error?.message === "Email logins are disabled") {
    return {
      status: 503,
      message: "Email-Login ist im Supabase-Projekt aktuell deaktiviert.",
    };
  }

  return {
    status: 500,
    message: "Magic Link konnte nicht gesendet werden.",
  };
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

  let body: { email?: string };

  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json(
      { error: "Request-Body ist kaputt." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { error: "Mailadresse fehlt." },
      { status: 400 },
    );
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(`ip:${clientIp}`) || isRateLimited(`email:${email}`)) {
    return NextResponse.json(
      { error: "Zu viele Magic-Link-Anfragen. Warte kurz und versuch es dann nochmal." },
      { status: 429 },
    );
  }

  if (!allowedEmails.includes(email)) {
    return NextResponse.json({
      message: "Wenn die Adresse freigeschaltet ist, ist der Magic Link unterwegs.",
    });
  }

  const origin = resolveRedirectOrigin(request);
  if (!origin) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_GYM_TRACKER_ORIGIN ist ungueltig konfiguriert." },
      { status: 500 },
    );
  }

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
    const publicError = toPublicAuthError(error);
    return NextResponse.json(
      { error: publicError.message },
      { status: publicError.status },
    );
  }

  return NextResponse.json({
    message: "Wenn die Adresse freigeschaltet ist, ist der Magic Link unterwegs.",
  });
}
