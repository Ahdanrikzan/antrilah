import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cx } from '../lib/utils';

type ToastTone = 'default' | 'error' | 'success';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

type PushToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<PushToast | null>(null);

const TONES: Record<ToastTone, string> = {
  default: 'bg-ink text-cream',
  success: 'bg-lime text-ink',
  error: 'bg-pink text-ink',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback<PushToast>((message, tone = 'default') => {
    const id = counter.current + 1;
    counter.current = id;
    setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
          {items.length ? items[items.length - 1].message : ''}
        </div>
        {items.map((item) => (
          <div
            key={item.id}
            className={cx(
              'pointer-events-auto max-w-lg animate-pop rounded-full border-3 border-ink px-5 py-2.5 text-center text-xs font-black uppercase tracking-[0.1em] shadow-hard-sm',
              TONES[item.tone],
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): PushToast {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
