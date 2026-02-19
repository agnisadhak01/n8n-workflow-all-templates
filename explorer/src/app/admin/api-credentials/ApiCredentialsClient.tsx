"use client";

import { useState, useEffect } from "react";

type ApiRequestLogRow = {
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

type ApiCredentialRow = {
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

const SCOPE_LABELS: Record<string, string> = {
  "analyzax:templates": "AnalyzAX templates",
  "analyzax:services": "AnalyzAX services",
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return "—";
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-2 rounded border border-zinc-600 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

export function ApiCredentialsClient() {
  const [credentials, setCredentials] = useState<ApiCredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createScopes, setCreateScopes] = useState<string[]>([
    "analyzax:templates",
    "analyzax:services",
  ]);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newCredential, setNewCredential] = useState<ApiCredentialRow | null>(null);
  const [logs, setLogs] = useState<ApiRequestLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilterCredential, setLogsFilterCredential] = useState<string>("");
  const [logsFilterEndpoint, setLogsFilterEndpoint] = useState<string>("");

  const fetchCredentials = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-credentials");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load credentials");
        setCredentials([]);
        return;
      }
      setCredentials(data.credentials ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load credentials");
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (logsFilterCredential) params.set("credential_id", logsFilterCredential);
      if (logsFilterEndpoint) params.set("endpoint", logsFilterEndpoint);
      const res = await fetch(`/api/admin/api-credentials/logs?${params}`);
      const data = await res.json();
      if (res.ok) setLogs(data.logs ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [logsFilterCredential, logsFilterEndpoint]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    setNewKey(null);
    setNewCredential(null);
    try {
      const res = await fetch("/api/admin/api-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), scopes: createScopes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create key");
        return;
      }
      setNewKey(data.key);
      setNewCredential(data.credential);
      setCreateName("");
      setCredentials((prev) => [data.credential, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const toggleScope = (scope: string) => {
    setCreateScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API key? It will no longer work.")) return;
    try {
      const res = await fetch(`/api/admin/api-credentials/${id}/revoke`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to revoke");
        return;
      }
      setCredentials((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: false } : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke");
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-200">
          {error}
        </div>
      )}

      {newKey && newCredential && (
        <div className="rounded-lg border border-amber-700 bg-amber-900/20 p-4">
          <p className="font-medium text-amber-200">API key created. Store it securely — it won&apos;t be shown again.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-zinc-800 px-2 py-1 font-mono text-sm text-zinc-200">
              {newKey}
            </code>
            <CopyButton text={newKey} label="Copy" />
          </div>
          <button
            type="button"
            onClick={() => {
              setNewKey(null);
              setNewCredential(null);
            }}
            className="mt-3 text-sm text-amber-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h2 className="mb-4 text-lg font-semibold">Create API key</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-zinc-400">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. AnalyzAX Production"
              className="w-full max-w-md rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-zinc-400">Scopes</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(SCOPE_LABELS).map(([scope, label]) => (
                <label key={scope} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || createScopes.length === 0}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create key"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h2 className="mb-4 text-lg font-semibold">API keys</h2>
        {loading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : credentials.length === 0 ? (
          <p className="text-zinc-500">No API keys yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-zinc-500">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Prefix</th>
                  <th className="pb-2 pr-4">Scopes</th>
                  <th className="pb-2 pr-4">Last used</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-700/50">
                    <td className="py-3 pr-4 font-medium">{c.name}</td>
                    <td className="py-3 pr-4 font-mono text-zinc-400">{c.key_prefix}…</td>
                    <td className="py-3 pr-4">
                      <span className="text-zinc-400">
                        {(c.scopes ?? []).map((s) => SCOPE_LABELS[s] ?? s).join(", ")}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">{formatDate(c.last_used_at)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          c.is_active
                            ? "text-emerald-400"
                            : "text-zinc-500"
                        }
                      >
                        {c.is_active ? "Active" : "Revoked"}
                      </span>
                    </td>
                    <td className="py-3">
                      {c.is_active && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(c.id)}
                          className="rounded border border-red-700/50 px-2 py-0.5 text-xs text-red-400 hover:bg-red-900/30"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h2 className="mb-4 text-lg font-semibold">API request history</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={logsFilterCredential}
            onChange={(e) => setLogsFilterCredential(e.target.value)}
            className="rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-200"
          >
            <option value="">All keys</option>
            {credentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.key_prefix}…)
              </option>
            ))}
          </select>
          <select
            value={logsFilterEndpoint}
            onChange={(e) => setLogsFilterEndpoint(e.target.value)}
            className="rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-200"
          >
            <option value="">All endpoints</option>
            <option value="/api/analyzax/templates">/api/analyzax/templates</option>
            <option value="/api/analyzax/services">/api/analyzax/services</option>
          </select>
          <button
            type="button"
            onClick={fetchLogs}
            className="rounded border border-zinc-600 px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>
        {logsLoading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-zinc-500">No API requests logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-zinc-500">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Key</th>
                  <th className="pb-2 pr-4">Endpoint</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Params</th>
                  <th className="pb-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const cred = credentials.find((c) => c.id === log.credential_id);
                  const statusColor =
                    log.status_code >= 200 && log.status_code < 300
                      ? "text-emerald-400"
                      : log.status_code >= 400
                        ? "text-red-400"
                        : "text-zinc-400";
                  const paramsStr =
                    log.request_params && Object.keys(log.request_params).length > 0
                      ? JSON.stringify(log.request_params)
                      : "—";
                  return (
                    <tr key={log.id} className="border-b border-zinc-700/50">
                      <td className="py-2 pr-4 text-zinc-400">{formatDate(log.created_at)}</td>
                      <td className="py-2 pr-4">
                        {cred ? (
                          <span title={cred.id}>
                            {cred.name} ({cred.key_prefix}…)
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 font-mono text-zinc-300">{log.endpoint}</td>
                      <td className={`py-2 pr-4 ${statusColor}`}>{log.status_code}</td>
                      <td className="max-w-[200px] truncate py-2 pr-4 font-mono text-xs text-zinc-500" title={paramsStr}>
                        {paramsStr}
                      </td>
                      <td className="py-2 text-zinc-500">{log.ip_address ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4 text-sm text-zinc-400">
        <h3 className="mb-2 font-medium text-zinc-300">Usage</h3>
        <p className="mb-2">
          Include the API key in requests using either:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <code className="rounded bg-zinc-800 px-1">x-api-key: your_key</code>
          </li>
          <li>
            <code className="rounded bg-zinc-800 px-1">Authorization: Bearer your_key</code>
          </li>
        </ul>
        <p className="mt-2">
          Endpoints require the appropriate scope (e.g. <code className="rounded bg-zinc-800 px-1">analyzax:templates</code> for templates, <code className="rounded bg-zinc-800 px-1">analyzax:services</code> for services).
        </p>
      </div>
    </div>
  );
}
