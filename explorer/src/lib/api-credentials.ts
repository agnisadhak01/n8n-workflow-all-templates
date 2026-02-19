/**
 * API credentials CRUD - uses service role for api_credentials table.
 */

import { createClient } from "@supabase/supabase-js";
import { hashApiKey, generateApiKey } from "./api-auth";
import { API_SCOPES } from "./api-auth";

const SCOPE_OPTIONS = [
  API_SCOPES.ANALYSAX_TEMPLATES,
  API_SCOPES.ANALYSAX_SERVICES,
] as const;

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

export type ApiCredentialRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
};

export async function listApiCredentials(): Promise<
  { credentials: ApiCredentialRow[] } | { error: string }
> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("api_credentials")
      .select("id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at, created_by")
      .order("created_at", { ascending: false });

    if (error) return { error: error.message };
    return { credentials: (data ?? []) as ApiCredentialRow[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createApiCredential(options: {
  name: string;
  scopes: string[];
  createdBy?: string;
}): Promise<
  | { credential: ApiCredentialRow; key: string }
  | { error: string }
> {
  const { name, scopes, createdBy } = options;
  const trimmedName = name?.trim();
  if (!trimmedName) return { error: "Name is required" };

  const validScopes = scopes.filter((s) =>
    SCOPE_OPTIONS.includes(s as (typeof SCOPE_OPTIONS)[number])
  );
  if (validScopes.length === 0) return { error: "At least one scope is required" };

  const { key, keyPrefix } = generateApiKey();
  const keyHash = await hashApiKey(key);

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("api_credentials")
      .insert({
        name: trimmedName,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes: validScopes,
        is_active: true,
        created_by: createdBy ?? null,
      })
      .select("id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at, created_by")
      .single();

    if (error) return { error: error.message };
    return {
      credential: data as ApiCredentialRow,
      key,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function revokeApiCredential(id: string): Promise<
  { ok: true } | { error: string }
> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("api_credentials")
      .update({ is_active: false })
      .eq("id", id);

    if (error) return { error: error.message };
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export { SCOPE_OPTIONS };
