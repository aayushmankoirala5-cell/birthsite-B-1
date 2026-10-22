import { NextResponse } from "next/server";
import { errorResponse, RequestError } from "@/lib/server/errors";
import { getPublicTeaser } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const celebration = await getPublicTeaser((await context.params).slug);
    if (!celebration)
      throw new RequestError("This celebration could not be found.", 404);
    return NextResponse.json(
      { celebration },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
