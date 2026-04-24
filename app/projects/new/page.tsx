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
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Toast } from '@/components/ui/Toast';
import styles from './page.module.css';

type DraftRow = { title: string; stitches: Stitch[]; note: string };

type DraftSection = {
  id: string;
  name: string;
  yarn_name: string;
  yarn_weight: string;
  yarn_colour: string;
  hook_size: string;
  rows: DraftRow[];
  builderTitle: string;
  builderStitches: Stitch[];
  builderNote: string;
};

let _id = 0;
const genId = () => String(++_id);

const YARN_WEIGHTS = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky', 'Super Bulky'];
const HOOK_SIZES = ['2mm', '2.5mm', '3mm', '3.25mm', '3.5mm', '3.75mm', '4mm', '4.5mm', '5mm', '5.5mm', '6mm', '6.5mm', '7mm', '8mm', '9mm', '10mm', '12mm', '15mm'];

export default function NewProjectPage() {
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
      { id: genId(), name: trimmed, yarn_name: '', yarn_weight: '', yarn_colour: '', hook_size: '', rows: [], builderTitle: '', builderStitches: [], builderNote: '' },
    ]);
    setAddingSectionName('');
    setShowAddSection(false);
  };

  const addRowToSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const title = s.builderTitle.trim() || `Row ${s.rows.length}`;
        return { ...s, rows: [...s.rows, { title, stitches: s.builderStitches, note: s.builderNote.trim() }], builderTitle: '', builderStitches: [], builderNote: '' };
      }),
    );
  };

  const removeRow = (sectionId: string, rowIndex: number) =>
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, rows: s.rows.filter((_, i) => i !== rowIndex) } : s));

  const removeSection = (sectionId: string) =>
    setSections((prev) => prev.filter((s) => s.id !== sectionId));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Project name is required.'); return; }
    if (sections.length === 0) { setError('Add at least one section.'); return; }
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;
    if (!userId) { setError('Not authenticated.'); setSaving(false); return; }

    const { data: project, error: projectError } = await supabase
      .from('projects').insert({ user_id: userId, name: trimmedName }).select('*').single();
    if (projectError) { setError(projectError.message); setSaving(false); return; }

    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .insert({ project_id: project.id, position: si, name: sec.name, yarn_name: sec.yarn_name || null, yarn_weight: sec.yarn_weight || null, yarn_colour: sec.yarn_colour || null, hook_size: sec.hook_size || null })
        .select('*').single();
      if (sectionError) { setToast({ message: sectionError.message, variant: 'error' }); setSaving(false); return; }

      if (sec.rows.length > 0) {
        const { error: rowsError } = await supabase.from('rows').insert(
          sec.rows.map((row, ri) => ({ section_id: sectionData.id, position: ri, title: row.title, stitches: row.stitches, note: row.note || null, done: false })),
        );
        if (rowsError) { setToast({ message: rowsError.message, variant: 'error' }); setSaving(false); return; }
      }
    }

    router.push(`/projects/${project.id}`);
  };

  return (
    <div className="appShell">
      <Sidebar />

      <div className="pageContent">
        <header className="pageHeader">
          <Link href="/projects" className={styles.backBtn} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4L6 9l5 5" />
            </svg>
          </Link>
          <h2 className={styles.headerTitle}>New project</h2>
        </header>

        <main className={styles.main}>
          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.field}>
              <FormLabel htmlFor="name">Project name</FormLabel>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cozy hat" />
              {error && <p className={styles.errorMsg}>{error}</p>}
            </div>

            <div>
              <h3 className={styles.sectionTitle}>Sections & rows</h3>
              <div className={styles.sectionsList}>
                {sections.map((section) => (
                  <div key={section.id} className={styles.sectionCard}>
                    <div className={styles.sectionCardHeader}>
                      <h4 className={styles.sectionCardName}>{section.name}</h4>
                      <button type="button" onClick={() => removeSection(section.id)} className={styles.removeBtn}>
                        Remove section
                      </button>
                    </div>

                    <div className={styles.detailGrid}>
                      {([
                        { field: 'yarn_name' as const, label: 'Yarn name', placeholder: 'e.g. Lion Brand' },
                        { field: 'yarn_weight' as const, label: 'Yarn weight', placeholder: 'e.g. DK', list: 'np-yarn-weights' },
                        { field: 'yarn_colour' as const, label: 'Colour', placeholder: 'e.g. Forest Green' },
                        { field: 'hook_size' as const, label: 'Hook size', placeholder: 'e.g. 5mm', list: 'np-hook-sizes' },
                      ] as { field: 'yarn_name' | 'yarn_weight' | 'yarn_colour' | 'hook_size'; label: string; placeholder: string; list?: string }[]).map(({ field, label, placeholder, list }) => (
                        <div key={field}>
                          <FormLabel>{label}</FormLabel>
                          <Input value={section[field]} onChange={(e) => updateSection(section.id, { [field]: e.target.value })} placeholder={placeholder} list={list} />
                        </div>
                      ))}
                      <datalist id="np-yarn-weights">{YARN_WEIGHTS.map((w) => <option key={w} value={w} />)}</datalist>
                      <datalist id="np-hook-sizes">{HOOK_SIZES.map((s) => <option key={s} value={s} />)}</datalist>
                    </div>

                    <div className={styles.rowBuilder}>
                      <div>
                        <FormLabel>Row name</FormLabel>
                        <Input value={section.builderTitle} onChange={(e) => updateSection(section.id, { builderTitle: e.target.value })} placeholder={`Row ${section.rows.length}`} />
                      </div>
                      <div>
                        <FormLabel>Stitches</FormLabel>
                        <StitchBuilder stitches={section.builderStitches} onChange={(stitches) => updateSection(section.id, { builderStitches: stitches })} />
                      </div>
                      <div>
                        <FormLabel>Note (optional)</FormLabel>
                        <Input value={section.builderNote} onChange={(e) => updateSection(section.id, { builderNote: e.target.value })} placeholder="Add a note…" />
                      </div>
                      <button type="button" onClick={() => addRowToSection(section.id)} className={styles.addRowToSection}>
                        + Add row to {section.name}
                      </button>
                    </div>

                    {section.rows.length > 0 && (
                      <div className={styles.rowList}>
                        {section.rows.map((row, ri) => (
                          <div key={ri} className={styles.rowItem}>
                            <div className={styles.rowBubble}>{ri}</div>
                            <div className={styles.rowBody}>
                              <p className={styles.rowTitle}>{row.title}</p>
                              {row.stitches.length > 0 && (
                                <div className={styles.rowPills}>
                                  {row.stitches.map((s, si) => <StitchPill key={si} stitch={s} />)}
                                </div>
                              )}
                              {row.note && <p className={styles.rowNote}>{row.note}</p>}
                            </div>
                            <button type="button" onClick={() => removeRow(section.id, ri)} className={styles.deleteRowBtn} aria-label="Remove row">
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
                  <div className={styles.addSectionForm}>
                    <Input autoFocus value={addingSectionName} onChange={(e) => setAddingSectionName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSection(); } }}
                      placeholder="Section name (e.g. Stem, Cap…)" />
                    <button type="button" onClick={addSection} className={styles.addSectionBtn}>Add</button>
                    <button type="button" onClick={() => { setShowAddSection(false); setAddingSectionName(''); }} className={styles.cancelBtn}>Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAddSection(true)} className={styles.addSectionTrigger}>
                    + Add section
                  </button>
                )}
              </div>
            </div>

            <div>
              <button type="submit" disabled={saving} className={styles.submitBtn}>
                {saving ? 'Saving…' : 'Save project'}
              </button>
            </div>
          </form>
        </main>
      </div>

      <MobileNav />

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
