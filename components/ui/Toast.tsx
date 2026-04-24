'use client';

import { useEffect } from 'react';
import styles from './Toast.module.css';

type ToastVariant = 'success' | 'error';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, variant = 'success', onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.toast} ${styles[variant]}`}>
        <span>{message}</span>
        <button onClick={onDismiss} className={styles.dismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
