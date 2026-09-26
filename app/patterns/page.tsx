'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Pattern } from '@/lib/types';
import { expandSteps, progressFraction } from '@/lib/track';
import { clamp, patternMeta } from '@/lib/utils';
import { AppTabs } from '@/components/layout/AppTabs';
import { Toast } from '@/components/ui/Toast';
import { CheckIcon, PlusIcon, YarnBallIcon } from '@/components/ui/icons';
import buttons from '@/components/ui/buttons.module.css';
import styles from './page.module.css';

type CardState = 'new' | 'active' | 'finished';

function describe(p: Pattern) {
  const steps = expandSteps(p.pattern_steps ?? [], [], p.worked_in);
  const total = steps.length;
  const finished = !!p.finished_at;
  const state: CardState = finished ? 'finished' : p.started_at && total > 0 ? 'active' : 'new';
  const idx = clamp(p.current_step, 0, Math.max(total - 1, 0));
  const pct = Math.round(progressFraction(steps, p.current_step, p.current_stitch, finished) * 100);

  let label: string;
  if (state === 'finished') label = 'Finished';
  else if (total === 0) label = 'No steps yet';
  else if (state === 'new') label = 'Not started yet';
  else label = `${steps[idx].title} · step ${idx + 1} of ${total}`;

  return { state, pct, label };
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from('patterns')
      .select('*, pattern_steps(id, position, name, stitch_unit, repeat_count, times)')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setPatterns((data as Pattern[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className={styles.page}>
      <AppTabs />

      <header className={styles.header}>
        <h1 className={styles.title}>My patterns</h1>
        <Link href="/patterns/new" aria-label="Add a new pattern" className={styles.addBtn}>
          <PlusIcon size={18} />
        </Link>
      </header>

      <main className={styles.body}>
        {loading ? (
          <p className={styles.muted}>Loading patterns…</p>
        ) : patterns.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No patterns yet</p>
            <p className={styles.emptyText}>Add a pattern round by round, then track every stitch as you work it.</p>
            <Link href="/patterns/new" className={buttons.primary}>
              <PlusIcon size={16} /> New pattern
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {patterns.map((p) => {
              const { state, pct, label } = describe(p);
              const meta = patternMeta(p.hook_size, p.yarn_summary);
              return (
                <Link
                  key={p.id}
                  href={`/patterns/${p.id}`}
                  aria-label={`Open ${p.name} pattern, ${label}`}
                  className={`${styles.card} ${state === 'new' ? styles.cardNew : ''}`}
                >
                  <div className={`${styles.thumb} ${styles[`thumb_${state}`]}`}>
                    {state === 'finished' ? <CheckIcon size={30} strokeWidth={2} /> : <YarnBallIcon />}
                  </div>
                  <div className={styles.name}>{p.name}</div>
                  <div className={styles.meta}>{meta || ' '}</div>
                  {state === 'new' ? (
                    <div className={styles.status}>{label}</div>
                  ) : (
                    <div className={styles.progress}>
                      <div className={styles.track}>
                        <div className={`${styles.fill} ${state === 'finished' ? styles.fillDone : ''}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.status}>{label}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {error && <Toast message={error} variant="error" onDismiss={() => setError(null)} />}
    </div>
  );
}
