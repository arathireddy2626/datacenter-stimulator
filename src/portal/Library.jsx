import { useState } from 'react';
import { KIND_LABELS, categoryOf } from './data';
import { Pill } from './ui';

export default function Library({ failures, d }) {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ kind: 'util', title: '', sev: 'warning', expect: '' });
  const q = query.trim().toLowerCase();
  const rows = failures.filter(
    (f) => !q || [f.title, f.expect, KIND_LABELS[f.kind], categoryOf(f)].join(' ').toLowerCase().includes(q),
  );
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const add = (e) => {
    e.preventDefault();
    d({
      t: 'failure',
      f: { id: 'f' + Date.now(), ...form, title: form.title.trim(), expect: form.expect.trim() },
    });
    setForm({ ...form, title: '', expect: '' });
  };

  return (
    <>
      <form className="pt-panel pt-field" onSubmit={add}>
        <h3>Add a failure</h3>
        <div className="pt-row">
          <select value={form.kind} onChange={set('kind')} aria-label="Equipment type">
            {Object.entries(KIND_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={form.title}
            onChange={set('title')}
            placeholder="Failure name"
            aria-label="Failure name"
            required
          />
          <select value={form.sev} onChange={set('sev')} aria-label="Severity">
            <option value="warning">Warning</option>
            <option value="critical">Alarm (critical)</option>
          </select>
          <input
            value={form.expect}
            onChange={set('expect')}
            placeholder="Expected action"
            aria-label="Expected action"
            required
          />
          <button className="pt-btn">Add failure</button>
        </div>
      </form>
      <div className="pt-panel pt-scroll">
        <div className="pt-field inline">
          <h3>
            {rows.length} of {failures.length} failures
          </h3>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search failures"
            aria-label="Search failures"
          />
        </div>
        <table className="pt-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Applies to</th>
              <th>Failure</th>
              <th>Severity</th>
              <th>Expected action</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id}>
                <td>{categoryOf(f)}</td>
                <td>{KIND_LABELS[f.kind] || f.kind}</td>
                <td>{f.title}</td>
                <td>
                  <Pill s={f.sev} />
                </td>
                <td>{f.expect}</td>
                <td>
                  <button
                    className="pt-btn ghost danger"
                    onClick={() => window.confirm(`Delete "${f.title}"?`) && d({ t: 'delFailure', id: f.id })}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
