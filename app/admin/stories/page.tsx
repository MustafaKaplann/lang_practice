"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import type { Story } from "@/lib/types";

const DIFFICULTY_LABELS: Record<Story["difficulty"], string> = {
  beginner: "Başlangıç",
  intermediate: "Orta",
  advanced: "İleri",
};

const DIFFICULTY_COLORS: Record<Story["difficulty"], string> = {
  beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  advanced: "text-red-400 bg-red-500/10 border-red-500/30",
};

const EMPTY_FORM = {
  title: "",
  author: "",
  description: "",
  audioUrl: "",
  transcript: "",
  difficulty: "intermediate" as Story["difficulty"],
  estimatedMinutes: "",
  source: "",
};

type ModalMode = "add" | "edit";

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: ModalMode; story?: Story } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/stories");
    if (res.ok) setStories(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ mode: "add" });
  }

  function openEdit(story: Story) {
    setForm({
      title: story.title,
      author: story.author,
      description: story.description ?? "",
      audioUrl: story.audioUrl,
      transcript: story.transcript,
      difficulty: story.difficulty,
      estimatedMinutes: String(story.estimatedMinutes),
      source: story.source,
    });
    setFormError(null);
    setModal({ mode: "edit", story });
  }

  async function handleSave() {
    if (!form.title.trim() || !form.author.trim() || !form.audioUrl.trim() ||
        !form.transcript.trim() || !form.estimatedMinutes || !form.source.trim()) {
      setFormError("Tüm zorunlu alanları doldurun.");
      return;
    }
    if (form.transcript.trim().length < 500) {
      setFormError("Transcript en az 500 karakter olmalıdır.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const body = {
      title: form.title.trim(),
      author: form.author.trim(),
      description: form.description.trim() || undefined,
      audioUrl: form.audioUrl.trim(),
      transcript: form.transcript.trim(),
      difficulty: form.difficulty,
      estimatedMinutes: Number(form.estimatedMinutes),
      source: form.source.trim(),
    };

    try {
      if (modal?.mode === "add") {
        const res = await fetch("/api/admin/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setFormError(d.error ?? "Kaydedilemedi.");
          return;
        }
        const created: Story = await res.json();
        setStories((prev) => [created, ...prev]);
      } else if (modal?.mode === "edit" && modal.story) {
        const res = await fetch(`/api/admin/stories/${modal.story.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setFormError(d.error ?? "Kaydedilemedi.");
          return;
        }
        const updated: Story = await res.json();
        setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      }
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/stories/${id}`, { method: "DELETE" });
    if (res.ok) setStories((prev) => prev.filter((s) => s.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Hikayeler</h1>
          <p className="text-sm text-slate-500 mt-0.5">{stories.length} hikaye</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-3 py-2 text-sm font-medium hover:bg-emerald-400 transition-colors"
        >
          <Plus className="h-4 w-4" /> Yeni Hikaye
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Yükleniyor…</div>
      ) : stories.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-500">
          Henüz hikaye eklenmemiş.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="px-4 py-3 text-left font-medium text-slate-400">Başlık</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden sm:table-cell">Yazar</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden md:table-cell">Zorluk</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden md:table-cell">Süre</th>
                <th className="px-4 py-3 text-right font-medium text-slate-400">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {stories.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-slate-900/20"}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-200 max-w-[220px]">
                    <div className="truncate">{s.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 sm:hidden">{s.author}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{s.author}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${DIFFICULTY_COLORS[s.difficulty]}`}>
                      {DIFFICULTY_LABELS[s.difficulty]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                    {s.estimatedMinutes} dk
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                        aria-label="Düzenle"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(s.id)}
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
        <StoryModal
          mode={modal.mode}
          form={form}
          setForm={setForm}
          error={formError}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <ConfirmModal
          message="Bu hikaye silinecek. Bu işlem geri alınamaz."
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function StoryModal({
  mode,
  form,
  setForm,
  error,
  saving,
  onSave,
  onClose,
}: {
  mode: ModalMode;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const wordCount = form.transcript.trim().split(/\s+/).filter(Boolean).length;
  const awlHint = form.transcript.length >= 500 ? `${wordCount} kelime` : `${form.transcript.trim().length}/500 karakter`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={ref}
        className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">
            {mode === "add" ? "Yeni Hikaye Ekle" : "Hikayeyi Düzenle"}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Başlık" required>
            <input type="text" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputCls} />
          </Field>
          <Field label="Yazar" required>
            <input type="text" value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              className={inputCls} />
          </Field>
          <Field label="Kaynak (LibriVox, Gutenberg…)" required>
            <input type="text" value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              className={inputCls} />
          </Field>
          <Field label="Süre (dakika)" required>
            <input type="number" min={1} value={form.estimatedMinutes}
              onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))}
              className={inputCls} />
          </Field>
          <Field label="Zorluk" required className="sm:col-span-2">
            <select value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Story["difficulty"] }))}
              className={inputCls}>
              <option value="beginner">Başlangıç</option>
              <option value="intermediate">Orta</option>
              <option value="advanced">İleri</option>
            </select>
          </Field>
          <Field label="Audio URL (mp3)" required className="sm:col-span-2">
            <input type="url" value={form.audioUrl}
              onChange={(e) => setForm((f) => ({ ...f, audioUrl: e.target.value }))}
              placeholder="https://…"
              className={inputCls} />
          </Field>
          <Field label="Açıklama" className="sm:col-span-2">
            <textarea value={form.description} rows={2}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`${inputCls} resize-none`} />
          </Field>
          <Field
            label="Transcript"
            required
            hint={awlHint}
            className="sm:col-span-2"
          >
            <textarea value={form.transcript} rows={8}
              onChange={(e) => setForm((f) => ({ ...f, transcript: e.target.value }))}
              placeholder="Hikaye metnini buraya yapıştır…"
              className={`${inputCls} resize-y`} />
          </Field>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-slate-700 text-slate-300 py-2 text-sm hover:border-slate-600 transition-colors">
            İptal
          </button>
          <button type="button" onClick={onSave} disabled={saving}
            className="flex-1 rounded-lg bg-emerald-500 text-slate-950 py-2 text-sm font-medium hover:bg-emerald-400 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
            {saving ? "Kaydediliyor…" : <><Check className="h-4 w-4" /> Kaydet</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, required, hint, className, children,
}: {
  label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
        <h3 className="font-heading text-lg font-bold text-red-400">Silmeyi Onayla</h3>
        <p className="text-sm text-slate-300">{message}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-700 text-slate-300 py-2 text-sm hover:border-slate-600 transition-colors">
            İptal
          </button>
          <button type="button" onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500 text-white py-2 text-sm font-medium hover:bg-red-400 transition-colors">
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none";
