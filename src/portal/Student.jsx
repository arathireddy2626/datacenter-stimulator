import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Banner } from './ui';
import { TRAINING_ROLES } from './data';
import { groupsOf, instructorsOf, studentsOf } from './access';
import { useStore } from './store';
import { EQUIPMENT, FLAT, FAIL, ACTIONS } from './data';
import { EquipTree, Pill, Tabs, when } from './ui';
import SimulatorApp from '../simulator/SimulatorApp';
import Wiring3D from './Wiring3D';
import SimDiagram from './SimDiagram';
import { isSimTicket } from './sim';

function Alarm({ t, sid, r, d }) {
  const f = FAIL[t.failId];
  const [action, setAction] = useState(r?.action || ACTIONS[0]);
  const [text, setText] = useState(r?.text || '');
  const graded = r?.score != null;
  return (
    <article className={`pt-panel pt-card ${f.sev}`}>
      <header>
        <b>{t.id}</b> <span className="mono">{FLAT.find((e) => e.id === t.equipId)?.label}</span> - {f.title}{' '}
        <Pill s={f.sev} />
        <small>{when(t.at)}</small>
      </header>
      {graded && (
        <p className="pt-score">
          Graded {r.score}/10{r.fb ? `: ${r.fb}` : ''}
        </p>
      )}
      <div className="pt-field">
        <label>
          Action taken
          <select value={action} onChange={(e) => setAction(e.target.value)} disabled={graded}>
            {ACTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          What did you do, and why?
          <textarea rows="3" value={text} onChange={(e) => setText(e.target.value)} disabled={graded} />
        </label>
        {!graded && (
          <button
            className="pt-btn"
            disabled={text.trim().length < 10}
            onClick={() => d({ t: 'respond', tid: t.id, sid, action, text: text.trim() })}
          >
            {r?.action ? 'Update response' : 'Submit response'}
          </button>
        )}
        {r?.action && !graded && <small className="ok">Submitted at {when(r.at)}</small>}
      </div>
    </article>
  );
}

export default function Student({ user }) {
  const [s, d] = useStore();
  const [tab, setTab] = useState('alarms');
  const tk = s.tickets.filter((t) => groupsOf(s, user.id).some((g) => g.id === t.groupId));
  const myRoles = [
    ...new Set(
      instructorsOf(s, user.id)
        .map((id) => s.users.find((u) => u.id === id)?.trainingRole)
        .filter(Boolean),
    ),
  ];
  const done = tk.filter((t) => s.resp[t.id + ':' + user.id]?.action).length;
  return (
    <main className="pt-main">
      <Banner
        icon={GraduationCap}
        sub={
          myRoles.length
            ? myRoles.map((r) => `${TRAINING_ROLES[r].label}: ${TRAINING_ROLES[r].duties}`).join(' ')
            : 'Review alarms and report your actions.'
        }
      >
        Welcome, {user.name.split(' ')[0]}
      </Banner>
      <div className="pt-stats">
        <div>
          <b>{tk.length}</b>
          <span>Alarms raised</span>
        </div>
        <div>
          <b>
            {done}/{tk.length}
          </b>
          <span>Responses submitted</span>
        </div>
      </div>
      <Tabs
        tabs={[
          ['alarms', 'Alarms', tk.length - done || null],
          ['equip', 'Equipment status'],
          ['sim', 'Diagram response', tk.length || null],
          ['wire', '3D wiring'],
          ['topo', 'Topology diagram'],
        ]}
        value={tab}
        onChange={(key) => {
          setTab(key);
          d({ t: 'log', uid: user.id, type: 'view', detail: `Opened the ${key} tab` });
        }}
      />
      {tab === 'alarms' && (
        <div className="pt-cards">
          {tk.length === 0 ? (
            <p className="pt-empty">
              No alarms right now. Check equipment status while you wait for your instructor.
            </p>
          ) : (
            tk.map((t) => <Alarm key={t.id} t={t} sid={user.id} r={s.resp[t.id + ':' + user.id]} d={d} />)
          )}
        </div>
      )}
      {tab === 'equip' && (
        <div className="pt-panel">
          <EquipTree nodes={EQUIPMENT} tickets={tk} />
        </div>
      )}
      {tab === 'sim' && (
        <div className="pt-cards">
          {tk.length === 0 ? (
            <p className="pt-empty">
              No alarm to work on yet. When your instructor launches a scenario, the diagram appears here.
            </p>
          ) : (
            tk.map((t) => (
              <section className="pt-panel" key={t.id}>
                <h3>
                  {t.id}: utility outage on {t.equipId}
                </h3>
                <SimDiagram
                  role={s.users.find((u) => u.id === t.by)?.trainingRole}
                  ticket={t}
                  log={(s.acts || {})[t.id + ':' + user.id] || []}
                  locked={s.resp[t.id + ':' + user.id]?.score != null}
                  onTrack={(detail) => d({ t: 'log', uid: user.id, type: 'inspect', detail })}
                  onAct={(id, note) => d({ t: 'act', tid: t.id, sid: user.id, id, note })}
                />
              </section>
            ))
          )}
        </div>
      )}
      {tab === 'wire' && <Wiring3D user={user} s={s} d={d} mode="student" />}
      {tab === 'topo' && <SimulatorApp />}
    </main>
  );
}
