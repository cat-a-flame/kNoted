'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Pattern, StitchType, WorkedIn, Yarn } from '@/lib/types';
import { STITCHES, STITCH_ORDER, instructionText, suggestedEndCount } from '@/lib/stitches';
import { AppTabs } from '@/components/layout/AppTabs';
import { FormLabel } from '@/components/ui/FormLabel';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import { BackspaceIcon, ChevronDownIcon, ChevronLeftIcon, ChevronUpIcon, CloseIcon, CopyIcon, PlusIcon } from '@/components/ui/icons';
import buttons from '@/components/ui/buttons.module.css';
import styles from './PatternEditor.module.css';

type DraftStep = {
  key: string;
  named: boolean;
  name: string;
  note: string;
  yarnId: string;
  unit: StitchType[];
  repeat: string;
  /** Empty string = use the suggested count. */
  end: string;
  times: string;
};

let keySeq = 0;
const newKey = () => `s${++keySeq}`;

const blankStep = (named: boolean, yarnId = ''): DraftStep => ({
  key: newKey(),
  named,
  name: '',
  note: '',
  yarnId,
  unit: named ? [] : ['sc'],
  repeat: '6',
  end: '',
  times: '1',
});

const toInt = (v: string, fallback: number) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
};

type Props = { patternId?: string };

