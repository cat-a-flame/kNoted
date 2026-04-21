'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Stitch } from '@/lib/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { StitchBuilder } from '@/components/rows/StitchBuilder';
import { StitchPill } from '@/components/rows/StitchPill';
import { Toast } from '@/components/ui/Toast';

type DraftRow = {
  title: string;
  stitches: Stitch[];
  note: string;
  section: string;
};

export default function NewPatternPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  // Draft row state
  const [rowTitle, setRowTitle] = useState('');
  const [rowStitches, setRowStitches] = useState<Stitch[]>([]);
  const [rowNote, setRowNote] = useState('');
  const [rowSection, setRowSection] = useState('');
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);

  const existingDraftSections = Array.from(new Set(draftRows.map((r) => r.section).filter(Boolean)));

  const addDraftRow = () => {
    const title = rowTitle.trim() || `Row ${draftRows.length + 1}`;
    setDraftRows((prev) => [
      ...prev,
      { title, stitches: rowStitches, note: rowNote.trim(), section: rowSection.trim() },
    ]);
    setRowTitle('');
    setRowStitches([]);
    setRowNote('');
    setRowSection('');
  };

  const removeDraftRow = (index: number) => {
    setDraftRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Pattern name is required.'); return; }
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;
    if (!userId) { setError('Not authenticated.'); setSaving(false); return; }

    const { data: pattern, error: patternError } = await supabase
      .from('patterns')
      .insert({ user_id: userId, name: trimmedName })
      .select('*')
      .single();

    if (patternError) { setError(patternError.message); setSaving(false); return; }

    if (draftRows.length > 0) {
      const { error: rowsError } = await supabase.from('rows').insert(
        draftRows.map((row, i) => ({
          pattern_id: pattern.id,
          position: i,
          title: row.title,
          stitches: row.stitches,
          note: row.note || null,
          section: row.section || null,
          done: false,
        })),
      );
      if (rowsError) { setToast({ message: rowsError.message, variant: 'error' }); setSaving(false); return; }
    }

    router.push(`/patterns/${pattern.id}`);
  };

  // Build section groups for draft rows preview (preserving first-appearance order)
  const draftGroups: { section: string; items: { row: DraftRow; index: number }[] }[] = [];
  const draftSectionMap = new Map<string, number>();
  draftRows.forEach((row, i) => {
    const key = row.section || '';
    if (!draftSectionMap.has(key)) {
      draftSectionMap.set(key, draftGroups.length);
      draftGroups.push({ section: key, items: [] });
    }
    draftGroups[draftSectionMap.get(key)!].items.push({ row, index: i });
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm border-b border-black/[0.09] px-6 py-3 flex items-center gap-4">
          <Link href="/patterns" className="text-text-tertiary hover:text-text-secondary transition-colors shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4L6 9l5 5" />
            </svg>
          </Link>
          <h2 className="font-serif text-lg font-semibold text-text-primary">New pattern</h2>
        </header>

        <main className="px-6 py-5 max-w-2xl w-full">
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            {/* Pattern name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1.5">
                Pattern name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cozy hat"
                className="w-full border border-black/[0.09] rounded-sm px-3 py-2 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
              />
              {error && <p className="mt-1.5 text-xs text-coral">{error}</p>}
            </div>

            {/* Row builder */}
            <div>
              <h3 className="font-serif text-base font-semibold text-text-primary mb-3">Add rows</h3>
              <div className="bg-surface border border-black/[0.09] rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Row name</label>
                  <input
                    value={rowTitle}
                    onChange={(e) => setRowTitle(e.target.value)}
                    placeholder={`Row ${draftRows.length + 1}`}
                    className="w-full border border-black/[0.09] rounded-sm px-3 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Section (optional)</label>
                  <input
                    value={rowSection}
                    onChange={(e) => setRowSection(e.target.value)}
                    placeholder="e.g. Stem, Cap…"
                    list="draft-sections-list"
                    className="w-full border border-black/[0.09] rounded-sm px-3 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                  />
                  {existingDraftSections.length > 0 && (
                    <datalist id="draft-sections-list">
                      {existingDraftSections.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Stitches</label>
                  <StitchBuilder stitches={rowStitches} onChange={setRowStitches} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Note (optional)</label>
                  <input
                    value={rowNote}
                    onChange={(e) => setRowNote(e.target.value)}
                    placeholder="Add a note…"
                    className="w-full border border-black/[0.09] rounded-sm px-3 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                  />
                </div>
                <button
                  type="button"
                  onClick={addDraftRow}
                  className="self-start px-4 py-1.5 text-sm font-medium bg-teal-light text-teal-dark border border-teal/20 rounded-sm hover:bg-teal/10 transition-colors"
                >
                  + Add row
                </button>
              </div>
            </div>

            {/* Draft rows preview grouped by section */}
            {draftRows.length > 0 && (
              <div className="flex flex-col gap-4">
                {draftGroups.map(({ section, items }, groupIndex) => (
                  <div key={section || '__none__'}>
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
                      {items.map(({ row, index: i }) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 bg-surface border border-black/[0.09] rounded-md p-3"
                        >
                          <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center text-xs font-bold text-text-secondary shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">{row.title}</p>
                            {row.stitches.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {row.stitches.map((s, si) => (
                                  <StitchPill key={si} stitch={s} />
                                ))}
                              </div>
                            )}
                            {row.note && <p className="text-xs text-text-secondary italic mt-1">{row.note}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDraftRow(i)}
                            className="text-text-tertiary hover:text-coral transition-colors shrink-0"
                            aria-label="Remove row"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-sm font-medium bg-teal text-white rounded-sm hover:bg-teal-dark transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save pattern'}
              </button>
            </div>
          </form>
        </main>
      </div>

      <MobileNav />

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
