import { NextResponse } from "next/server";
import { loadScraperEnvIfNeeded } from "@/lib/load-scraper-env";
import { startEnrichmentInBackground } from "@/lib/enrich-run";

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

  loadScraperEnvIfNeeded();
  const result = startEnrichmentInBackground();
  if (!result.ok) {
    return NextResponse.json(
      { error: `Failed to start enrichment: ${result.error}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message:
        "Enrichment started in background. Use status endpoint to monitor.",
    },
    { status: 202 }
  );
}
