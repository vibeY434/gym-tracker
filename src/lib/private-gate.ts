import "server-only";

import { createClient } from "@supabase/supabase-js";

const HANDOFF_CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SAFE_NEXT_PATH_MAX_LENGTH = 2048;

export interface RedeemedGymIdentity {
  email: string;
  nextPath: string;
  userId: string;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getAllowedEmails(): string[] {
  const raw = process.env.GYM_ALLOWED_EMAILS?.trim();

  if (!raw) {
    return [];
  }

  return [
    ...new Set(
      raw
        .split(",")
        .map((email) => normalizeEmail(email))
        .filter(Boolean),
    ),
  ];
}

export function isGymAllowedEmail(email: string): boolean {
  const allowedEmails = getAllowedEmails();

  return (
    allowedEmails.length > 0 &&
    allowedEmails.includes(normalizeEmail(email))
  );
}

export function isValidHandoffCode(value: unknown): value is string {
  return typeof value === "string" && HANDOFF_CODE_PATTERN.test(value);
}

function hasUnsafeNextPathSyntax(value: string): boolean {
  let candidate = value;

  for (let pass = 0; pass < 3; pass += 1) {
    if (
      !candidate ||
      candidate.length > SAFE_NEXT_PATH_MAX_LENGTH ||
      candidate[0] !== "/" ||
      candidate[1] === "/" ||
      candidate[1] === "\\" ||
      /[\\\u0000-\u001f\u007f]/.test(candidate)
    ) {
      return true;
    }

    try {
      const decoded = decodeURIComponent(candidate);

      if (decoded === candidate) {
        return false;
      }

      candidate = decoded;
    } catch {
      return true;
    }
  }

  return true;
}

export function getSafeGymNextPath(value: unknown): string {
  const fallbackPath = "/private";
  const baseUrl = new URL("https://gym.w3yh.invalid");

  if (typeof value !== "string" || hasUnsafeNextPathSyntax(value)) {
    return fallbackPath;
  }

  try {
    const targetUrl = new URL(value, baseUrl);
    const normalizedPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;

    if (
      targetUrl.origin !== baseUrl.origin ||
      hasUnsafeNextPathSyntax(normalizedPath)
    ) {
      return fallbackPath;
    }

    return normalizedPath;
  } catch {
    return fallbackPath;
  }
}

export function getPrivateGateOrigin(): string | undefined {
  const configured =
    process.env.NEXT_PUBLIC_W3YH_PRIVATE_GATE_ORIGIN?.trim() ||
    "https://private.w3yh.xyz";

  try {
    const url = new URL(configured);

    return url.protocol === "https:" ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

function getSupabaseServiceKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined
  );
}

export function createGymServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = getSupabaseServiceKey();

  if (!supabaseUrl || !serviceKey) {
    return undefined;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function isRedeemedGymIdentity(
  value: unknown,
): value is RedeemedGymIdentity & { audience: "gym" } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<
    RedeemedGymIdentity & { audience: string }
  >;

  return (
    candidate.audience === "gym" &&
    typeof candidate.email === "string" &&
    candidate.email.includes("@") &&
    typeof candidate.nextPath === "string" &&
    typeof candidate.userId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      candidate.userId,
    )
  );
}

export async function redeemGymHandoffCode(
  code: string,
): Promise<RedeemedGymIdentity | undefined> {
  const gateOrigin = getPrivateGateOrigin();
  const redeemSecret =
    process.env.W3YH_PRIVATE_HANDOFF_GYM_REDEEM_SECRET?.trim();

  if (!gateOrigin || !redeemSecret || redeemSecret.length < 32) {
    return undefined;
  }

  try {
    const response = await fetch(
      new URL("/api/private/handoff/redeem", gateOrigin),
      {
        body: JSON.stringify({ code }),
        cache: "no-store",
        headers: {
          authorization: `Bearer ${redeemSecret}`,
          "content-type": "application/json",
          "x-w3yh-handoff-audience": "gym",
        },
        method: "POST",
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      return undefined;
    }

    const data: unknown = await response.json();

    if (!isRedeemedGymIdentity(data)) {
      return undefined;
    }

    return {
      email: normalizeEmail(data.email),
      nextPath: getSafeGymNextPath(data.nextPath),
      userId: data.userId,
    };
  } catch {
    return undefined;
  }
}
