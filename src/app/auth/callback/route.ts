import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

interface PendingCookieMutation {
  name: string;
  options?: CookieOptions;
  value: string;
}

function hasUnsafeNextPathSyntax(value: string): boolean {
  let candidate = value;

  for (let pass = 0; pass < 3; pass += 1) {
    if (
      !candidate ||
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

function safeNextPath(value: string | null) {
  const fallbackPath = "/private";
  const baseUrl = new URL("https://gym.w3yh.invalid");

  if (!value || hasUnsafeNextPathSyntax(value)) {
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
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
  const loginUrl = new URL("/private", origin);
  loginUrl.searchParams.set("next", nextPath);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    loginUrl.searchParams.set("error", "Supabase ist nicht konfiguriert.");
    return NextResponse.redirect(loginUrl);
  }

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return createRedirectResponse(
        new URL(nextPath, origin),
        [...pendingCookies.values()],
        pendingHeaders,
      );
    }

    loginUrl.searchParams.set("error", error.message);
    return createRedirectResponse(
      loginUrl,
      [...pendingCookies.values()],
      pendingHeaders,
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });

    if (!error) {
      return createRedirectResponse(
        new URL(nextPath, origin),
        [...pendingCookies.values()],
        pendingHeaders,
      );
    }

    loginUrl.searchParams.set("error", error.message);
    return createRedirectResponse(
      loginUrl,
      [...pendingCookies.values()],
      pendingHeaders,
    );
  }

  loginUrl.searchParams.set("error", "Missing authentication token.");
  return createRedirectResponse(
    loginUrl,
    [...pendingCookies.values()],
    pendingHeaders,
  );
}
