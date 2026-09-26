'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import type { Pattern, Yarn } from '@/lib/types';
import { STITCHES } from '@/lib/stitches';
import { expandSteps, progressFraction, stepSubtitle, usedStitches } from '@/lib/track';
import { clamp, patternMeta } from '@/lib/utils';
import { StitchLayout } from '@/components/workspace/StitchLayout';
import { Toast } from '@/components/ui/Toast';
import { CheckIcon, ChevronLeftIcon, MinusIcon, PencilIcon, PlusIcon } from '@/components/ui/icons';
import styles from './page.module.css';

const RING_CIRC = 452.4;

type Progress = { step: number; stitch: number; startedAt: string | null; finishedAt: string | null };

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [yarns, setYarns] = useState<Pick<Yarn, 'id' | 'colour_hex' | 'colour_name'>[]>([]);
  const [progress, setProgress] = useState<Progress>({ step: 0, stitch: 0, startedAt: null, finishedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: p, error: pErr }, { data: y }] = await Promise.all([
        supabase.from('patterns').select('*, pattern_steps(*)').eq('id', id).single(),
        supabase.from('yarns').select('id, colour_hex, colour_name'),
      ]);
      if (pErr) setError(pErr.message);
      if (p) {
        setPattern(p as Pattern);
        setProgress({ step: p.current_step, stitch: p.current_stitch, startedAt: p.started_at, finishedAt: p.finished_at });
      }
      setYarns(y ?? []);
      setLoading(false);
    };
    load();
  }, [id]);

  const steps = useMemo(
    () => (pattern ? expandSteps(pattern.pattern_steps ?? [], yarns, pattern.worked_in) : []),
    [pattern, yarns],
  );

  // Persist tracker state; counting fast should not fire a request per tap.
  const persist = useDebouncedCallback(async (next: Progress) => {
    const { error } = await createClient()
      .from('patterns')
      .update({
        current_step: next.step,
        current_stitch: next.stitch,
        started_at: next.startedAt,
        finished_at: next.finishedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) setError(`Progress not saved: ${error.message}`);
  }, 600);

  useEffect(() => () => { persist.flush(); }, [persist]);

  const commit = useCallback(
    (patch: Partial<Progress>) => {
      setProgress((prev) => {
        const next = { ...prev, ...patch };
        if (!next.startedAt) next.startedAt = new Date().toISOString();
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const total = steps.length;
  const idx = clamp(progress.step, 0, Math.max(total - 1, 0));
  const step = steps[idx];
  const isLast = idx === total - 1;
  const finished = !!progress.finishedAt;
  const countable = !!step?.countable;
  const actionsTotal = step?.actionsTotal ?? 0;
  const stitchesMade = countable ? clamp(progress.stitch, 0, actionsTotal) : 0;
  const stepComplete = countable && stitchesMade >= actionsTotal;

  const inc = useCallback(() => {
    if (countable && stitchesMade < actionsTotal) commit({ stitch: stitchesMade + 1 });
  }, [countable, stitchesMade, actionsTotal, commit]);

  const dec = useCallback(() => {
    if (countable && stitchesMade > 0) commit({ stitch: stitchesMade - 1, finishedAt: null });
  }, [countable, stitchesMade, commit]);

  const advance = useCallback(() => {
    if (isLast) commit({ finishedAt: new Date().toISOString() });
    else commit({ step: idx + 1, stitch: 0 });
  }, [isLast, idx, commit]);

  const jumpTo = (i: number) => commit({ step: i, stitch: 0, finishedAt: null });

  // Keyboard: space / + / → adds a stitch, − / ← / backspace removes one, enter moves on.
  // Handled even when a button has focus, so clicking a step and then pressing space counts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      if (e.key === ' ' || e.key === '+' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (stepComplete) return;
        inc();
      } else if (e.key === '-' || e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        dec();
      } else if (e.key === 'Enter' && !target.closest('button, a') && (stepComplete || !countable) && !finished) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inc, dec, advance, stepComplete, countable, finished]);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [idx, loading]);

  if (loading) return <div className={styles.centerMsg}>Loading pattern…</div>;

  if (!pattern) {
    return (
      <div className={styles.centerMsg}>
        <p>This pattern could not be found.</p>
        <Link href="/patterns" className={styles.backLink}><ChevronLeftIcon size={14} /> Patterns</Link>
      </div>
    );
  }

  const unitWord = pattern.worked_in === 'rounds' ? 'round' : 'row';
  const UnitWord = unitWord[0].toUpperCase() + unitWord.slice(1);
  const pct = progressFraction(steps, idx, stitchesMade, finished);
  const meta = patternMeta(pattern.hook_size, pattern.yarn_summary);
  const stitchKey = usedStitches(steps);
  const nextToken = countable && !stepComplete ? step.unit[stitchesMade % step.unit.length] : null;
  const repeatIndex = countable ? Math.min(Math.floor(stitchesMade / step.unit.length) + 1, step.repeat) : 0;
  const ringPct = countable && actionsTotal > 0 ? stitchesMade / actionsTotal : 0;
  const endLabel = step?.end != null ? `Ends this ${unitWord} with ${step.end} stitches.` : '';
  const bodyText = step ? [step.note, step.text].filter(Boolean).join(' ') : '';
  const nextStepLabel = isLast ? 'Finish pattern' : steps[idx + 1]?.number != null ? `Next ${unitWord}` : 'Next step';

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <div className={styles.sidebarNav}>
            <Link href="/patterns" className={styles.backLink}><ChevronLeftIcon size={14} /> Patterns</Link>
            <Link href={`/patterns/${pattern.id}/edit`} className={styles.backLink}><PencilIcon size={13} /> Edit</Link>
          </div>
          <div className={styles.patternName}>{pattern.name}</div>
          {meta && <div className={styles.patternMeta}>{meta}</div>}
        </div>

        <div className={styles.progressRow}>
          <div className={styles.track}>
            <div className={`${styles.fill} ${finished ? styles.fillDone : ''}`} style={{ width: `${Math.round(pct * 100)}%` }} />
          </div>
          <span className={styles.progressLabel}>{finished ? 'Finished' : total ? `Step ${idx + 1} of ${total}` : 'No steps'}</span>
        </div>

        <div className={styles.divider} />

        <nav className={styles.stepList} aria-label="Pattern steps">
          {steps.map((s, i) => {
            const isActive = i === idx && !finished;
            const isDone = i < idx || finished;
            return (
              <button
                key={s.key}
                ref={i === idx ? activeRowRef : undefined}
                onClick={() => jumpTo(i)}
                className={`${styles.stepRow} ${isActive ? styles.stepRowActive : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className={`${styles.badge} ${isDone ? styles.badgeDone : isActive ? styles.badgeActive : ''}`}>{s.badge}</span>
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>{s.title}</span>
                  <span className={styles.stepSub}>{stepSubtitle(s, pattern.worked_in)}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {stitchKey.length > 0 && (
          <div className={styles.stitchKey}>
            <strong>Stitch key:</strong>{' '}
            {stitchKey.map((t) => `${STITCHES[t].abbr} = ${STITCHES[t].label.toLowerCase()}`).join(' · ')}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {!step ? (
          <div className={styles.card}>
            <p className={styles.bodyText}>This pattern has no steps yet.</p>
            <Link href={`/patterns/${pattern.id}/edit`} className={styles.inlineLink}>Add rounds and steps</Link>
          </div>
        ) : (
          <>
            <div>
              <div className={styles.eyebrowRow}>
                <span className={styles.yarnDot} style={{ background: step.yarnHex ?? '#DEDCD1' }} />
                <span className={styles.eyebrow}>{step.eyebrow}</span>
              </div>
              <h1 className={styles.stepHeading}>{step.title}</h1>
            </div>

            <div className={styles.card}>
              {countable && (
                <StitchLayout
                  unit={step.unit}
                  actionsTotal={actionsTotal}
                  stitchesMade={stitchesMade}
                  shape={pattern.worked_in === 'rounds' ? 'ring' : 'rows'}
                  title={step.title}
                />
              )}

              {bodyText && <p className={styles.bodyText}>{bodyText}</p>}

              {countable && (
                <div className={styles.chipBlock}>
                  <div className={styles.chips}>
                    {step.unit.map((t, i) => (
                      <span key={i} className={styles.chip} style={{ background: STITCHES[t].chipBg, color: STITCHES[t].chipFg }}>
                        {STITCHES[t].abbr}
                      </span>
                    ))}
                    {step.repeat > 1 && <span className={styles.repeatLabel}>× {step.repeat}</span>}
                  </div>
                  {endLabel && <div className={styles.endLabel}>{endLabel}</div>}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Counter */}
      <aside className={styles.counter}>
        <div className={styles.counterTitle}>{UnitWord} counter</div>

        {finished ? (
          <div className={styles.doneBox}>
            <div className={styles.doneIcon}><CheckIcon size={24} /></div>
            <div className={styles.doneTitle}>Pattern finished!</div>
            <p className={styles.doneText}>Every step is done. Lovely work.</p>
            <button onClick={() => commit({ finishedAt: null })} className={styles.linkBtn}>Reopen last step</button>
          </div>
        ) : !step ? null : countable && !stepComplete ? (
          <div className={styles.counterBody}>
            {step.repeat > 1 && <div className={styles.repeatInfo}>Repeat {repeatIndex} of {step.repeat}</div>}

            <div className={styles.dial}>
              <svg width="180" height="180" viewBox="0 0 180 180" className={styles.dialSvg}>
                <circle cx="90" cy="90" r="72" fill="none" stroke="#EFEBE3" strokeWidth="12" />
                <circle
                  cx="90" cy="90" r="72" fill="none" stroke="#C1613F" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC * (1 - ringPct)}
                  className={styles.dialArc}
                />
              </svg>
              <div className={styles.dialCenter}>
                <div className={styles.dialCount}>{stitchesMade}</div>
                <div className={styles.dialOf}>of {actionsTotal} stitches</div>
              </div>
            </div>

            <div className={styles.nextLabel}>{nextToken ? `Next: ${STITCHES[nextToken].label}` : ''}</div>

            <div className={styles.counterButtons}>
              <button onClick={dec} disabled={stitchesMade <= 0} aria-label="Remove one stitch" className={styles.decBtn}>
                <MinusIcon size={18} />
              </button>
              <button onClick={inc} aria-label="Add one stitch" className={styles.incBtn}>
                <PlusIcon size={22} />
              </button>
            </div>

            <p className={styles.keyHint}>Space adds a stitch · Backspace removes one</p>
          </div>
        ) : countable ? (
          <div className={styles.doneBox}>
            <div className={styles.doneIcon}><CheckIcon size={24} /></div>
            <div className={styles.doneTitle}>{UnitWord} complete!</div>
            {endLabel && <p className={styles.doneText}>{endLabel}</p>}
            <button onClick={advance} className={styles.nextBtn}>{nextStepLabel}</button>
            <button onClick={dec} className={styles.linkBtn}>Back up one stitch</button>
          </div>
        ) : (
          <div className={styles.idleBox}>
            <div className={styles.idleIcon}><CheckIcon size={24} strokeWidth={2.2} /></div>
            <p className={styles.doneText}>No stitches to count on this step &mdash; just the finishing touches.</p>
            <button onClick={advance} className={styles.nextBtn}>{nextStepLabel}</button>
          </div>
        )}
      </aside>

      {error && <Toast message={error} variant="error" onDismiss={() => setError(null)} />}
    </div>
  );
}
