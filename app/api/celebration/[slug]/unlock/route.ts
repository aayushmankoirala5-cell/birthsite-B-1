import { NextResponse } from "next/server";
import { requireAttempt, setUnlockSession } from "@/lib/server/auth";
import {
  errorResponse,
  readJson,
  RequestError,
  requireSameOrigin,
} from "@/lib/server/errors";
import {
  getCustomerBySlug,
  toPublic,
  verifyBirthYear,
} from "@/lib/server/store";
import { validateBirthYear } from "@/lib/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    requireSameOrigin(request);
    const { slug } = await context.params;
    await requireAttempt(request, `unlock:${slug}`, 10, 10);
    const year = validateBirthYear((await readJson(request)).birthYear);
    const customer = await getCustomerBySlug(slug);
    if (!customer)
      throw new RequestError("This celebration could not be found.", 404);
    if (!verifyBirthYear(year, customer.passwordHash))
      throw new RequestError("Not quite. Try the year you were born.", 401);
    const response = NextResponse.json(
      { celebration: toPublic(customer) },
      { headers: { "Cache-Control": "no-store" } },
    );
    setUnlockSession(response, customer);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
