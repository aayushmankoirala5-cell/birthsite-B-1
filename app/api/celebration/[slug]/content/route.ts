import { NextResponse } from "next/server";
import { isUnlocked } from "@/lib/server/auth";
import { errorResponse, RequestError } from "@/lib/server/errors";
import { getCustomerBySlug, toPublic } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const customer = await getCustomerBySlug((await context.params).slug);
    if (!customer)
      throw new RequestError("This celebration could not be found.", 404);
    if (!(await isUnlocked(customer)))
      throw new RequestError("Unlock this celebration first.", 401);
    return NextResponse.json(
      { celebration: toPublic(customer) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
