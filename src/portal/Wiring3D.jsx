import { useState } from 'react';
import { groupsOf } from './access';
import { INFO } from './equipInfo';
import { DEMO, linkKey, solvePower } from './power';
import { EquipModal } from './Equip3D';
import Scene3D from './Scene3D';

// The 3D wiring tab. Students cut and reconnect cables to trace a problem; instructors cut cables for a group.
export default function Wiring3D({ user, s, d, mode, groups = [] }) {
  const published = (s.topologies || []).filter((t) => t.published);
  const all = [DEMO, ...published];
  const [topoId, setTopoId] = useState('demo');
  const [picked, setPicked] = useState(null);
  const topo = all.find((t) => t.id === topoId) || DEMO;
  const myGroups = mode === 'student' ? groupsOf(s, user.id) : groups;
  const [gid, setGid] = useState(myGroups[0]?.id || '');
  const faults = (s.faults || []).filter((f) => f.topoId === topo.id);
  const play = (s.plays || {})[user.id + ':' + topo.id] || { cut: [], fixed: [] };
  const name = (id) => topo.nodes.find((n) => n.id === id)?.name || id;

  const assigned = faults.filter((f) => myGroups.some((g) => g.id === f.groupId)).map((f) => f.link);
  let cuts = faults.map((f) => f.link);
  if (mode === 'student')
    cuts = [...new Set([...assigned.filter((k) => !play.fixed.includes(k)), ...play.cut])];
  if (mode === 'instructor') cuts = faults.filter((f) => f.groupId === gid).map((f) => f.link);
  const power = solvePower(topo, cuts);

  const describe = (key) => {
    const [from, to] = key.split('>');
    return `the cable ${name(from)} to ${name(to)} on ${topo.name}`;
  };
  const log = (type, detail) => d({ t: 'log', uid: user.id, type, detail });

  const onWire = (key) => {
    const isCut = cuts.includes(key);
    if (mode === 'student') {
      const next = isCut
        ? {
            cut: play.cut.filter((k) => k !== key),
            fixed: assigned.includes(key) ? [...new Set([...play.fixed, key])] : play.fixed,
          }
        : { cut: [...play.cut, key], fixed: play.fixed.filter((k) => k !== key) };
      d({ t: 'setPlay', key: user.id + ':' + topo.id, play: next });
      log('action', `${isCut ? 'Reconnected' : 'Cut'} ${describe(key)}`);
    } else if (mode === 'instructor' && gid) {
      const rest = (s.faults || []).filter(
        (f) => !(f.topoId === topo.id && f.groupId === gid && f.link === key),
      );
      const next = isCut
        ? rest
        : [
            ...rest,
            { id: 'c' + Date.now(), topoId: topo.id, groupId: gid, link: key, by: user.id, at: Date.now() },
          ];
      d({ t: 'setFaults', faults: next });
      log(
        'launch',
        `${isCut ? 'Restored' : 'Cut'} ${describe(key)} for ${myGroups.find((g) => g.id === gid)?.name}`,
      );
    }
  };
  const restoreAll = () =>
    d({
      t: 'setFaults',
      faults: (s.faults || []).filter((f) => !(f.topoId === topo.id && f.groupId === gid)),
    });

  const onNode = (n) => {
    if (INFO[n.kind]) setPicked(n);
    log('inspect', `Opened ${n.name} in the 3D view`);
  };

  return (
    <div className="pt-panel">
      <div className="pt-row builder-bar">
        <select value={topoId} onChange={(e) => setTopoId(e.target.value)} aria-label="Choose a topology">
          {all.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {mode === 'instructor' && (
          <select value={gid} onChange={(e) => setGid(e.target.value)} aria-label="Group">
            {myGroups.length === 0 && <option value="">No groups</option>}
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        {mode === 'instructor' && (
          <button className="pt-btn ghost" onClick={restoreAll} disabled={!cuts.length}>
            Restore all cables
          </button>
        )}
      </div>
      <p className={`pt-simbar ${power.lost.length ? 'critical' : 'run'}`}>
        {power.lost.length
          ? `Without power: ${power.lost.map((n) => n.name).join(', ')}`
          : cuts.length
            ? 'Everything is still powered through another path.'
            : 'All equipment is powered.'}
      </p>
      <Scene3D topo={topo} cuts={cuts} onWire={mode === 'readonly' ? undefined : onWire} onNode={onNode} />
      <p className="pt-empty">
        {mode === 'student' && 'Click a cable to cut it or reconnect it. '}
        {mode === 'instructor' && 'Click a cable to cut it for the chosen group, and again to restore it. '}
        Click equipment for details. Drag to rotate and scroll to zoom. Cut cables spark red.
      </p>
      {picked && (
        <EquipModal
          node={{ key: picked.kind, name: picked.name }}
          status={power.powered.has(picked.id) ? 'normal' : 'critical'}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  );
}
