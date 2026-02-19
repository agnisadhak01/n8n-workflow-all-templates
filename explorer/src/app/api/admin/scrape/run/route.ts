import { NextResponse } from "next/server";
import { loadScraperEnvIfNeeded } from "@/lib/load-scraper-env";
import { startScraperInBackground } from "@/lib/scraper-run";

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

  let options: { batchSize?: number; delay?: number; limit?: number } = {};
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text) as Record<string, unknown>;
      if (typeof body.batchSize === "number") {
        options.batchSize = Math.max(1, Math.min(500, Math.floor(body.batchSize)));
      }
      if (typeof body.delay === "number") {
        options.delay = Math.max(0, body.delay);
      }
      if (typeof body.limit === "number") {
        options.limit = Math.max(0, Math.floor(body.limit));
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  loadScraperEnvIfNeeded();
  const result = await startScraperInBackground(options);
  if (!result.ok) {
    return NextResponse.json(
      { error: `Failed to start scraper: ${result.error}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message:
        "Template fetch (scraper) started in background. Use Refresh on the admin page to see updated template count.",
    },
    { status: 202 }
  );
}
