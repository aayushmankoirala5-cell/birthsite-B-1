import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { RequestError } from "./errors";
import { consumeAttempt, type CustomerRecord, storageReady } from "./store";

export const ADMIN_COOKIE = "birthsite_admin";
const ADMIN_DURATION = 8 * 60 * 60;
const UNLOCK_DURATION = 24 * 60 * 60;

export function adminConfigured() {
  return Boolean(
    process.env.ADMIN_PASSWORD &&
    process.env.ADMIN_PASSWORD.length >= 16 &&
    process.env.ADMIN_SESSION_SECRET &&
    process.env.ADMIN_SESSION_SECRET.length >= 32,
  );
}

function secret(demo = false): string {
  if (
    process.env.ADMIN_SESSION_SECRET &&
    process.env.ADMIN_SESSION_SECRET.length >= 32
  )
    return process.env.ADMIN_SESSION_SECRET;
  // This fallback signs ONLY the intentionally public, built-in sample. Never customer/admin sessions.
  if (demo) return "birthsite-public-sample-only-not-a-customer-secret-v1";
  throw new RequestError(
    "Secure sessions are not configured. Add a strong ADMIN_SESSION_SECRET.",
    503,
  );
}

function sign(payload: Record<string, string | number>, demo = false) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret(demo))
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

function verify(
  token: string | undefined,
  demo = false,
): Record<string, unknown> | null {
  if (!token || token.length > 2000) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const expected = createHmac("sha256", secret(demo))
      .update(parts[0])
      .digest();
    const actual = Buffer.from(parts[1], "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    const payload = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    );
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const payload = verify((await cookies()).get(ADMIN_COOKIE)?.value);
  // A password/secret rotation invalidates existing admin sessions.
  return payload?.role === "admin" && payload.version === passwordVersion();
}

export async function requireAdmin() {
  if (!adminConfigured())
    throw new RequestError(
      "Admin access is disabled. Configure ADMIN_PASSWORD (16+ characters) and ADMIN_SESSION_SECRET (32+ characters).",
      503,
    );
  if (!(await isAdmin()))
    throw new RequestError("Please sign in to manage customers.", 401);
  if (!storageReady())
    throw new RequestError(
      "Add DATABASE_URL to enable persistent customer storage in production.",
      503,
    );
}

function passwordVersion() {
  return createHash("sha256")
    .update(process.env.ADMIN_PASSWORD ?? "")
    .digest("hex")
    .slice(0, 16);
}

export function verifyAdminPassword(password: unknown) {
  if (
    !adminConfigured() ||
    typeof password !== "string" ||
    password.length > 1024
  )
    return false;
  return timingSafeEqual(
    createHash("sha256").update(password).digest(),
    createHash("sha256").update(process.env.ADMIN_PASSWORD!).digest(),
  );
}

export function setAdminSession(response: NextResponse) {
  response.cookies.set(
    ADMIN_COOKIE,
    sign({
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + ADMIN_DURATION,
      version: passwordVersion(),
    }),
    cookieOptions(ADMIN_DURATION),
  );
}

export function clearAdminSession(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, "", cookieOptions(0));
}

export function setUnlockSession(
  response: NextResponse,
  customer: CustomerRecord,
) {
  const isDemo = customer.id === "demo";
  const payload = sign(
    {
      role: "celebration",
      id: customer.id,
      version: customer.passwordVersion,
      exp: Math.floor(Date.now() / 1000) + UNLOCK_DURATION,
    },
    isDemo,
  );
  response.cookies.set(
    `birthsite_unlock_${customer.id}`,
    payload,
    cookieOptions(UNLOCK_DURATION),
  );
}

export async function isUnlocked(customer: CustomerRecord) {
  const payload = verify(
    (await cookies()).get(`birthsite_unlock_${customer.id}`)?.value,
    customer.id === "demo",
  );
  return (
    payload?.role === "celebration" &&
    payload.id === customer.id &&
    payload.version === customer.passwordVersion
  );
}

export async function requireAttempt(
  request: Request,
  scope: string,
  limit: number,
  minutes: number,
) {
  // In production the hosting proxy must overwrite this header (Vercel does).
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = createHash("sha256").update(`${scope}:${ip}`).digest("hex");
  if (!(await consumeAttempt(key, limit, minutes * 60_000))) {
    throw new RequestError(
      `Too many attempts. Please try again in ${minutes} minutes.`,
      429,
    );
  }
}
