import { NextRequest, NextResponse } from "next/server";
import { revokeApiCredential } from "@/lib/api-credentials";

/**
 * POST /api/admin/api-credentials/[id]/revoke
 * Revoke an API key (set is_active = false). Protected by admin middleware.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing credential ID" }, { status: 400 });
  }

  const result = await revokeApiCredential(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "API key revoked" });
}
