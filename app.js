import React, { useEffect, useMemo, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const STORAGE_KEY = 'crochet_nb_v2';
const STITCHES = ['Chain st.', 'Magic ring', 'Single crochet', 'Half double cr.', 'Double crochet', 'Treble crochet', 'Increase', 'Decrease', 'Crab stitch', 'Popcorn st.'];

const uid = () => Math.random().toString(36).slice(2, 10);
const demoPatterns = [
  {
    id: uid(),
    name: 'Flower top',
    archived: false,
    rows: [
      { id: uid(), title: 'Foundation chain', stitches: [{ name: 'Chain st.', count: 30 }], done: true },
      { id: uid(), title: 'Row 2', stitches: [{ name: 'Half double cr.', count: 29 }], done: false },
    ],
  },
];

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [page, setPage] = useState('library');
  const [patterns, setPatterns] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || demoPatterns;
    } catch {
      return demoPatterns;
    }
  });
  const [activePatternId, setActivePatternId] = useState(null);

  const activePattern = useMemo(() => patterns.find((p) => p.id === activePatternId), [patterns, activePatternId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  }, [patterns]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function syncFromSupabase() {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from('notebooks').select('patterns').eq('user_id', user.id).maybeSingle();
    if (error) {
      setAuthError(`Could not load cloud data: ${error.message}`);
      return;
    }
    if (data?.patterns) setPatterns(data.patterns);
  }

  async function syncToSupabase(nextPatterns = patterns) {
    if (!supabase || !user) return;
    const { error } = await supabase.from('notebooks').upsert({ user_id: user.id, patterns: nextPatterns }, { onConflict: 'user_id' });
    if (error) setAuthError(`Could not save cloud data: ${error.message}`);
  }

  async function onAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');
    if (!supabase) {
      setAuthError('Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY before using auth.');
      return;
    }
    const fn = authMode === 'login' ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    if (error) setAuthError(error.message);
  }

  function addPattern(name) {
    const next = [...patterns, { id: uid(), name, archived: false, rows: [] }];
    setPatterns(next);
    syncToSupabase(next);
  }

  function addRow(patternId, title, stitchName, count) {
    const next = patterns.map((p) =>
      p.id === patternId
        ? {
            ...p,
            rows: [...p.rows, { id: uid(), title, stitches: [{ name: stitchName, count: Number(count) }], done: false }],
          }
        : p,
    );
    setPatterns(next);
    syncToSupabase(next);
  }

  function toggleRow(patternId, rowId) {
    const next = patterns.map((p) =>
      p.id === patternId
        ? { ...p, rows: p.rows.map((r) => (r.id === rowId ? { ...r, done: !r.done } : r)) }
        : p,
    );
    setPatterns(next);
    syncToSupabase(next);
  }

  const stats = useMemo(() => {
    const active = patterns.filter((p) => !p.archived);
    const finished = active.filter((p) => p.rows.length > 0 && p.rows.every((r) => r.done)).length;
    const rowDone = active.reduce((acc, p) => acc + p.rows.filter((r) => r.done).length, 0);
    return { total: active.length, finished, rowDone };
  }, [patterns]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">Crochet Notebook (React)</div>
        <div className="row">
          <button className="btn" onClick={() => setPage('library')}>Library</button>
          <button className="btn" onClick={() => setPage('stats')}>Stats</button>
        </div>
      </header>

      <main className="content stack">
        <section className="card stack">
          <h3>Supabase Login + Cloud Sync</h3>
          <p className="note">You can work locally without login, then sync when authenticated.</p>
          <form className="row" onSubmit={onAuthSubmit}>
            <input className="in" placeholder="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="in" placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn teal" type="submit">{authMode === 'login' ? 'Login' : 'Sign up'}</button>
            <button className="btn" type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
              {authMode === 'login' ? 'Need account?' : 'Have account?'}
            </button>
          </form>
          <div className="row">
            <span className="badge">{user ? `Logged in as ${user.email}` : 'Not logged in'}</span>
            <button className="btn" onClick={syncFromSupabase} disabled={!user}>Pull cloud data</button>
            <button className="btn" onClick={() => syncToSupabase()} disabled={!user}>Push cloud data</button>
          </div>
          {authError ? <p className="error">{authError}</p> : null}
        </section>

        {page === 'library' ? (
          <LibraryView
            patterns={patterns}
            activePatternId={activePatternId}
            setActivePatternId={setActivePatternId}
            addPattern={addPattern}
            addRow={addRow}
            toggleRow={toggleRow}
          />
        ) : (
          <StatsView stats={stats} patterns={patterns} />
        )}

        {activePattern ? <PatternDetail pattern={activePattern} onToggle={(rowId) => toggleRow(activePattern.id, rowId)} /> : null}
      </main>
    </div>
  );
}

