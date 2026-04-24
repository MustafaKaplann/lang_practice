"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Upload, Search, X, Check } from "lucide-react";
import type { CustomWord } from "@/lib/types";

type ModalMode = "add" | "edit";

const EMPTY_FORM = {
  word: "",
  meaningTr: "",
  meaningEn: "",
  exampleEn: "",
  exampleTr: "",
  category: "",
};

export default function AdminWordsPage() {
  const [words, setWords] = useState<CustomWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [modal, setModal] = useState<{ mode: ModalMode; word?: CustomWord } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // single id or "__bulk"

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/words");
    if (res.ok) setWords(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = Array.from(new Set(words.map((w) => w.category))).sort();

  const filtered = words.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch = !q || w.word.toLowerCase().includes(q) || w.meaningTr.toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || w.category === filterCategory;
    return matchSearch && matchCat;
  });

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ mode: "add" });
  }

  function openEdit(word: CustomWord) {
    setForm({
      word: word.word,
      meaningTr: word.meaningTr,
      meaningEn: word.meaningEn ?? "",
      exampleEn: word.exampleEn ?? "",
      exampleTr: word.exampleTr ?? "",
      category: word.category,
    });
    setFormError(null);
    setModal({ mode: "edit", word });
  }

  async function handleSave() {
    if (!form.word.trim() || !form.meaningTr.trim() || !form.category.trim()) {
      setFormError("Kelime, Türkçe anlam ve kategori zorunludur.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        word: form.word.trim(),
        meaningTr: form.meaningTr.trim(),
        meaningEn: form.meaningEn.trim() || undefined,
        exampleEn: form.exampleEn.trim() || undefined,
        exampleTr: form.exampleTr.trim() || undefined,
        category: form.category.trim(),
      };

      if (modal?.mode === "add") {
        const res = await fetch("/api/admin/words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setFormError(d.error ?? "Kaydedilemedi.");
          return;
        }
        const created: CustomWord = await res.json();
        setWords((prev) => [created, ...prev]);
      } else if (modal?.mode === "edit" && modal.word) {
        const res = await fetch(`/api/admin/words/${modal.word.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setFormError(d.error ?? "Kaydedilemedi.");
          return;
        }
        const updated: CustomWord = await res.json();
        setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      }
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/words/${id}`, { method: "DELETE" });
    if (res.ok) setWords((prev) => prev.filter((w) => w.id !== id));
    setDeleteConfirm(null);
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    const res = await fetch("/api/admin/words/__bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setWords((prev) => prev.filter((w) => !selected.has(w.id)));
      setSelected(new Set());
    }
    setDeleteConfirm(null);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((w) => w.id)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Custom Kelimeler</h1>
          <p className="text-sm text-slate-500 mt-0.5">{words.length} kelime</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/words/import"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 px-3 py-2 text-sm hover:border-slate-600 transition-colors"
          >
            <Upload className="h-4 w-4" /> CSV Import
          </Link>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-3 py-2 text-sm font-medium hover:bg-emerald-400 transition-colors"
          >
            <Plus className="h-4 w-4" /> Yeni Kelime
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Kelime veya anlam ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5">
          <span className="text-sm text-red-300">{selected.size} kelime seçili</span>
          <button
            type="button"
            onClick={() => setDeleteConfirm("__bulk")}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-1 text-xs hover:bg-red-500/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Seçilileri Sil
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-slate-400 hover:text-slate-200 text-xs"
          >
            İptal
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-slate-400 text-sm">Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-500">
          {words.length === 0 ? "Henüz kelime eklenmemiş." : "Eşleşen kelime bulunamadı."}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="accent-emerald-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Kelime</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Türkçe Anlam</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden sm:table-cell">Kategori</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden md:table-cell">Eklenme</th>
                <th className="px-4 py-3 text-right font-medium text-slate-400">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => (
                <tr
                  key={w.id}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-slate-900/20"}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(w.id)}
                      onChange={() => toggleSelect(w.id)}
                      className="accent-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">{w.word}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{w.meaningTr}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {w.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                    {new Date(w.createdAt).toLocaleDateString("tr")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(w)}
                        className="p-1.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                        aria-label="Düzenle"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(w.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                        aria-label="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <Modal
          title={modal.mode === "add" ? "Yeni Kelime Ekle" : "Kelimeyi Düzenle"}
          onClose={() => setModal(null)}
        >
          <WordForm
            form={form}
            setForm={setForm}
            error={formError}
            saving={saving}
            categories={categories}
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal title="Silmeyi Onayla" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-slate-300 mb-6">
            {deleteConfirm === "__bulk"
              ? `${selected.size} kelime silinecek. Bu işlem geri alınamaz.`
              : "Bu kelime silinecek. Bu işlem geri alınamaz."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 rounded-lg border border-slate-700 text-slate-300 py-2 text-sm hover:border-slate-600 transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() =>
                deleteConfirm === "__bulk" ? handleBulkDelete() : handleDelete(deleteConfirm)
              }
              className="flex-1 rounded-lg bg-red-500 text-white py-2 text-sm font-medium hover:bg-red-400 transition-colors"
            >
              Sil
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={ref}
        className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function WordForm({
  form,
  setForm,
  error,
  saving,
  categories,
  onSave,
  onCancel,
}: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  error: string | null;
  saving: boolean;
  categories: string[];
  onSave: () => void;
  onCancel: () => void;
}) {
  function field(key: keyof typeof EMPTY_FORM, label: string, required = false, multiline = false) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-400">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {multiline ? (
          <textarea
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none resize-none"
          />
        ) : (
          <input
            type="text"
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {field("word", "Kelime (İngilizce)", true)}
      {field("meaningTr", "Türkçe Anlam", true)}
      {field("meaningEn", "İngilizce Anlam")}
      {field("exampleEn", "Örnek Cümle (İngilizce)", false, true)}
      {field("exampleTr", "Örnek Cümle (Türkçe)", false, true)}

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-400">
          Kategori <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          list="category-list"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          placeholder="örn. TOEFL, İş İngilizcesi…"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
        />
        <datalist id="category-list">
          {categories.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-700 text-slate-300 py-2 text-sm hover:border-slate-600 transition-colors"
        >
          İptal
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-emerald-500 text-slate-950 py-2 text-sm font-medium hover:bg-emerald-400 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
        >
          {saving ? "Kaydediliyor…" : <><Check className="h-4 w-4" /> Kaydet</>}
        </button>
      </div>
    </div>
  );
}
