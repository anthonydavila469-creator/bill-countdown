'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { X, Check, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Toast types
interface Toast {
  id: string;
  message: string;
  description?: string;
  amount?: number;
  type: 'success' | 'error' | 'info' | 'undo';
  duration?: number;
  onUndo?: () => void;
  undoTimeout?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  showPaidToast: (billName: string, amount: number | null, onUndo: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Individual Toast Component
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [progress, setProgress] = useState(100);
  const [isLeaving, setIsLeaving] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const duration = toast.duration || 5000;
  const undoTimeout = toast.undoTimeout || 10000;

  // Handle countdown for undo toasts
  useEffect(() => {
    if (toast.type !== 'undo') {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }

    // For undo toasts, animate the countdown
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / undoTimeout) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.type, duration, undoTimeout]);

  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    setTimeout(onRemove, 300);
  }, [onRemove]);

  const handleUndo = useCallback(() => {
    if (toast.onUndo) {
      toast.onUndo();
    }
    handleDismiss();
  }, [toast.onUndo, handleDismiss]);

  const secondsLeft = Math.ceil((progress / 100) * (undoTimeout / 1000));

  return (
    <div
      className={cn(
        'group relative w-[380px] overflow-hidden',
        'animate-in slide-in-from-right-full fade-in duration-300',
        isLeaving && 'animate-out slide-out-to-right-full fade-out duration-300'
      )}
    >
      {/* Outer glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-violet-500/10 to-transparent rounded-2xl blur-xl opacity-60" />

      {/* Main container */}
      <div className="relative bg-[#0c0c10]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
        {/* Top accent line */}
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Success icon with ring */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              {/* Pulse effect */}
              <div className="absolute inset-0 rounded-xl bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium text-white">{toast.message}</p>
              {toast.description && (
                <p className="text-[13px] text-zinc-400 mt-0.5 truncate">{toast.description}</p>
              )}
              {toast.amount !== undefined && toast.amount !== null && (
                <p className="text-lg font-semibold text-emerald-400 mt-1">
                  ${toast.amount.toFixed(2)}
                </p>
              )}
            </div>

            {/* Right side: Undo button with countdown ring OR dismiss */}
            {toast.type === 'undo' && toast.onUndo ? (
              <div className="relative flex-shrink-0">
                {/* Countdown ring */}
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                  {/* Background ring */}
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="url(#undoGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                    className="transition-all duration-100"
                  />
                  <defs>
                    <linearGradient id="undoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Undo button in center */}
                <button
                  onClick={handleUndo}
                  className="absolute inset-0 flex items-center justify-center group/undo"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-400/20 hover:bg-violet-400/30 border border-violet-400/40 flex items-center justify-center transition-all duration-200 hover:scale-110">
                    <Undo2 className="w-4 h-4 text-violet-300" />
                  </div>
                </button>
                {/* Seconds remaining */}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-mono text-violet-300/80">
                  {secondsLeft}s
                </span>
              </div>
            ) : (
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom progress bar for non-undo toasts */}
        {toast.type !== 'undo' && (
          <div className="h-0.5 bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showPaidToast = useCallback(
    (billName: string, amount: number | null, onUndo: () => void) => {
      addToast({
        message: 'Marked as paid',
        description: billName,
        amount: amount ?? undefined,
        type: 'undo',
        onUndo,
        undoTimeout: 10000,
      });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showPaidToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
