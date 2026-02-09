"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DEBOUNCE_MS = 300;

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [value, setValue] = useState(q);

  useEffect(() => setValue(q), [q]);

  const updateUrl = useCallback(
    (newQ: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (newQ.trim()) next.set("q", newQ.trim());
      else next.delete("q");
      router.push(`/templates?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => updateUrl(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps -- only sync value -> url

  return (
    <input
      type="search"
      placeholder="Search by name, description, or tags…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
  );
}
