'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Pattern, Row } from '@/lib/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { ProgressBar } from '@/components/ui/ProgressBar';

type PatternWithRows = Pattern & { rows: Pick<Row, 'done'>[] };

function buildHeatmap(patterns: PatternWithRows[]): Map<string, number> {
  const map = new Map<string, number>();
  patterns
    .filter((p) => !p.archived)
    .forEach((p) => {
      p.activity.forEach((date) => {
        map.set(date, (map.get(date) ?? 0) + 1);
      });
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
  const intensity =
    count === 0
      ? 'bg-surface-3'
      : count === 1
      ? 'bg-teal-mid/40'
      : count === 2
      ? 'bg-teal/50'
      : 'bg-teal';

  return (
    <div
      className={`w-3 h-3 rounded-[2px] ${intensity}`}
      title={count > 0 ? `${count} session${count > 1 ? 's' : ''}` : undefined}
    />
  );
}

export default function StatsPage() {
  const [patterns, setPatterns] = useState<PatternWithRows[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: patternData } = await supabase
        .from('patterns')
        .select('*')
        .order('created_at', { ascending: false });

      if (!patternData) { setLoading(false); return; }

      const ids = patternData.map((p) => p.id);
      const { data: rowData } = ids.length
        ? await supabase.from('rows').select('id, pattern_id, done').in('pattern_id', ids)
        : { data: [] };

      const rowsByPattern = new Map<string, { done: boolean }[]>();
      (rowData ?? []).forEach((r) => {
        const arr = rowsByPattern.get(r.pattern_id) ?? [];
        arr.push({ done: r.done });
        rowsByPattern.set(r.pattern_id, arr);
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

  const active = patterns.filter((p) => !p.archived);
  const finished = active.filter((p) => p.rows.length > 0 && p.rows.every((r) => r.done));
  const totalRowsDone = active.reduce((sum, p) => sum + p.rows.filter((r) => r.done).length, 0);
  const avgProgress =
    active.length === 0
      ? 0
      : Math.round(
          active.reduce((sum, p) => {
            const pct = p.rows.length === 0 ? 0 : (p.rows.filter((r) => r.done).length / p.rows.length) * 100;
            return sum + pct;
          }, 0) / active.length,
        );

  const heatmap = buildHeatmap(patterns);
  const days = last70Days();

  const metrics = [
    { label: 'Finished patterns', value: finished.length },
    { label: 'Rows completed', value: totalRowsDone },
    { label: 'Active patterns', value: active.length },
    { label: 'Avg progress', value: `${avgProgress}%` },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm border-b border-black/[0.09] px-6 py-3">
          <h2 className="font-serif text-xl font-semibold text-text-primary">Statistics</h2>
        </header>

        <main className="px-6 py-5 flex flex-col gap-6">
          {loading ? (
            <p className="text-text-tertiary text-sm py-8 text-center">Loading…</p>
          ) : (
            <>
              {/* Metric cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {metrics.map(({ label, value }) => (
                  <div key={label} className="bg-surface border border-black/[0.09] rounded-lg p-4">
                    <p className="text-xs font-medium text-text-secondary mb-1">{label}</p>
                    <p className="font-serif text-2xl font-bold text-text-primary">{value}</p>
                  </div>
                ))}
              </div>

              {/* Activity heatmap */}
              <div className="bg-surface border border-black/[0.09] rounded-lg p-5">
                <h3 className="font-serif text-sm font-semibold text-text-primary mb-4">
                  Activity — last 70 days
                </h3>
                <div className="flex flex-wrap gap-1">
                  {days.map((day) => (
                    <HeatmapCell key={day} count={heatmap.get(day) ?? 0} />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-text-tertiary">Less</span>
                  <div className="flex gap-1">
                    {['bg-surface-3', 'bg-teal-mid/40', 'bg-teal/50', 'bg-teal'].map((c) => (
                      <div key={c} className={`w-3 h-3 rounded-[2px] ${c}`} />
                    ))}
                  </div>
                  <span className="text-xs text-text-tertiary">More</span>
                </div>
              </div>

              {/* Per-pattern progress */}
              {active.length > 0 && (
                <div className="bg-surface border border-black/[0.09] rounded-lg p-5">
                  <h3 className="font-serif text-sm font-semibold text-text-primary mb-4">
                    Pattern progress
                  </h3>
                  <div className="flex flex-col gap-4">
                    {active.map((p) => {
                      const d = p.rows.filter((r) => r.done).length;
                      const t = p.rows.length;
                      return (
                        <div key={p.id}>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm font-medium text-text-primary truncate">{p.name}</span>
                            <span className="text-xs text-text-secondary ml-2 shrink-0">{d} / {t}</span>
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
