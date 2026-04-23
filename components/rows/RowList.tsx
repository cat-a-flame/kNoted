'use client';

import { useState, useCallback } from 'react';
import { Row, Stitch } from '@/lib/types';
import { RowCard } from './RowCard';
import { RowEditForm } from './RowEditForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface RowListProps {
  rows: Row[];
  editMode: boolean;
  firstIncompleteRowId: string | null;
  onToggle: (rowId: string, done: boolean) => Promise<void>;
  onEdit: (rowId: string, data: { title: string; stitches: Stitch[]; note: string | null }) => Promise<void>;
  onDuplicate: (rowId: string) => Promise<void>;
  onDelete: (rowId: string) => Promise<void>;
  onReorder: (rows: Row[]) => Promise<void>;
}

export function RowList({
  rows,
  editMode,
  firstIncompleteRowId,
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

  const handleDragStart = useCallback((id: string) => setDraggingId(id), []);

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

  return (
    <>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
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
                isCurrent={row.id === firstIncompleteRowId}
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
