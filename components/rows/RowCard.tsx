'use client';

import { Row } from '@/lib/types';
import { StitchPill } from './StitchPill';

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
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
        row.done
          ? 'bg-surface-2 border-black/[0.09] opacity-70'
          : 'bg-surface border-black/[0.09] hover:border-black/[0.17]'
      }`}
    >
      {editMode && (
        <div
          {...dragHandleProps}
          className="mt-1 cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-secondary"
          aria-label="Drag to reorder"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="2" width="10" height="2" rx="1" />
            <rect x="2" y="6" width="10" height="2" rx="1" />
            <rect x="2" y="10" width="10" height="2" rx="1" />
          </svg>
        </div>
      )}

      {/* Row number bubble */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
          isCurrent
            ? 'bg-teal text-white'
            : row.done
            ? 'bg-surface-3 text-text-tertiary'
            : 'bg-surface-2 text-text-secondary'
        }`}
      >
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${row.done ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
          {row.title}
        </p>
        {row.stitches.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {row.stitches.map((stitch, i) => (
              <StitchPill key={i} stitch={stitch} />
            ))}
          </div>
        )}
        {row.note && (
          <p className="text-xs text-text-secondary italic mt-1.5">{row.note}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {editMode && (
          <>
            <button
              onClick={onDuplicate}
              title="Duplicate"
              className="w-7 h-7 flex items-center justify-center rounded text-text-tertiary hover:bg-surface-2 hover:text-text-secondary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="5" width="9" height="9" rx="1.5" />
                <path d="M2 11V3a2 2 0 0 1 2-2h8" />
              </svg>
            </button>
            <button
              onClick={onEdit}
              title="Edit"
              className="w-7 h-7 flex items-center justify-center rounded text-text-tertiary hover:bg-surface-2 hover:text-text-secondary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11.5 2.5a2.12 2.12 0 0 1 3 3L5 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              title="Delete"
              className="w-7 h-7 flex items-center justify-center rounded text-text-tertiary hover:bg-coral-light hover:text-coral transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
              </svg>
            </button>
          </>
        )}

        {/* Checkmark button */}
        <button
          onClick={onToggle}
          aria-label={row.done ? 'Mark as incomplete' : 'Mark as done'}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ml-1 ${
            row.done
              ? 'border-teal bg-teal text-white'
              : 'border-black/[0.17] text-transparent hover:border-teal'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l3.5 3.5L13 4.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
