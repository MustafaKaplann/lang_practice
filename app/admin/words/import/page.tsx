"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Upload, Check, AlertTriangle } from "lucide-react";
interface ParsedRow {
  word: string;
  meaningTr: string;
  meaningEn?: string;
  exampleEn?: string;
  exampleTr?: string;
  category: string;
  error?: string;
}

// Format: word,meaningTr,meaningEn,exampleEn,exampleTr,category
function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  // Skip header if first line looks like header
  const start = lines[0]?.toLowerCase().startsWith("word") ? 1 : 0;
  return lines.slice(start).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [word, meaningTr, meaningEn, exampleEn, exampleTr, category] = cols;
    if (!word || !meaningTr || !category) {
      return {
        word: word ?? "",
        meaningTr: meaningTr ?? "",
        category: category ?? "",
        error: "word, meaningTr ve category zorunludur.",
      };
    }
    return {
      word,
      meaningTr,
      meaningEn: meaningEn || undefined,
      exampleEn: exampleEn || undefined,
      exampleTr: exampleTr || undefined,
      category,
    };
  });
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; skipped: number } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setResult(null);
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    const valid = rows.filter((r) => !r.error);
    if (valid.length === 0) return;
    setImporting(true);
    let success = 0;
    for (const row of valid) {
      const res = await fetch("/api/admin/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) success++;
    }
    setResult({ success, skipped: rows.length - valid.length });
    setRows([]);
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const validCount = rows.filter((r) => !r.error).length;
  const invalidCount = rows.filter((r) => r.error).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/words"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400"
        >
          <ChevronLeft className="h-4 w-4" /> Kelimeler
        </Link>
      </div>

      <div>
        <h1 className="font-heading text-2xl font-bold">CSV Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Format:{" "}
          <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">
            word,meaningTr,meaningEn,exampleEn,exampleTr,category
          </code>
        </p>
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center space-y-4">
        <Upload className="h-8 w-8 text-slate-600 mx-auto" />
        <p className="text-sm text-slate-400">CSV dosyası seç</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="hidden"
          id="csv-file"
        />
        <label
          htmlFor="csv-file"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 px-4 py-2 text-sm cursor-pointer hover:border-slate-600 transition-colors"
        >
          Dosya Seç
        </label>
      </div>

      {/* Import result */}
      {result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <Check className="h-4 w-4 inline mr-1.5" />
          {result.success} kelime eklendi.{" "}
          {result.skipped > 0 && `${result.skipped} satır atlandı.`}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <span className="text-emerald-400 font-medium">{validCount} geçerli</span>
              {invalidCount > 0 && (
                <span className="ml-3 text-red-400 font-medium">{invalidCount} hatalı</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={validCount === 0 || importing}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-4 py-2 text-sm font-medium hover:bg-emerald-400 disabled:opacity-60 transition-colors"
            >
              {importing ? "İçe aktarılıyor…" : `${validCount} Kelimeyi Ekle`}
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-3 py-2 text-left font-medium text-slate-400">Kelime</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-400">Türkçe</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-400">Kategori</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-400">Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-800/50 ${row.error ? "bg-red-500/5" : ""}`}
                  >
                    <td className="px-3 py-2 text-slate-200">{row.word || "—"}</td>
                    <td className="px-3 py-2 text-slate-400 max-w-[180px] truncate">{row.meaningTr || "—"}</td>
                    <td className="px-3 py-2 text-slate-400">{row.category || "—"}</td>
                    <td className="px-3 py-2">
                      {row.error ? (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <AlertTriangle className="h-3 w-3" /> {row.error}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <Check className="h-3 w-3" /> Geçerli
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

