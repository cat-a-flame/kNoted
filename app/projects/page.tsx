'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Project } from '@/lib/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import styles from './page.module.css';

type Tab = 'active' | 'archived';

type ProjectWithRows = Project & { rows: { done: boolean }[] };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithRows[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

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
    setToast({ message: archived ? 'Project archived.' : 'Project unarchived.', variant: 'success' });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const supabase = createClient();
    const { error } = await supabase.from('projects').delete().eq('id', deleteId);
    if (error) { setToast({ message: error.message, variant: 'error' }); setDeleteId(null); return; }
    setProjects((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    setToast({ message: 'Project deleted.', variant: 'success' });
  };

  const filtered = projects.filter((p) => p.archived === (tab === 'archived'));

  return (
    <div className="appShell">
      <Sidebar />

      <div className="pageContent">
        <header className="pageHeader">
          <h2 className={styles.headerTitle}>Projects</h2>
          <Link href="/projects/new" className={styles.newBtn}>+ New project</Link>
        </header>

        <main className="pageMain">
          <div className={styles.tabs}>
            {(['active', 'archived'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.loading}>
              <p>Loading projects…</p>
            </div>
          ) : (
            <ProjectGrid projects={filtered} onArchive={handleArchive} onDelete={(id) => setDeleteId(id)} />
          )}
        </main>
      </div>

      <MobileNav />

      {deleteId && (
        <ConfirmDialog
          title="Delete project"
          description="This will permanently delete the project and all its rows. This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
