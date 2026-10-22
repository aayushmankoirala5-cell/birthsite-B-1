import "server-only";
import { NextResponse } from "next/server";

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof RequestError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  // Avoid logging connection URLs, request bodies, or other customer information.
  console.error("BirthSite: a server operation failed.");
  return NextResponse.json(
    { error: "Something went wrong. Please try again shortly." },
    { status: 500 },
  );
}

export async function readJson(
  request: Request,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new RequestError("Send a JSON request.", 415);
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > 60_000)
    throw new RequestError("Request is too large.", 413);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new RequestError("Invalid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new RequestError("Invalid request.");
  return data as Record<string, unknown>;
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next uses the inbound host for route URLs. Never trust an arbitrary forwarded host.
  const host = request.headers.get("host") ?? url.host;
  if (!origin)
    throw new RequestError("A same-origin request is required.", 403);
  try {
    const parsed = new URL(origin);
    if (
      parsed.host !== host ||
      !["https:", "http:"].includes(parsed.protocol)
    ) {
      throw new Error("origin");
    }
    if (
      process.env.NODE_ENV === "production" &&
      parsed.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
    ) {
      throw new Error("origin");
    }
  } catch {
    throw new RequestError("This request could not be verified.", 403);
  }
}
