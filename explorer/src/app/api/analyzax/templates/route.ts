import { NextRequest, NextResponse } from "next/server";
import { fetchTemplatesForAnalyzax } from "@/lib/analyzax-templates";
import { validateApiKey, API_SCOPES } from "@/lib/api-auth";
import { logApiRequest } from "@/lib/api-logs";

const jsonHeaders = {
  "Content-Type": "application/json",
  "WWW-Authenticate": "Bearer",
};
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

/**
 * GET /api/analyzax/templates
 *
 * Returns enriched n8n templates filtered by industry and AnalyzAX service names.
 * Used by AnalyzAX to display "Suggested Workflows" in evaluation reports.
 * Requires API key with scope analyzax:templates.
 *
 * Query params:
 *   - industry: string (optional) - User's industry (e.g. Healthcare, Retail)
 *   - services: string - Comma-separated AnalyzAX service names (e.g. "Lead Generation,Customer Management")
 *   - limit: number (optional, default 15, max 50) - Max templates to return
 *
 * Auth: x-api-key or Authorization: Bearer <key>
 */
export async function GET(request: NextRequest) {
  const authResult = await validateApiKey(request, API_SCOPES.ANALYSAX_TEMPLATES);
  if (!authResult.valid) {
    logApiRequest({
      credentialId: null,
      endpoint: "/api/analyzax/templates",
      method: "GET",
      statusCode: 401,
      request,
    });
    return NextResponse.json(
      { error: authResult.error ?? "API key required" },
      { status: 401, headers: { ...jsonHeaders, ...corsHeaders } }
    );
  }

  const url = new URL(request.url);
  const industry = url.searchParams.get("industry")?.trim() || null;
  const servicesParam = url.searchParams.get("services")?.trim() || "";
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 50) : 15;

  const services = servicesParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (services.length === 0) {
    logApiRequest({
      credentialId: authResult.credential.id,
      endpoint: "/api/analyzax/templates",
      method: "GET",
      requestParams: { industry, services: servicesParam, limit },
      statusCode: 400,
      request,
    });
    return NextResponse.json(
      { error: "Missing or empty 'services' query parameter (comma-separated)" },
      { status: 400, headers: { ...jsonHeaders, "Cache-Control": "no-store" } }
    );
  }

  try {
    const { templates, total_returned } = await fetchTemplatesForAnalyzax({
      industry,
      services,
      limit,
    });

    const headers: Record<string, string> = {
      ...jsonHeaders,
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Total-Returned": String(total_returned),
      ...corsHeaders,
    };

    logApiRequest({
      credentialId: authResult.credential.id,
      endpoint: "/api/analyzax/templates",
      method: "GET",
      requestParams: { industry, services, limit },
      statusCode: 200,
      responseSummary: { templates_returned: total_returned },
      request,
    });

    return NextResponse.json({ templates }, { headers });
  } catch (error) {
    console.error("[AnalyzaxTemplates] Error:", error);
    logApiRequest({
      credentialId: authResult.credential.id,
      endpoint: "/api/analyzax/templates",
      method: "GET",
      requestParams: { industry, services, limit },
      statusCode: 500,
      request,
    });
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500, headers: { ...jsonHeaders, "Cache-Control": "no-store", ...corsHeaders } }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight (AnalyzAX may call from different origin).
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
