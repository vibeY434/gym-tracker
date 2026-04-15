import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { verifyGymHandoffToken } from "@/lib/handoff";

interface PendingCookieMutation {
  name: string;
  options?: CookieOptions;
  value: string;
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/private";
  }

  return value;
}

function createRedirectResponse(
  url: URL,
  cookiesToSet: PendingCookieMutation[],
  headersToSet: Headers,
) {
  const response = NextResponse.redirect(url);

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  headersToSet.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const privateUrl = new URL("/private", origin);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    privateUrl.searchParams.set("error", "Supabase ist nicht konfiguriert.");
    return NextResponse.redirect(privateUrl);
  }

  const verified = verifyGymHandoffToken(requestUrl.searchParams.get("handoff"));

  if (!verified.ok) {
    privateUrl.searchParams.set("error", verified.error);
    return NextResponse.redirect(privateUrl);
  }

  const nextPath = safeNextPath(verified.payload.nextPath);
  const requestCookies = request.headers.get("cookie") ?? "";
  const baseCookies = requestCookies
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const pendingCookies = new Map<string, PendingCookieMutation>();
  const pendingHeaders = new Headers();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const parsedCookies = baseCookies.map((entry) => {
          const separatorIndex = entry.indexOf("=");

          if (separatorIndex === -1) {
            return {
              name: entry,
              value: "",
            };
          }

          return {
            name: entry.slice(0, separatorIndex),
            value: decodeURIComponent(entry.slice(separatorIndex + 1)),
          };
        });

        pendingCookies.forEach(({ name, value }) => {
          const existingIndex = parsedCookies.findIndex(
            (cookie) => cookie.name === name,
          );

          if (existingIndex === -1) {
            parsedCookies.push({ name, value });
            return;
          }

          parsedCookies[existingIndex] = { name, value };
        });

        return parsedCookies;
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.set(name, {
            name,
            value,
            options,
          });
        });

        Object.entries(headersToSet).forEach(([key, value]) => {
          pendingHeaders.set(key, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.setSession({
    access_token: verified.payload.session.accessToken,
    refresh_token: verified.payload.session.refreshToken,
  });

  if (error) {
    privateUrl.searchParams.set("error", error.message);
    return createRedirectResponse(
      privateUrl,
      [...pendingCookies.values()],
      pendingHeaders,
    );
  }

  return createRedirectResponse(
    new URL(nextPath, origin),
    [...pendingCookies.values()],
    pendingHeaders,
  );
}