export function PatternEditor({ patternId }: Props) {
  const router = useRouter();
  const isEdit = !!patternId;

  const [name, setName] = useState('');
  const [hookSize, setHookSize] = useState('');
  const [yarnSummary, setYarnSummary] = useState('');
  const [workedIn, setWorkedIn] = useState<WorkedIn>('rounds');
  const [steps, setSteps] = useState<DraftStep[]>(() => [blankStep(false)]);
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'delete' | 'reset' | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('yarns').select('*').order('colour_name').then(({ data }) => setYarns(data ?? []));
    if (!patternId) return;

    supabase
      .from('patterns')
      .select('*, pattern_steps(*)')
      .eq('id', patternId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setError(error?.message ?? 'Pattern not found.'); setLoading(false); return; }
        const p = data as Pattern;
        setName(p.name);
        setHookSize(p.hook_size ?? '');
        setYarnSummary(p.yarn_summary ?? '');
        setWorkedIn(p.worked_in);
        const sorted = [...(p.pattern_steps ?? [])].sort((a, b) => a.position - b.position);
        setSteps(
          sorted.map((s) => ({
            key: newKey(),
            named: !!s.name,
            name: s.name ?? '',
            note: s.note ?? '',
            yarnId: s.yarn_id ?? '',
            unit: s.stitch_unit ?? [],
            repeat: String(s.repeat_count),
            end: s.end_count != null && s.end_count !== suggestedEndCount(s.stitch_unit, s.repeat_count) ? String(s.end_count) : '',
            times: String(s.times),
          })),
        );
        setLoading(false);
      });
  }, [patternId]);

  const unitWord = workedIn === 'rounds' ? 'Round' : 'Row';

  // "Round 3" / "Rounds 13–21" labels, following the same numbering as the tracker.
  const numberLabels = useMemo(() => {
    let n = 0;
    return steps.map((s) => {
      if (s.named) return null;
      const times = toInt(s.times, 1);
      const first = n + 1;
      n += times;
      return times > 1 ? `${unitWord}s ${first}–${n}` : `${unitWord} ${first}`;
    });
  }, [steps, unitWord]);

  const updateStep = (key: string, patch: Partial<DraftStep>) =>
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const moveStep = (i: number, dir: -1 | 1) =>
    setSteps((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const duplicateStep = (i: number) =>
    setSteps((prev) => [...prev.slice(0, i + 1), { ...prev[i], key: newKey() }, ...prev.slice(i + 1)]);

  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, j) => j !== i));

  const addStep = (named: boolean) =>
    setSteps((prev) => [...prev, blankStep(named, prev[prev.length - 1]?.yarnId ?? '')]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Give the pattern a name.'); return; }
    const unnamed = steps.findIndex((s) => s.named && !s.name.trim());
    if (unnamed !== -1) { setError(`Step ${unnamed + 1} needs a name.`); return; }
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const fields = {
      name: name.trim(),
      hook_size: hookSize.trim() || null,
      yarn_summary: yarnSummary.trim() || null,
      worked_in: workedIn,
      updated_at: new Date().toISOString(),
    };

    let id = patternId;
    if (id) {
      const { error } = await supabase.from('patterns').update(fields).eq('id', id);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('patterns').insert(fields).select('id').single();
      if (error) { setError(error.message); setSaving(false); return; }
      id = data.id;
    }

    const payload = steps.map((s) => {
      const countable = s.unit.length > 0;
      const repeat = countable ? toInt(s.repeat, 1) : 1;
      const end = s.end.trim() === '' ? suggestedEndCount(s.unit, repeat) : parseInt(s.end, 10);
      return {
        name: s.named ? s.name.trim() : null,
        note: s.note.trim() || null,
        yarn_id: s.yarnId || null,
        stitch_unit: s.unit,
        repeat_count: repeat,
        end_count: Number.isFinite(end) ? end : null,
        times: countable ? toInt(s.times, 1) : 1,
      };
    });

    const { error: stepsError } = await supabase.rpc('replace_pattern_steps', { p_pattern_id: id, p_steps: payload });
    if (stepsError) { setError(stepsError.message); setSaving(false); return; }

    router.push(`/patterns/${id}`);
  };

  const handleDelete = async () => {
    setConfirm(null);
    const { error } = await createClient().from('patterns').delete().eq('id', patternId!);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    router.push('/patterns');
  };

  const handleReset = async () => {
    setConfirm(null);
    const { error } = await createClient()
      .from('patterns')
      .update({ current_step: 0, current_stitch: 0, started_at: null, finished_at: null })
      .eq('id', patternId!);
    setToast(error ? { message: error.message, variant: 'error' } : { message: 'Progress reset.', variant: 'success' });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <AppTabs />
        <p className={styles.muted}>Loading pattern…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <AppTabs />

      <header className={styles.header}>
        <Link href={isEdit ? `/patterns/${patternId}` : '/patterns'} className={styles.backLink}>
          <ChevronLeftIcon size={14} /> {isEdit ? 'Back to pattern' : 'Patterns'}
        </Link>
        <h1 className={styles.title}>{isEdit ? 'Edit pattern' : 'New pattern'}</h1>
      </header>

      <form onSubmit={handleSave} className={styles.body}>
        <section className={styles.card}>
          <div>
            <FormLabel htmlFor="p-name">Pattern name</FormLabel>
            <Input id="p-name" placeholder="e.g. Little Pumpkin" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!isEdit} />
          </div>
          <div className={styles.grid3}>
            <div>
              <FormLabel htmlFor="p-hook">Hook size</FormLabel>
              <Input id="p-hook" placeholder="e.g. 4.5mm" value={hookSize} onChange={(e) => setHookSize(e.target.value)} />
            </div>
            <div>
              <FormLabel htmlFor="p-yarn">Yarn</FormLabel>
              <Input id="p-yarn" placeholder="e.g. cotton yarn" value={yarnSummary} onChange={(e) => setYarnSummary(e.target.value)} />
            </div>
            <div>
              <FormLabel>Worked in</FormLabel>
              <div className={styles.segmented} role="radiogroup" aria-label="Worked in">
                {(['rounds', 'rows'] as WorkedIn[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    role="radio"
                    aria-checked={workedIn === w}
                    onClick={() => setWorkedIn(w)}
                    className={`${styles.segment} ${workedIn === w ? styles.segmentActive : ''}`}
                  >
                    {w === 'rounds' ? 'Rounds' : 'Rows'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className={styles.stepsHeader}>
          <h2 className={styles.sectionTitle}>Steps</h2>
          <p className={styles.muted}>
            Build each {unitWord.toLowerCase()} from its repeat group — e.g. <em>sc, sc, inc</em> × 6. Leave the group empty for steps with nothing to count.
          </p>
        </div>

        {steps.map((s, i) => {
          const repeat = toInt(s.repeat, 1);
          const suggested = suggestedEndCount(s.unit, repeat);
          const preview = instructionText(s.unit, workedIn);
          const yarn = yarns.find((y) => y.id === s.yarnId);
          return (
            <section key={s.key} className={styles.stepCard}>
              <div className={styles.stepTop}>
                <div className={styles.stepLabel}>
                  <span className={styles.yarnDot} style={{ background: yarn?.colour_hex ?? '#DEDCD1' }} />
                  {s.named ? s.name.trim() || 'Named step' : numberLabels[i]}
                </div>
                <div className={styles.stepTools}>
                  <button type="button" className={buttons.iconRound} onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Move step up"><ChevronUpIcon size={14} /></button>
                  <button type="button" className={buttons.iconRound} onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} aria-label="Move step down"><ChevronDownIcon size={14} /></button>
                  <button type="button" className={buttons.iconRound} onClick={() => duplicateStep(i)} aria-label="Duplicate step"><CopyIcon size={14} /></button>
                  <button type="button" className={buttons.iconRound} onClick={() => removeStep(i)} aria-label="Remove step"><CloseIcon size={14} /></button>
                </div>
              </div>

              <div className={styles.grid2}>
                <div>
                  <FormLabel>Type</FormLabel>
                  <div className={styles.segmented}>
                    <button type="button" onClick={() => updateStep(s.key, { named: false })} className={`${styles.segment} ${!s.named ? styles.segmentActive : ''}`}>
                      Numbered {unitWord.toLowerCase()}
                    </button>
                    <button type="button" onClick={() => updateStep(s.key, { named: true })} className={`${styles.segment} ${s.named ? styles.segmentActive : ''}`}>
                      Named step
                    </button>
                  </div>
                </div>
                {s.named ? (
                  <div>
                    <FormLabel htmlFor={`${s.key}-name`}>Name</FormLabel>
                    <Input id={`${s.key}-name`} placeholder="e.g. Leaf (optional), Finishing" value={s.name} onChange={(e) => updateStep(s.key, { name: e.target.value })} />
                  </div>
                ) : (
                  <div>
                    <FormLabel htmlFor={`${s.key}-yarn`}>Yarn</FormLabel>
                    <YarnSelect id={`${s.key}-yarn`} yarns={yarns} value={s.yarnId} onChange={(v) => updateStep(s.key, { yarnId: v })} />
                  </div>
                )}
              </div>

              {s.named && (
                <div>
                  <FormLabel htmlFor={`${s.key}-yarn`}>Yarn</FormLabel>
                  <YarnSelect id={`${s.key}-yarn`} yarns={yarns} value={s.yarnId} onChange={(v) => updateStep(s.key, { yarnId: v })} />
                </div>
              )}

              <div>
                <FormLabel>Repeat group</FormLabel>
                <div className={styles.unitBox}>
                  {s.unit.length === 0 ? (
                    <span className={styles.unitEmpty}>Nothing to count</span>
                  ) : (
                    s.unit.map((t, ti) => (
                      <button
                        key={ti}
                        type="button"
                        title="Remove"
                        onClick={() => updateStep(s.key, { unit: s.unit.filter((_, k) => k !== ti) })}
                        className={styles.chip}
                        style={{ background: STITCHES[t].chipBg, color: STITCHES[t].chipFg }}
                      >
                        {STITCHES[t].abbr}
                      </button>
                    ))
                  )}
                  {s.unit.length > 0 && (
                    <button type="button" className={`${buttons.iconRound} ${styles.unitBackspace}`} onClick={() => updateStep(s.key, { unit: s.unit.slice(0, -1) })} aria-label="Remove last stitch">
                      <BackspaceIcon size={15} />
                    </button>
                  )}
                </div>
                <div className={styles.palette}>
                  {STITCH_ORDER.map((t) => (
                    <button key={t} type="button" onClick={() => updateStep(s.key, { unit: [...s.unit, t] })} className={styles.paletteBtn} title={STITCHES[t].label}>
                      <PlusIcon size={11} /> {STITCHES[t].abbr}
                    </button>
                  ))}
                </div>
              </div>

              {s.unit.length > 0 && (
                <div className={styles.grid3}>
                  <div>
                    <FormLabel htmlFor={`${s.key}-rep`}>Repeat group ×</FormLabel>
                    <Input id={`${s.key}-rep`} type="number" min={1} inputMode="numeric" value={s.repeat} onChange={(e) => updateStep(s.key, { repeat: e.target.value })} />
                  </div>
                  <div>
                    <FormLabel htmlFor={`${s.key}-end`}>Ends with (stitches)</FormLabel>
                    <Input id={`${s.key}-end`} type="number" min={0} inputMode="numeric" placeholder={suggested != null ? String(suggested) : ''} value={s.end} onChange={(e) => updateStep(s.key, { end: e.target.value })} />
                  </div>
                  <div>
                    <FormLabel htmlFor={`${s.key}-times`}>Identical {s.named ? 'steps' : `${unitWord.toLowerCase()}s`} in a row</FormLabel>
                    <Input id={`${s.key}-times`} type="number" min={1} inputMode="numeric" value={s.times} onChange={(e) => updateStep(s.key, { times: e.target.value })} />
                  </div>
                </div>
              )}

              <div>
                <FormLabel htmlFor={`${s.key}-note`}>Note (optional)</FormLabel>
                <Textarea id={`${s.key}-note`} rows={2} placeholder="e.g. Work into a magic ring. / Stuff firmly once this round is done." value={s.note} onChange={(e) => updateStep(s.key, { note: e.target.value })} />
              </div>

              {(preview || s.note.trim()) && (
                <p className={styles.preview}>
                  {[s.note.trim(), preview].filter(Boolean).join(' ')}
                  {s.unit.length > 0 && repeat > 1 && <span className={styles.previewMeta}> × {repeat}</span>}
                </p>
              )}
            </section>
          );
        })}

        <div className={styles.addRow}>
          <button type="button" onClick={() => addStep(false)} className={styles.addBtn}><PlusIcon size={14} /> Add {unitWord.toLowerCase()}</button>
          <button type="button" onClick={() => addStep(true)} className={styles.addBtn}><PlusIcon size={14} /> Add named step</button>
        </div>

        <div className={styles.footer}>
          {isEdit && (
            <div className={styles.footerLeft}>
              <button type="button" onClick={() => setConfirm('reset')} className={buttons.ghost}>Reset progress</button>
              <button type="button" onClick={() => setConfirm('delete')} className={buttons.danger}>Delete pattern</button>
            </div>
          )}
          <div className={styles.footerRight}>
            {error && <p className={styles.error}>{error}</p>}
            <Link href={isEdit ? `/patterns/${patternId}` : '/patterns'} className={buttons.ghost}>Cancel</Link>
            <button type="submit" disabled={saving} className={buttons.primary}>
              {saving ? 'Saving…' : isEdit ? 'Save pattern' : 'Create pattern'}
            </button>
          </div>
        </div>
      </form>

      {confirm === 'delete' && (
        <ConfirmDialog
          title="Delete this pattern?"
          description="The pattern, all of its steps and your progress will be deleted. This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'reset' && (
        <ConfirmDialog
          title="Reset progress?"
          description="The tracker will go back to the first step with no stitches counted."
          confirmLabel="Reset"
          onConfirm={handleReset}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function YarnSelect({ id, yarns, value, onChange }: { id: string; yarns: Yarn[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{yarns.length ? 'No yarn' : 'No yarns in your stash yet'}</option>
      {yarns.map((y) => (
        <option key={y.id} value={y.id}>{y.colour_name} — {y.brand}</option>
      ))}
    </Select>
  );
}
