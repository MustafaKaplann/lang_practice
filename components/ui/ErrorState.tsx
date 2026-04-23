import { WifiOff, RotateCcw } from "lucide-react";

export default function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center space-y-4">
      <WifiOff className="h-10 w-10 text-red-400/50 mx-auto" />
      <div>
        <p className="font-medium text-slate-200">Veriler yüklenemedi</p>
        <p className="text-sm text-slate-500 mt-1">Bağlantını kontrol et.</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 text-sm hover:bg-slate-700 transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Tekrar Dene
        </button>
      )}
    </div>
  );
}
