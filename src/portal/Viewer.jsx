import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useStore } from './store';
import { EQUIPMENT, TRAINING_ROLES } from './data';
import { Banner, EquipTree, Tabs } from './ui';
import Activity from './Activity';
import { instructorsOf } from './access';

const fmt = (n) => (n === null ? 'No grades yet' : n.toFixed(1));

// Management Viewer: read-only view of activity and performance.
export default function Viewer() {
  const [s] = useStore();
  const [tab, setTab] = useState('perf');
  const students = s.users.filter((u) => u.role === 'student');

  const scorecard = (u) => {
    const own = Object.entries(s.resp).filter(([key]) => key.endsWith(':' + u.id));
    const graded = own.filter(([, r]) => r.score != null);
    const total = graded.reduce((sum, [, r]) => sum + r.score, 0);
    return {
      answered: own.filter(([, r]) => r.action).length,
      graded: graded.length,
      average: graded.length ? total / graded.length : null,
      actions: (s.activity || []).filter((a) => a.uid === u.id && a.type === 'action').length,
    };
  };

  const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  const cards = Object.fromEntries(students.map((u) => [u.id, scorecard(u)]));
  const allAverages = students.map((u) => cards[u.id].average).filter((v) => v !== null);
  const gradedCount = students.reduce((sum, u) => sum + cards[u.id].graded, 0);

  const stats = [
    ['Students', students.length],
    ['Open alarms', s.tickets.length],
    ['Responses graded', gradedCount],
    ['Average score', allAverages.length ? mean(allAverages).toFixed(1) : '-'],
  ];

  return (
    <main className="pt-main">
      <Banner icon={Eye} sub="Observe activity and review performance reports. This view is read-only.">
        Management view
      </Banner>
      <div className="pt-stats">
        {stats.map(([k, v]) => (
          <div key={k}>
            <b>{v}</b>
            <span>{k}</span>
          </div>
        ))}
      </div>
      <Tabs
        tabs={[
          ['perf', 'Performance'],
          ['activity', 'Activity'],
          ['equip', 'Equipment status'],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'perf' && (
        <>
          <section className="pt-panel pt-scroll">
            <h3>Individual scorecards</h3>
            <table className="pt-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Training role</th>
                  <th>Answered</th>
                  <th>Graded</th>
                  <th>Average (of 10)</th>
                  <th>Diagram actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>
                      {instructorsOf(s, u.id)
                        .map((id) => TRAINING_ROLES[s.users.find((x) => x.id === id)?.trainingRole]?.label)
                        .filter(Boolean)
                        .join(', ') || 'No group'}
                    </td>
                    <td>{cards[u.id].answered}</td>
                    <td>{cards[u.id].graded}</td>
                    <td>{fmt(cards[u.id].average)}</td>
                    <td>{cards[u.id].actions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="pt-panel pt-scroll">
            <h3>Team scorecards</h3>
            <table className="pt-table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Instructors</th>
                  <th>Students</th>
                  <th>Average (of 10)</th>
                </tr>
              </thead>
              <tbody>
                {s.groups.map((g) => {
                  const averages = g.studentIds.map((id) => cards[id]?.average).filter((v) => v != null);
                  return (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td>{g.instructorIds.length}</td>
                      <td>{g.studentIds.length}</td>
                      <td>{fmt(mean(averages))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
      {tab === 'activity' && (
        <Activity
          users={s.users.filter((u) => u.role === 'student' || u.role === 'instructor')}
          activity={s.activity || []}
        />
      )}
      {tab === 'equip' && (
        <div className="pt-panel">
          <EquipTree nodes={EQUIPMENT} tickets={s.tickets} />
        </div>
      )}
    </main>
  );
}
