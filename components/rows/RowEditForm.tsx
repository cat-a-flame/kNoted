'use client';

import { useState, FormEvent } from 'react';
import { Row, Stitch } from '@/lib/types';
import { StitchBuilder } from './StitchBuilder';

interface RowEditFormProps {
  row: Row;
  onSave: (data: { title: string; stitches: Stitch[]; note: string | null }) => Promise<void>;
  onCancel: () => void;
}

export function RowEditForm({ row, onSave, onCancel }: RowEditFormProps) {
  const [title, setTitle] = useState(row.title);
  const [stitches, setStitches] = useState<Stitch[]>(row.stitches);
  const [note, setNote] = useState(row.note ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ title: title.trim() || row.title, stitches, note: note.trim() || null });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 bg-surface-2 rounded-md border border-black/[0.09]">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Row name</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-black/[0.09] rounded-sm px-3 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Stitches</label>
        <StitchBuilder stitches={stitches} onChange={setStitches} />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Note (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          className="w-full border border-black/[0.09] rounded-sm px-3 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium rounded-sm border border-black/[0.09] text-text-secondary hover:bg-surface-3 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 text-xs font-medium rounded-sm bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
