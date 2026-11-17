import { useState } from 'react';
import { TRAINING_ROLES } from './data';

// Who is in a group: instructors and students with their contact details.
export function GroupMembers({ group, users }) {
  const find = (ids) => ids.map((id) => users.find((u) => u.id === id)).filter(Boolean);
  const instructors = find(group.instructorIds);
  const students = find(group.studentIds);
  const row = (u, extra) => (
    <tr key={u.id}>
      <td>{u.name}</td>
      <td className="mono">{u.username}</td>
      <td>{extra}</td>
      <td>{u.email}</td>
      <td>{u.phone || 'Not provided'}</td>
      <td>{u.active ? (u.mustChange ? 'Awaiting first login' : 'Active') : 'Disabled'}</td>
    </tr>
  );
  const head = (extra) => (
    <thead>
      <tr>
        <th>Name</th>
        <th>Username</th>
        <th>{extra}</th>
        <th>Email</th>
        <th>Phone</th>
        <th>Status</th>
      </tr>
    </thead>
  );
  return (
    <div className="pt-roster">
      <h4>Instructors ({instructors.length})</h4>
      <div className="pt-scroll">
        <table className="pt-table">
          {head('Training role')}
          <tbody>
            {instructors.length === 0 && (
              <tr>
                <td colSpan="6" className="pt-empty">
                  No instructors.
                </td>
              </tr>
            )}
            {instructors.map((u) => row(u, TRAINING_ROLES[u.trainingRole]?.label || 'Not set'))}
          </tbody>
        </table>
      </div>
      <h4>Students ({students.length})</h4>
      <div className="pt-scroll">
        <table className="pt-table">
          {head('Role')}
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan="6" className="pt-empty">
                  No students yet.
                </td>
              </tr>
            )}
            {students.map((u) => row(u, 'Student'))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Group names that open the member list when clicked.
export function GroupLinks({ groups, users, empty = 'No group' }) {
  const [open, setOpen] = useState(null);
  const group = groups.find((g) => g.id === open);
  if (!groups.length) return <>{empty}</>;
  return (
    <>
      {groups.map((g, i) => (
        <span key={g.id}>
          {i > 0 && ', '}
          <button className="pt-link" onClick={() => setOpen(g.id)} title="Show who is in this group">
            {g.name}
          </button>
        </span>
      ))}
      {group && (
        <div className="pt-modal" onClick={() => setOpen(null)}>
          <div
            className="pt-sheet one groupsheet"
            role="dialog"
            aria-label={`${group.name} members`}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3>{group.name}</h3>
              <GroupMembers group={group} users={users} />
              <div className="pt-actions">
                <button className="pt-btn ghost" onClick={() => setOpen(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
