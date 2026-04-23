'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Pattern } from '@/lib/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { PatternGrid } from '@/components/patterns/PatternGrid';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';

type Tab = 'active' | 'archived';

type PatternWithRows = Pattern & { rows: { done: boolean }[] };

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<PatternWithRows[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: patternData } = await supabase
        .from('patterns')
        .select('*')
        .order('created_at', { ascending: false });

      if (!patternData) { setLoading(false); return; }

      const ids = patternData.map((p) => p.id);

      const { data: sectionData } = ids.length
        ? await supabase.from('sections').select('id, pattern_id').in('pattern_id', ids)
        : { data: [] };

      const sectionIds = (sectionData ?? []).map((s: { id: string }) => s.id);
      const sectionToPattern = new Map<string, string>(
        (sectionData ?? []).map((s: { id: string; pattern_id: string }) => [s.id, s.pattern_id]),
      );

      const { data: rowData } = sectionIds.length
        ? await supabase.from('rows').select('section_id, done').in('section_id', sectionIds)
        : { data: [] };

      const rowsByPattern = new Map<string, { done: boolean }[]>();
      (rowData ?? []).forEach((r: { section_id: string; done: boolean }) => {
        const patternId = sectionToPattern.get(r.section_id);
        if (!patternId) return;
        const arr = rowsByPattern.get(patternId) ?? [];
        arr.push({ done: r.done });
        rowsByPattern.set(patternId, arr);
      });

      setPatterns(
        patternData.map((p) => ({
          ...p,
          rows: rowsByPattern.get(p.id) ?? [],
        })),
      );
      setLoading(false);
    };
    load();
  }, []);

  const handleArchive = async (id: string, archived: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from('patterns').update({ archived }).eq('id', id);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setPatterns((prev) => prev.map((p) => (p.id === id ? { ...p, archived } : p)));
    setToast({ message: archived ? 'Pattern archived.' : 'Pattern unarchived.', variant: 'success' });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const supabase = createClient();
    const { error } = await supabase.from('patterns').delete().eq('id', deleteId);
    if (error) { setToast({ message: error.message, variant: 'error' }); setDeleteId(null); return; }
    setPatterns((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    setToast({ message: 'Pattern deleted.', variant: 'success' });
  };

  const filtered = patterns.filter((p) => p.archived === (tab === 'archived'));

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm border-b border-black/[0.09] px-6 py-3 flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl font-semibold text-text-primary">Patterns</h2>
          <Link
            href="/patterns/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-teal text-white rounded-sm hover:bg-teal-dark transition-colors"
          >
            <span>+ New pattern</span>
          </Link>
        </header>

        <main className="px-6 py-5 flex-1">
          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-black/[0.09]">
            {(['active', 'archived'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
                  tab === t
                    ? 'border-teal text-teal'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <p className="text-text-tertiary text-sm">Loading patterns…</p>
            </div>
          ) : (
            <PatternGrid
              patterns={filtered}
              onArchive={handleArchive}
              onDelete={(id) => setDeleteId(id)}
            />
          )}
        </main>
      </div>

      <MobileNav />

      {deleteId && (
        <ConfirmDialog
          title="Delete pattern"
          description="This will permanently delete the pattern and all its rows. This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

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
