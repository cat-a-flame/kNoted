import { Pattern } from '@/lib/types';
import { PatternCard } from './PatternCard';

interface PatternGridProps {
  patterns: (Pattern & { rows?: { done: boolean }[] })[];
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}

export function PatternGrid({ patterns, onArchive, onDelete }: PatternGridProps) {
  if (patterns.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-tertiary text-sm">No patterns here yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {patterns.map((pattern) => (
        <PatternCard
          key={pattern.id}
          pattern={pattern}
          onArchive={() => onArchive(pattern.id, !pattern.archived)}
          onDelete={() => onDelete(pattern.id)}
        />
      ))}
    </div>
  );
}
