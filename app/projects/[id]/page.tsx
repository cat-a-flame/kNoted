'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Project, Section, Row, Stitch } from '@/lib/types';
import { todayIso } from '@/lib/utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { SectionList } from '@/components/rows/SectionList';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toast } from '@/components/ui/Toast';

function CoverPlaceholder() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#F0EDE8] to-[#DFF0EC] flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 32 32" fill="none" stroke="#9BBFBA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="16" r="11" />
        <path d="M5 16c4-5 8-7 11-7s7 2 11 7" />
        <path d="M5 16c4 5 8 7 11 7s7-2 11-7" />
        <path d="M16 5c-3 4-3 8-3 11s0 7 3 11" />
        <path d="M16 5c3 4 3 8 3 11s0 7-3 11" />
      </svg>
    </div>
  );
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const didScrollRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: p } = await supabase.from('projects').select('*').eq('id', id).single();
      const { data: s } = await supabase
        .from('sections')
        .select('*, rows(*)')
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
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      didScrollRef.current = true;
    }
  }, [loading, firstIncompleteRowId]);

  const submitRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === project?.name) { setIsRenaming(false); return; }
    const supabase = createClient();
    const { error } = await supabase.from('projects').update({ name: trimmed }).eq('id', id);
    if (error) { setToast({ message: error.message, variant: 'error' }); setIsRenaming(false); return; }
    setProject((prev) => (prev ? { ...prev, name: trimmed } : prev));
    setIsRenaming(false);
    setToast({ message: 'Project renamed.', variant: 'success' });
  }, [id, renameValue, project?.name]);

  const handleCoverChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCoverUploading(true);
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${id}/cover.${ext}`;
      const { error } = await supabase.storage
        .from('pattern-covers')
        .upload(path, file, { upsert: true });
      if (error) { setToast({ message: error.message, variant: 'error' }); setCoverUploading(false); return; }
      const { data } = supabase.storage.from('pattern-covers').getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      await supabase.from('projects').update({ cover_url: data.publicUrl }).eq('id', id);
      setProject((prev) => (prev ? { ...prev, cover_url: url } : prev));
      setToast({ message: 'Cover image saved.', variant: 'success' });
      setCoverUploading(false);
      e.target.value = '';
    },
    [id],
  );

  const handleRemoveCover = useCallback(async () => {
    const supabase = createClient();
    await supabase.from('projects').update({ cover_url: null }).eq('id', id);
    setProject((prev) => (prev ? { ...prev, cover_url: null } : prev));
    setToast({ message: 'Cover image removed.', variant: 'success' });
  }, [id]);

  const handleToggleRow = useCallback(
    async (sectionId: string, rowId: string, nextDone: boolean) => {
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
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, rows: (s.rows ?? []).map((r) => (r.id === rowId ? { ...r, done: nextDone } : r)) }
            : s,
        ),
      );
    },
    [id, project],
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
      setToast({ message: 'Row saved.', variant: 'success' });
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
      setToast({ message: 'Row deleted.', variant: 'success' });
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
      setToast({ message: 'Section deleted.', variant: 'success' });
    },
    [],
  );

  const handleAddSection = useCallback(
    async (name: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sections')
        .insert({ project_id: id, position: sections.length, name })
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

  if (!project) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <p className="text-text-secondary">Project not found.</p>
          <Link href="/projects" className="text-sm text-teal hover:underline">Back to projects</Link>
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
            href="/projects"
            className="text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4L6 9l5 5" />
            </svg>
          </Link>

          <div className="flex-1 flex items-center gap-2 min-w-0 group/title">
            {isRenaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                className="font-serif text-lg font-semibold text-text-primary bg-transparent border-b border-teal focus:outline-none min-w-0 flex-1"
              />
            ) : (
              <>
                <h2 className="font-serif text-lg font-semibold text-text-primary truncate">
                  {project.name}
                </h2>
                <button
                  onClick={() => { setIsRenaming(true); setRenameValue(project.name); }}
                  className="opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0 text-text-tertiary hover:text-text-secondary"
                  title="Rename project"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M11.5 2.5a2.12 2.12 0 0 1 3 3L5 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            )}
          </div>

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

        {/* Cover banner */}
        {(project.cover_url || editMode) && (
          <div className="relative w-full h-44 shrink-0 border-b border-black/[0.09] overflow-hidden">
            {project.cover_url ? (
              <Image
                src={project.cover_url}
                alt={project.name}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            ) : (
              <CoverPlaceholder />
            )}
            {editMode && (
              <div className="absolute bottom-3 right-4 flex gap-2">
                <label className={`px-3 py-1.5 text-xs font-medium bg-white/90 backdrop-blur-sm border border-black/[0.09] rounded-sm transition-colors ${coverUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-white'}`}>
                  {coverUploading ? 'Uploading…' : project.cover_url ? 'Change cover' : '+ Add cover'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverChange}
                    disabled={coverUploading}
                  />
                </label>
                {project.cover_url && (
                  <button
                    onClick={handleRemoveCover}
                    className="px-3 py-1.5 text-xs font-medium bg-white/90 backdrop-blur-sm border border-black/[0.09] rounded-sm hover:bg-white hover:text-coral transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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
