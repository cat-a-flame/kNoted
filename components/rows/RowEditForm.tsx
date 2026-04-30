'use client';

import { useState, FormEvent } from 'react';
import { Row } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import styles from './RowEditForm.module.css';

interface RowEditFormProps {
  row: Row;
  onSave: (data: { note: string | null; stitch_count: number | null }) => Promise<void>;
  onCancel: () => void;
}

export function RowEditForm({ row, onSave, onCancel }: RowEditFormProps) {
  const [note, setNote] = useState(row.note ?? '');
  const [stitchCount, setStitchCount] = useState(row.stitch_count != null ? String(row.stitch_count) : '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const parsed = stitchCount.trim() ? parseInt(stitchCount, 10) : null;
    const validCount = parsed !== null && !isNaN(parsed) ? parsed : null;
    await onSave({ note: note.trim() || null, stitch_count: validCount });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div>
        <FormLabel>Total stitches</FormLabel>
        <Input
          type="number"
          min="0"
          value={stitchCount}
          onChange={(e) => setStitchCount(e.target.value)}
          placeholder="e.g. 24"
        />
      </div>

      <div>
        <FormLabel>Details (optional)</FormLabel>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add details…"
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
