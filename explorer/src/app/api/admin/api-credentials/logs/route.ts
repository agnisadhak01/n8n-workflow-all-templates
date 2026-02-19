import { NextRequest, NextResponse } from "next/server";
import { listApiRequestLogs } from "@/lib/api-logs";

/**
 * GET /api/admin/api-credentials/logs
 * List API request logs. Protected by admin middleware.
 * Query params: limit, credential_id, endpoint
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 500) : 100;
  const credentialId = url.searchParams.get("credential_id")?.trim() || undefined;
  const endpoint = url.searchParams.get("endpoint")?.trim() || undefined;

  const result = await listApiRequestLogs({
    limit,
    credentialId,
    endpoint,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
