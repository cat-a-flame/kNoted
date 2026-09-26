'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Yarn } from '@/lib/types';
import { AppTabs } from '@/components/layout/AppTabs';
import { FormLabel } from '@/components/ui/FormLabel';
import { Input, Textarea } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import { CloseIcon, PencilIcon, PlusIcon } from '@/components/ui/icons';
import buttons from '@/components/ui/buttons.module.css';
import styles from './page.module.css';

type Draft = {
  brand: string;
  colour_name: string;
  colour_hex: string;
  fiber: string;
  hook: string;
  skein: string;
  quantity: string;
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
  quantity: '',
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
  quantity: y.quantity ?? '',
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
  quantity: d.quantity.trim() || null,
  care: d.care.trim() || null,
  notes: d.notes.trim() || null,
});

export default function YarnsPage() {
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
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

  const update = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const openAdd = () => {
    if (formOpen) { closeForm(); return; }
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
  };

  const openEdit = (y: Yarn) => {
    setEditingId(y.id);
    setDraft(toDraft(y));
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canSave = !!(draft.brand.trim() && draft.colour_name.trim());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const supabase = createClient();

    if (editingId) {
      const { data, error } = await supabase.from('yarns').update(toRow(draft)).eq('id', editingId).select('*').single();
      setSaving(false);
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }
      setYarns((prev) => prev.map((y) => (y.id === editingId ? data : y)));
      setToast({ message: 'Yarn updated.', variant: 'success' });
    } else {
      const { data, error } = await supabase.from('yarns').insert(toRow(draft)).select('*').single();
      setSaving(false);
      if (error) { setToast({ message: error.message, variant: 'error' }); return; }
      setYarns((prev) => [data, ...prev]);
      setToast({ message: 'Added to your stash.', variant: 'success' });
    }
    closeForm();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const { error } = await createClient().from('yarns').delete().eq('id', target.id);
    if (error) { setToast({ message: error.message, variant: 'error' }); return; }
    setYarns((prev) => prev.filter((y) => y.id !== target.id));
    if (editingId === target.id) closeForm();
    setToast({ message: 'Yarn removed.', variant: 'success' });
  };

  const countLabel = `${yarns.length} ${yarns.length === 1 ? 'yarn' : 'yarns'} in your stash`;

  return (
    <div className={styles.page}>
      <AppTabs />

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>My yarn stash</h1>
          <p className={styles.subtitle}>{loading ? 'Loading…' : countLabel}</p>
        </div>
        <button onClick={openAdd} className={buttons.primary}>
          {formOpen ? <CloseIcon size={16} /> : <PlusIcon size={16} />}
          {formOpen ? 'Close' : 'Add yarn'}
        </button>
      </header>

      <main className={styles.body}>
        {formOpen && (
          <form onSubmit={handleSave} className={styles.formCard}>
            <h2 className={styles.formTitle}>{editingId ? 'Edit yarn' : 'Add a yarn'}</h2>

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

            <div>
              <FormLabel htmlFor="y-qty">Quantity on hand</FormLabel>
              <Input id="y-qty" placeholder="e.g. 2 skeins" value={draft.quantity} onChange={update('quantity')} />
            </div>

            <div>
              <FormLabel htmlFor="y-care">Care info</FormLabel>
              <Textarea id="y-care" rows={2} placeholder="e.g. Machine wash cold, lay flat to dry" value={draft.care} onChange={update('care')} />
            </div>

            <div>
              <FormLabel htmlFor="y-notes">Notes (optional)</FormLabel>
              <Textarea id="y-notes" rows={2} placeholder="e.g. Leftover from the pumpkin project" value={draft.notes} onChange={update('notes')} />
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={closeForm} className={buttons.ghost}>Cancel</button>
              <button type="submit" disabled={!canSave || saving} className={buttons.primary}>
                {editingId ? (saving ? 'Saving…' : 'Save changes') : saving ? 'Adding…' : 'Add to stash'}
              </button>
            </div>
          </form>
        )}

        {!loading && yarns.length === 0 && !formOpen && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Your stash is empty</p>
            <p className={styles.emptyText}>Add the yarns you have on hand, then link them to the steps of your patterns.</p>
          </div>
        )}

        <div className={styles.cards}>
          {yarns.map((y) => (
            <article key={y.id} className={`${styles.card} ${editingId === y.id ? styles.cardEditing : ''}`}>
              <div className={styles.cardActions}>
                <button onClick={() => openEdit(y)} aria-label={`Edit ${y.colour_name}`} className={buttons.iconRound}>
                  <PencilIcon size={14} />
                </button>
                <button onClick={() => setDeleteTarget(y)} aria-label={`Remove ${y.colour_name}`} className={buttons.iconRound}>
                  <CloseIcon size={14} />
                </button>
              </div>

              <div className={styles.cardHead}>
                <span className={styles.swatch} style={{ background: y.colour_hex }} />
                <div className={styles.cardHeadText}>
                  <div className={styles.colourName}>{y.colour_name}</div>
                  <div className={styles.brand}>{y.brand}</div>
                </div>
              </div>

              {y.fiber && (
                <div className={styles.tags}>
                  <span className={styles.tag}>{y.fiber}</span>
                </div>
              )}

              {(y.hook || y.skein || y.quantity) && (
                <div className={styles.specs}>
                  {y.hook && <div><strong>Hook:</strong> {y.hook}</div>}
                  {y.skein && <div><strong>Skein:</strong> {y.skein}</div>}
                  {y.quantity && <div><strong>On hand:</strong> {y.quantity}</div>}
                </div>
              )}

              {y.care && <div className={styles.care}>{y.care}</div>}
              {y.notes && <div className={styles.notes}>{y.notes}</div>}
            </article>
          ))}
        </div>
      </main>

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
