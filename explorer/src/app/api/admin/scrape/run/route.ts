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

  loadScraperEnvIfNeeded();
  const result = await startScraperInBackground();
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
