// A tiny app-wide toast bus, following the same window-event pattern as the
// unauthorized / rate-limited signals in apiErrors.ts. `pushToast` can be called
// from anywhere (mutation onError handlers, effects) without prop-drilling; the
// <Toaster /> component subscribes and renders.

const TOAST_EVENT = 'mastoforum:toast';

export type ToastKind = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  subtitle?: string;
  /** Auto-dismiss delay in ms; 0 keeps it until closed. Defaults to 6000. */
  timeoutMs?: number;
}

let nextId = 0;

export function pushToast(toast: Omit<Toast, 'id'>): void {
  const detail: Toast = { id: (nextId += 1), ...toast };
  window.dispatchEvent(new CustomEvent<Toast>(TOAST_EVENT, { detail }));
}

export function onToast(handler: (toast: Toast) => void): () => void {
  const wrapped = (e: Event) => handler((e as CustomEvent<Toast>).detail);
  window.addEventListener(TOAST_EVENT, wrapped);
  return () => window.removeEventListener(TOAST_EVENT, wrapped);
}
