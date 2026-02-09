import Link from "next/link";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Discover and preview n8n workflows
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-zinc-400">
            Browse by tags and services, or search by node type. Visualize the workflow graph and copy JSON with one click.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/browse"
              className="inline-flex items-center rounded-lg bg-zinc-700 px-6 py-3 font-medium text-white transition hover:bg-zinc-600"
            >
              Browse (index)
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-500"
            >
              Templates (search)
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
