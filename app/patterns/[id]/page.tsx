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
import { patternImageUrl } from '@/lib/images';
import { StitchLayout } from '@/components/workspace/StitchLayout';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import { Toast } from '@/components/ui/Toast';
import { CheckIcon, ChevronLeftIcon, CloseIcon, ExpandIcon, MinusIcon, PlusIcon } from '@/components/ui/icons';
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
  const [imageOpen, setImageOpen] = useState(false);
  const activeRowRef = useRef<HTMLElement>(null);

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
      if (imageOpen) {
        if (e.key === 'Escape') setImageOpen(false);
        return;
      }
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
  }, [inc, dec, advance, stepComplete, countable, finished, imageOpen]);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [idx, loading]);

  if (loading) {
    return (
      <div className="appShell">
        <AppHeader />
        <p className={styles.loadingText}>Loading pattern…</p>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="appShell">
        <AppHeader />
        <main className={styles.notFound}>
          <p className={styles.notFoundText}>Pattern not found.</p>
          <Link href="/patterns" className={styles.backLink}>Back to patterns</Link>
        </main>
        <AppFooter />
      </div>
    );
  }

  const unitWord = pattern.worked_in === 'rounds' ? 'round' : 'row';
  const UnitWord = unitWord[0].toUpperCase() + unitWord.slice(1);
  const pct = progressFraction(steps, idx, stitchesMade, finished);
  const meta = patternMeta(pattern.hook_size, pattern.yarn_summary);
  const imageUrl = patternImageUrl(pattern.image_path);
  const stitchKey = usedStitches(steps);
  const nextToken = countable && !stepComplete ? step.unit[stitchesMade % step.unit.length] : null;
  const repeatIndex = countable ? Math.min(Math.floor(stitchesMade / step.unit.length) + 1, step.repeat) : 0;
  const ringPct = countable && actionsTotal > 0 ? stitchesMade / actionsTotal : 0;
  const endLabel = step?.end != null ? `Ends this ${unitWord} with ${step.end} stitches.` : '';
  const nextStepLabel = isLast ? 'Finish pattern' : steps[idx + 1]?.number != null ? `Next ${unitWord}` : 'Next step';
  const yarnName = (yarnId: string | null) => yarns.find((y) => y.id === yarnId)?.colour_name;

  return (
    <div className="appShell">
      <AppHeader />

      <main className={styles.pageMain}>
        {/* Sticky title bar */}
        <div className={styles.pageTop}>
          <div className={styles.pageTopInner}>
            <Link href="/patterns" className={styles.backBtn} aria-label="Back to patterns">
              <ChevronLeftIcon size={18} />
            </Link>
            <div className={styles.titleGroup}>
              <h1 className={styles.titleText}>{pattern.name}</h1>
              {meta && <span className={styles.titleMeta}>{meta}</span>}
            </div>
            <Link href={`/patterns/${pattern.id}/edit`} className={styles.editBtn}>Edit</Link>
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.twoCol}>
            {/* Left: step list, current step expanded */}
            <div className={styles.stepsCol}>
              {steps.length === 0 ? (
                <p className={styles.emptyState}>
                  No steps yet. <Link href={`/patterns/${pattern.id}/edit`} className={styles.backLink}>Add rounds and steps</Link>
                </p>
              ) : (
                <div className={styles.stepList}>
                  {steps.map((s, i) => {
                    const isCurrent = i === idx && !finished;
                    const isDone = i < idx || finished;
                    const bubble = isCurrent ? styles.bubbleCurrent : isDone ? styles.bubbleDone : styles.bubbleDefault;
                    const yarn = yarnName(s.yarnId);
                    return (
                      <article
                        key={s.key}
                        ref={i === idx ? activeRowRef : undefined}
                        className={`${styles.stepCard} ${isCurrent ? styles.stepCardCurrent : ''} ${isDone ? styles.stepCardDone : ''}`}
                      >
                        <button
                          onClick={() => !isCurrent && jumpTo(i)}
                          className={styles.stepHead}
                          aria-current={isCurrent ? 'step' : undefined}
                          aria-label={isCurrent ? undefined : `Go to ${s.title}`}
                        >
                          <span className={`${styles.rowBubble} ${bubble}`}>
                            {isDone ? <CheckIcon size={13} strokeWidth={3} /> : s.badge}
                          </span>
                          <span className={styles.stepHeadText}>
                            <span className={styles.stepTitle}>
                              {s.title}
                              {s.yarnHex && <span className={styles.yarnDot} style={{ background: s.yarnHex }} title={yarn} />}
                            </span>
                            <span className={styles.stepSub}>{stepSubtitle(s, pattern.worked_in)}</span>
                          </span>
                        </button>

                        {isCurrent && (
                          <div className={styles.stepBody}>
                            {(s.note || s.text) && (
                              <p className={styles.instructions}>{[s.note, s.text].filter(Boolean).join(' ')}</p>
                            )}

                            {s.countable && (
                              <>
                                <div className={styles.pills}>
                                  {s.unit.map((t, ti) => (
                                    <span key={ti} className={styles.pill} style={{ background: STITCHES[t].chipBg, color: STITCHES[t].chipFg }}>
                                      {STITCHES[t].abbr}
                                    </span>
                                  ))}
                                  {s.repeat > 1 && <span className={styles.repeatLabel}>× {s.repeat}</span>}
                                  {yarn && <span className={styles.yarnLabel}>{yarn}</span>}
                                </div>
                                {endLabel && <p className={styles.endLabel}>{endLabel}</p>}
                                <StitchLayout
                                  unit={s.unit}
                                  actionsTotal={actionsTotal}
                                  stitchesMade={stitchesMade}
                                  shape={pattern.worked_in === 'rounds' ? 'ring' : 'rows'}
                                  title={s.title}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: image, counter, progress */}
            <aside className={styles.sidebar}>
              <button
                className={styles.coverCard}
                onClick={() => imageUrl && setImageOpen(true)}
                disabled={!imageUrl}
                aria-label={imageUrl ? 'View pattern image' : undefined}
              >
                {imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={pattern.name} className={styles.coverImg} />
                    <span className={styles.coverExpand}><ExpandIcon size={13} /></span>
                  </>
                ) : (
                  <CoverPlaceholder iconSize={36} />
                )}
              </button>

              {step && (
                <div className={styles.counterCard}>
                  <p className={styles.statsLabel}>{UnitWord} counter</p>

                  {finished ? (
                    <div className={styles.doneBox}>
                      <div className={styles.doneIcon}><CheckIcon size={22} /></div>
                      <p className={styles.doneTitle}>Pattern finished!</p>
                      <p className={styles.doneText}>Every step is done. Lovely work.</p>
                      <button onClick={() => commit({ finishedAt: null })} className={styles.linkBtn}>Reopen last step</button>
                    </div>
                  ) : countable && !stepComplete ? (
                    <div className={styles.counterBody}>
                      <p className={styles.counterStep}>
                        {step.title}
                        {step.repeat > 1 && <span> · repeat {repeatIndex} of {step.repeat}</span>}
                      </p>
                      <div className={styles.dial}>
                        <svg width="150" height="150" viewBox="0 0 180 180" className={styles.dialSvg}>
                          <circle cx="90" cy="90" r="72" fill="none" stroke="var(--color-surface-2)" strokeWidth="12" />
                          <circle
                            cx="90" cy="90" r="72" fill="none" stroke="var(--color-accent)" strokeWidth="12" strokeLinecap="round"
                            strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC * (1 - ringPct)}
                            className={styles.dialArc}
                          />
                        </svg>
                        <div className={styles.dialCenter}>
                          <span className={styles.dialCount}>{stitchesMade}</span>
                          <span className={styles.dialOf}>of {actionsTotal} sts</span>
                        </div>
                      </div>
                      <p className={styles.nextLabel}>{nextToken ? `Next: ${STITCHES[nextToken].label}` : ''}</p>
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
                      <div className={styles.doneIcon}><CheckIcon size={22} /></div>
                      <p className={styles.doneTitle}>{UnitWord} complete!</p>
                      {endLabel && <p className={styles.doneText}>{endLabel}</p>}
                      <button onClick={advance} className={styles.nextBtn}>{nextStepLabel}</button>
                      <button onClick={dec} className={styles.linkBtn}>Back up one stitch</button>
                    </div>
                  ) : (
                    <div className={styles.doneBox}>
                      <p className={styles.doneText}>No stitches to count on this step &mdash; just follow the instructions.</p>
                      <button onClick={advance} className={styles.nextBtn}>{nextStepLabel}</button>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.statsCard}>
                <p className={styles.statsLabel}>Progress</p>
                <p className={styles.statsValue}>
                  {finished ? 'Finished' : total ? <>Step {idx + 1} <span className={styles.statsOf}>of {total}</span></> : '—'}
                </p>
                <ProgressBar value={Math.round(pct * 100)} max={100} className={styles.statsBar} />
                {stitchKey.length > 0 && (
                  <>
                    <div className={styles.statsDivider} />
                    <p className={styles.statsSub}>Stitch key</p>
                    <ul className={styles.stitchKey}>
                      {stitchKey.map((t) => (
                        <li key={t}>
                          <span className={styles.keyDot} style={{ background: STITCHES[t].strong }} />
                          <strong>{STITCHES[t].abbr}</strong> {STITCHES[t].label.toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Phones: the counter stays under your thumb while you read the step list. */}
      {step && !finished && (
        <div className={styles.mobileBar}>
          {countable && !stepComplete ? (
            <>
              <button onClick={dec} disabled={stitchesMade <= 0} aria-label="Remove one stitch" className={styles.decBtn}>
                <MinusIcon size={18} />
              </button>
              <div className={styles.mobileBarText}>
                <span className={styles.mobileBarCount}>{stitchesMade}<span> / {actionsTotal}</span></span>
                <span className={styles.mobileBarSub}>
                  {step.title}{nextToken ? ` · next ${STITCHES[nextToken].abbr}` : ''}
                </span>
              </div>
              <button onClick={inc} aria-label="Add one stitch" className={styles.incBtn}>
                <PlusIcon size={22} />
              </button>
            </>
          ) : (
            <>
              <div className={styles.mobileBarText}>
                <span className={styles.mobileBarSub}>{countable ? `${step.title} complete` : step.title}</span>
              </div>
              {countable && (
                <button onClick={dec} className={styles.linkBtn}>Undo</button>
              )}
              <button onClick={advance} className={styles.mobileNextBtn}>{nextStepLabel}</button>
            </>
          )}
        </div>
      )}

      <AppFooter />

      {imageOpen && imageUrl && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`${pattern.name} image`} onClick={() => setImageOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={pattern.name} className={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
          <button className={styles.lightboxClose} onClick={() => setImageOpen(false)} aria-label="Close image" autoFocus>
            <CloseIcon size={18} />
          </button>
        </div>
      )}

      {error && <Toast message={error} variant="error" onDismiss={() => setError(null)} />}
    </div>
  );
}
