import { NextResponse } from "next/server";
import { loadScraperEnvIfNeeded } from "@/lib/load-scraper-env";
import { startServiceableNameInBackground } from "@/lib/service-name-run";

function getSecret(request: Request): string | null {
  const header = request.headers.get("x-admin-secret");
  if (header) return header;
  const url = new URL(request.url);
  return url.searchParams.get("secret");
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.ENRICHMENT_ADMIN_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const provided = getSecret(request);
  return provided !== null && provided === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let options: { batchSize?: number; limit?: number; refresh?: boolean } = {};
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text) as Record<string, unknown>;
      if (typeof body.batchSize === "number") {
        options.batchSize = Math.max(1, Math.min(500, Math.floor(body.batchSize)));
      }
      if (typeof body.limit === "number") {
        options.limit = Math.max(0, Math.floor(body.limit));
      }
      if (typeof body.refresh === "boolean") {
        options.refresh = body.refresh;
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  loadScraperEnvIfNeeded();
  const result = await startServiceableNameInBackground(options);
  if (!result.ok) {
    return NextResponse.json(
      { error: `Failed to start serviceable name enrichment: ${result.error}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message:
        "Serviceable name enrichment started in background. Use status endpoint to monitor.",
    },
    { status: 202 }
  );
}
