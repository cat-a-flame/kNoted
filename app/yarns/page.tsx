'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Yarn } from '@/lib/types';
import { removeYarnImage, uploadYarnImage, yarnImageUrl } from '@/lib/images';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { FormLabel } from '@/components/ui/FormLabel';
import { Input, Textarea } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { ImageField } from '@/components/ui/ImageField';
import { Toast } from '@/components/ui/Toast';
import { CloseIcon, PencilIcon } from '@/components/ui/icons';
import buttons from '@/components/ui/buttons.module.css';
import styles from './page.module.css';

type Draft = {
  brand: string;
  colour_name: string;
  colour_hex: string;
  fiber: string;
  hook: string;
  skein: string;
  care: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  brand: '',
  colour_name: '',
  colour_hex: '#7A5AA6',
  fiber: '',
  hook: '',
  skein: '',
  care: '',
  notes: '',
};

const toDraft = (y: Yarn): Draft => ({
  brand: y.brand,
  colour_name: y.colour_name,
  colour_hex: y.colour_hex,
  fiber: y.fiber ?? '',
  hook: y.hook ?? '',
  skein: y.skein ?? '',
  care: y.care ?? '',
  notes: y.notes ?? '',
});

const toRow = (d: Draft) => ({
  brand: d.brand.trim(),
  colour_name: d.colour_name.trim(),
  colour_hex: d.colour_hex,
  fiber: d.fiber.trim() || null,
  hook: d.hook.trim() || null,
  skein: d.skein.trim() || null,
  care: d.care.trim() || null,
  notes: d.notes.trim() || null,
});

