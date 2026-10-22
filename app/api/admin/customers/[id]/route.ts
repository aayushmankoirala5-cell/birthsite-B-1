import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  errorResponse,
  readJson,
  RequestError,
  requireSameOrigin,
} from "@/lib/server/errors";
import {
  deleteCustomer,
  getCustomerById,
  toAdmin,
  updateCustomer,
} from "@/lib/server/store";
import { validateCustomer } from "@/lib/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    const existing = await getCustomerById(id);
    if (!existing) throw new RequestError("Customer not found.", 404);
    const input = validateCustomer(await readJson(request), existing);
    return NextResponse.json(
      { customer: toAdmin(await updateCustomer(id, input)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await requireAdmin();
    await deleteCustomer((await context.params).id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
