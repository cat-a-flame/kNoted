'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Project, Section, Row } from '@/lib/types';
import { todayIso } from '@/lib/utils';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { SectionList } from '@/components/rows/SectionList';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import { Toast } from '@/components/ui/Toast';
import styles from './page.module.css';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error'; onUndo?: () => void } | null>(null);
  const [stitchCount, setStitchCount] = useState(0);

  const didScrollRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: p } = await supabase.from('projects').select('*').eq('id', id).single();
      const { data: s } = await supabase
        .from('sections').select('*, rows(*)')
        .eq('project_id', id)
        .order('position', { ascending: true })
        .order('position', { ascending: true, foreignTable: 'rows' });
      setProject(p ?? null);
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
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); didScrollRef.current = true; }
  }, [loading, firstIncompleteRowId]);

  const submitRename = useCallback(async (): Promise<boolean> => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === project?.name) return true;
    const { error } = await createClient().from('projects').update({ name: trimmed }).eq('id', id);
    if (error) { setToast({ message: error.message, variant: 'error' }); return false; }
    setProject((prev) => (prev ? { ...prev, name: trimmed } : prev));
    return true;
  }, [id, renameValue, project?.name]);

  const handleToggleEditMode = useCallback(async () => {
    if (editMode) {
      const ok = await submitRename();
      setEditMode(false);
      if (ok) setToast({ message: 'Changes saved.', variant: 'success' });
    } else {
      setRenameValue(project?.name ?? '');
      setEditMode(true);
    }
  }, [editMode, project?.name, submitRename]);

  const handleArchiveProject = useCallback(async (forceArchived?: boolean) => {
    if (!project) return;
    setMenuOpen(false);
    const nextArchived = forceArchived !== undefined ? forceArchived : !project.archived;
    const { error } = await createClient().from('projects').update({ archived: nextArchived }).eq('id', id);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setProject((prev) => prev ? { ...prev, archived: nextArchived } : prev);
    setToast({
      message: nextArchived ? 'Project archived.' : 'Project unarchived.',
      variant: 'success',
      onUndo: () => handleArchiveProject(!nextArchived),
    });
  }, [id, project]);

  const handleDuplicate = useCallback(async () => {
    if (!project) return;
    setMenuOpen(false);
    const supabase = createClient();
    const { data: newProject, error: pErr } = await supabase
      .from('projects')
      .insert({ name: `${project.name} (copy)`, archived: false, activity: [], cover_url: project.cover_url })
      .select('*').single();
    if (pErr) { setToast({ message: pErr.message, variant: 'error' }); return; }
    for (const section of sections) {
      const { data: newSection, error: sErr } = await supabase
        .from('sections')
        .insert({ project_id: newProject.id, position: section.position, name: section.name, yarn_name: section.yarn_name, yarn_weight: section.yarn_weight, yarn_colour: section.yarn_colour, hook_size: section.hook_size })
        .select('*').single();
      if (sErr || !newSection) continue;
      const rows = section.rows ?? [];
      if (rows.length > 0) {
        await supabase.from('rows').insert(rows.map((r) => ({ section_id: newSection.id, position: r.position, title: r.title, note: r.note, stitch_count: r.stitch_count, done: false })));
      }
    }
    setToast({ message: 'Project duplicated.', variant: 'success' });
  }, [project, sections]);

  const handleMoveTobin = useCallback(async () => {
    if (!project) return;
    setMenuOpen(false);
    const deletedAt = new Date().toISOString();
    const { error } = await createClient().from('projects').update({ deleted_at: deletedAt }).eq('id', id);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setProject((prev) => (prev ? { ...prev, deleted_at: deletedAt } : prev));
    setToast({
      message: 'Project moved to bin.',
      variant: 'success',
      onUndo: async () => {
        await createClient().from('projects').update({ deleted_at: null }).eq('id', id);
        setProject((prev) => (prev ? { ...prev, deleted_at: null } : prev));
      },
    });
  }, [id, project]);

  const handleCoverChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${id}/cover.${ext}`;
    const { error } = await supabase.storage.from('pattern-covers').upload(path, file, { upsert: true });
    if (error) { setToast({ message: error.message, variant: 'error' }); setCoverUploading(false); return; }
    const { data } = supabase.storage.from('pattern-covers').getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    await supabase.from('projects').update({ cover_url: data.publicUrl }).eq('id', id);
    setProject((prev) => (prev ? { ...prev, cover_url: url } : prev));
    setToast({ message: 'Cover image saved.', variant: 'success' });
    setCoverUploading(false);
    e.target.value = '';
  }, [id]);

  const handleRemoveCover = useCallback(async () => {
    const supabase = createClient();
    await supabase.from('projects').update({ cover_url: null }).eq('id', id);
    setProject((prev) => (prev ? { ...prev, cover_url: null } : prev));
  }, [id]);

  const handleToggleRow = useCallback(async (sectionId: string, rowId: string, nextDone: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from('rows').update({ done: nextDone }).eq('id', rowId);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    if (nextDone && project) {
      const today = todayIso();
      if (!project.activity.includes(today)) {
        const nextActivity = [...project.activity, today];
        await supabase.from('projects').update({ activity: nextActivity }).eq('id', id);
        setProject((prev) => (prev ? { ...prev, activity: nextActivity } : prev));
      }
    }
    setSections((prev) =>
      prev.map((s) => s.id === sectionId
        ? { ...s, rows: (s.rows ?? []).map((r) => (r.id === rowId ? { ...r, done: nextDone } : r)) }
        : s,
      ),
    );
  }, [id, project]);

  const handleEditRow = useCallback(async (sectionId: string, rowId: string, data: { note: string | null; stitch_count: number | null }) => {
    const supabase = createClient();
    const { error } = await supabase.from('rows').update(data).eq('id', rowId);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setSections((prev) =>
      prev.map((s) => s.id === sectionId
        ? { ...s, rows: (s.rows ?? []).map((r) => (r.id === rowId ? { ...r, ...data } : r)) }
        : s,
      ),
    );
    setToast({ message: 'Row saved.', variant: 'success' });
  }, []);

  const handleDuplicateRow = useCallback(async (sectionId: string, rowId: string) => {
    const supabase = createClient();
    const section = sections.find((s) => s.id === sectionId);
    const rows = section?.rows ?? [];
    const source = rows.find((r) => r.id === rowId);
    if (!source) return;
    const insertPos = source.position + 1;
    const reindexed = rows.map((r) => r.position >= insertPos ? { ...r, position: r.position + 1 } : r);
    const { data, error } = await supabase.from('rows')
      .insert({ section_id: sectionId, position: insertPos, title: source.title, note: source.note, stitch_count: source.stitch_count, done: false })
      .select('*').single();
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    await Promise.all(reindexed.filter((r) => r.id !== data.id && r.position >= insertPos).map((r) => supabase.from('rows').update({ position: r.position }).eq('id', r.id)));
    const merged = [...reindexed, data as Row].sort((a, b) => a.position - b.position);
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, rows: merged } : s)));
  }, [sections]);

  const handleDeleteRow = useCallback(async (sectionId: string, rowId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('rows').delete().eq('id', rowId);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, rows: (s.rows ?? []).filter((r) => r.id !== rowId) } : s));
    setToast({ message: 'Row deleted.', variant: 'success' });
  }, []);

  const handleReorderRows = useCallback(async (sectionId: string, reordered: Row[]) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, rows: reordered } : s)));
    const supabase = createClient();
    await Promise.all(reordered.map((r) => supabase.from('rows').update({ position: r.position }).eq('id', r.id)));
  }, []);

  const handleAddRow = useCallback(async (sectionId: string, data: { note: string | null; stitch_count: number | null }) => {
    const supabase = createClient();
    const section = sections.find((s) => s.id === sectionId);
    const rowCount = (section?.rows ?? []).length;
    const title = rowCount === 0 ? 'Base' : `Row ${rowCount}`;
    const { data: newRow, error } = await supabase.from('rows')
      .insert({ section_id: sectionId, position: rowCount, title, note: data.note, stitch_count: data.stitch_count, done: false })
      .select('*').single();
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, rows: [...(s.rows ?? []), newRow as Row] } : s));
  }, [sections]);

  const handleUpdateSection = useCallback(async (sectionId: string, updates: { name?: string; yarn_name?: string | null; yarn_weight?: string | null; yarn_colour?: string | null; hook_size?: string | null }) => {
    const supabase = createClient();
    const { error } = await supabase.from('sections').update(updates).eq('id', sectionId);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)));
    setToast({ message: 'Changes saved.', variant: 'success' });
  }, []);

  const handleDeleteSection = useCallback(async (sectionId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('sections').delete().eq('id', sectionId);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setToast({ message: 'Section deleted.', variant: 'success' });
  }, []);

  const handleAddSection = useCallback(async (name: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.from('sections')
      .insert({ project_id: id, position: sections.length, name }).select('*').single();
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setSections((prev) => [...prev, { ...data, rows: [] } as Section]);
  }, [id, sections.length]);

  if (loading) {
    return (
      <div className="appShell">
        <AppHeader />
        <main className={styles.pageMain}>
          <p className={styles.loadingText}>Loading…</p>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="appShell">
        <AppHeader />
        <main className={styles.pageMain}>
          <div className={styles.notFound}>
            <p className={styles.notFoundText}>Project not found.</p>
            <Link href="/projects" className={styles.backLink}>Back to projects</Link>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const isDeleted = !!project.deleted_at;

  return (
    <div className="appShell">
      <AppHeader />

      <main className={styles.pageMain}>
        {/* Sticky title bar */}
        <div className={styles.pageTop}>
          <div className={styles.pageTopInner}>
            <div className={styles.titleGroup}>
              {editMode ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') setRenameValue(project.name);
                  }}
                  className={styles.renameInput}
                />
              ) : (
                <h1 className={styles.titleText}>{project.name}</h1>
              )}
              {isDeleted && <span className={styles.deletedBadge}>Deleted</span>}
            </div>

            {!isDeleted && (
              <div ref={menuRef} className={styles.menuWrap}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className={`${styles.menuBtn} ${menuOpen ? styles.menuBtnActive : ''}`}
                  aria-label="Project options"
                >
                  •••
                </button>
                {menuOpen && (
                  <div className={styles.menuDropdown}>
                    <button onClick={() => handleArchiveProject()} className={styles.menuItem}>
                      {project.archived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button onClick={handleDuplicate} className={styles.menuItem}>
                      Duplicate
                    </button>
                    <div className={styles.menuDivider} />
                    <button onClick={handleMoveTobin} className={`${styles.menuItem} ${styles.menuItemDanger}`}>
                      Move to bin
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleToggleEditMode}
              disabled={isDeleted}
              className={`${styles.editToggle} ${editMode ? styles.editToggleActive : ''}`}
            >
              {editMode ? 'Done editing' : 'Edit'}
            </button>
          </div>
        </div>

        <div className={styles.container}>
          {/* Two-column body */}
          <div className={styles.twoCol}>
            {/* Left: row list */}
            <div className={`${styles.rowsCol} ${isDeleted ? styles.rowsColDisabled : ''}`}>
              {sections.length === 0 ? (
                <p className={styles.emptyState}>
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
            </div>

            {/* Right: cover + stats */}
            <aside className={styles.sidebar}>
              <div className={styles.coverCard}>
                {project.cover_url ? (
                  <Image src={project.cover_url} alt={project.name} fill style={{ objectFit: 'cover' }} sizes="320px" priority />
                ) : (
                  <CoverPlaceholder iconSize={36} />
                )}
                {editMode && (
                  <div className={styles.coverActions}>
                    <label className={`${styles.coverBtn} ${coverUploading ? styles.coverBtnDisabled : ''}`}>
                      {coverUploading ? 'Uploading…' : project.cover_url ? 'Change' : '+ Photo'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} disabled={coverUploading} />
                    </label>
                    {project.cover_url && (
                      <button onClick={handleRemoveCover} className={`${styles.coverBtn} ${styles.coverBtnRemove}`}>
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className={`${styles.statsCard} ${isDeleted ? styles.statsCardMuted : ''}`}>
                <p className={styles.statsLabel}>Progress</p>
                <p className={styles.statsValue}>
                  {done} <span className={styles.statsValueMuted}>/ {total}</span>
                </p>
                <p className={styles.statsSub}>rows completed</p>
                <ProgressBar value={done} max={total || 1} />

                {sections.length > 1 && (
                  <>
                    <div className={styles.statsDivider} />
                    <p className={styles.statsLabel} style={{ marginBottom: '0.75rem' }}>By section</p>
                    <div className={styles.sectionProgress}>
                      {sections.map((s) => {
                        const sRows = s.rows ?? [];
                        const sDone = sRows.filter((r) => r.done).length;
                        const sTotal = sRows.length;
                        return (
                          <div key={s.id}>
                            <div className={styles.sectionProgressRow}>
                              <span className={styles.sectionProgressName}>{s.name}</span>
                              <span className={styles.sectionProgressCount}>{sDone} / {sTotal}</span>
                            </div>
                            <ProgressBar value={sDone} max={sTotal || 1} />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {!isDeleted && (
                <div className={styles.stitchCard}>
                  <p className={styles.statsLabel}>Stitch counter</p>
                  <input
                    type="number"
                    min="0"
                    value={stitchCount}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setStitchCount(isNaN(n) || n < 0 ? 0 : n);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') { e.preventDefault(); setStitchCount((n) => n + 1); }
                      if (e.key === 'ArrowDown') { e.preventDefault(); setStitchCount((n) => Math.max(0, n - 1)); }
                    }}
                    className={styles.stitchInput}
                  />
                  <div className={styles.stitchBtns}>
                    <button
                      onClick={() => setStitchCount((n) => Math.max(0, n - 1))}
                      className={styles.stitchBtn}
                      aria-label="Decrease"
                    >−</button>
                    <button
                      onClick={() => setStitchCount((n) => n + 1)}
                      className={styles.stitchBtn}
                      aria-label="Increase"
                    >+</button>
                  </div>
                  <button onClick={() => setStitchCount(0)} className={styles.stitchReset}>
                    Reset
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <AppFooter />

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} onUndo={toast.onUndo} />}
    </div>
  );
}