export default function YarnsPage() {
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  /** undefined = unchanged, null = remove, File = replace on save. */
  const [imageChange, setImageChange] = useState<File | null | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Yarn | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  useEffect(() => {
    createClient()
      .from('yarns')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setToast({ message: error.message, variant: 'error' });
        setYarns(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!(imageChange instanceof File)) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageChange);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageChange]);

  const editing = yarns.find((y) => y.id === editingId) ?? null;
  const savedImagePath = editing?.image_path ?? null;
  const imageSrc = imageChange === null ? null : imagePreview ?? yarnImageUrl(savedImagePath);

  const update = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setImageChange(undefined);
  };

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setImageChange(undefined);
    setFormOpen(true);
  };

  const openEdit = (y: Yarn) => {
    setEditingId(y.id);
    setDraft(toDraft(y));
    setImageChange(undefined);
    setFormOpen(true);
  };

  const canSave = !!(draft.brand.trim() && draft.colour_name.trim());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const supabase = createClient();

    const isNew = !editingId;
    const query = editingId
      ? supabase.from('yarns').update(toRow(draft)).eq('id', editingId)
      : supabase.from('yarns').insert(toRow(draft));
    const { data, error } = await query.select('*').single();
    if (error) { setSaving(false); setToast({ message: error.message, variant: 'error' }); return; }
    let saved = data as Yarn;
    setYarns((prev) => (isNew ? [saved, ...prev] : prev.map((y) => (y.id === saved.id ? saved : y))));

    if (imageChange !== undefined) {
      try {
        let nextPath: string | null = null;
        if (imageChange) {
          const { data: auth } = await supabase.auth.getUser();
          if (!auth.user) throw new Error('Not signed in.');
          nextPath = await uploadYarnImage(auth.user.id, saved.id, imageChange);
        }
        const { error: imgError } = await supabase.from('yarns').update({ image_path: nextPath }).eq('id', saved.id);
        if (imgError) throw imgError;
        if (saved.image_path && saved.image_path !== nextPath) await removeYarnImage(saved.image_path);
        saved = { ...saved, image_path: nextPath };
        setYarns((prev) => prev.map((y) => (y.id === saved.id ? saved : y)));
      } catch (err) {
        // The yarn itself is saved; keep the dialog open (now editing it) so the image can be retried.
        setEditingId(saved.id);
        setSaving(false);
        setToast({ message: `Yarn saved, but the image could not be uploaded: ${err instanceof Error ? err.message : String(err)}`, variant: 'error' });
        return;
      }
    }

    setSaving(false);
    setToast({ message: isNew ? 'Added to your stash.' : 'Yarn updated.', variant: 'success' });
    closeForm();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const { error } = await createClient().from('yarns').delete().eq('id', target.id);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    await removeYarnImage(target.image_path);
    setYarns((prev) => prev.filter((y) => y.id !== target.id));
    if (editingId === target.id) closeForm();
    setToast({ message: 'Yarn removed.', variant: 'success' });
  };

  const countLabel = `${yarns.length} ${yarns.length === 1 ? 'yarn' : 'yarns'} in your stash`;

  return (
    <div className="appShell">
      <AppHeader />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.topRow}>
            <div>
              <h1 className={styles.title}>Yarn stash</h1>
              <p className={styles.subtitle}>{loading ? 'Loading…' : countLabel}</p>
            </div>
            <button onClick={openAdd} className={styles.addBtn}>+ Add yarn</button>
          </div>

          {!loading && yarns.length === 0 && (
            <p className={styles.empty}>Your stash is empty. Add the yarns you have on hand, then link them to the steps of your patterns.</p>
          )}

          <div className={styles.cards}>
            {yarns.map((y) => (
              <article key={y.id} className={styles.card}>
                <div className={`${styles.swatch} ${y.image_path ? styles.swatchImage : ''}`} style={{ background: y.colour_hex }}>
                  {y.image_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={yarnImageUrl(y.image_path)!} alt={y.colour_name} className={styles.swatchImg} loading="lazy" />
                  )}
                  <div className={styles.cardActions}>
                    <button onClick={() => openEdit(y)} aria-label={`Edit ${y.colour_name}`} className={styles.swatchBtn}>
                      <PencilIcon size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(y)} aria-label={`Remove ${y.colour_name}`} className={styles.swatchBtn}>
                      <CloseIcon size={14} />
                    </button>
                  </div>
                </div>

                <div className={styles.body}>
                  <h3 className={styles.colourName}>{y.colour_name}</h3>
                  <p className={styles.brand}>{y.brand}{y.fiber ? ` · ${y.fiber}` : ''}</p>

                  {(y.hook || y.skein) && (
                    <dl className={styles.specs}>
                      {y.hook && <><dt>Hook</dt><dd>{y.hook}</dd></>}
                      {y.skein && <><dt>Skein</dt><dd>{y.skein}</dd></>}
                    </dl>
                  )}

                  {y.care && <p className={styles.care}>{y.care}</p>}
                  {y.notes && <p className={styles.notes}>{y.notes}</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <AppFooter />

      {formOpen && (
        <Dialog
          title={editingId ? 'Edit yarn' : 'Add a yarn'}
          onClose={closeForm}
          onSubmit={handleSave}
          closeOnEscape={!deleteTarget}
          footer={
            <>
              <button type="button" onClick={closeForm} className={buttons.secondary}>Cancel</button>
              <button type="submit" disabled={!canSave || saving} className={buttons.primary}>
                {editingId ? (saving ? 'Saving…' : 'Save changes') : saving ? 'Adding…' : 'Add to stash'}
              </button>
            </>
          }
        >
          <div className={styles.form}>
            <div className={styles.grid2}>
              <div>
                <FormLabel htmlFor="y-brand">Brand / name</FormLabel>
                <Input id="y-brand" placeholder="e.g. Craft Cotton" value={draft.brand} onChange={update('brand')} autoFocus />
              </div>
              <div>
                <FormLabel htmlFor="y-colourname">Colour name</FormLabel>
                <Input id="y-colourname" placeholder="e.g. Pumpkin Orange" value={draft.colour_name} onChange={update('colour_name')} />
              </div>
            </div>

            <div className={styles.grid2}>
              <div>
                <FormLabel htmlFor="y-colorpicker">Colour</FormLabel>
                <div className={styles.colourRow}>
                  <input id="y-colorpicker" type="color" value={draft.colour_hex} onChange={update('colour_hex')} className={styles.colourPicker} />
                  <span className={styles.colourHex}>{draft.colour_hex.toUpperCase()}</span>
                </div>
              </div>
              <div>
                <FormLabel htmlFor="y-fiber">Fibre type</FormLabel>
                <Input id="y-fiber" placeholder="e.g. 100% cotton" value={draft.fiber} onChange={update('fiber')} />
              </div>
            </div>

            <div className={styles.grid2}>
              <div>
                <FormLabel htmlFor="y-hook">Hook / needle size</FormLabel>
                <Input id="y-hook" placeholder="e.g. 4.5mm / G-7" value={draft.hook} onChange={update('hook')} />
              </div>
              <div>
                <FormLabel htmlFor="y-skein">Skein weight &amp; length</FormLabel>
                <Input id="y-skein" placeholder="e.g. 100g / 150m" value={draft.skein} onChange={update('skein')} />
              </div>
            </div>

            <div className={styles.grid2}>
              <div>
                <FormLabel htmlFor="y-care">Care info</FormLabel>
                <Textarea id="y-care" rows={2} placeholder="e.g. Machine wash cold, lay flat to dry" value={draft.care} onChange={update('care')} />
              </div>
              <div>
                <FormLabel htmlFor="y-notes">Notes (optional)</FormLabel>
                <Textarea id="y-notes" rows={2} placeholder="e.g. Leftover from the pumpkin project" value={draft.notes} onChange={update('notes')} />
              </div>
            </div>

            <div>
              <FormLabel>Image (optional)</FormLabel>
              <ImageField
                src={imageSrc}
                onPick={(file) => setImageChange(file)}
                onRemove={() => setImageChange(savedImagePath ? null : undefined)}
                onError={(message) => setToast({ message, variant: 'error' })}
                hint="A photo of the skein or its label"
                alt={draft.colour_name || 'Yarn'}
              />
            </div>
          </div>
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Remove this yarn?"
          description={`${deleteTarget.colour_name} (${deleteTarget.brand}) will be removed from your stash. Pattern steps that use it will keep their instructions but lose the colour link.`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
    </div>
  );
}
