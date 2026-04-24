"use client";

import type { WordPoolCategory } from "@/lib/wordPool";

interface Props {
  value: WordPoolCategory;
  onChange: (v: WordPoolCategory) => void;
  categories: string[];  // custom category names
}

const BASE_OPTIONS: Array<{ value: WordPoolCategory; label: string }> = [
  { value: "awl", label: "AWL Kelimeleri" },
  { value: "custom", label: "Kendi Kelimelerim" },
  { value: "all", label: "Tümü" },
];

export default function CategoryFilter({ value, onChange, categories }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-slate-500 font-medium">Kategori:</span>
      {BASE_OPTIONS.map((opt) => (
        <Pill
          key={opt.value}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Pill>
      ))}
      {categories.map((cat) => {
        const key = `custom:${cat}`;
        return (
          <Pill key={key} active={value === key} onClick={() => onChange(key)}>
            {cat}
          </Pill>
        );
      })}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
        active
          ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
