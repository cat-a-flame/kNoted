'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Pattern, Row, Stitch } from '@/lib/types';
import { todayIso } from '@/lib/utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { RowList } from '@/components/rows/RowList';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StitchBuilder } from '@/components/rows/StitchBuilder';
import { Toast } from '@/components/ui/Toast';

export default function PatternPage() {
  const { id } = useParams<{ id: string }>();

  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newStitches, setNewStitches] = useState<Stitch[]>([]);
  const [newNote, setNewNote] = useState('');

  const didScrollRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: p } = await supabase.from('patterns').select('*').eq('id', id).single();
      const { data: r } = await supabase
        .from('rows')
        .select('*')
        .eq('pattern_id', id)
        .order('position', { ascending: true });
      setPattern(p ?? null);
      setRows((r ?? []) as Row[]);
      setLoading(false);
    };
    load();
  }, [id]);

  // Auto-scroll to first incomplete row on load
  useEffect(() => {
    if (loading || didScrollRef.current || rows.length === 0) return;
    const firstIncomplete = rows.find((r) => !r.done);
    if (!firstIncomplete) return;
    const el = document.getElementById(`row-${firstIncomplete.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      didScrollRef.current = true;
    }
  }, [loading, rows]);

  const done = rows.filter((r) => r.done).length;
  const total = rows.length;
  const firstIncompleteIndex = rows.findIndex((r) => !r.done);

  const handleToggle = useCallback(
    async (rowId: string, nextDone: boolean) => {
      const supabase = createClient();
      const { error } = await supabase.from('rows').update({ done: nextDone }).eq('id', rowId);
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }

      if (nextDone && pattern) {
        const today = todayIso();
        if (!pattern.activity.includes(today)) {
          const nextActivity = [...pattern.activity, today];
          await supabase.from('patterns').update({ activity: nextActivity }).eq('id', id);
          setPattern((prev) => (prev ? { ...prev, activity: nextActivity } : prev));
        }
      }
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, done: nextDone } : r)));
    },
    [id, pattern],
  );

  const handleEdit = useCallback(
    async (rowId: string, data: { title: string; stitches: Stitch[]; note: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase.from('rows').update(data).eq('id', rowId);
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...data } : r)));
    },
    [],
  );

  const handleDuplicate = useCallback(
    async (rowId: string) => {
      const supabase = createClient();
      const source = rows.find((r) => r.id === rowId);
      if (!source) return;
      const insertPos = source.position + 1;

      const reindexed = rows.map((r) =>
        r.position >= insertPos ? { ...r, position: r.position + 1 } : r,
      );

      const { data, error } = await supabase
        .from('rows')
        .insert({
          pattern_id: id,
          position: insertPos,
          title: `${source.title} (copy)`,
          stitches: source.stitches,
          note: source.note,
          done: false,
        })
        .select('*')
        .single();

      if (error) { setToast({ message: error.message, variant: 'error' }); return; }

      await Promise.all(
        reindexed
          .filter((r) => r.id !== data.id && r.position >= insertPos)
          .map((r) => supabase.from('rows').update({ position: r.position }).eq('id', r.id)),
      );

      const merged = [...reindexed, data as Row].sort((a, b) => a.position - b.position);
      setRows(merged);
    },
    [id, rows],
  );

  const handleDelete = useCallback(async (rowId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('rows').delete().eq('id', rowId);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }, []);

  const handleReorder = useCallback(async (reordered: Row[]) => {
    setRows(reordered);
    const supabase = createClient();
    await Promise.all(
      reordered.map((r) => supabase.from('rows').update({ position: r.position }).eq('id', r.id)),
    );
  }, []);

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const title = newTitle.trim() || `Row ${rows.length + 1}`;
    const { data, error } = await supabase
      .from('rows')
      .insert({
        pattern_id: id,
        position: rows.length,
        title,
        stitches: newStitches,
        note: newNote.trim() || null,
        done: false,
      })
      .select('*')
      .single();

    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setRows((prev) => [...prev, data as Row]);
    setNewTitle('');
    setNewStitches([]);
    setNewNote('');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-tertiary text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <p className="text-text-secondary">Pattern not found.</p>
          <Link href="/patterns" className="text-sm text-teal hover:underline">
            Back to patterns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col pb-16 md:pb-0 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm border-b border-black/[0.09] px-6 py-3 flex items-center gap-4">
          <Link
            href="/patterns"
            className="text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M11 4L6 9l5 5" />
            </svg>
          </Link>
          <h2 className="font-serif text-lg font-semibold text-text-primary truncate flex-1">
            {pattern.name}
          </h2>
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors shrink-0 ${
              editMode
                ? 'bg-teal text-white border-teal'
                : 'border-black/[0.09] text-text-secondary hover:bg-surface-2'
            }`}
          >
            {editMode ? 'Done editing' : 'Edit rows'}
          </button>
        </header>

        {/* Two-column layout */}
        <div className="flex flex-1 min-w-0">
          {/* Rows list */}
          <main className="flex-1 px-6 py-5 min-w-0 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="text-text-tertiary text-sm py-8 text-center">
                No rows yet.{' '}
                {editMode
                  ? 'Add your first row in the panel →'
                  : 'Turn on "Edit rows" to add rows.'}
              </p>
            ) : (
              <RowList
                rows={rows}
                editMode={editMode}
                firstIncompleteIndex={firstIncompleteIndex}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onReorder={handleReorder}
              />
            )}
          </main>

          {/* Side panel */}
          <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0 border-l border-black/[0.09] px-5 py-5 bg-surface/50">
            {/* Progress card */}
            <div className="bg-surface rounded-lg border border-black/[0.09] p-4">
              <p className="text-xs font-medium text-text-secondary mb-1">Progress</p>
              <p className="font-serif text-2xl font-bold text-text-primary">
                {done} <span className="text-text-tertiary text-lg">/ {total}</span>
              </p>
              <p className="text-xs text-text-secondary mb-2">rows completed</p>
              <ProgressBar value={done} max={total || 1} />
            </div>

            {/* Add row builder — edit mode only */}
            {editMode && (
              <div className="bg-surface rounded-lg border border-black/[0.09] p-4">
                <h3 className="font-serif text-sm font-semibold text-text-primary mb-3">
                  Add row
                </h3>
                <form onSubmit={handleAddRow} className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Row name
                    </label>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={`Row ${rows.length + 1}`}
                      className="w-full border border-black/[0.09] rounded-sm px-2 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Stitches
                    </label>
                    <StitchBuilder stitches={newStitches} onChange={setNewStitches} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Note (optional)
                    </label>
                    <input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note…"
                      className="w-full border border-black/[0.09] rounded-sm px-2 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 text-sm font-medium bg-teal text-white rounded-sm hover:bg-teal-dark transition-colors"
                  >
                    + Add row
                  </button>
                </form>
              </div>
            )}
          </aside>
        </div>
      </div>

      <MobileNav />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
