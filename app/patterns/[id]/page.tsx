'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Pattern, Section, Row, Stitch } from '@/lib/types';
import { todayIso } from '@/lib/utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { SectionList } from '@/components/rows/SectionList';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toast } from '@/components/ui/Toast';

export default function PatternPage() {
  const { id } = useParams<{ id: string }>();

  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const didScrollRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: p } = await supabase.from('patterns').select('*').eq('id', id).single();
      const { data: s } = await supabase
        .from('sections')
        .select('*, rows(*)')
        .eq('pattern_id', id)
        .order('position', { ascending: true })
        .order('position', { ascending: true, foreignTable: 'rows' });
      setPattern(p ?? null);
      setSections((s ?? []) as Section[]);
      setLoading(false);
    };
    load();
  }, [id]);

  const allRows = sections.flatMap((s) => s.rows ?? []);
  const done = allRows.filter((r) => r.done).length;
  const total = allRows.length;
  const firstIncompleteRowId = allRows.find((r) => !r.done)?.id ?? null;

  useEffect(() => {
    if (loading || didScrollRef.current || !firstIncompleteRowId) return;
    const el = document.getElementById(`row-${firstIncompleteRowId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      didScrollRef.current = true;
    }
  }, [loading, firstIncompleteRowId]);

  const handleToggleRow = useCallback(
    async (sectionId: string, rowId: string, nextDone: boolean) => {
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
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, rows: (s.rows ?? []).map((r) => (r.id === rowId ? { ...r, done: nextDone } : r)) }
            : s,
        ),
      );
    },
    [id, pattern],
  );

  const handleEditRow = useCallback(
    async (sectionId: string, rowId: string, data: { title: string; stitches: Stitch[]; note: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase.from('rows').update(data).eq('id', rowId);
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, rows: (s.rows ?? []).map((r) => (r.id === rowId ? { ...r, ...data } : r)) }
            : s,
        ),
      );
    },
    [],
  );

  const handleDuplicateRow = useCallback(
    async (sectionId: string, rowId: string) => {
      const supabase = createClient();
      const section = sections.find((s) => s.id === sectionId);
      const rows = section?.rows ?? [];
      const source = rows.find((r) => r.id === rowId);
      if (!source) return;
      const insertPos = source.position + 1;

      const reindexed = rows.map((r) =>
        r.position >= insertPos ? { ...r, position: r.position + 1 } : r,
      );

      const { data, error } = await supabase
        .from('rows')
        .insert({
          section_id: sectionId,
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
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, rows: merged } : s)),
      );
    },
    [sections],
  );

  const handleDeleteRow = useCallback(
    async (sectionId: string, rowId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('rows').delete().eq('id', rowId);
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, rows: (s.rows ?? []).filter((r) => r.id !== rowId) } : s,
        ),
      );
    },
    [],
  );

  const handleReorderRows = useCallback(
    async (sectionId: string, reordered: Row[]) => {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, rows: reordered } : s)),
      );
      const supabase = createClient();
      await Promise.all(
        reordered.map((r) => supabase.from('rows').update({ position: r.position }).eq('id', r.id)),
      );
    },
    [],
  );

  const handleAddRow = useCallback(
    async (sectionId: string, data: { title: string; stitches: Stitch[]; note: string | null }) => {
      const supabase = createClient();
      const section = sections.find((s) => s.id === sectionId);
      const rowCount = (section?.rows ?? []).length;
      const { data: newRow, error } = await supabase
        .from('rows')
        .insert({
          section_id: sectionId,
          position: rowCount,
          title: data.title,
          stitches: data.stitches,
          note: data.note,
          done: false,
        })
        .select('*')
        .single();
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, rows: [...(s.rows ?? []), newRow as Row] } : s,
        ),
      );
    },
    [sections],
  );

  const handleUpdateSection = useCallback(
    async (sectionId: string, updates: { name?: string; yarn_name?: string | null; yarn_weight?: string | null; yarn_colour?: string | null; hook_size?: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase.from('sections').update(updates).eq('id', sectionId);
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }
      setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)));
    },
    [],
  );

  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('sections').delete().eq('id', sectionId);
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    },
    [],
  );

  const handleAddSection = useCallback(
    async (name: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sections')
        .insert({ pattern_id: id, position: sections.length, name })
        .select('*')
        .single();
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }
      setSections((prev) => [...prev, { ...data, rows: [] } as Section]);
    },
    [id, sections.length],
  );

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
          <Link href="/patterns" className="text-sm text-teal hover:underline">Back to patterns</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col pb-16 md:pb-0 min-w-0">
        <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm border-b border-black/[0.09] px-6 py-3 flex items-center gap-4">
          <Link
            href="/patterns"
            className="text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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

        <div className="flex flex-1 min-w-0">
          <main className="flex-1 px-6 py-5 min-w-0 overflow-y-auto">
            {sections.length === 0 ? (
              <p className="text-text-tertiary text-sm py-8 text-center">
                No rows yet.{' '}
                {editMode ? 'Use "Add row" below to get started.' : 'Turn on "Edit rows" to add rows.'}
              </p>
            ) : (
              <SectionList
                sections={sections}
                editMode={editMode}
                firstIncompleteRowId={firstIncompleteRowId}
                onToggleRow={handleToggleRow}
                onEditRow={handleEditRow}
                onDuplicateRow={handleDuplicateRow}
                onDeleteRow={handleDeleteRow}
                onReorderRows={handleReorderRows}
                onAddRow={handleAddRow}
                onUpdateSection={handleUpdateSection}
                onDeleteSection={handleDeleteSection}
                onAddSection={handleAddSection}
              />
            )}
          </main>

          <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0 border-l border-black/[0.09] px-5 py-5 bg-surface/50">
            <div className="bg-surface rounded-lg border border-black/[0.09] p-4">
              <p className="text-xs font-medium text-text-secondary mb-1">Progress</p>
              <p className="font-serif text-2xl font-bold text-text-primary">
                {done} <span className="text-text-tertiary text-lg">/ {total}</span>
              </p>
              <p className="text-xs text-text-secondary mb-2">rows completed</p>
              <ProgressBar value={done} max={total || 1} />
            </div>

            {sections.length > 1 && (
              <div className="bg-surface rounded-lg border border-black/[0.09] p-4">
                <p className="text-xs font-medium text-text-secondary mb-3">By section</p>
                <div className="flex flex-col gap-3">
                  {sections.map((s) => {
                    const sRows = s.rows ?? [];
                    const sDone = sRows.filter((r) => r.done).length;
                    const sTotal = sRows.length;
                    return (
                      <div key={s.id}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs font-medium text-text-primary truncate">{s.name}</span>
                          <span className="text-xs text-text-secondary ml-1 shrink-0">{sDone} / {sTotal}</span>
                        </div>
                        <ProgressBar value={sDone} max={sTotal || 1} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <MobileNav />

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
