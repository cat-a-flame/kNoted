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
};

type DraftSection = {
  id: string;
  name: string;
  rows: DraftRow[];
  builderTitle: string;
  builderStitches: Stitch[];
  builderNote: string;
};

let _id = 0;
const genId = () => String(++_id);

export default function NewPatternPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const [sections, setSections] = useState<DraftSection[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [addingSectionName, setAddingSectionName] = useState('');

  const updateSection = (id: string, patch: Partial<DraftSection>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSection = () => {
    const trimmed = addingSectionName.trim();
    if (!trimmed) return;
    setSections((prev) => [
      ...prev,
      { id: genId(), name: trimmed, rows: [], builderTitle: '', builderStitches: [], builderNote: '' },
    ]);
    setAddingSectionName('');
    setShowAddSection(false);
  };

  const addRowToSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const title = s.builderTitle.trim() || `Row ${s.rows.length + 1}`;
        return {
          ...s,
          rows: [...s.rows, { title, stitches: s.builderStitches, note: s.builderNote.trim() }],
          builderTitle: '',
          builderStitches: [],
          builderNote: '',
        };
      }),
    );
  };

  const removeRow = (sectionId: string, rowIndex: number) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, rows: s.rows.filter((_, i) => i !== rowIndex) } : s,
      ),
    );

  const removeSection = (sectionId: string) =>
    setSections((prev) => prev.filter((s) => s.id !== sectionId));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Pattern name is required.'); return; }
    if (sections.length === 0) { setError('Add at least one section.'); return; }
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

    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .insert({ pattern_id: pattern.id, position: si, name: sec.name })
        .select('*')
        .single();
      if (sectionError) { setToast({ message: sectionError.message, variant: 'error' }); setSaving(false); return; }

      if (sec.rows.length > 0) {
        const { error: rowsError } = await supabase.from('rows').insert(
          sec.rows.map((row, ri) => ({
            section_id: sectionData.id,
            position: ri,
            title: row.title,
            stitches: row.stitches,
            note: row.note || null,
            done: false,
          })),
        );
        if (rowsError) { setToast({ message: rowsError.message, variant: 'error' }); setSaving(false); return; }
      }
    }

    router.push(`/patterns/${pattern.id}`);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col pb-16 md:pb-0">
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

            <div>
              <h3 className="font-serif text-base font-semibold text-text-primary mb-3">Sections & rows</h3>
              <div className="flex flex-col gap-4">
                {sections.map((section) => (
                  <div key={section.id} className="bg-surface border border-black/[0.09] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-serif text-sm font-semibold text-text-primary">{section.name}</h4>
                      <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        className="text-xs text-text-tertiary hover:text-coral transition-colors"
                      >
                        Remove section
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Row name</label>
                        <input
                          value={section.builderTitle}
                          onChange={(e) => updateSection(section.id, { builderTitle: e.target.value })}
                          placeholder={`Row ${section.rows.length + 1}`}
                          className="w-full border border-black/[0.09] rounded-sm px-3 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Stitches</label>
                        <StitchBuilder
                          stitches={section.builderStitches}
                          onChange={(stitches) => updateSection(section.id, { builderStitches: stitches })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Note (optional)</label>
                        <input
                          value={section.builderNote}
                          onChange={(e) => updateSection(section.id, { builderNote: e.target.value })}
                          placeholder="Add a note…"
                          className="w-full border border-black/[0.09] rounded-sm px-3 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => addRowToSection(section.id)}
                        className="self-start px-4 py-1.5 text-sm font-medium bg-teal-light text-teal-dark border border-teal/20 rounded-sm hover:bg-teal/10 transition-colors"
                      >
                        + Add row to {section.name}
                      </button>
                    </div>

                    {section.rows.length > 0 && (
                      <div className="flex flex-col gap-1.5 border-t border-black/[0.06] pt-3">
                        {section.rows.map((row, ri) => (
                          <div key={ri} className="flex items-start gap-2 py-1">
                            <div className="w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center text-xs font-bold text-text-secondary shrink-0 mt-0.5">
                              {ri + 1}
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
                              {row.note && <p className="text-xs text-text-secondary italic mt-0.5">{row.note}</p>}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRow(section.id, ri)}
                              className="text-text-tertiary hover:text-coral transition-colors shrink-0 mt-0.5"
                              aria-label="Remove row"
                            >
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {showAddSection ? (
                  <div className="border border-dashed border-black/[0.17] rounded-lg p-4 flex gap-2">
                    <input
                      autoFocus
                      value={addingSectionName}
                      onChange={(e) => setAddingSectionName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSection(); } }}
                      placeholder="Section name (e.g. Stem, Cap…)"
                      className="flex-1 border border-black/[0.09] rounded-sm px-3 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    />
                    <button
                      type="button"
                      onClick={addSection}
                      className="px-3 py-1.5 text-sm font-medium bg-teal text-white rounded-sm hover:bg-teal-dark transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddSection(false); setAddingSectionName(''); }}
                      className="px-3 py-1.5 text-sm font-medium border border-black/[0.09] text-text-secondary rounded-sm hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddSection(true)}
                    className="w-full py-3 text-sm font-medium text-text-secondary border border-dashed border-black/[0.17] rounded-lg hover:border-teal hover:text-teal transition-colors"
                  >
                    + Add section
                  </button>
                )}
              </div>
            </div>

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
