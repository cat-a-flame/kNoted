'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Pattern, StitchType, WorkedIn, Yarn } from '@/lib/types';
import { STITCHES, STITCH_ORDER, instructionText, suggestedEndCount } from '@/lib/stitches';
import { patternImageUrl, removePatternImage, uploadPatternImage } from '@/lib/images';
import { FormLabel } from '@/components/ui/FormLabel';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { ImageField } from '@/components/ui/ImageField';
import { Toast } from '@/components/ui/Toast';
import { ArrowDownIcon, ArrowUpIcon, BackspaceIcon, ChevronUpIcon, CloseIcon, CopyIcon, PencilIcon } from '@/components/ui/icons';
import buttons from '@/components/ui/buttons.module.css';
import styles from './PatternEditor.module.css';

type DraftStep = {
  key: string;
  /** Empty = numbered automatically ("Round 5"). */
  title: string;
  note: string;
  yarnId: string;
  unit: StitchType[];
  repeat: string;
  /** Empty = use the suggested count. */
  end: string;
  times: string;
};

let keySeq = 0;
const newKey = () => `s${++keySeq}`;

const blankRound = (yarnId = ''): DraftStep => ({
  key: newKey(),
  title: '',
  note: '',
  yarnId,
  unit: ['sc'],
  repeat: '6',
  end: '',
  times: '1',
});

const blankNoteStep = (): DraftStep => ({ ...blankRound(), title: 'Finishing', unit: [], repeat: '1' });

/** Pattern-style shorthand, e.g. "(sc, inc) ×3". */
function shorthand(unit: StitchType[], repeat: number): string {
  if (unit.length === 0) return 'Nothing to count';
  const abbrs = unit.map((t) => STITCHES[t].abbr);
  const group = unit.length === 1 ? abbrs[0] : `(${abbrs.join(', ')})`;
  return repeat > 1 ? `${group} ×${repeat}` : group;
}

const toInt = (v: string, fallback: number) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
};

/** Rounds with stitches and titled steps (e.g. "Shape segment" ×6) can repeat; an untitled note step can't. */
const canRepeat = (s: DraftStep) => s.unit.length > 0 || !!s.title.trim();

type Props = {
  /** Omit to create a new pattern. */
  patternId?: string;
  onClose: () => void;
  onSaved: (id: string) => void;
  onDeleted?: () => void;
  onReset?: () => void;
};

