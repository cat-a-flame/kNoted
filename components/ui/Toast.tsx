'use client';

import { useEffect } from 'react';

type ToastVariant = 'success' | 'error';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  duration?: number;
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-teal-dark text-white',
  error: 'bg-coral text-white',
};

export function Toast({ message, variant = 'success', onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-md shadow-lg text-sm font-medium max-w-xs ${variantClasses[variant]}`}
      >
        <span>{message}</span>
        <button
          onClick={onDismiss}
          className="ml-auto opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
