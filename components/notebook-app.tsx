'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import type { Pattern, PatternRow, Stitch } from '@/types/pattern';

type Tab = 'library' | 'archived' | 'stats';

type DbPattern = {
  id: string;
  user_id: string;
  name: string;
  archived: boolean;
  activity: string[];
  created_at: string;
};

type DbRow = {
  id: string;
  pattern_id: string;
  position: number;
  title: string;
  stitches: Stitch[];
  note: string | null;
  done: boolean;
};

const supabase = createSupabaseBrowserClient();

const mapPatterns = (patterns: DbPattern[], rows: DbRow[]): Pattern[] => {
  const rowsByPattern = new Map<string, PatternRow[]>();

  rows.forEach((row) => {
    const nextRow: PatternRow = {
      id: row.id,
      position: row.position,
      title: row.title,
      note: row.note ?? undefined,
      done: row.done,
      stitches: Array.isArray(row.stitches) ? row.stitches : [],
    };

    const existing = rowsByPattern.get(row.pattern_id) ?? [];
    existing.push(nextRow);
    rowsByPattern.set(row.pattern_id, existing);
  });

  return patterns.map((pattern) => ({
    id: pattern.id,
    name: pattern.name,
    archived: pattern.archived,
    activity: pattern.activity ?? [],
    createdAt: pattern.created_at,
    rows: (rowsByPattern.get(pattern.id) ?? []).sort((a, b) => a.position - b.position),
  }));
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export function NotebookApp() {
  const [tab, setTab] = useState<Tab>('library');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [newPatternName, setNewPatternName] = useState('');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);

  const [newRowTitle, setNewRowTitle] = useState('');
  const [newRowStitch, setNewRowStitch] = useState('SC');
  const [newRowCount, setNewRowCount] = useState(12);
  const [newRowNote, setNewRowNote] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setError('Sign in to view your patterns.');
        setIsLoading(false);
        return;
      }

      const { data: patternData, error: patternError } = await supabase
        .from('patterns')
        .select('*')
        .order('created_at', { ascending: false });

      if (patternError) {
        setError(patternError.message);
        setIsLoading(false);
        return;
      }

      const patternIds = (patternData ?? []).map((pattern) => pattern.id);

      const { data: rowData, error: rowError } = patternIds.length
        ? await supabase
            .from('rows')
            .select('*')
            .in('pattern_id', patternIds)
            .order('position', { ascending: true })
        : { data: [], error: null };

      if (rowError) {
        setError(rowError.message);
        setIsLoading(false);
        return;
      }

      const mapped = mapPatterns((patternData ?? []) as DbPattern[], (rowData ?? []) as DbRow[]);
      setPatterns(mapped);
      setSelectedPatternId((current) => current ?? mapped[0]?.id ?? null);
      setIsLoading(false);
    };

    load();
  }, []);

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

  const savePattern = async (event: FormEvent) => {
    event.preventDefault();
    const name = newPatternName.trim();
    if (!name) return;

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      setError('Sign in to create a pattern.');
      return;
    }

    const { data, error: insertError } = await supabase
      .from('patterns')
      .insert({
        user_id: userId,
        name,
      })
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const created: Pattern = {
      id: data.id,
      name: data.name,
      archived: data.archived,
      activity: data.activity ?? [],
      createdAt: data.created_at,
      rows: [],
    };

    setPatterns((previous) => [created, ...previous]);
    setSelectedPatternId(created.id);
    setTab('library');
    setNewPatternName('');
  };

  const addRow = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPattern) return;

    const title = newRowTitle.trim() || `Row ${selectedPattern.rows.length + 1}`;

    const { data, error: insertError } = await supabase
      .from('rows')
      .insert({
        pattern_id: selectedPattern.id,
        position: selectedPattern.rows.length,
        title,
        note: newRowNote.trim() || null,
        stitches: [{ id: crypto.randomUUID(), name: newRowStitch, count: newRowCount }],
      })
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const createdRow: PatternRow = {
      id: data.id,
      position: data.position,
      title: data.title,
      note: data.note ?? undefined,
      done: data.done,
      stitches: Array.isArray(data.stitches) ? data.stitches : [],
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

  const toggleRow = async (patternId: string, rowId: string, nextDone: boolean) => {
    const { error: rowError } = await supabase
      .from('rows')
      .update({ done: nextDone })
      .eq('id', rowId)
      .eq('pattern_id', patternId);

    if (rowError) {
      setError(rowError.message);
      return;
    }

    if (nextDone) {
      const today = todayIsoDate();
      const pattern = patterns.find((entry) => entry.id === patternId);
      const nextActivity = pattern?.activity.includes(today)
        ? pattern.activity
        : [...(pattern?.activity ?? []), today];

      const { error: patternError } = await supabase
        .from('patterns')
        .update({ activity: nextActivity })
        .eq('id', patternId);

      if (patternError) {
        setError(patternError.message);
        return;
      }
    }

    setPatterns((previous) =>
      previous.map((pattern) => {
        if (pattern.id !== patternId) return pattern;

        const nextActivity = nextDone
          ? pattern.activity.includes(todayIsoDate())
            ? pattern.activity
            : [...pattern.activity, todayIsoDate()]
          : pattern.activity;

        return {
          ...pattern,
          activity: nextActivity,
          rows: pattern.rows.map((row) =>
            row.id === rowId ? { ...row, done: nextDone } : row,
          ),
        };
      }),
    );
  };

  const toggleArchived = async (patternId: string, archived: boolean) => {
    const { error: updateError } = await supabase
      .from('patterns')
      .update({ archived })
      .eq('id', patternId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPatterns((previous) =>
      previous.map((pattern) =>
        pattern.id === patternId ? { ...pattern, archived } : pattern,
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
        {isLoading ? <p className="muted">Loading patterns...</p> : null}
        {error ? <p className="muted">{error}</p> : null}

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
                          onClick={() => toggleArchived(pattern.id, !pattern.archived)}
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
                          onClick={() => toggleRow(selectedPattern.id, row.id, !row.done)}
                          className={row.done ? 'done' : ''}
                        >
                          <span>{row.title}</span>
                          <small>
                            {row.stitches
                              .map((stitch) => `${stitch.count}× ${stitch.name}`)
                              .join(' · ')}
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
      </main>
    </div>
  );
}
