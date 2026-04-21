'use client';

import { useState, useCallback } from 'react';
import { Row, Stitch } from '@/lib/types';
import { RowCard } from './RowCard';
import { RowEditForm } from './RowEditForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface RowListProps {
  rows: Row[];
  editMode: boolean;
  firstIncompleteIndex: number;
  onToggle: (rowId: string, done: boolean) => Promise<void>;
  onEdit: (rowId: string, data: { title: string; stitches: Stitch[]; note: string | null; section: string | null }) => Promise<void>;
  onDuplicate: (rowId: string) => Promise<void>;
  onDelete: (rowId: string) => Promise<void>;
  onReorder: (rows: Row[]) => Promise<void>;
}

export function RowList({
  rows,
  editMode,
  firstIncompleteIndex,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  onReorder,
}: RowListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const existingSections = Array.from(
    new Set(rows.map((r) => r.section).filter((s): s is string => s !== null)),
  );

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggingId || draggingId === targetId) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }

      const fromIndex = rows.findIndex((r) => r.id === draggingId);
      const toIndex = rows.findIndex((r) => r.id === targetId);
      const reordered = [...rows];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      const withPositions = reordered.map((r, i) => ({ ...r, position: i }));

      setDraggingId(null);
      setDragOverId(null);
      await onReorder(withPositions);
    },
    [draggingId, rows, onReorder],
  );

  // Build section groups preserving first-appearance order
  const sectionGroups: { section: string | null; items: { row: Row; flatIndex: number }[] }[] = [];
  const sectionIndexMap = new Map<string | null, number>();
  rows.forEach((row, i) => {
    const key = row.section ?? null;
    if (!sectionIndexMap.has(key)) {
      sectionIndexMap.set(key, sectionGroups.length);
      sectionGroups.push({ section: key, items: [] });
    }
    sectionGroups[sectionIndexMap.get(key)!].items.push({ row, flatIndex: i });
  });

  return (
    <>
      <div className="flex flex-col gap-4">
        {sectionGroups.map(({ section, items }, groupIndex) => (
          <div key={section ?? '__none__'}>
            {section && (
              <h3
                className={`text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 px-1 ${
                  groupIndex > 0 ? 'mt-2' : ''
                }`}
              >
                {section}
              </h3>
            )}
            <div className="flex flex-col gap-2">
              {items.map(({ row, flatIndex: i }) => (
                <div
                  key={row.id}
                  id={`row-${row.id}`}
                  draggable={editMode}
                  onDragStart={() => handleDragStart(row.id)}
                  onDragOver={(e) => handleDragOver(e, row.id)}
                  onDrop={(e) => handleDrop(e, row.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                  className={`transition-opacity ${draggingId === row.id ? 'opacity-40' : ''} ${
                    dragOverId === row.id && draggingId !== row.id ? 'ring-2 ring-teal rounded-md' : ''
                  }`}
                >
                  {editingId === row.id ? (
                    <RowEditForm
                      row={row}
                      existingSections={existingSections}
                      onSave={async (data) => {
                        await onEdit(row.id, data);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <RowCard
                      row={row}
                      index={i}
                      isCurrent={i === firstIncompleteIndex}
                      editMode={editMode}
                      onToggle={() => onToggle(row.id, !row.done)}
                      onEdit={() => setEditingId(row.id)}
                      onDuplicate={() => onDuplicate(row.id)}
                      onDelete={() => setDeletingId(row.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {deletingId && (
        <ConfirmDialog
          title="Delete row"
          description="This row will be permanently deleted. This cannot be undone."
          onConfirm={async () => {
            await onDelete(deletingId);
            setDeletingId(null);
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </>
  );
}
