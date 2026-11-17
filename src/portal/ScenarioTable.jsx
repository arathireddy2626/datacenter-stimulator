import { FAIL } from './data';
import { GroupLinks } from './GroupRoster';
import { Pill } from './ui';

// Every scenario launched to the instructor's groups, with who is handling it and who is in the group.
export default function ScenarioTable({ tickets, s }) {
  const name = (id) => s.users.find((u) => u.id === id)?.name || 'Unknown';
  const rows = [...tickets].sort((a, b) => b.at - a.at);
  return (
    <section className="pt-panel pt-scroll">
      <h3>Scenarios launched to your groups</h3>
      {rows.length === 0 ? (
        <p className="pt-empty">Nothing launched yet.</p>
      ) : (
        <table className="pt-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Equipment</th>
              <th>Failure</th>
              <th>Group</th>
              <th>Instructors handling the group</th>
              <th>Students in the group</th>
              <th>Set up</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const group = s.groups.find((g) => g.id === t.groupId);
              return (
                <tr key={t.id}>
                  <td className="mono">{t.id}</td>
                  <td className="mono">{t.equipId}</td>
                  <td>
                    {FAIL[t.failId]?.title} <Pill s={FAIL[t.failId]?.sev || 'warning'} />
                  </td>
                  <td>
                    <GroupLinks groups={group ? [group] : []} users={s.users} empty="Removed group" />
                  </td>
                  <td>
                    {(group?.instructorIds || [])
                      .map((id) => (id === t.by ? `${name(id)} (created it)` : name(id)))
                      .join(', ')}
                  </td>
                  <td>{(group?.studentIds || []).map(name).join(', ') || 'No students'}</td>
                  <td>{new Date(t.at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