/** Create / edit form for a pattern, shown in a dialog. */
export function PatternEditor({ patternId, onClose, onSaved, onDeleted, onReset }: Props) {
  const isEdit = !!patternId;

  const [name, setName] = useState('');
  const [hookSize, setHookSize] = useState('');
  const [yarnSummary, setYarnSummary] = useState('');
  const [workedIn, setWorkedIn] = useState<WorkedIn>('rounds');
  const [steps, setSteps] = useState<DraftStep[]>(() => [blankRound()]);
  /** Cards shown in full; the rest collapse to a one-line summary. */
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const [yarns, setYarns] = useState<Yarn[]>([]);
  /** Path already saved on the pattern. */
  const [imagePath, setImagePath] = useState<string | null>(null);
  /** undefined = unchanged, null = remove, File = replace on save. */
  const [imageChange, setImageChange] = useState<File | null | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  /** Set once a new pattern is inserted, so a retry after a failed upload updates instead of duplicating. */
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'delete' | 'reset' | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // The error sits at the end of the scrolling body; bring it into view.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [error]);

  useEffect(() => {
    if (!patternId) setOpenKeys(new Set(steps.slice(0, 1).map((s) => s.key)));
    // Only on mount: open the starter card of a new pattern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setImagePath(p.image_path);
        const sorted = [...(p.pattern_steps ?? [])].sort((a, b) => a.position - b.position);
        setSteps(
          sorted.map((s) => ({
            key: newKey(),
            title: s.name ?? '',
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

  useEffect(() => {
    if (!(imageChange instanceof File)) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageChange);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageChange]);

  const imageSrc = imageChange === null ? null : imagePreview ?? patternImageUrl(imagePath);

  const unitWord = workedIn === 'rounds' ? 'round' : 'row';
  const UnitWord = workedIn === 'rounds' ? 'Round' : 'Row';

  // "Round 3" / "Rounds 13–21" — the same numbering the tracker uses. Titled steps aren't numbered.
  const autoLabels = useMemo(() => {
    let n = 0;
    return steps.map((s) => {
      if (s.title.trim()) return null;
      const times = canRepeat(s) ? toInt(s.times, 1) : 1;
      const first = n + 1;
      n += times;
      return times > 1 ? `${UnitWord}s ${first}–${n}` : `${UnitWord} ${first}`;
    });
  }, [steps, UnitWord]);

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

  const duplicateStep = (i: number) => {
    const copy = { ...steps[i], key: newKey() };
    setSteps((prev) => [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)]);
    setOpenKeys(new Set([copy.key]));
  };

  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, j) => j !== i));

  const toggleOpen = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  /** Adds a card, opens it and closes the others so the new one is the focus. */
  const addStep = (step: DraftStep) => {
    setSteps((prev) => [...prev, step]);
    setOpenKeys(new Set([step.key]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || loading) return;
    if (!name.trim()) { setError('Give the pattern a name.'); return; }
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

    let id = patternId ?? createdId ?? undefined;
    if (id) {
      const { error } = await supabase.from('patterns').update(fields).eq('id', id);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('patterns').insert(fields).select('id').single();
      if (error) { setError(error.message); setSaving(false); return; }
      id = data.id;
      setCreatedId(data.id);
    }

    const payload = steps.map((s) => {
      const countable = s.unit.length > 0;
      const repeat = countable ? toInt(s.repeat, 1) : 1;
      const end = s.end.trim() === '' ? suggestedEndCount(s.unit, repeat) : parseInt(s.end, 10);
      return {
        name: s.title.trim() || null,
        note: s.note.trim() || null,
        yarn_id: s.yarnId || null,
        stitch_unit: s.unit,
        repeat_count: repeat,
        end_count: Number.isFinite(end) ? end : null,
        times: canRepeat(s) ? toInt(s.times, 1) : 1,
      };
    });

    const { error: stepsError } = await supabase.rpc('replace_pattern_steps', { p_pattern_id: id, p_steps: payload });
    if (stepsError) { setError(stepsError.message); setSaving(false); return; }

    if (imageChange !== undefined) {
      try {
        let nextPath: string | null = null;
        if (imageChange) {
          const { data: auth } = await supabase.auth.getUser();
          if (!auth.user) throw new Error('Not signed in.');
          nextPath = await uploadPatternImage(auth.user.id, id!, imageChange);
        }
        const { error: imgError } = await supabase.from('patterns').update({ image_path: nextPath }).eq('id', id);
        if (imgError) throw imgError;
        if (imagePath && imagePath !== nextPath) await removePatternImage(imagePath);
        setImagePath(nextPath);
        setImageChange(undefined);
      } catch (err) {
        // The pattern itself is saved; stay here so the image can be retried.
        setError(`Pattern saved, but the image could not be uploaded: ${err instanceof Error ? err.message : String(err)}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved(id!);
  };

  const handleDelete = async () => {
    setConfirm(null);
    const { error } = await createClient().from('patterns').delete().eq('id', patternId!);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    await removePatternImage(imagePath);
    onDeleted?.();
  };

  const handleReset = async () => {
    setConfirm(null);
    const { error } = await createClient()
      .from('patterns')
      .update({ current_step: 0, current_stitch: 0, started_at: null, finished_at: null })
      .eq('id', patternId!);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setToast({ message: 'Progress reset.', variant: 'success' });
    onReset?.();
  };

  return (
    <>
      <Dialog
        title={isEdit ? 'Edit pattern' : 'New pattern'}
        onClose={onClose}
        onSubmit={handleSave}
        size="lg"
        closeOnEscape={!confirm}
        footer={
          <>
            {isEdit && !loading && (
              <div className={styles.footerLeft}>
                <button type="button" onClick={() => setConfirm('reset')} className={buttons.secondary}>Reset progress</button>
                <button type="button" onClick={() => setConfirm('delete')} className={buttons.danger}>Delete</button>
              </div>
            )}
            <button type="button" onClick={onClose} className={buttons.secondary}>Cancel</button>
            <button type="submit" disabled={saving || loading} className={buttons.primary}>
              {saving ? 'Saving…' : isEdit ? 'Save pattern' : 'Create pattern'}
            </button>
          </>
        }
      >
        {loading ? (
          <p className={styles.muted}>Loading pattern…</p>
        ) : (
          <div className={styles.form}>
            {/* ── Pattern details ── */}
            <section className={styles.card}>
              <div className={styles.field}>
                <FormLabel htmlFor="p-name">Pattern name</FormLabel>
                <Input id="p-name" placeholder="e.g. Little Pumpkin" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!isEdit} />
              </div>
              <div className={styles.detailGrid}>
                <div className={styles.field}>
                  <FormLabel htmlFor="p-hook">Hook size</FormLabel>
                  <Input id="p-hook" placeholder="e.g. 4.5mm" value={hookSize} onChange={(e) => setHookSize(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <FormLabel htmlFor="p-yarn">Yarn</FormLabel>
                  <Input id="p-yarn" placeholder="e.g. cotton yarn" value={yarnSummary} onChange={(e) => setYarnSummary(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <FormLabel htmlFor="p-worked">Worked in</FormLabel>
                  <Select id="p-worked" value={workedIn} onChange={(e) => setWorkedIn(e.target.value as WorkedIn)}>
                    <option value="rounds">Rounds</option>
                    <option value="rows">Rows</option>
                  </Select>
                </div>
              </div>
              <div className={styles.field}>
                <FormLabel>Image (optional)</FormLabel>
                <ImageField
                  src={imageSrc}
                  onPick={(file) => setImageChange(file)}
                  onRemove={() => setImageChange(imagePath ? null : undefined)}
                  onError={(message) => setToast({ message, variant: 'error' })}
                  hint="A photo of the finished piece or the pattern chart"
                  alt={name || 'Pattern'}
                />
              </div>
            </section>

            {/* ── Steps ── */}
            <div>
              <h2 className={styles.sectionTitle}>{UnitWord}s</h2>
              <p className={styles.help}>
                One card per line of the pattern — click a card to edit it. For <em>“R6: (sc, inc) ×3 (9)”</em> pick <strong>sc</strong>,{' '}
                <strong>inc</strong> and set “Repeat” to 3.
              </p>
            </div>

            <div className={styles.stepList}>
              {steps.map((s, i) => {
                const countable = s.unit.length > 0;
                const repeat = toInt(s.repeat, 1);
                const suggested = suggestedEndCount(s.unit, repeat);
                const preview = instructionText(s.unit, workedIn);
                const yarn = yarns.find((y) => y.id === s.yarnId);
                const label = s.title.trim() || autoLabels[i];
                const open = openKeys.has(s.key);
                const endShown = s.end.trim() || suggested;
                const times = canRepeat(s) ? toInt(s.times, 1) : 1;
                return (
                  <section key={s.key} className={`${styles.stepCard} ${open ? '' : styles.stepCardClosed}`}>
                    <div className={`${styles.stepHeader} ${open ? '' : styles.stepHeaderClosed}`}>
                      <button type="button" className={styles.stepToggle} onClick={() => toggleOpen(s.key)} aria-expanded={open}>
                        <span className={styles.stepLabel}>
                          <span className={styles.yarnDot} style={{ background: yarn?.colour_hex ?? 'var(--color-surface-3)' }} />
                          {label}
                        </span>
                        {!open && (
                          <span className={styles.stepSummary}>
                            {shorthand(s.unit, repeat)}
                            {countable && endShown != null && ` → ${endShown} sts`}
                            {times > 1 && s.title.trim() && ` · ×${times}`}
                            {s.note.trim() && <span className={styles.stepSummaryNote}> · {s.note.trim()}</span>}
                          </span>
                        )}
                      </button>
                      <div className={styles.stepTools}>
                        <button type="button" className={buttons.icon} onClick={() => toggleOpen(s.key)} aria-label={open ? 'Collapse' : 'Edit'} title={open ? 'Collapse' : 'Edit'}>{open ? <ChevronUpIcon size={14} /> : <PencilIcon size={13} />}</button>
                        <button type="button" className={buttons.icon} onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up"><ArrowUpIcon size={14} /></button>
                        <button type="button" className={buttons.icon} onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} aria-label="Move down" title="Move down"><ArrowDownIcon size={14} /></button>
                        <button type="button" className={buttons.icon} onClick={() => duplicateStep(i)} aria-label="Duplicate" title="Duplicate"><CopyIcon size={14} /></button>
                        <button type="button" className={buttons.iconDanger} onClick={() => removeStep(i)} aria-label="Remove" title="Remove"><CloseIcon size={14} /></button>
                      </div>
                    </div>

                    {open && (<>
                    {/* Stitches */}
                    <div className={styles.field}>
                      <FormLabel>Stitches, in the order you work them</FormLabel>
                      <div className={styles.unitBox}>
                        {s.unit.length === 0 ? (
                          <span className={styles.unitEmpty}>No stitches — nothing to count (e.g. finishing or sewing)</span>
                        ) : (
                          s.unit.map((t, ti) => (
                            <button
                              key={ti}
                              type="button"
                              title="Click to remove"
                              onClick={() => updateStep(s.key, { unit: s.unit.filter((_, k) => k !== ti) })}
                              className={styles.chip}
                              style={{ background: STITCHES[t].chipBg, color: STITCHES[t].chipFg }}
                            >
                              {STITCHES[t].abbr}
                            </button>
                          ))
                        )}
                        {s.unit.length > 0 && (
                          <button type="button" className={`${buttons.icon} ${styles.unitBackspace}`} onClick={() => updateStep(s.key, { unit: s.unit.slice(0, -1) })} aria-label="Remove last stitch" title="Remove last stitch">
                            <BackspaceIcon size={15} />
                          </button>
                        )}
                      </div>
                      <div className={styles.palette}>
                        {STITCH_ORDER.map((t) => (
                          <button key={t} type="button" onClick={() => updateStep(s.key, { unit: [...s.unit, t] })} className={styles.paletteBtn} title={`Add ${STITCHES[t].label.toLowerCase()}`}>
                            + {STITCHES[t].abbr}
                          </button>
                        ))}
                      </div>
                    </div>

                    {countable && (
                      <div className={styles.numbersGrid}>
                        <div className={styles.field}>
                          <FormLabel htmlFor={`${s.key}-rep`}>Repeat</FormLabel>
                          <div className={styles.inputAffix}>
                            <span>×</span>
                            <Input id={`${s.key}-rep`} type="number" min={1} inputMode="numeric" value={s.repeat} onChange={(e) => updateStep(s.key, { repeat: e.target.value })} />
                          </div>
                          <p className={styles.hint}>times around the {unitWord}</p>
                        </div>
                        <div className={styles.field}>
                          <FormLabel htmlFor={`${s.key}-end`}>Stitch count at the end</FormLabel>
                          <Input id={`${s.key}-end`} type="number" min={0} inputMode="numeric" placeholder={suggested != null ? String(suggested) : ''} value={s.end} onChange={(e) => updateStep(s.key, { end: e.target.value })} />
                          <p className={styles.hint}>{s.end.trim() ? 'Clear to calculate it' : 'Calculated for you'}</p>
                        </div>
                        <div className={styles.field}>
                          <FormLabel htmlFor={`${s.key}-times`}>Same {unitWord} in a row</FormLabel>
                          <div className={styles.inputAffix}>
                            <span>×</span>
                            <Input id={`${s.key}-times`} type="number" min={1} inputMode="numeric" value={s.times} onChange={(e) => updateStep(s.key, { times: e.target.value })} />
                          </div>
                          <p className={styles.hint}>e.g. 9 for R13–R21</p>
                        </div>
                      </div>
                    )}

                    {!countable && s.title.trim() && (
                      <div className={styles.numbersGrid}>
                        <div className={styles.field}>
                          <FormLabel htmlFor={`${s.key}-times`}>Same step in a row</FormLabel>
                          <div className={styles.inputAffix}>
                            <span>×</span>
                            <Input id={`${s.key}-times`} type="number" min={1} inputMode="numeric" value={s.times} onChange={(e) => updateStep(s.key, { times: e.target.value })} />
                          </div>
                          <p className={styles.hint}>e.g. 6 for six identical segments</p>
                        </div>
                      </div>
                    )}

                    <div className={styles.detailGrid2}>
                      <div className={styles.field}>
                        <FormLabel htmlFor={`${s.key}-yarn`}>Yarn</FormLabel>
                        <Select id={`${s.key}-yarn`} value={s.yarnId} onChange={(e) => updateStep(s.key, { yarnId: e.target.value })}>
                          <option value="">{yarns.length ? 'No yarn' : 'No yarns in your stash yet'}</option>
                          {yarns.map((y) => (
                            <option key={y.id} value={y.id}>{y.colour_name} — {y.brand}</option>
                          ))}
                        </Select>
                      </div>
                      <div className={styles.field}>
                        <FormLabel htmlFor={`${s.key}-title`}>Title (optional)</FormLabel>
                        <Input id={`${s.key}-title`} placeholder={autoLabels[i] ?? `e.g. Leaf, Finishing`} value={s.title} onChange={(e) => updateStep(s.key, { title: e.target.value })} />
                        <p className={styles.hint}>Leave empty to number it automatically</p>
                      </div>
                    </div>

                    <div className={styles.field}>
                      <FormLabel htmlFor={`${s.key}-note`}>Instructions / notes (optional)</FormLabel>
                      <Textarea id={`${s.key}-note`} rows={2} placeholder="e.g. Work into a magic ring. / Stuff firmly once this round is done." value={s.note} onChange={(e) => updateStep(s.key, { note: e.target.value })} />
                    </div>

                    {(preview || s.note.trim()) && (
                      <p className={styles.preview}>
                        <span className={styles.previewLabel}>Preview</span>
                        {[s.note.trim(), preview].filter(Boolean).join(' ')}
                        {countable && repeat > 1 && ` ×${repeat}`}
                        {countable && endShown != null && ` → ${endShown} sts`}
                      </p>
                    )}
                    </>)}
                  </section>
                );
              })}

              <div className={styles.addRow}>
                <button type="button" onClick={() => addStep(blankRound(steps[steps.length - 1]?.yarnId ?? ''))} className={styles.addTrigger}>
                  + Add {unitWord}
                </button>
                <button type="button" onClick={() => addStep(blankNoteStep())} className={styles.addTrigger}>
                  + Add finishing / notes step
                </button>
              </div>
            </div>

            {error && <p ref={errorRef} className={styles.errorMsg}>{error}</p>}
          </div>
        )}
      </Dialog>

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
    </>
  );
}
