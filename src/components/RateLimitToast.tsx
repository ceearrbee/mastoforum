import { useEffect, useState } from 'react';
import { ToastNotification } from '@carbon/react';
import { onRateLimited } from '../utils/apiErrors';

interface ActiveToast {
  retryInMs: number;
}

export default function RateLimitToast() {
  const [toast, setToast] = useState<ActiveToast | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const unsub = onRateLimited((detail) => {
      setToast({ retryInMs: detail.retryInMs });
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setToast(null), detail.retryInMs + 500);
    });
    return () => {
      unsub();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  if (!toast) return null;
  // Display the static initial wait — we don't need a live countdown for a toast.
  const seconds = Math.max(1, Math.ceil(toast.retryInMs / 1000));
  return (
    <div
      style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 80, maxWidth: '24rem' }}
    >
      <ToastNotification
        kind="warning"
        title="Your instance is rate-limiting us"
        subtitle={`Retrying in ~${seconds}s.`}
        lowContrast
        onCloseButtonClick={() => setToast(null)}
      />
    </div>
  );
}
