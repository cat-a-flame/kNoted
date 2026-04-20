'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { Pattern, PatternRow } from '@/types/pattern';

type Tab = 'library' | 'archived' | 'stats';

const uid = () => crypto.randomUUID();

const seedRows = (): PatternRow[] => [
  {
    id: uid(),
    title: 'Foundation row',
    note: 'Start with a comfortable tension.',
    done: false,
    stitches: [
      { id: uid(), name: 'SC', count: 24 },
      { id: uid(), name: 'CH', count: 1 },
    ],
  },
  {
    id: uid(),
    title: 'Body row',
    done: false,
    stitches: [{ id: uid(), name: 'HDC', count: 24 }],
  },
];

const initialPatterns: Pattern[] = [
  {
    id: uid(),
    name: 'Beginner dishcloth',
    archived: false,
    createdAt: new Date().toISOString(),
    rows: seedRows(),
  },
];

export function NotebookApp() {
  const [tab, setTab] = useState<Tab>('library');
  const [patterns, setPatterns] = useState<Pattern[]>(initialPatterns);
  const [newPatternName, setNewPatternName] = useState('');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
    initialPatterns[0]?.id ?? null,
  );

  const [newRowTitle, setNewRowTitle] = useState('');
  const [newRowStitch, setNewRowStitch] = useState('SC');
  const [newRowCount, setNewRowCount] = useState(12);
  const [newRowNote, setNewRowNote] = useState('');

  const filteredPatterns = useMemo(
    () => patterns.filter((pattern) => pattern.archived === (tab === 'archived')),
    [patterns, tab],
  );

  const selectedPattern = useMemo(
    () => patterns.find((pattern) => pattern.id === selectedPatternId) ?? null,
    [patterns, selectedPatternId],
  );

  const completedRows = selectedPattern?.rows.filter((row) => row.done).length ?? 0;
  const totalRows = selectedPattern?.rows.length ?? 0;
  const progress = totalRows ? Math.round((completedRows / totalRows) * 100) : 0;

  const savePattern = (event: FormEvent) => {
    event.preventDefault();
    const name = newPatternName.trim();
    if (!name) return;

    const created: Pattern = {
      id: uid(),
      name,
      archived: false,
      createdAt: new Date().toISOString(),
      rows: [],
    };

    setPatterns((previous) => [created, ...previous]);
    setSelectedPatternId(created.id);
    setTab('library');
    setNewPatternName('');
  };

  const addRow = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPattern) return;

    const title = newRowTitle.trim() || `Row ${selectedPattern.rows.length + 1}`;

    const createdRow: PatternRow = {
      id: uid(),
      title,
      note: newRowNote.trim(),
      done: false,
      stitches: [{ id: uid(), name: newRowStitch, count: newRowCount }],
    };

    setPatterns((previous) =>
      previous.map((pattern) =>
        pattern.id === selectedPattern.id
          ? { ...pattern, rows: [...pattern.rows, createdRow] }
          : pattern,
      ),
    );

    setNewRowTitle('');
    setNewRowCount(12);
    setNewRowNote('');
  };

  const toggleRow = (patternId: string, rowId: string) => {
    setPatterns((previous) =>
      previous.map((pattern) =>
        pattern.id !== patternId
          ? pattern
          : {
              ...pattern,
              rows: pattern.rows.map((row) =>
                row.id === rowId ? { ...row, done: !row.done } : row,
              ),
            },
      ),
    );
  };

  const toggleArchived = (patternId: string) => {
    setPatterns((previous) =>
      previous.map((pattern) =>
        pattern.id === patternId
          ? { ...pattern, archived: !pattern.archived }
          : pattern,
      ),
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>kNoted</h1>
        <p>React + Next.js + TypeScript</p>

        <nav>
          <button
            className={tab === 'library' ? 'active' : ''}
            onClick={() => setTab('library')}
          >
            Library
          </button>
          <button
            className={tab === 'archived' ? 'active' : ''}
            onClick={() => setTab('archived')}
          >
            Archived
          </button>
          <button
            className={tab === 'stats' ? 'active' : ''}
            onClick={() => setTab('stats')}
          >
            Stats
          </button>
        </nav>

        <form onSubmit={savePattern} className="card">
          <label htmlFor="patternName">New pattern</label>
          <input
            id="patternName"
            value={newPatternName}
            onChange={(event) => setNewPatternName(event.target.value)}
            placeholder="e.g. Cozy hat"
          />
          <button type="submit">Create</button>
        </form>
      </aside>

      <main className="main-content">
        {tab === 'stats' ? (
          <section className="stats-grid">
            <article className="card">
              <h2>Total patterns</h2>
              <strong>{patterns.length}</strong>
            </article>
            <article className="card">
              <h2>Active patterns</h2>
              <strong>{patterns.filter((pattern) => !pattern.archived).length}</strong>
            </article>
            <article className="card">
              <h2>Total rows done</h2>
              <strong>
                {patterns.reduce(
                  (sum, pattern) => sum + pattern.rows.filter((row) => row.done).length,
                  0,
                )}
              </strong>
            </article>
          </section>
        ) : (
          <>
            <section className="pattern-list card">
              <h2>{tab === 'archived' ? 'Archived patterns' : 'Pattern library'}</h2>
              {filteredPatterns.length === 0 ? (
                <p className="muted">No patterns in this section yet.</p>
              ) : (
                <ul>
                  {filteredPatterns.map((pattern) => {
                    const done = pattern.rows.filter((row) => row.done).length;
                    const pct = pattern.rows.length
                      ? Math.round((done / pattern.rows.length) * 100)
                      : 0;

                    return (
                      <li key={pattern.id}>
                        <button
                          className={`pattern-item ${
                            selectedPatternId === pattern.id ? 'selected' : ''
                          }`}
                          onClick={() => setSelectedPatternId(pattern.id)}
                        >
                          <span>{pattern.name}</span>
                          <small>
                            {done}/{pattern.rows.length} rows · {pct}%
                          </small>
                        </button>
                        <button
                          className="ghost"
                          onClick={() => toggleArchived(pattern.id)}
                        >
                          {pattern.archived ? 'Unarchive' : 'Archive'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="card rows-panel">
              <header>
                <h2>{selectedPattern?.name ?? 'Select a pattern'}</h2>
                <p className="muted">
                  Progress: {completedRows}/{totalRows} ({progress}%)
                </p>
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </header>

              {selectedPattern ? (
                <>
                  <ul className="rows-list">
                    {selectedPattern.rows.map((row) => (
                      <li key={row.id}>
                        <button
                          onClick={() => toggleRow(selectedPattern.id, row.id)}
                          className={row.done ? 'done' : ''}
                        >
                          <span>{row.title}</span>
                          <small>
                            {row.stitches.map((stitch) => `${stitch.count}× ${stitch.name}`).join(' · ')}
                          </small>
                          {row.note ? <em>{row.note}</em> : null}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <form onSubmit={addRow} className="inline-form">
                    <h3>Add row</h3>
                    <input
                      value={newRowTitle}
                      onChange={(event) => setNewRowTitle(event.target.value)}
                      placeholder="Row title"
                    />
                    <div className="inline-fields">
                      <select
                        value={newRowStitch}
                        onChange={(event) => setNewRowStitch(event.target.value)}
                      >
                        <option value="SC">SC</option>
                        <option value="HDC">HDC</option>
                        <option value="DC">DC</option>
                        <option value="CH">CH</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={newRowCount}
                        onChange={(event) => setNewRowCount(Number(event.target.value))}
                      />
                    </div>
                    <input
                      value={newRowNote}
                      onChange={(event) => setNewRowNote(event.target.value)}
                      placeholder="Optional note"
                    />
                    <button type="submit">Add row</button>
                  </form>
                </>
              ) : (
                <p className="muted">Pick a pattern from the library to begin.</p>
              )}
            </section>
          </>
        )}

        <section className="card supabase-note">
          <h2>Supabase hook-up</h2>
          <p>
            This UI is prepared for Supabase auth/storage. Next steps are to wire
            sessions and persist patterns in your Supabase tables.
          </p>
          <pre>{`// Example (client)
import { createSupabaseBrowserClient } from '@/lib/supabase';
const supabase = createSupabaseBrowserClient();`}</pre>
        </section>
      </main>
    </div>
  );
}
