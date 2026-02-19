import Link from "next/link";
import { Header } from "@/components/Header";
import { ApiCredentialsClient } from "./ApiCredentialsClient";

export default function ApiCredentialsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">API credentials</h1>
            <p className="mt-1 text-zinc-400">
              Create and manage API keys for data APIs (e.g. AnalyzAX templates and services).
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/enrichment"
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
            >
              Enrichment admin
            </Link>
            <form action="/api/admin/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <ApiCredentialsClient />
      </main>
    </div>
  );
}
