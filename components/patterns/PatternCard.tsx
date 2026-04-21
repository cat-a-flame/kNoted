'use client';

import Link from 'next/link';
import { Pattern } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ContextMenu } from './ContextMenu';

interface PatternCardProps {
  pattern: Pattern & { rows?: { done: boolean }[] };
  onArchive: () => void;
  onDelete: () => void;
}

export function PatternCard({ pattern, onArchive, onDelete }: PatternCardProps) {
  const rows = pattern.rows ?? [];
  const done = rows.filter((r) => r.done).length;
  const total = rows.length;
  const allDone = total > 0 && done === total;

  const badgeVariant = pattern.archived ? 'archived' : allDone ? 'done' : 'inProgress';

  return (
    <div className="bg-surface border border-black/[0.09] rounded-lg p-4 hover:border-black/[0.17] transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/patterns/${pattern.id}`} className="flex-1 min-w-0">
          <h3 className="font-serif text-base font-semibold text-text-primary truncate leading-snug">
            {pattern.name}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {done} / {total} rows
          </p>
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={badgeVariant} />
          <ContextMenu
            items={[
              {
                label: pattern.archived ? 'Unarchive' : 'Archive',
                onClick: onArchive,
              },
              {
                label: 'Delete',
                onClick: onDelete,
                variant: 'danger',
              },
            ]}
          />
        </div>
      </div>
      <ProgressBar value={done} max={total || 1} className="mt-3" />
    </div>
  );
}
