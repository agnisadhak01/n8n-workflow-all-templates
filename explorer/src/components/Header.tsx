import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-800 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight text-zinc-100">
          n8n Template Explorer
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Home
          </Link>
          <Link
            href="/browse"
            className="rounded-lg px-4 py-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Browse
          </Link>
          <Link
            href="/templates"
            className="rounded-lg px-4 py-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Templates
          </Link>
          <Link
            href="/admin/enrichment"
            className="rounded-lg px-4 py-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
            title="Enrichment admin (requires secret in URL)"
          >
            Enrichment
          </Link>
        </nav>
      </div>
    </header>
  );
}
