'use client';

import { useState, useCallback } from 'react';
import { Section, Row, Stitch } from '@/lib/types';
import { RowList } from './RowList';
import { StitchBuilder } from './StitchBuilder';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import styles from './SectionList.module.css';

type SectionUpdate = {
  name?: string;
  yarn_name?: string | null;
  yarn_weight?: string | null;
  yarn_colour?: string | null;
  hook_size?: string | null;
};

interface SectionListProps {
  sections: Section[];
  editMode: boolean;
  firstIncompleteRowId: string | null;
  onToggleRow: (sectionId: string, rowId: string, done: boolean) => Promise<void>;
  onEditRow: (sectionId: string, rowId: string, data: { title: string; stitches: Stitch[]; note: string | null }) => Promise<void>;
  onDuplicateRow: (sectionId: string, rowId: string) => Promise<void>;
  onDeleteRow: (sectionId: string, rowId: string) => Promise<void>;
  onReorderRows: (sectionId: string, rows: Row[]) => Promise<void>;
  onAddRow: (sectionId: string, data: { title: string; stitches: Stitch[]; note: string | null }) => Promise<void>;
  onUpdateSection: (sectionId: string, updates: SectionUpdate) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onAddSection: (name: string) => Promise<void>;
}

const YARN_WEIGHTS = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky', 'Super Bulky'];
const HOOK_SIZES = ['2mm', '2.5mm', '3mm', '3.25mm', '3.5mm', '3.75mm', '4mm', '4.5mm', '5mm', '5.5mm', '6mm', '6.5mm', '7mm', '8mm', '9mm', '10mm', '12mm', '15mm'];

