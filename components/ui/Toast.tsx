'use client';

import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

type ToastVariant = 'success' | 'error';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  onUndo?: () => void;
  duration?: number;
}

export function Toast({ message, variant = 'success', onDismiss, onUndo, duration = 4000 }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExiting(true), duration);
    return () => clearTimeout(t);
  }, [duration]);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(onDismiss, 250);
    return () => clearTimeout(t);
  }, [exiting, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
  };

  const handleUndo = () => {
    onUndo?.();
    setExiting(true);
  };

  return (
    <div className={`${styles.wrapper} ${exiting ? styles.wrapperExiting : ''}`}>
      <div className={`${styles.toast} ${styles[variant]}`}>
        <span>{message}</span>
        {onUndo && (
          <button onClick={handleUndo} className={styles.undoBtn}>
            Undo
          </button>
        )}
        <button onClick={handleDismiss} className={styles.dismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
