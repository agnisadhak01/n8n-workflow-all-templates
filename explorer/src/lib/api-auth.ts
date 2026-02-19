/**
 * API key validation for data APIs (e.g. /api/analyzax/*).
 * Keys are validated via x-api-key or Authorization: Bearer header.
 */

import { createClient } from "@supabase/supabase-js";

export const API_SCOPES = {
  ANALYSAX_TEMPLATES: "analyzax:templates",
  ANALYSAX_SERVICES: "analyzax:services",
} as const;

export type ApiCredential = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
};

const KEY_PREFIX = "n8n_";
const KEY_LENGTH = 32; // 32 hex chars = 128 bits

function getSupabase() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
  return createClient(url, serviceKey);
}

/**
 * Compute SHA-256 hash of the key (hex string).
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a new API key. Format: n8n_ + 32 hex chars.
 * Returns { key, keyPrefix } - full key shown once; prefix for storage/display.
 */
export function generateApiKey(): { key: string; keyPrefix: string } {
  const bytes = new Uint8Array(KEY_LENGTH / 2);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `${KEY_PREFIX}${hex}`;
  const keyPrefix = key.slice(0, 8);
  return { key, keyPrefix };
}

/**
 * Extract API key from request.
 * Supports: x-api-key header, Authorization: Bearer <key>
 */
export function extractApiKey(request: Request): string | null {
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader?.trim()) return apiKeyHeader.trim();

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const key = auth.slice(7).trim();
    return key || null;
  }

  return null;
}

/**
 * Validate API key and optionally check scope.
 * Updates last_used_at on success.
 * Returns { valid, credential } or { valid: false, error }.
 */
export async function validateApiKey(
  request: Request,
  requiredScope?: string
): Promise<
  | { valid: true; credential: ApiCredential }
  | { valid: false; error?: string }
> {
  const key = extractApiKey(request);
  if (!key) {
    return { valid: false, error: "API key required" };
  }

  if (!key.startsWith(KEY_PREFIX) || key.length !== KEY_PREFIX.length + KEY_LENGTH) {
    return { valid: false, error: "Invalid API key format" };
  }

  const keyHash = await hashApiKey(key);

  try {
    const supabase = getSupabase();
    const { data: row, error } = await supabase
      .from("api_credentials")
      .select("id, name, key_prefix, scopes, last_used_at, expires_at")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[api-auth] Supabase error:", error);
      return { valid: false, error: "Authentication failed" };
    }

    if (!row) {
      return { valid: false, error: "Invalid API key" };
    }

    const expiresAt = row.expires_at as string | null;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return { valid: false, error: "API key expired" };
    }

    const scopes = (row.scopes ?? []) as string[];
    if (requiredScope && !scopes.includes(requiredScope)) {
      return { valid: false, error: "Insufficient scope" };
    }

    const credential: ApiCredential = {
      id: row.id,
      name: row.name,
      key_prefix: row.key_prefix,
      scopes,
      last_used_at: row.last_used_at,
      expires_at: expiresAt,
    };

    // Update last_used_at (fire-and-forget)
    supabase
      .from("api_credentials")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id)
      .then(() => {})
      .catch((err) => console.warn("[api-auth] Failed to update last_used_at:", err));

    return { valid: true, credential };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api-auth] Error:", msg);
    return { valid: false, error: "Authentication failed" };
  }
}
