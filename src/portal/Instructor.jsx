import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { Banner } from './ui';
import { instructorsOf, studentsOf } from './access';
import Activity from './Activity';
import { actionsFor, labelsFor, scoreTicket } from './sim';
import Responses from './Responses';
import ScenarioTable from './ScenarioTable';
import { useStore } from './store';
import { EQUIPMENT, FLAT, FAILURES, FAIL } from './data';
import { EquipTree, Pill, Tabs, when } from './ui';
import SimulatorApp from '../simulator/SimulatorApp';
import Wiring3D from './Wiring3D';
import { isSimTicket, autoScore, SIM_ACTIONS } from './sim';

const getOpts = () => FLAT.filter((e) => FAILURES.some((f) => f.kind === e.kind));
const label = (id) => FLAT.find((e) => e.id === id)?.label || id;

function Scenario({ by, tk, groups, d }) {
  const opts = getOpts();
  const [draft, setDraft] = useState([]);
  const [eq, setEq] = useState(opts[0].id);
  const [fid, setFid] = useState('');
  const [n, setN] = useState(3);
  const [gid, setGid] = useState(groups[0]?.id || '');
  const fl = FAILURES.filter((f) => f.kind === FLAT.find((e) => e.id === eq).kind);
  const fsel = fl.find((f) => f.id === fid) ? fid : fl[0].id;
  const add = () =>
    !draft.some((x) => x.equipId === eq && x.failId === fsel) &&
    setDraft([...draft, { equipId: eq, failId: fsel }]);
  const randomize = () => {
    const pick = [...opts].sort(() => Math.random() - 0.5).slice(0, n);
    setDraft(
      pick.map((e) => {
        const l = FAILURES.filter((f) => f.kind === e.kind);
        return { equipId: e.id, failId: l[Math.floor(Math.random() * l.length)].id };
      }),
    );
  };
  const launch = () => {
    d({ t: 'raise', by, groupId: gid, items: draft });
    setDraft([]);
  };
  return (
    <div className="pt-two">
      <section className="pt-panel">
        <h3>Set up the environment</h3>
        <div className="pt-field">
          <label>
            Equipment
            <select value={eq} onChange={(e) => setEq(e.target.value)}>
              {opts.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Failure
            <select value={fsel} onChange={(e) => setFid(e.target.value)}>
              {fl.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </label>
          <button className="pt-btn" onClick={add}>
            Add to scenario
          </button>
        </div>
        <hr />
        <div className="pt-field inline">
          <label>
            Random failures
            <input
              type="number"
              min="1"
              max="8"
              value={n}
              onChange={(e) => setN(Math.max(1, Math.min(8, +e.target.value || 1)))}
            />
          </label>
          <button className="pt-btn ghost" onClick={randomize}>
            Generate random set
          </button>
        </div>
      </section>
      <section className="pt-panel">
        <h3>Ready to launch ({draft.length})</h3>
        {draft.length === 0 && <p className="pt-empty">Add failures manually or generate a random set.</p>}
        <ul className="pt-list">
          {draft.map((x, i) => (
            <li key={i}>
              <span>
                <b>{label(x.equipId)}</b> {FAIL[x.failId].title}
              </span>
              <Pill s={FAIL[x.failId].sev} />
              <button className="pt-btn ghost" onClick={() => setDraft(draft.filter((_, j) => j !== i))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <label className="pt-field">
          Launch to group
          <select value={gid} onChange={(e) => setGid(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <div className="pt-actions">
          <button className="pt-btn" disabled={!draft.length || !gid} onClick={launch}>
            Launch to students
          </button>
          <button
            className="pt-btn ghost danger"
            disabled={!tk.length}
            onClick={() =>
              window.confirm('Clear all live alarms and student responses?') && d({ t: 'clear', by })
            }
          >
            Clear environment ({tk.length} live)
          </button>
        </div>
      </section>
    </div>
  );
}

function GradeCard({ t, k, r, d, canGrade = true, handler }) {
  const [state] = useStore();
  const log = (state.acts || {})[k] || [];
  const labels = labelsFor(t, state.users.find((u) => u.id === t.by)?.trainingRole);
  const auto = log.length ? scoreTicket(t, log, labels) : null;
  const [score, setScore] = useState(r?.score ?? (auto ? auto.score : ''));
  const [fb, setFb] = useState(r?.fb ?? '');
  const f = FAIL[t.failId];
  return (
    <article className="pt-panel pt-card">
      <header>
        <b>{t.id}</b> {label(t.equipId)} - {f.title} <Pill s={f.sev} />
        <small>Instructor: {handler}</small>
      </header>
      <p className="pt-exp">
        <b>Expected:</b> {f.expect}
      </p>
      {r?.action ? (
        <blockquote>
          <b>{r.action}</b> <small>{when(r.at)}</small>
          <br />
          {r.text}
        </blockquote>
      ) : (
        <p className="pt-empty">No response yet.</p>
      )}
      {auto && (
        <div className="pt-auto">
          <b>Auto score from diagram actions: {auto.score}/10</b>
          <ul>
            {auto.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
          <small>Actions in order: {log.map((a) => labels[a.id] || SIM_ACTIONS[a.id]).join(', ')}</small>
        </div>
      )}
      <div className="pt-grade">
        <label>
          Score (0 to 10)
          <input
            type="number"
            min="0"
            max="10"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            disabled={!canGrade || (!r?.action && !auto)}
          />
        </label>
        <label className="grow">
          Feedback
          <input
            value={fb}
            onChange={(e) => setFb(e.target.value)}
            disabled={!canGrade || (!r?.action && !auto)}
          />
        </label>
        <button
          className="pt-btn"
          disabled={!canGrade || (!r?.action && !auto) || score === ''}
          onClick={() => d({ t: 'grade', key: k, score: Math.max(0, Math.min(10, +score)), fb })}
        >
          {r?.score != null ? 'Update grade' : 'Save grade'}
        </button>
      </div>
    </article>
  );
}

export default function Instructor({ user }) {
  const [s, d] = useStore();
  const [tab, setTab] = useState('equip');

  const myGroups = s.groups.filter((g) => g.instructorIds.includes(user.id));
  const can = (t) => t.by === user.id;
  const tk = s.tickets.filter((t) => myGroups.some((g) => g.id === t.groupId));
  const studs = s.users.filter(
    (u) => u.role === 'student' && u.active && myGroups.some((g) => g.studentIds.includes(u.id)),
  );
  const answered = Object.entries(s.resp).filter(
    ([k, r]) => r.action && tk.some((t) => k.startsWith(t.id + ':')),
  ).length;
  return (
    <main className="pt-main">
      <Banner icon={Gauge} sub="Run scenarios, watch equipment status and grade student responses.">
        Instructor
      </Banner>
      <div className="pt-stats">
        <div>
          <b>{tk.length}</b>
          <span>Live alarms</span>
        </div>
        <div>
          <b>{studs.length}</b>
          <span>Students</span>
        </div>
        <div>
          <b>
            {answered}/{tk.length * studs.length}
          </b>
          <span>Responses in</span>
        </div>
      </div>
      <Tabs
        tabs={[
          ['equip', 'Equipment status'],
          ['setup', 'Scenario setup'],
          ['resp', 'Student responses', answered || null],
          ['activity', 'Student activity'],
          ['wire', '3D wiring'],
          ['topo', 'Topology diagram'],
        ]}
        value={tab}
        onChange={(key) => {
          setTab(key);
          d({ t: 'log', uid: user.id, type: 'view', detail: `Opened the ${key} tab` });
        }}
      />
      {tab === 'equip' && (
        <div className="pt-panel">
          <EquipTree nodes={EQUIPMENT} tickets={tk} />
        </div>
      )}
      {tab === 'setup' && (
        <>
          <Scenario by={user.id} tk={tk.filter((t) => t.by === user.id)} groups={myGroups} d={d} />
          <ScenarioTable tickets={tk} s={s} />
        </>
      )}
      {tab === 'resp' && (
        <Responses me={user.id} can={can} studs={studs} tk={tk} s={s} d={d} Card={GradeCard} />
      )}
      {tab === 'activity' && <Activity users={studs} activity={s.activity || []} />}
      {tab === 'wire' && <Wiring3D user={user} s={s} d={d} mode="instructor" groups={myGroups} />}
      {tab === 'topo' && <SimulatorApp />}
    </main>
  );
}
