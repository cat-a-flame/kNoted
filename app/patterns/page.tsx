'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Pattern } from '@/lib/types';
import { expandSteps, progressFraction } from '@/lib/track';
import { clamp, patternMeta } from '@/lib/utils';
import { patternImageUrl } from '@/lib/images';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import { Toast } from '@/components/ui/Toast';
import { PatternEditor } from '@/components/patterns/PatternEditor';
import styles from './page.module.css';

type Tab = 'active' | 'done';

function describe(p: Pattern) {
  const steps = expandSteps(p.pattern_steps ?? [], [], p.worked_in);
  const total = steps.length;
  const finished = !!p.finished_at;
  const idx = clamp(p.current_step, 0, Math.max(total - 1, 0));
  const pct = Math.round(progressFraction(steps, p.current_step, p.current_stitch, finished) * 100);

  let label: string;
  if (finished) label = 'Finished';
  else if (total === 0) label = 'No steps yet';
  else if (!p.started_at) label = `Not started · ${total} steps`;
  else label = `${steps[idx].title} · step ${idx + 1} of ${total}`;

  return { finished, pct, label };
}

export default function PatternsPage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // /patterns/new redirects here with ?new so old links still open the form.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('new')) {
      setCreating(true);
      router.replace('/patterns');
    }
  }, [router]);

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

  const filtered = patterns.filter((p) => (tab === 'done' ? !!p.finished_at : !p.finished_at));

  return (
    <div className="appShell">
      <AppHeader />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.tabRow}>
            <div className={styles.tabs}>
              {(['active', 'done'] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <Link href="/patterns/import" className={styles.importBtn}>Import pattern</Link>
              <button onClick={() => setCreating(true)} className={styles.newBtn}>+ New pattern</button>
            </div>
          </div>

          {loading ? (
            <p className={styles.empty}>Loading patterns…</p>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              {tab === 'done' ? (
                <p>No finished patterns yet.</p>
              ) : (
                <>
                  <p>No patterns here yet.</p>
                  <button onClick={() => setCreating(true)} className={styles.emptyLink}>Add your first pattern</button>
                </>
              )}
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((p) => {
                const { finished, pct, label } = describe(p);
                const meta = patternMeta(p.hook_size, p.yarn_summary);
                const imageUrl = patternImageUrl(p.image_path);
                return (
                  <Link key={p.id} href={`/patterns/${p.id}`} className={styles.card}>
                    <div className={styles.cover}>
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt={p.name} className={styles.coverImg} loading="lazy" />
                      ) : (
                        <CoverPlaceholder />
                      )}
                      {finished && <span className={styles.doneBadge}>Finished</span>}
                    </div>
                    <div className={styles.body}>
                      <h3 className={styles.name}>{p.name}</h3>
                      {meta && <p className={styles.meta}>{meta}</p>}
                      <p className={styles.status}>{label}</p>
                      <ProgressBar value={pct} max={100} className={styles.progress} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <AppFooter />

      {creating && (
        <PatternEditor onClose={() => setCreating(false)} onSaved={(id) => router.push(`/patterns/${id}`)} />
      )}

      {error && <Toast message={error} variant="error" onDismiss={() => setError(null)} />}
    </div>
  );
}
