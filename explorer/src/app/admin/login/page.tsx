import Link from "next/link";
import { Header } from "@/components/Header";

type Props = { searchParams: Promise<{ error?: string; from?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error, from } = await searchParams;
  const redirectTo = from && from.startsWith("/admin") ? from : "/admin/enrichment";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-8">
          <h1 className="text-xl font-semibold text-zinc-200">Admin sign in</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Sign in to access the Enrichment admin page.
          </p>
          <form
            action="/api/admin/auth/login"
            method="POST"
            className="mt-6 space-y-4"
          >
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-zinc-300">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {error === "invalid" && (
              <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-300">
                Invalid username or password.
              </p>
            )}
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <input type="hidden" name="redirect" value={redirectTo} />
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              Sign in
            </button>
          </form>
          <Link
            href="/"
            className="mt-4 block text-center text-sm text-emerald-400 hover:underline"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
