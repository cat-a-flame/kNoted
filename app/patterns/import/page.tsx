'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Yarn } from '@/lib/types';
import { STITCHES } from '@/lib/stitches';
import { expandSteps, stepSubtitle } from '@/lib/track';
import { patternMeta } from '@/lib/utils';
import {
  checkStitchCounts,
  matchStashYarn,
  parsePatternText,
  toPreviewSteps,
  toStepPayload,
  type KnotedPattern,
} from '@/lib/import';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { FormLabel } from '@/components/ui/FormLabel';
import { Select, Textarea } from '@/components/ui/Input';
import buttons from '@/components/ui/buttons.module.css';
import styles from './page.module.css';

/** Yarn mapping choice: a stash yarn id, NEW (add the file's colour to the stash) or '' (no yarn). */
const NEW = '__new';
const DEFAULT_HEX = '#7A5AA6';

export default function ImportPatternPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [stash, setStash] = useState<Yarn[]>([]);
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [data, setData] = useState<KnotedPattern | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    createClient().from('yarns').select('*').order('colour_name').then(({ data }) => setStash(data ?? []));
  }, []);

  // Pre-select stash yarns with the same colour name once both the file and the stash are loaded.
  useEffect(() => {
    if (!data) return;
    setMapping((prev) => {
      const next: Record<string, string> = {};
      data.yarns.forEach((y) => {
        next[y.key] = prev[y.key] || matchStashYarn(y, stash)?.id || '';
      });
      return next;
    });
  }, [data, stash]);

  const load = (text: string, source: string | null) => {
    setSaveError(null);
    const result = parsePatternText(text);
    if (result.ok) {
      setData(result.data);
      setErrors([]);
      setMapping({});
      setFileName(source);
    } else {
      setData(null);
      setErrors(result.errors);
      setFileName(source);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    load(await file.text(), file.name);
  };

  const warnings = useMemo(() => (data ? checkStitchCounts(data.steps, data.pattern.worked_in) : []), [data]);

  // Ids the preview uses for yarn colours: stash ids, or a stand-in for yarns that will be created.
  const previewYarnIds = useMemo(() => {
    const ids: Record<string, string | null> = {};
    data?.yarns.forEach((y) => {
      const choice = mapping[y.key] ?? '';
      ids[y.key] = choice === NEW ? `new:${y.key}` : choice || null;
    });
    return ids;
  }, [data, mapping]);

  const preview = useMemo(() => {
    if (!data) return [];
    const colours = [
      ...stash.map((y) => ({ id: y.id, colour_hex: y.colour_hex })),
      ...data.yarns.map((y) => ({ id: `new:${y.key}`, colour_hex: y.colour_hex ?? DEFAULT_HEX })),
    ];
    return expandSteps(toPreviewSteps(data.steps, previewYarnIds), colours, data.pattern.worked_in);
  }, [data, stash, previewYarnIds]);

  const handleImport = async () => {
    if (!data) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();

    // 1. Add new yarns to the stash.
    const yarnIds: Record<string, string | null> = { ...previewYarnIds };
    const toCreate = data.yarns.filter((y) => mapping[y.key] === NEW);
    if (toCreate.length) {
      const { data: created, error } = await supabase
        .from('yarns')
        .insert(
          toCreate.map((y) => ({
            brand: data.pattern.yarn_summary ?? 'Imported',
            colour_name: y.colour_name,
            colour_hex: y.colour_hex ?? DEFAULT_HEX,
            notes: y.used_for ? `For ${data.pattern.name}: ${y.used_for}` : `For ${data.pattern.name}`,
          })),
        )
        .select('id');
      if (error || !created) { setSaveError(error?.message ?? 'Could not add yarns.'); setSaving(false); return; }
      toCreate.forEach((y, i) => { yarnIds[y.key] = created[i].id; });
    }

    // 2. The pattern, then its steps.
    const { data: inserted, error: pErr } = await supabase
      .from('patterns')
      .insert({
        name: data.pattern.name,
        hook_size: data.pattern.hook_size,
        yarn_summary: data.pattern.yarn_summary,
        worked_in: data.pattern.worked_in,
      })
      .select('id')
      .single();
    if (pErr || !inserted) { setSaveError(pErr?.message ?? 'Could not create the pattern.'); setSaving(false); return; }

    const { error: sErr } = await supabase.rpc('replace_pattern_steps', {
      p_pattern_id: inserted.id,
      p_steps: toStepPayload(data.steps, yarnIds),
    });
    if (sErr) {
      // Don't leave an empty pattern behind; the import can simply be retried.
      await supabase.from('patterns').delete().eq('id', inserted.id);
      setSaveError(sErr.message);
      setSaving(false);
      return;
    }

    router.push(`/patterns/${inserted.id}`);
  };

  const warningsFor = (stepIndex: number) => warnings.filter((w) => w.step === stepIndex);
  const meta = data ? patternMeta(data.pattern.hook_size, data.pattern.yarn_summary) : '';

  return (
    <div className="appShell">
      <AppHeader />

      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Import pattern</h1>

        <div className={styles.form}>
          {/* ── Load ── */}
          <section className={styles.card}>
            <div className={styles.field}>
              <FormLabel>Pattern file</FormLabel>
              <div className={styles.fileRow}>
                <button type="button" className={buttons.secondary} onClick={() => fileInput.current?.click()}>
                  Choose .knoted.json file
                </button>
                {fileName && <span className={styles.fileName}>{fileName}</span>}
                <input ref={fileInput} type="file" accept=".json,application/json" onChange={onPickFile} hidden />
              </div>
            </div>
            <div className={styles.field}>
              <FormLabel htmlFor="i-paste">…or paste the JSON</FormLabel>
              <Textarea id="i-paste" rows={4} className={styles.code} placeholder='{ "format": "knoted-pattern", "version": 1, … }' value={pasted} onChange={(e) => setPasted(e.target.value)} />
              <div className={styles.pasteActions}>
                <button type="button" className={buttons.secondary} disabled={!pasted.trim()} onClick={() => load(pasted, null)}>
                  Read pasted JSON
                </button>
              </div>
            </div>
          </section>

          {errors.length > 0 && (
            <div className={styles.errorMsg}>
              <p>This file can&rsquo;t be imported:</p>
              <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          {data && (
            <>
              {/* ── Pattern ── */}
              <section className={styles.card}>
                <div>
                  <h2 className={styles.patternName}>{data.pattern.name}</h2>
                  {(meta || data.pattern.designer) && (
                    <p className={styles.muted}>
                      {[data.pattern.designer && `by ${data.pattern.designer}`, meta].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <p className={styles.muted}>
                  {data.steps.length} steps in the file · {preview.length} in the tracker · worked in {data.pattern.worked_in}
                </p>
              </section>

              {/* ── Yarns ── */}
              {data.yarns.length > 0 && (
                <div>
                  <h2 className={styles.sectionTitle}>Yarns</h2>
                  <p className={styles.help}>Pick a yarn from your stash for each colour, or add it to your stash.</p>
                  <section className={`${styles.card} ${styles.sectionBody}`}>
                    {data.yarns.map((y) => (
                      <div key={y.key} className={styles.yarnRow}>
                        <span className={styles.swatch} style={{ background: y.colour_hex ?? 'var(--color-surface-3)' }} />
                        <div className={styles.yarnText}>
                          <span className={styles.yarnName}>{y.colour_name}</span>
                          {y.used_for && <span className={styles.muted}>{y.used_for}</span>}
                        </div>
                        <Select
                          aria-label={`Yarn for ${y.colour_name}`}
                          className={styles.yarnSelect}
                          value={mapping[y.key] ?? ''}
                          onChange={(e) => setMapping((prev) => ({ ...prev, [y.key]: e.target.value }))}
                        >
                          <option value="">No yarn</option>
                          <option value={NEW}>Add “{y.colour_name}” to my stash</option>
                          {stash.length > 0 && (
                            <optgroup label="From your stash">
                              {stash.map((s) => (
                                <option key={s.id} value={s.id}>{s.colour_name} — {s.brand}</option>
                              ))}
                            </optgroup>
                          )}
                        </Select>
                      </div>
                    ))}
                  </section>
                </div>
              )}

              {/* ── Preview ── */}
              <div>
                <h2 className={styles.sectionTitle}>Preview</h2>
                <p className={styles.help}>
                  This is how the tracker will list the pattern.
                  {warnings.length > 0 && (
                    <> <strong className={styles.warnText}>{warnings.length} stitch count{warnings.length === 1 ? '' : 's'} don&rsquo;t add up</strong> — check them against the pattern. Special stitches (e.g. 3 sc in one stitch) can cause this; you can import anyway and fix them in the editor.</>
                  )}
                </p>
                <ol className={`${styles.card} ${styles.previewList}`}>
                  {preview.map((t) => {
                    const stepIndex = Number(t.key.split('-')[1]);
                    const stepWarnings = t.key.endsWith('-0') ? warningsFor(stepIndex) : [];
                    return (
                      <li key={t.key} className={`${styles.previewItem} ${stepWarnings.length ? styles.previewItemWarn : ''}`}>
                        <span className={styles.badge}>{t.badge}</span>
                        <div className={styles.previewText}>
                          <p className={styles.previewTitle}>
                            {t.title}
                            {t.yarnHex && <span className={styles.yarnDot} style={{ background: t.yarnHex }} />}
                            <span className={styles.previewSub}>{stepSubtitle(t, data.pattern.worked_in)}</span>
                          </p>
                          {t.countable && (
                            <p className={styles.previewLine}>
                              {t.unit.map((u) => STITCHES[u].abbr).join(', ')}
                              {t.repeat > 1 && ` ×${t.repeat}`}
                              {t.end != null && ` → ${t.end} sts`}
                            </p>
                          )}
                          {t.note && <p className={styles.previewNote}>{t.note}</p>}
                          {stepWarnings.map((w, i) => (
                            <p key={i} className={styles.warning}>⚠ {w.message}</p>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}

          {saveError && <p className={styles.errorMsg}>{saveError}</p>}

          <div className={styles.footer}>
            <Link href="/patterns" className={buttons.secondary}>Cancel</Link>
            <button type="button" disabled={!data || saving} onClick={handleImport} className={buttons.primary}>
              {saving ? 'Importing…' : 'Import pattern'}
            </button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
