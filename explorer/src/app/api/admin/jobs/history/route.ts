import { NextResponse } from "next/server";
import { getJobHistory } from "@/lib/admin-jobs";
import type { JobType } from "@/lib/admin-jobs";

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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const type: JobType | undefined =
    typeParam === "enrichment" || typeParam === "scraper" || typeParam === "top2"
      ? typeParam
      : undefined;

  const result = await getJobHistory({ type });
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json(result);
}