function LibraryView({ patterns, activePatternId, setActivePatternId, addPattern, addRow, toggleRow }) {
  const [name, setName] = useState('');
  return (
    <section className="card stack">
      <h3>My Patterns</h3>
      <div className="row">
        <input className="in" value={name} onChange={(e) => setName(e.target.value)} placeholder="New pattern name" />
        <button
          className="btn teal"
          onClick={() => {
            if (!name.trim()) return;
            addPattern(name.trim());
            setName('');
          }}
        >
          Add pattern
        </button>
      </div>

      <div className="grid">
        {patterns.map((p) => {
          const done = p.rows.filter((r) => r.done).length;
          return (
            <div className="card stack" key={p.id}>
              <div className="pattern-row">
                <strong>{p.name}</strong>
                <button className="btn" onClick={() => setActivePatternId(p.id)}>
                  {activePatternId === p.id ? 'Selected' : 'Open'}
                </button>
              </div>
              <span className="badge">{done} / {p.rows.length} rows done</span>
              {activePatternId === p.id ? <QuickRowForm pattern={p} addRow={addRow} toggleRow={toggleRow} /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuickRowForm({ pattern, addRow }) {
  const [title, setTitle] = useState('');
  const [stitch, setStitch] = useState(STITCHES[0]);
  const [count, setCount] = useState(1);
  return (
    <div className="stack">
      <input className="in" placeholder="Row title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="row">
        <select className="in" value={stitch} onChange={(e) => setStitch(e.target.value)}>
          {STITCHES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="in" type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} />
        <button
          className="btn teal"
          onClick={() => {
            if (!title.trim()) return;
            addRow(pattern.id, title.trim(), stitch, count);
            setTitle('');
            setCount(1);
          }}
        >
          Add row
        </button>
      </div>
    </div>
  );
}

function PatternDetail({ pattern, onToggle }) {
  return (
    <section className="card stack">
      <h3>{pattern.name}</h3>
      {pattern.rows.length === 0 ? <p className="note">No rows yet.</p> : null}
      {pattern.rows.map((row, idx) => (
        <div className="pattern-row" key={row.id}>
          <div className="stack" style={{ gap: '4px' }}>
            <strong>{idx + 1}. {row.title}</strong>
            <div className="pills">
              {row.stitches.map((s, i) => (
                <span key={i} className="pill">{s.count}× {s.name}</span>
              ))}
            </div>
          </div>
          <button className="btn" onClick={() => onToggle(row.id)}>{row.done ? 'Undo' : 'Done'}</button>
        </div>
      ))}
    </section>
  );
}

function StatsView({ stats, patterns }) {
  return (
    <section className="card stack">
      <h3>Statistics</h3>
      <div className="grid">
        <div className="card"><div className="badge">Active patterns</div><strong>{stats.total}</strong></div>
        <div className="card"><div className="badge">Finished patterns</div><strong>{stats.finished}</strong></div>
        <div className="card"><div className="badge">Rows completed</div><strong>{stats.rowDone}</strong></div>
      </div>
      <div className="stack">
        {patterns.map((p) => {
          const done = p.rows.filter((r) => r.done).length;
          const pct = p.rows.length ? Math.round((done / p.rows.length) * 100) : 0;
          return <div key={p.id} className="pattern-row"><span>{p.name}</span><span className="badge">{pct}%</span></div>;
        })}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
