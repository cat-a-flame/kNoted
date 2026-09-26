'use client';

import { useEffect, useId } from 'react';
import { CloseIcon } from './icons';
import buttons from './buttons.module.css';
import styles from './Dialog.module.css';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Buttons pinned to the bottom of the dialog. */
  footer?: React.ReactNode;
  /** Renders the dialog as a form, so a submit button in the footer submits it. */
  onSubmit?: (e: React.FormEvent) => void;
  size?: 'md' | 'lg';
  /** Off while something on top (e.g. a confirm) should take Escape instead. */
  closeOnEscape?: boolean;
}

/**
 * Modal for create and edit forms. The body scrolls; the header and footer stay put.
 * The backdrop doesn't close it, so a stray click can't throw away a half-filled form.
 */
export function Dialog({ title, onClose, children, footer, onSubmit, size = 'md', closeOnEscape = true }: DialogProps) {
  const titleId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeOnEscape, onClose]);

  const Panel = onSubmit ? 'form' : 'div';

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} />
      <Panel
        className={`${styles.dialog} ${size === 'lg' ? styles.dialogLg : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={onSubmit}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <button type="button" onClick={onClose} className={buttons.icon} aria-label="Close" title="Close">
            <CloseIcon size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </Panel>
    </div>
  );
}
