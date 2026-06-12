import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import App from './App.tsx';
import {
  httpStatus,
  isRateLimited,
  isUnauthorized,
  notifyRateLimited,
  notifyUnauthorized,
  rateLimitDelayMs,
} from './utils/apiErrors';
import { installGlobalErrorHandlers, reportError, type ErrorSource } from './utils/telemetry';
import './index.css';
import '@carbon/styles/css/styles.css';

// Statuses the UI already handles gracefully — not worth reporting as bugs.
const EXPECTED_STATUSES = new Set([401, 403, 404, 422, 429]);

const handleApiError = (err: unknown, source: ErrorSource) => {
  if (isUnauthorized(err)) {
    notifyUnauthorized();
    return;
  }
  if (isRateLimited(err)) {
    notifyRateLimited({ retryInMs: rateLimitDelayMs(err) });
    return;
  }
  // Report genuine server failures (5xx, unexpected codes). Skip client-side
  // validation Errors (no HTTP status — the UI surfaces those itself) and the
  // expected statuses above.
  const status = httpStatus(err);
  if (status !== undefined && !EXPECTED_STATUSES.has(status)) {
    reportError(err, { source });
  }
};

installGlobalErrorHandlers();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, err) => {
        if (isUnauthorized(err)) return false;
        if (isRateLimited(err)) return failureCount < 3;
        return failureCount < 1;
      },
      retryDelay: (failureCount, err) =>
        isRateLimited(err) ? rateLimitDelayMs(err) : Math.min(1000 * 2 ** failureCount, 30_000),
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
  queryCache: new QueryCache({ onError: (err) => handleApiError(err, 'query') }),
  mutationCache: new MutationCache({ onError: (err) => handleApiError(err, 'mutation') }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
