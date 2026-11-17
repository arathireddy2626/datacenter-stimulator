import { useState } from 'react';
import { groupsOf } from './access';

const VIEWS = [
  ['all', 'All scenarios'],
  ['mine', 'Created by me'],
];

export default function Responses({ me, can, studs, tk, s, d, Card }) {
  const [sid, setSid] = useState(studs[0]?.id);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('all');
  const name = (id) => s.users.find((u) => u.id === id)?.name || 'Unknown';
  const people = studs.filter((u) => u.name.toLowerCase().includes(query.trim().toLowerCase()));
  const student = studs.find((u) => u.id === sid) || people[0];

  // Scenarios that reached this student through one of their groups.
  const forStudent = (u) => tk.filter((t) => groupsOf(s, u.id).some((g) => g.id === t.groupId));
  const response = (t, u) => s.resp[t.id + ':' + u.id];
  const shown = !student
    ? []
    : forStudent(student).filter((t) => {
        if (view === 'mine') return t.by === me;
        return true;
      });

  if (!studs.length) return <p className="pt-empty">No students are in your groups yet.</p>;
  return (
    <div className="pt-split">
      <div className="pt-panel pt-students">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students"
          aria-label="Search students"
        />
        <ul>
          {people.map((u) => {
            const ts = forStudent(u);
            const answered = ts.filter((t) => response(t, u)?.action).length;
            const graded = ts.filter((t) => response(t, u)?.score != null).length;
            return (
              <li key={u.id}>
                <button className={student?.id === u.id ? 'on' : ''} onClick={() => setSid(u.id)}>
                  <b>{u.name}</b>
                  <span>
                    {answered}/{ts.length} answered, {graded} graded
                  </span>
                </button>
              </li>
            );
          })}
          {people.length === 0 && <li className="pt-empty">No student matches.</li>}
        </ul>
      </div>
      <div className="pt-cards">
        <div className="pt-filter">
          {VIEWS.map(([key, label]) => (
            <button
              key={key}
              className={`pt-btn ghost ${view === key ? 'on' : ''}`}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="pt-empty">No scenarios match this view.</p>
        ) : (
          shown.map((t) => (
            <Card
              key={t.id + student.id}
              t={t}
              k={t.id + ':' + student.id}
              r={response(t, student)}
              d={d}
              canGrade={can(t)}
              handler={name(t.by)}
            />
          ))
        )}
      </div>
    </div>
  );
}
