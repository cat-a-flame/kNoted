'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project } from '@/lib/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { ProgressBar } from '@/components/ui/ProgressBar';
import styles from './page.module.css';

type ProjectWithRows = Project & { rows: { done: boolean }[] };

function buildHeatmap(projects: ProjectWithRows[]): Map<string, number> {
  const map = new Map<string, number>();
  projects.filter((p) => !p.archived).forEach((p) => {
    p.activity.forEach((date) => { map.set(date, (map.get(date) ?? 0) + 1); });
  });
  return map;
}

function last70Days(): string[] {
  const days: string[] = [];
  for (let i = 69; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function HeatmapCell({ count }: { count: number }) {
  const cellClass =
    count === 0 ? styles.cellEmpty
    : count === 1 ? styles.cellLow
    : count === 2 ? styles.cellMid
    : styles.cellHigh;

  return (
    <div
      className={`${styles.cell} ${cellClass}`}
      title={count > 0 ? `${count} session${count > 1 ? 's' : ''}` : undefined}
    />
  );
}

const LEGEND_CLASSES = ['cellEmpty', 'cellLow', 'cellMid', 'cellHigh'] as const;

export default function StatsPage() {
  const [projects, setProjects] = useState<ProjectWithRows[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: projectData } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
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

  const active = projects.filter((p) => !p.archived);
  const finished = active.filter((p) => p.rows.length > 0 && p.rows.every((r) => r.done));
  const totalRowsDone = active.reduce((sum, p) => sum + p.rows.filter((r) => r.done).length, 0);
  const avgProgress = active.length === 0 ? 0 : Math.round(
    active.reduce((sum, p) => {
      const pct = p.rows.length === 0 ? 0 : (p.rows.filter((r) => r.done).length / p.rows.length) * 100;
      return sum + pct;
    }, 0) / active.length,
  );

  const heatmap = buildHeatmap(projects);
  const days = last70Days();

  const metrics = [
    { label: 'Finished projects', value: finished.length },
    { label: 'Rows completed', value: totalRowsDone },
    { label: 'Active projects', value: active.length },
    { label: 'Avg progress', value: `${avgProgress}%` },
  ];

  return (
    <div className="appShell">
      <Sidebar />

      <div className="pageContent">
        <header className="pageHeader">
          <h2 className={styles.headerTitle}>Statistics</h2>
        </header>

        <main className={styles.main}>
          {loading ? (
            <p className={styles.loading}>Loading…</p>
          ) : (
            <>
              <div className={styles.metricsGrid}>
                {metrics.map(({ label, value }) => (
                  <div key={label} className={styles.metricCard}>
                    <p className={styles.metricLabel}>{label}</p>
                    <p className={styles.metricValue}>{value}</p>
                  </div>
                ))}
              </div>

              <div className={styles.heatmapCard}>
                <h3 className={styles.heatmapTitle}>Activity — last 70 days</h3>
                <div className={styles.heatmapGrid}>
                  {days.map((day) => <HeatmapCell key={day} count={heatmap.get(day) ?? 0} />)}
                </div>
                <div className={styles.legend}>
                  <span className={styles.legendLabel}>Less</span>
                  <div className={styles.legendCells}>
                    {LEGEND_CLASSES.map((c) => (
                      <div key={c} className={`${styles.cell} ${styles[c]}`} />
                    ))}
                  </div>
                  <span className={styles.legendLabel}>More</span>
                </div>
              </div>

              {active.length > 0 && (
                <div className={styles.progressCard}>
                  <h3 className={styles.progressTitle}>Project progress</h3>
                  <div className={styles.progressList}>
                    {active.map((p) => {
                      const d = p.rows.filter((r) => r.done).length;
                      const t = p.rows.length;
                      return (
                        <div key={p.id} className={styles.progressItem}>
                          <div className={styles.progressItemHeader}>
                            <span className={styles.progressItemName}>{p.name}</span>
                            <span className={styles.progressItemCount}>{d} / {t}</span>
                          </div>
                          <ProgressBar value={d} max={t || 1} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
