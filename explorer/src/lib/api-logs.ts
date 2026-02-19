/**
 * API request logging for data APIs.
 * Records each request for auditing and history (fire-and-forget).
 */

import { createClient } from "@supabase/supabase-js";

export type LogApiRequestParams = {
  credentialId: string | null;
  endpoint: string;
  method?: string;
  requestParams?: Record<string, unknown>;
  statusCode: number;
  responseSummary?: Record<string, unknown>;
  request?: Request;
};

function getSupabase() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

function getClientIp(request?: Request): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip") ?? null;
}

export type ApiRequestLogRow = {
  id: string;
  credential_id: string | null;
  endpoint: string;
  method: string;
  request_params: Record<string, unknown>;
  status_code: number;
  response_summary: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export type ApiRequestLogWithCredential = ApiRequestLogRow;

/**
 * Fetch API request logs for admin dashboard.
 */
export async function listApiRequestLogs(options?: {
  limit?: number;
  credentialId?: string;
  endpoint?: string;
}): Promise<
  { logs: ApiRequestLogWithCredential[] } | { error: string }
> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const limit = Math.min(Math.max(1, options?.limit ?? 100), 500);

  try {
    let query = supabase
      .from("api_request_logs")
      .select("id, credential_id, endpoint, method, request_params, status_code, response_summary, ip_address, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options?.credentialId) {
      query = query.eq("credential_id", options.credentialId);
    }
    if (options?.endpoint) {
      query = query.eq("endpoint", options.endpoint);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };

    return { logs: (data ?? []) as ApiRequestLogWithCredential[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Log an API request. Fire-and-forget; does not throw.
 */
export function logApiRequest(params: LogApiRequestParams): void {
  const {
    credentialId,
    endpoint,
    method = "GET",
    requestParams = {},
    statusCode,
    responseSummary,
    request,
  } = params;

  const supabase = getSupabase();
  if (!supabase) return;

  const ipAddress = getClientIp(request);

  void Promise.resolve(
    supabase.from("api_request_logs").insert({
      credential_id: credentialId,
      endpoint,
      method,
      request_params: requestParams,
      status_code: statusCode,
      response_summary: responseSummary ?? null,
      ip_address: ipAddress,
    })
  ).then(({ error }) => {
    if (error) console.warn("[api-logs] Failed to insert log:", error.message);
  }).catch((err) => console.warn("[api-logs] Log error:", err));
}
