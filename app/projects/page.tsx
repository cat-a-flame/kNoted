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

      setProjects(
        projectData.map((p) => ({
          ...p,
          rows: rowsByProject.get(p.id) ?? [],
        })),
      );
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
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm border-b border-black/[0.09] px-6 py-3 flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl font-semibold text-text-primary">Projects</h2>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-teal text-white rounded-sm hover:bg-teal-dark transition-colors"
          >
            <span>+ New project</span>
          </Link>
        </header>

        <main className="px-6 py-5 flex-1">
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
              <p className="text-text-tertiary text-sm">Loading projects…</p>
            </div>
          ) : (
            <ProjectGrid
              projects={filtered}
              onArchive={handleArchive}
              onDelete={(id) => setDeleteId(id)}
            />
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
