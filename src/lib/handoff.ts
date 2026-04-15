import { createHmac, timingSafeEqual } from "node:crypto";

type GymHandoffEnv = Pick<NodeJS.ProcessEnv, "W3YH_PRIVATE_HANDOFF_SECRET">;

interface GymHandoffSession {
  accessToken: string;
  refreshToken: string;
}

interface GymHandoffPayload {
  app: "gym";
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  nextPath: string;
  nonce: string;
  session: GymHandoffSession;
  sub: string;
}

type VerifiedHandoff =
  | { ok: true; payload: GymHandoffPayload }
  | { error: string; ok: false };

const SERVER_ENV: GymHandoffEnv = {
  W3YH_PRIVATE_HANDOFF_SECRET: process.env.W3YH_PRIVATE_HANDOFF_SECRET,
};

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, "base64");
}

function isValidSession(session: unknown): session is GymHandoffSession {
  return Boolean(
    session &&
      typeof session === "object" &&
      "accessToken" in session &&
      typeof session.accessToken === "string" &&
      session.accessToken &&
      "refreshToken" in session &&
      typeof session.refreshToken === "string" &&
      session.refreshToken,
  );
}

function isValidPayload(payload: unknown): payload is GymHandoffPayload {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "app" in payload &&
      payload.app === "gym" &&
      "aud" in payload &&
      payload.aud === "gym" &&
      "exp" in payload &&
      typeof payload.exp === "number" &&
      "iat" in payload &&
      typeof payload.iat === "number" &&
      "iss" in payload &&
      typeof payload.iss === "string" &&
      payload.iss &&
      "nextPath" in payload &&
      typeof payload.nextPath === "string" &&
      payload.nextPath.startsWith("/") &&
      "nonce" in payload &&
      typeof payload.nonce === "string" &&
      payload.nonce &&
      "sub" in payload &&
      typeof payload.sub === "string" &&
      payload.sub &&
      "session" in payload &&
      isValidSession(payload.session),
  );
}

function getHandoffSecret(env: GymHandoffEnv = SERVER_ENV): string | undefined {
  const secret = env.W3YH_PRIVATE_HANDOFF_SECRET?.trim();
  return secret || undefined;
}

export function verifyGymHandoffToken(
  token: string | null,
  env: GymHandoffEnv = SERVER_ENV,
): VerifiedHandoff {
  const secret = getHandoffSecret(env);

  if (!secret) {
    return {
      ok: false,
      error: "Private-Gate-Handoff ist noch nicht konfiguriert.",
    };
  }

  if (!token) {
    return {
      ok: false,
      error: "Kein Handoff-Token uebergeben.",
    };
  }

  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return {
      ok: false,
      error: "Handoff-Token ist unvollstaendig.",
    };
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest();

  let providedSignature: Buffer;
  let payload: unknown;

  try {
    providedSignature = fromBase64Url(encodedSignature);
    payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8"));
  } catch {
    return {
      ok: false,
      error: "Handoff-Token konnte nicht gelesen werden.",
    };
  }

  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return {
      ok: false,
      error: "Handoff-Signatur ist ungueltig.",
    };
  }

  if (!isValidPayload(payload)) {
    return {
      ok: false,
      error: "Handoff-Payload ist ungueltig.",
    };
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return {
      ok: false,
      error: "Handoff-Token ist bereits abgelaufen.",
    };
  }

  return {
    ok: true,
    payload,
  };
}
