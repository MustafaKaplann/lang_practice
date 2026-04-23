export type ToastType = "success" | "info" | "achievement";

export interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

export function showToast(opts: ToastOptions): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("awl-toast", { detail: opts }));
}
