import { useState } from 'react';
import { when } from './ui';

const TYPES = {
  login: 'Signed in',
  logout: 'Signed out',
  view: 'Viewed tab',
  inspect: 'Inspected equipment',
  action: 'Diagram action',
  response: 'Written response',
  launch: 'Scenario',
};

export default function Activity({ users, activity }) {
  const [who, setWho] = useState('all');
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const mine = activity.filter((a) => byId[a.uid]);
  const rows = mine.filter((a) => who === 'all' || a.uid === who).slice(0, 200);

  const summary = (u) => {
    const own = mine.filter((a) => a.uid === u.id);
    return {
      total: own.length,
      actions: own.filter((a) => a.type === 'action').length,
      last: own[0]?.at,
    };
  };

  return (
    <>
      <section className="pt-panel pt-scroll">
        <h3>
          <span className="pt-live">
            <i aria-hidden />
            Live
          </span>{' '}
          Activity summary
        </h3>
        <table className="pt-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Events</th>
              <th>Diagram actions</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const st = summary(u);
              return (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  <td>{st.total}</td>
                  <td>{st.actions}</td>
                  <td>{st.last ? new Date(st.last).toLocaleString() : 'No activity yet'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="pt-panel pt-scroll">
        <div className="pt-field inline">
          <h3>Every recorded movement</h3>
          <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filter by person">
            <option value="all">Everyone</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <p className="pt-empty">Nothing recorded yet. Events appear here as people use the app.</p>
        ) : (
          <table className="pt-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Person</th>
                <th>Event</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{new Date(a.at).toLocaleString()}</td>
                  <td>{byId[a.uid].name}</td>
                  <td>{TYPES[a.type] || a.type}</td>
                  <td>{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
