import { useEffect } from 'react';

export interface ToastData {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ toast, onDismiss, duration = 3500 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onDismiss]);

  if (!toast) return null;

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      <div className={`toast-item ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
        <span>
          {toast.type === 'success' ? '✨ ' : '⚠️ '}
          {toast.message}
        </span>
        <button
          type="button"
          className="toast-close"
          onClick={onDismiss}
          aria-label="Fechar notificação"
        >
          ✕
        </button>
      </div>
    </div>
  );
}