function SectionDetailEditor({
  section,
  onUpdate,
}: {
  section: Section;
  onUpdate: (updates: SectionUpdate) => Promise<void>;
}) {
  const [yarnName, setYarnName] = useState(section.yarn_name ?? '');
  const [yarnWeight, setYarnWeight] = useState(section.yarn_weight ?? '');
  const [yarnColour, setYarnColour] = useState(section.yarn_colour ?? '');
  const [hookSize, setHookSize] = useState(section.hook_size ?? '');

  return (
    <div className={styles.detailGrid}>
      <div>
        <FormLabel variant="meta">Yarn name</FormLabel>
        <Input inputSize="sm" value={yarnName} onChange={(e) => setYarnName(e.target.value)}
          onBlur={() => onUpdate({ yarn_name: yarnName.trim() || null })}
          placeholder="e.g. Lion Brand" />
      </div>
      <div>
        <FormLabel variant="meta">Yarn weight</FormLabel>
        <Input inputSize="sm" value={yarnWeight} onChange={(e) => setYarnWeight(e.target.value)}
          onBlur={() => onUpdate({ yarn_weight: yarnWeight.trim() || null })}
          placeholder="e.g. DK" list="sl-yarn-weights" />
        <datalist id="sl-yarn-weights">
          {YARN_WEIGHTS.map((w) => <option key={w} value={w} />)}
        </datalist>
      </div>
      <div>
        <FormLabel variant="meta">Colour</FormLabel>
        <Input inputSize="sm" value={yarnColour} onChange={(e) => setYarnColour(e.target.value)}
          onBlur={() => onUpdate({ yarn_colour: yarnColour.trim() || null })}
          placeholder="e.g. Forest Green" />
      </div>
      <div>
        <FormLabel variant="meta">Hook size</FormLabel>
        <Input inputSize="sm" value={hookSize} onChange={(e) => setHookSize(e.target.value)}
          onBlur={() => onUpdate({ hook_size: hookSize.trim() || null })}
          placeholder="e.g. 5mm" list="sl-hook-sizes" />
        <datalist id="sl-hook-sizes">
          {HOOK_SIZES.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
    </div>
  );
}

function detailText(section: Section): string | null {
  const parts: string[] = [];
  const yarn = [section.yarn_name, section.yarn_weight ? `(${section.yarn_weight})` : null]
    .filter(Boolean).join(' ');
  if (yarn) parts.push(yarn);
  if (section.yarn_colour) parts.push(section.yarn_colour);
  if (section.hook_size) parts.push(`Hook: ${section.hook_size}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function SectionList({
  sections,
  editMode,
  firstIncompleteRowId,
  onToggleRow,
  onEditRow,
  onDuplicateRow,
  onDeleteRow,
  onReorderRows,
  onAddRow,
  onUpdateSection,
  onDeleteSection,
  onAddSection,
}: SectionListProps) {
  const showHeaders = sections.length > 1;

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [addingRowTo, setAddingRowTo] = useState<string | null>(null);
  const [rowTitle, setRowTitle] = useState('');
  const [rowStitches, setRowStitches] = useState<Stitch[]>([]);
  const [rowNote, setRowNote] = useState('');

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);

  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSectionLoading, setAddingSectionLoading] = useState(false);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startRename = (section: Section) => {
    setRenamingId(section.id);
    setRenameValue(section.name);
  };

  const submitRename = useCallback(
    async (sectionId: string) => {
      const trimmed = renameValue.trim();
      if (trimmed) await onUpdateSection(sectionId, { name: trimmed });
      setRenamingId(null);
      setRenameValue('');
    },
    [renameValue, onUpdateSection],
  );

  const openAddRow = (sectionId: string) => {
    setAddingRowTo(sectionId);
    setRowTitle('');
    setRowStitches([]);
    setRowNote('');
  };

  const submitAddRow = async (sectionId: string, rowCount: number) => {
    await onAddRow(sectionId, {
      title: rowTitle.trim() || `Row ${rowCount}`,
      stitches: rowStitches,
      note: rowNote.trim() || null,
    });
    setAddingRowTo(null);
    setRowTitle('');
    setRowStitches([]);
    setRowNote('');
  };

  const submitAddSection = async () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    setAddingSectionLoading(true);
    await onAddSection(trimmed);
    setAddingSectionLoading(false);
    setShowAddSection(false);
    setNewSectionName('');
  };

  return (
    <div className={styles.root}>
      {sections.map((section) => {
        const rows = section.rows ?? [];
        const doneCnt = rows.filter((r) => r.done).length;
        const allDone = rows.length > 0 && doneCnt === rows.length;
        const isCollapsed = collapsedIds.has(section.id);
        const detail = detailText(section);

        return (
          <div key={section.id}>
            {showHeaders && (
              <>
                <div className={styles.sectionHeader}>
                  <button
                    onClick={() => toggleCollapse(section.id)}
                    className={styles.collapseBtn}
                    aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                  >
                    <svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className={`${styles.collapseIcon} ${isCollapsed ? styles.collapseIconClosed : ''}`}
                    >
                      <path d="M2 5l5 5 5-5" />
                    </svg>
                  </button>

                  {renamingId === section.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => submitRename(section.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename(section.id);
                        if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                      }}
                      className={styles.sectionRenameInput}
                    />
                  ) : (
                    <span className={styles.sectionName}>{section.name}</span>
                  )}

                  <span className={styles.rowCount}>{doneCnt} / {rows.length}</span>

                  {allDone && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className={styles.allDoneIcon}
                    >
                      <path d="M3 8l3.5 3.5L13 4.5" />
                    </svg>
                  )}

                  {editMode && renamingId !== section.id && (
                    <div className={styles.sectionActions}>
                      <button onClick={() => startRename(section)} title="Rename section"
                        className={styles.sectionIconBtn}
                      >
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M11.5 2.5a2.12 2.12 0 0 1 3 3L5 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeletingSectionId(section.id)} title="Delete section"
                        className={`${styles.sectionIconBtn} ${styles.sectionIconBtnDanger}`}
                      >
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {editMode
                  ? <SectionDetailEditor key={section.id} section={section} onUpdate={(u) => onUpdateSection(section.id, u)} />
                  : detail && <p className={styles.detailText}>{detail}</p>
                }
              </>
            )}

            {!showHeaders && (
              editMode
                ? <SectionDetailEditor key={section.id} section={section} onUpdate={(u) => onUpdateSection(section.id, u)} />
                : detail && <p className={styles.detailText}>{detail}</p>
            )}

            {!isCollapsed && (
              <>
                {rows.length > 0 && (
                  <RowList
                    rows={rows}
                    editMode={editMode}
                    firstIncompleteRowId={firstIncompleteRowId}
                    onToggle={(rowId, done) => onToggleRow(section.id, rowId, done)}
                    onEdit={(rowId, data) => onEditRow(section.id, rowId, data)}
                    onDuplicate={(rowId) => onDuplicateRow(section.id, rowId)}
                    onDelete={(rowId) => onDeleteRow(section.id, rowId)}
                    onReorder={(reordered) => onReorderRows(section.id, reordered)}
                  />
                )}

                {editMode && (
                  addingRowTo === section.id ? (
                    <div className={styles.addRowForm}>
                      <Input
                        autoFocus
                        value={rowTitle}
                        onChange={(e) => setRowTitle(e.target.value)}
                        placeholder={`Row ${rows.length}`}
                      />
                      <StitchBuilder stitches={rowStitches} onChange={setRowStitches} />
                      <Input
                        value={rowNote}
                        onChange={(e) => setRowNote(e.target.value)}
                        placeholder="Note (optional)"
                      />
                      <div className={styles.addRowActions}>
                        <button onClick={() => submitAddRow(section.id, rows.length)} className={styles.addRowBtn}>
                          Add row
                        </button>
                        <button onClick={() => setAddingRowTo(null)} className={styles.cancelBtn}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => openAddRow(section.id)} className={styles.dashedBtn}>
                      + Add row
                    </button>
                  )
                )}
              </>
            )}
          </div>
        );
      })}

      {editMode && (
        showAddSection ? (
          <div className={styles.addSectionForm}>
            <Input
              autoFocus
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAddSection()}
              placeholder="Section name"
            />
            <button onClick={submitAddSection} disabled={addingSectionLoading} className={styles.addSectionBtn}>
              Add
            </button>
            <button onClick={() => { setShowAddSection(false); setNewSectionName(''); }} className={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAddSection(true)} className={styles.dashedBtnLg}>
            + Add section
          </button>
        )
      )}

      {deletingSectionId && (
        <ConfirmDialog
          title="Delete section"
          description="This will permanently delete the section and all its rows. This cannot be undone."
          onConfirm={async () => {
            await onDeleteSection(deletingSectionId);
            setDeletingSectionId(null);
          }}
          onCancel={() => setDeletingSectionId(null)}
        />
      )}
    </div>
  );
}
