'use client';

import { useState } from 'react';
import { Stitch } from '@/lib/types';
import { STITCHES } from '@/lib/stitches';
import { StitchPill } from './StitchPill';
import styles from './StitchBuilder.module.css';

interface StitchBuilderProps {
  stitches: Stitch[];
  onChange: (stitches: Stitch[]) => void;
}

function DragHandle() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor" className={styles.handle}>
      <circle cx="2" cy="2" r="1" />
      <circle cx="6" cy="2" r="1" />
      <circle cx="2" cy="6" r="1" />
      <circle cx="6" cy="6" r="1" />
      <circle cx="2" cy="10" r="1" />
      <circle cx="6" cy="10" r="1" />
    </svg>
  );
}

export function StitchBuilder({ stitches, onChange }: StitchBuilderProps) {
  const [selectedName, setSelectedName] = useState(STITCHES[0].name);
  const [count, setCount] = useState(1);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const add = () => {
    if (count < 1) return;
    onChange([...stitches, { name: selectedName, count }]);
    setCount(1);
  };

  const remove = (index: number) => {
    onChange(stitches.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== dragOverIndex) setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) { cleanup(); return; }
    const next = [...stitches];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
    cleanup();
  };

  const cleanup = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className={styles.root}>
      <div className={styles.addRow}>
        <select
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
          className={styles.select}
        >
          {STITCHES.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
          className={styles.countInput}
        />
        <button type="button" onClick={add} className={styles.addBtn}>
          + Add
        </button>
      </div>

      {stitches.length > 0 && (
        <div className={styles.pillList}>
          {stitches.map((stitch, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={cleanup}
              className={`${styles.draggableItem} ${dragIndex === i ? styles.dragging : ''} ${dragOverIndex === i && dragIndex !== i ? styles.dragOver : ''}`}
            >
              <DragHandle />
              <StitchPill stitch={stitch} />
              <button
                type="button"
                onClick={() => remove(i)}
                className={styles.removeBtn}
                aria-label="Remove stitch"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
