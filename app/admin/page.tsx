import Link from "next/link";
import { BookMarked, BookOpen, Plus, Tag } from "lucide-react";
import { getCustomWords, getStories } from "@/lib/kv";
import type { CustomWord } from "@/lib/types";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [words, stories] = await Promise.all([getCustomWords(), getStories()]);

  const categories = new Set(words.map((w: CustomWord) => w.category));
  const recent = words.slice(-5).reverse();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-slate-500 mt-1">AWL Master yönetim paneli</p>
      </div>

      {/* Stat cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<BookMarked className="h-5 w-5 text-emerald-400" />}
          label="Custom Kelime"
          value={words.length}
          href="/admin/words"
        />
        <StatCard
          icon={<Tag className="h-5 w-5 text-sky-400" />}
          label="Kategori"
          value={categories.size}
          href="/admin/words"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-violet-400" />}
          label="Hikaye"
          value={stories.length}
          href="/admin/stories"
        />
      </section>

      {/* Quick actions */}
      <section className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-slate-300">Hızlı Eylemler</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/words"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2 text-sm hover:bg-emerald-500/20 transition-colors"
          >
            <Plus className="h-4 w-4" /> Kelime Ekle
          </Link>
          <Link
            href="/admin/stories"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 px-4 py-2 text-sm hover:bg-violet-500/20 transition-colors"
          >
            <Plus className="h-4 w-4" /> Hikaye Ekle
          </Link>
        </div>
      </section>

      {/* Recent words */}
      {recent.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-slate-300">Son Eklenen Kelimeler</h2>
          <div className="rounded-xl border border-slate-800 divide-y divide-slate-800">
            {recent.map((w: CustomWord) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-slate-200">{w.word}</span>
                  <span className="ml-3 text-sm text-slate-500">{w.meaningTr}</span>
                </div>
                <span className="text-xs text-slate-600 rounded-full bg-slate-800 px-2 py-0.5">
                  {w.category}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, href,
}: {
  icon: React.ReactNode; label: string; value: number; href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex items-center gap-4 hover:border-slate-700 transition-colors"
    >
      <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-heading text-2xl font-bold text-slate-100">{value}</div>
        <div className="text-sm text-slate-400 mt-0.5">{label}</div>
      </div>
    </Link>
  );
}
