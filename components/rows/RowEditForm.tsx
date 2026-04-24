'use client';

import { useState, FormEvent } from 'react';
import { Row, Stitch } from '@/lib/types';
import { StitchBuilder } from './StitchBuilder';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import styles from './RowEditForm.module.css';

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
    <form onSubmit={handleSubmit} className={styles.form}>
      <div>
        <FormLabel>Row name</FormLabel>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <FormLabel>Stitches</FormLabel>
        <StitchBuilder stitches={stitches} onChange={setStitches} />
      </div>

      <div>
        <FormLabel>Note (optional)</FormLabel>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
        />
      </div>

      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} className={styles.cancelBtn}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className={styles.saveBtn}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
