'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Project } from '@/lib/types';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import styles from './page.module.css';

type Tab = 'active' | 'done' | 'archive' | 'bin';

type ProjectWithRows = Project & { rows: { done: boolean }[] };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithRows[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error'; onUndo?: () => void } | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!projectData) { setLoading(false); return; }

      const ids = projectData.map((p) => p.id);

      const { data: sectionData } = ids.length
        ? await supabase.from('sections').select('id, project_id').in('project_id', ids)
        : { data: [] };

      const sectionIds = (sectionData ?? []).map((s: { id: string }) => s.id);
      const sectionToProject = new Map<string, string>(
        (sectionData ?? []).map((s: { id: string; project_id: string }) => [s.id, s.project_id]),
      );

      const { data: rowData } = sectionIds.length
        ? await supabase.from('rows').select('section_id, done').in('section_id', sectionIds)
        : { data: [] };

      const rowsByProject = new Map<string, { done: boolean }[]>();
      (rowData ?? []).forEach((r: { section_id: string; done: boolean }) => {
        const projectId = sectionToProject.get(r.section_id);
        if (!projectId) return;
        const arr = rowsByProject.get(projectId) ?? [];
        arr.push({ done: r.done });
        rowsByProject.set(projectId, arr);
      });

      setProjects(projectData.map((p) => ({ ...p, rows: rowsByProject.get(p.id) ?? [] })));
      setLoading(false);
    };
    load();
  }, []);

  const handleArchive = async (id: string, archived: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from('projects').update({ archived }).eq('id', id);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, archived } : p)));
    setToast({
      message: archived ? 'Project archived.' : 'Project unarchived.',
      variant: 'success',
      onUndo: () => handleArchive(id, !archived),
    });
  };

  const handleRestore = async (id: string) => {
    const { error } = await createClient().from('projects').update({ deleted_at: null }).eq('id', id);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, deleted_at: null } : p));
    setToast({ message: 'Project restored.', variant: 'success' });
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteId) return;
    const { error } = await createClient().from('projects').delete().eq('id', permanentDeleteId);
    if (error) { setToast({ message: error.message, variant: 'error' }); setPermanentDeleteId(null); return; }
    setProjects((prev) => prev.filter((p) => p.id !== permanentDeleteId));
    setPermanentDeleteId(null);
    setToast({ message: 'Project permanently deleted.', variant: 'success' });
  };

  const daysRemaining = (deletedAt: string) => {
    const expiry = new Date(new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  };

  const isAllDone = (p: ProjectWithRows) => p.rows.length > 0 && p.rows.every((r) => r.done);

  const filtered = projects.filter((p) => {
    if (p.deleted_at) return tab === 'bin';
    if (tab === 'bin') return false;
    if (tab === 'active') return !p.archived && !isAllDone(p);
    if (tab === 'done') return !p.archived && isAllDone(p);
    return p.archived;
  });

  return (
    <div className="appShell">
      <AppHeader />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.tabRow}>
            <div className={styles.tabs}>
              {(['active', 'done', 'archive', 'bin'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Link href="/projects/new" className={styles.newProjectBtn}>+ New project</Link>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <p>Loading projects…</p>
            </div>
          ) : tab === 'bin' ? (
            filtered.length === 0 ? (
              <p className={styles.loading}>The bin is empty.</p>
            ) : (
              <div className={styles.binList}>
                {filtered.map((p) => (
                  <div key={p.id} className={styles.binItem}>
                    <div className={styles.binInfo}>
                      <p className={styles.binName}>{p.name}</p>
                      <p className={styles.binExpiry}>{daysRemaining(p.deleted_at!)} days until permanent deletion</p>
                    </div>
                    <div className={styles.binActions}>
                      <button onClick={() => handleRestore(p.id)} className={styles.binRestoreBtn}>Restore</button>
                      <button onClick={() => setPermanentDeleteId(p.id)} className={styles.binDeleteBtn}>Delete permanently</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <ProjectGrid projects={filtered} onArchive={handleArchive} onDelete={(id) => setPermanentDeleteId(id)} />
          )}
        </div>
      </main>

      <AppFooter />

      {permanentDeleteId && (
        <ConfirmDialog
          title="Delete permanently"
          description="This will permanently delete the project and all its rows. This cannot be undone."
          onConfirm={handlePermanentDelete}
          onCancel={() => setPermanentDeleteId(null)}
        />
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} onUndo={toast.onUndo} />}
    </div>
  );
}
