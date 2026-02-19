import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ANALYSAX_SERVICES } from "@/lib/analyzax-mapping";
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
 * GET /api/analyzax/services
 *
 * Returns available services metadata for AnalyzAX integration.
 * Requires API key with scope analyzax:services.
 *
 * Auth: x-api-key or Authorization: Bearer <key>
 */
export async function GET(request: NextRequest) {
  const authResult = await validateApiKey(request, API_SCOPES.ANALYSAX_SERVICES);
  if (!authResult.valid) {
    logApiRequest({
      credentialId: null,
      endpoint: "/api/analyzax/services",
      method: "GET",
      statusCode: 401,
      request,
    });
    return NextResponse.json(
      { error: authResult.error ?? "API key required" },
      { status: 401, headers: { ...jsonHeaders, ...corsHeaders } }
    );
  }

  const headers: Record<string, string> = {
    ...jsonHeaders,
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
    ...corsHeaders,
  };

  if (!supabase) {
    logApiRequest({
      credentialId: authResult.credential.id,
      endpoint: "/api/analyzax/services",
      method: "GET",
      statusCode: 200,
      responseSummary: { fallback: true },
      request,
    });
    return NextResponse.json(
      {
        supported_analyzax_services: [...ANALYSAX_SERVICES],
        sample_industries: [],
        sample_processes: [],
        message: "Supabase not configured; returning supported services only.",
      },
      { headers }
    );
  }

  try {
    const { data: analyticsRows, error } = await supabase
      .from("template_analytics")
      .select("applicable_industries, applicable_processes, top_2_industries, top_2_processes")
      .eq("enrichment_status", "enriched")
      .limit(2000);

    if (error) {
      console.error("[AnalyzaxServices] Supabase error:", error);
      logApiRequest({
        credentialId: authResult.credential.id,
        endpoint: "/api/analyzax/services",
        method: "GET",
        statusCode: 500,
        request,
      });
      return NextResponse.json(
        {
          supported_analyzax_services: [...ANALYSAX_SERVICES],
          sample_industries: [],
          sample_processes: [],
          error: "Failed to fetch analytics data",
        },
        { status: 500, headers }
      );
    }

    const industries = new Set<string>();
    const processes = new Set<string>();

    for (const row of analyticsRows ?? []) {
      const extractNames = (arr: unknown) => {
        if (!Array.isArray(arr)) return;
        for (const item of arr) {
          if (typeof item === "object" && item !== null && "name" in item) {
            const name = String((item as { name: unknown }).name).trim();
            if (name) industries.add(name);
          }
        }
      };
      const extractProcessNames = (arr: unknown) => {
        if (!Array.isArray(arr)) return;
        for (const item of arr) {
          if (typeof item === "object" && item !== null && "name" in item) {
            const name = String((item as { name: unknown }).name).trim();
            if (name) processes.add(name);
          }
        }
      };
      extractNames(row.applicable_industries);
      extractNames(row.top_2_industries);
      extractProcessNames(row.applicable_processes);
      extractProcessNames(row.top_2_processes);
    }

    const sampleIndustries = Array.from(industries).sort();
    const sampleProcesses = Array.from(processes).sort();

    logApiRequest({
      credentialId: authResult.credential.id,
      endpoint: "/api/analyzax/services",
      method: "GET",
      statusCode: 200,
      responseSummary: {
        industries_count: sampleIndustries.length,
        processes_count: sampleProcesses.length,
      },
      request,
    });

    return NextResponse.json(
      {
        supported_analyzax_services: [...ANALYSAX_SERVICES],
        sample_industries: sampleIndustries,
        sample_processes: sampleProcesses,
      },
      { headers }
    );
  } catch (err) {
    console.error("[AnalyzaxServices] Error:", err);
    logApiRequest({
      credentialId: authResult.credential.id,
      endpoint: "/api/analyzax/services",
      method: "GET",
      statusCode: 500,
      request,
    });
    return NextResponse.json(
      {
        supported_analyzax_services: [...ANALYSAX_SERVICES],
        sample_industries: [],
        sample_processes: [],
        error: "Internal server error",
      },
      { status: 500, headers }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight.
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
