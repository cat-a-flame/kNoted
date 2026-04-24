'use client';

import { Row } from '@/lib/types';
import { StitchPill } from './StitchPill';
import styles from './RowCard.module.css';

interface RowCardProps {
  row: Row;
  index: number;
  isCurrent: boolean;
  editMode: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function RowCard({
  row,
  index,
  isCurrent,
  editMode,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  dragHandleProps,
}: RowCardProps) {
  const bubbleClass = isCurrent
    ? styles.bubbleCurrent
    : row.done
    ? styles.bubbleDone
    : styles.bubbleDefault;

  return (
    <div className={`${styles.card} ${row.done ? styles.cardDone : ''}`}>
      {editMode && (
        <div
          {...dragHandleProps}
          className={styles.dragHandle}
          aria-label="Drag to reorder"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="2" width="10" height="2" rx="1" />
            <rect x="2" y="6" width="10" height="2" rx="1" />
            <rect x="2" y="10" width="10" height="2" rx="1" />
          </svg>
        </div>
      )}

      <div className={`${styles.rowBubble} ${bubbleClass}`}>{index}</div>

      <div className={styles.body}>
        <p className={`${styles.rowTitle} ${row.done ? styles.rowTitleDone : ''}`}>
          {row.title}
        </p>
        {row.stitches.length > 0 && (
          <div className={styles.pillRow}>
            {row.stitches.map((stitch, i) => (
              <StitchPill key={i} stitch={stitch} />
            ))}
          </div>
        )}
        {row.note && <p className={styles.note}>{row.note}</p>}
      </div>

      <div className={styles.actions}>
        {editMode && (
          <>
            <button onClick={onDuplicate} title="Duplicate" className={styles.iconBtn}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="5" width="9" height="9" rx="1.5" />
                <path d="M2 11V3a2 2 0 0 1 2-2h8" />
              </svg>
            </button>
            <button onClick={onEdit} title="Edit" className={styles.iconBtn}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11.5 2.5a2.12 2.12 0 0 1 3 3L5 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button onClick={onDelete} title="Delete" className={`${styles.iconBtn} ${styles.iconBtnDanger}`}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
              </svg>
            </button>
          </>
        )}

        <button
          onClick={onToggle}
          aria-label={row.done ? 'Mark as incomplete' : 'Mark as done'}
          className={`${styles.checkBtn} ${row.done ? styles.checkBtnDone : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l3.5 3.5L13 4.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
