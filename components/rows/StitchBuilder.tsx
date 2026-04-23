'use client';

import { useState } from 'react';
import { Stitch } from '@/lib/types';
import { STITCHES } from '@/lib/stitches';
import { StitchPill } from './StitchPill';

interface StitchBuilderProps {
  stitches: Stitch[];
  onChange: (stitches: Stitch[]) => void;
}

function DragHandle() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor" className="text-text-tertiary shrink-0">
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
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <select
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
          className="flex-1 border border-black/[0.09] rounded-sm px-2 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
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
          className="w-20 border border-black/[0.09] rounded-sm px-2 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-1.5 text-sm font-medium bg-teal-light text-teal-dark border border-teal/20 rounded-sm hover:bg-teal/10 transition-colors"
        >
          + Add
        </button>
      </div>

      {stitches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stitches.map((stitch, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={cleanup}
              className={`flex items-center gap-1 rounded-sm transition-opacity cursor-grab active:cursor-grabbing select-none ${
                dragIndex === i ? 'opacity-40' : 'opacity-100'
              } ${dragOverIndex === i && dragIndex !== i ? 'ring-2 ring-teal ring-offset-1' : ''}`}
            >
              <DragHandle />
              <StitchPill stitch={stitch} />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-text-tertiary hover:text-coral transition-colors text-xs leading-none"
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
