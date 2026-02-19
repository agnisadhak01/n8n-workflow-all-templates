import { NextRequest, NextResponse } from "next/server";
import { listApiCredentials, createApiCredential } from "@/lib/api-credentials";

/**
 * GET /api/admin/api-credentials
 * List all API credentials. Protected by admin middleware.
 */
export async function GET() {
  const result = await listApiCredentials();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}

/**
 * POST /api/admin/api-credentials
 * Create a new API key. Returns full key once; store it securely.
 * Body: { name: string, scopes: string[] }
 */
export async function POST(request: NextRequest) {
  let body: { name?: string; scopes?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const result = await createApiCredential({
    name: body.name ?? "",
    scopes: Array.isArray(body.scopes) ? body.scopes : [],
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Name is required" || result.error === "At least one scope is required" ? 400 : 500 }
    );
  }

  return NextResponse.json({
    credential: result.credential,
    key: result.key,
    message: "Store this key securely. It will not be shown again.",
  });
}
