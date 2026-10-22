import { NextResponse } from "next/server";
import {
  adminConfigured,
  clearAdminSession,
  isAdmin,
  requireAttempt,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/server/auth";
import {
  errorResponse,
  readJson,
  RequestError,
  requireSameOrigin,
} from "@/lib/server/errors";
import { storageReady } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(
      {
        authenticated: await isAdmin(),
        configured: adminConfigured(),
        storageReady: storageReady(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (!adminConfigured())
      throw new RequestError(
        "Admin access is disabled. Set ADMIN_PASSWORD (16+ characters) and ADMIN_SESSION_SECRET (32+ characters) in your environment settings.",
        503,
      );
    if (!storageReady())
      throw new RequestError(
        "Configure DATABASE_URL before managing customers in production.",
        503,
      );
    await requireAttempt(request, "admin-login", 5, 15);
    const data = await readJson(request);
    if (!verifyAdminPassword(data.password))
      throw new RequestError("That password isn't correct.", 401);
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    setAdminSession(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const response = NextResponse.json({ ok: true });
    clearAdminSession(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
