import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  errorResponse,
  readJson,
  requireSameOrigin,
} from "@/lib/server/errors";
import { createCustomer, listCustomers, toAdmin } from "@/lib/server/store";
import { validateCustomer } from "@/lib/server/validation";
import type { CustomerInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(
      { customers: (await listCustomers()).map(toAdmin) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireAdmin();
    const validated = validateCustomer(
      await readJson(request),
    ) as CustomerInput;
    const customer = await createCustomer(validated);
    return NextResponse.json(
      { customer: toAdmin(customer) },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
