import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  createGymServiceClient,
  getPrivateGateOrigin,
  isGymAllowedEmail,
  isValidHandoffCode,
  redeemGymHandoffCode,
} from "@/lib/private-gate";

interface PendingCookieMutation {
  name: string;
  options?: CookieOptions;
  value: string;
}

const NO_STORE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

function createRedirectResponse(
  url: URL,
  cookiesToSet: PendingCookieMutation[] = [],
  headersToSet = new Headers(),
) {
  const response = NextResponse.redirect(url, { status: 303 });

  Object.entries(NO_STORE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  headersToSet.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

function getRequestCookies(request: Request) {
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex === -1) {
        return { name: entry, value: "" };
      }

      const name = entry.slice(0, separatorIndex);
      const rawValue = entry.slice(separatorIndex + 1);

      try {
        return { name, value: decodeURIComponent(rawValue) };
      } catch {
        return { name, value: rawValue };
      }
    });
}

function errorRedirect(origin: string, message: string) {
  const url = new URL("/private", origin);
  url.searchParams.set("error", message);
  return createRedirectResponse(url);
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const gateOrigin = getPrivateGateOrigin();

  if (!gateOrigin || request.headers.get("origin") !== gateOrigin) {
    return NextResponse.json(
      { error: "Nicht autorisierte Handoff-Origin." },
      { headers: NO_STORE_HEADERS, status: 403 },
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.startsWith("application/x-www-form-urlencoded")) {
    return NextResponse.json(
      { error: "Ungültiger Content-Type." },
      { headers: NO_STORE_HEADERS, status: 415 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorRedirect(origin, "Private-Gate-Code konnte nicht gelesen werden.");
  }

  const code = formData.get("code");

  if (!isValidHandoffCode(code)) {
    return errorRedirect(origin, "Private-Gate-Code ist ungültig.");
  }

  const identity = await redeemGymHandoffCode(code);

  if (!identity || !isGymAllowedEmail(identity.email)) {
    return errorRedirect(
      origin,
      "Private-Gate-Code ist ungültig, abgelaufen oder nicht freigeschaltet.",
    );
  }

  const serviceClient = createGymServiceClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!serviceClient || !supabaseUrl || !supabaseAnonKey) {
    return errorRedirect(origin, "Gym-Authentifizierung ist nicht konfiguriert.");
  }

  const [userResult, membershipResult] = await Promise.all([
    serviceClient.auth.admin.getUserById(identity.userId),
    serviceClient
      .from("private_app_memberships")
      .select("email")
      .eq("app_slug", "gym")
      .eq("user_id", identity.userId)
      .eq("status", "active")
      .maybeSingle<{ email: string }>(),
  ]);

  const user = userResult.data.user;
  const membership = membershipResult.data;

  if (
    userResult.error ||
    membershipResult.error ||
    !user?.email ||
    user.id !== identity.userId ||
    user.email.toLowerCase() !== identity.email ||
    membership?.email.toLowerCase() !== identity.email
  ) {
    return errorRedirect(origin, "Kein freigeschalteter Gym-Zugang.");
  }

  const linkResult = await serviceClient.auth.admin.generateLink({
    email: identity.email,
    type: "magiclink",
  });
  const tokenHash = linkResult.data.properties?.hashed_token;

  if (
    linkResult.error ||
    linkResult.data.user?.id !== identity.userId ||
    !tokenHash
  ) {
    return errorRedirect(origin, "Gym-Session konnte nicht erstellt werden.");
  }

  const baseCookies = getRequestCookies(request);
  const pendingCookies = new Map<string, PendingCookieMutation>();
  const pendingHeaders = new Headers();
  const cookieOptions = {
    path: "/",
    sameSite: "strict" as const,
    secure: requestUrl.protocol === "https:",
  };
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        const cookies = [...baseCookies];

        pendingCookies.forEach(({ name, value }) => {
          const existingIndex = cookies.findIndex(
            (cookie) => cookie.name === name,
          );

          if (existingIndex === -1) {
            cookies.push({ name, value });
          } else {
            cookies[existingIndex] = { name, value };
          }
        });

        return cookies;
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.set(name, {
            name,
            value,
            options: {
              ...options,
              ...cookieOptions,
            },
          });
        });

        Object.entries(headersToSet).forEach(([key, value]) => {
          pendingHeaders.set(key, value);
        });
      },
    },
  });

  const sessionResult = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (
    sessionResult.error ||
    sessionResult.data.user?.id !== identity.userId
  ) {
    return errorRedirect(origin, "Gym-Session konnte nicht bestätigt werden.");
  }

  return createRedirectResponse(
    new URL(identity.nextPath, origin),
    [...pendingCookies.values()],
    pendingHeaders,
  );
}

export function GET() {
  return NextResponse.json(
    { error: "Der Private-Gate-Handoff akzeptiert nur POST." },
    {
      headers: {
        ...NO_STORE_HEADERS,
        allow: "POST",
      },
      status: 405,
    },
  );
}
