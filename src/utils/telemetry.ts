/**
 * Vendor-neutral error funnel. Nothing is sent anywhere until a host registers
 * a reporter (e.g. wiring Sentry in `main.tsx` via `setErrorReporter`). Without
 * one, errors are logged in dev only — so production behaviour is unchanged
 * unless you opt in. Reporting never throws, so it can't cascade.
 */
export type ErrorSource = 'react' | 'query' | 'mutation' | 'window' | 'unhandledrejection';

export interface ErrorContext {
  source: ErrorSource;
  componentStack?: string;
}

type Reporter = (error: unknown, context: ErrorContext) => void;

let reporter: Reporter | null = null;

/** Register (or clear, with null) the error sink. Call once at startup. */
export function setErrorReporter(fn: Reporter | null): void {
  reporter = fn;
}

/** Funnel for unexpected errors. No-op in production unless a reporter is set. */
export function reportError(error: unknown, context: ErrorContext): void {
  if (reporter) {
    try {
      reporter(error, context);
    } catch {
      // A broken reporter must never take the app down with it.
    }
  } else if (import.meta.env.DEV) {
    console.error(`[${context.source}]`, error, context);
  }
}

/** Catch otherwise-unhandled errors and promise rejections. Call once at startup. */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, { source: 'window' }));
  window.addEventListener('unhandledrejection', (e) =>
    reportError(e.reason, { source: 'unhandledrejection' }),
  );
}
