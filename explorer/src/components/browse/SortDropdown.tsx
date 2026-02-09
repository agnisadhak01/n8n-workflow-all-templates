"use client";

import type { SortOption } from "@/types/browse";

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "id-asc", label: "ID ascending" },
  { value: "id-desc", label: "ID descending" },
  { value: "tags-asc", label: "Fewest tags" },
  { value: "tags-desc", label: "Most tags" },
  { value: "popularity-desc", label: "Popularity (tag count)" },
];

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
