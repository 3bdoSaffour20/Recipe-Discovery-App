import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CloseIcon } from '../components/Icons';

const ToastContext = createContext(null);

/** Tone → class pair. Kept as a lookup so every token exists in the CSS. */
const TONE_CLASSES = {
  success: 'toast toast--success',
  error: 'toast toast--error',
  info: 'toast toast--info',
};

/** How long a message stays on screen before it dismisses itself. */
const TOAST_DURATION_MS = 4200;

/**
 * Small transient notification system.
 *
 * Used instead of `alert()`: a toast announces itself to screen readers
 * (`role="status"`), never blocks the page, and stacks with any other message
 * that arrives while it is visible.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = 'success') => {
      counterRef.current += 1;
      const id = counterRef.current;
      const text = String(message ?? '').trim();
      if (!text) return;

      setToasts((current) => [...current.slice(-2), { id, message: text, tone }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((item) => (
          <div className={TONE_CLASSES[item.tone] ?? TONE_CLASSES.info} key={item.id}>
            <span className="toast__message">{item.message}</span>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
            >
              <CloseIcon width="16" height="16" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Reads the toast context.
 * @throws if used outside a ToastProvider.
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }

  return context;
}

export default ToastProvider;
