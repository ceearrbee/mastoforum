import { useEffect, useState } from 'react';
import { ToastNotification } from '@carbon/react';
import { onToast, type Toast } from '../utils/toast';

const DEFAULT_TIMEOUT_MS = 6000;

/**
 * App-wide toast host. Subscribes to the toast bus and renders a stacked,
 * fixed-position column of Carbon notifications. Mounted once, in AppShell.
 */
export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const unsub = onToast((toast) => {
      setToasts((prev) => [...prev, toast]);
      const timeout = toast.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      if (timeout > 0) {
        timers.push(
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
          }, timeout),
        );
      }
    });
    return () => {
      unsub();
      timers.forEach(clearTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 80,
        maxWidth: '24rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          kind={toast.kind}
          title={toast.title}
          subtitle={toast.subtitle}
          lowContrast
          onCloseButtonClick={() => dismiss(toast.id)}
        />
      ))}
    </div>
  );
}
