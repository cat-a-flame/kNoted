'use client';

import { useState, useCallback } from 'react';
import { Section, Row, Stitch } from '@/lib/types';
import { RowList } from './RowList';
import { StitchBuilder } from './StitchBuilder';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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

const inputCls = 'w-full border border-black/[0.09] rounded-sm px-2 py-1 text-xs text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal placeholder:text-text-tertiary';

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

  const label = 'block text-[10px] font-medium text-text-tertiary mb-0.5 uppercase tracking-wide';

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3 px-1">
      <div>
        <p className={label}>Yarn name</p>
        <input value={yarnName} onChange={(e) => setYarnName(e.target.value)}
          onBlur={() => onUpdate({ yarn_name: yarnName.trim() || null })}
          placeholder="e.g. Lion Brand" className={inputCls} />
      </div>
      <div>
        <p className={label}>Yarn weight</p>
        <input value={yarnWeight} onChange={(e) => setYarnWeight(e.target.value)}
          onBlur={() => onUpdate({ yarn_weight: yarnWeight.trim() || null })}
          placeholder="e.g. DK" list="sl-yarn-weights" className={inputCls} />
        <datalist id="sl-yarn-weights">
          {YARN_WEIGHTS.map((w) => <option key={w} value={w} />)}
        </datalist>
      </div>
      <div>
        <p className={label}>Colour</p>
        <input value={yarnColour} onChange={(e) => setYarnColour(e.target.value)}
          onBlur={() => onUpdate({ yarn_colour: yarnColour.trim() || null })}
          placeholder="e.g. Forest Green" className={inputCls} />
      </div>
      <div>
        <p className={label}>Hook size</p>
        <input value={hookSize} onChange={(e) => setHookSize(e.target.value)}
          onBlur={() => onUpdate({ hook_size: hookSize.trim() || null })}
          placeholder="e.g. 5mm" list="sl-hook-sizes" className={inputCls} />
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
      title: rowTitle.trim() || `Row ${rowCount + 1}`,
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
    <div className="flex flex-col gap-4">
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
                <div className="flex items-center gap-2 mb-1 px-1">
                  <button
                    onClick={() => toggleCollapse(section.id)}
                    className="text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
                    aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                  >
                    <svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className={`transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
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
                      className="flex-1 text-sm font-semibold text-text-primary bg-transparent border-b border-teal focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-text-primary">{section.name}</span>
                  )}

                  <span className="text-xs text-text-secondary">{doneCnt} / {rows.length}</span>

                  {allDone && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="text-teal shrink-0"
                    >
                      <path d="M3 8l3.5 3.5L13 4.5" />
                    </svg>
                  )}

                  {editMode && renamingId !== section.id && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button onClick={() => startRename(section)} title="Rename section"
                        className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:bg-surface-2 hover:text-text-secondary transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M11.5 2.5a2.12 2.12 0 0 1 3 3L5 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeletingSectionId(section.id)} title="Delete section"
                        className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:bg-coral-light hover:text-coral transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Details: editable in edit mode, read-only text when set */}
                {editMode
                  ? <SectionDetailEditor key={section.id} section={section} onUpdate={(u) => onUpdateSection(section.id, u)} />
                  : detail && <p className="text-xs text-text-secondary px-1 mb-2">{detail}</p>
                }
              </>
            )}

            {/* Single-section: show details without a name header */}
            {!showHeaders && (
              editMode
                ? <SectionDetailEditor key={section.id} section={section} onUpdate={(u) => onUpdateSection(section.id, u)} />
                : detail && <p className="text-xs text-text-secondary mb-2">{detail}</p>
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
                    <div className="mt-2 bg-surface-2 rounded-md border border-black/[0.09] p-3 flex flex-col gap-2">
                      <input
                        autoFocus
                        value={rowTitle}
                        onChange={(e) => setRowTitle(e.target.value)}
                        placeholder={`Row ${rows.length + 1}`}
                        className="w-full border border-black/[0.09] rounded-sm px-2 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                      />
                      <StitchBuilder stitches={rowStitches} onChange={setRowStitches} />
                      <input
                        value={rowNote}
                        onChange={(e) => setRowNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="w-full border border-black/[0.09] rounded-sm px-2 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => submitAddRow(section.id, rows.length)}
                          className="px-3 py-1.5 text-xs font-medium bg-teal text-white rounded-sm hover:bg-teal-dark transition-colors"
                        >
                          Add row
                        </button>
                        <button onClick={() => setAddingRowTo(null)}
                          className="px-3 py-1.5 text-xs font-medium border border-black/[0.09] text-text-secondary rounded-sm hover:bg-surface-3 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => openAddRow(section.id)}
                      className="mt-2 w-full py-2 text-xs font-medium text-text-secondary border border-dashed border-black/[0.17] rounded-md hover:border-teal hover:text-teal transition-colors"
                    >
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
          <div className="bg-surface-2 rounded-md border border-black/[0.09] p-3 flex gap-2">
            <input
              autoFocus
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAddSection()}
              placeholder="Section name"
              className="flex-1 border border-black/[0.09] rounded-sm px-2 py-1.5 text-sm text-text-primary bg-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
            />
            <button onClick={submitAddSection} disabled={addingSectionLoading}
              className="px-3 py-1.5 text-xs font-medium bg-teal text-white rounded-sm hover:bg-teal-dark transition-colors disabled:opacity-60"
            >
              Add
            </button>
            <button onClick={() => { setShowAddSection(false); setNewSectionName(''); }}
              className="px-3 py-1.5 text-xs font-medium border border-black/[0.09] text-text-secondary rounded-sm hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAddSection(true)}
            className="w-full py-2.5 text-sm font-medium text-text-secondary border border-dashed border-black/[0.17] rounded-md hover:border-teal hover:text-teal transition-colors"
          >
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
