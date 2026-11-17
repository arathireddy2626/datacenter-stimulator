import { FAIL } from './data';
import { isSimTicket, runGeneric, runSim } from './sim';

const rank = { normal: 0, run: 0, warning: 1, critical: 2 };
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const TITLES = {
  'CHW-LOOP': 'CHW LOOP',
  'NET-CORE': 'CORE NETWORK',
  'STOR-1': 'STORAGE',
  'SRV-CL': 'SERVER CLUSTER',
  'FIRE-PNL': 'FIRE PANEL',
  'LEAK-DET': 'LEAK DETECT',
  ACCESS: 'ACCESS CONTROL',
  'CRAH-1': 'CRAH-1',
  'CRAH-2': 'CRAH-2',
};

// Maps one of our equipment ids to the box title used on the topology diagram.
export function topoTitle(id) {
  let m;
  if (TITLES[id]) return TITLES[id];
  if (/^(UTIL|MV|ATS|MSB|PDU|UPS|GEN)-/.test(id)) return id;
  if ((m = id.match(/^(?:RECT|INV|BYP|BATT)-(\w\d)$/))) return `UPS-${m[1]}`;
  if ((m = id.match(/^(?:ENG|FUEL|ALT|CTL)-(\w\d)$/))) return `GEN-${m[1]}`;
  if ((m = id.match(/^ATS[CNE]-(\w)$/))) return `ATS-${m[1]}`;
  if ((m = id.match(/^RACK-(\d)$/))) return `RACK ROW ${m[1]}`;
  return null;
}

// The most complete set of actions any student has taken on a ticket (used for the instructor's view).
export const bestLog = (acts, ticketId) =>
  Object.entries(acts || {})
    .filter(([key]) => key.startsWith(ticketId + ':'))
    .map(([, value]) => value)
    .sort((a, b) => b.length - a.length)[0] || [];

// Which boxes to glow, and the status lines shown above the diagram.
export function overlay(tickets, logFor, now, labelsOf) {
  const marks = {};
  const lines = [];
  const mark = (title, level) => {
    if (!title || level === 'normal') return;
    if (!marks[title] || rank[level] > rank[marks[title]]) marks[title] = level;
  };

  tickets.forEach((t) => {
    const failure = FAIL[t.failId];
    if (!failure) return;
    if (!isSimTicket(t)) {
      const g = runGeneric(t, logFor(t), now, labelsOf(t));
      if (g.state === 'resolved') {
        lines.push({ level: 'run', text: `${t.equipId}: ${failure.title} resolved` });
        return;
      }
      const level = g.state === 'open' && failure.sev === 'warning' ? 'warning' : 'critical';
      mark(topoTitle(t.equipId), level);
      const suffix =
        g.state === 'impact'
          ? ', service impact'
          : g.state === 'escalated'
            ? ', made worse by an unsafe action'
            : '';
      lines.push({ level, text: `${t.equipId}: ${failure.title}${suffix}` });
      return;
    }
    const side = t.equipId.slice(-1);
    const sim = runSim(logFor(t), t.at, now);
    const titles = {
      util: `UTIL-${side}`,
      mv: `MV-${side}`,
      ats: `ATS-${side}`,
      gen: `GEN-${side}1`,
      msb: `MSB-${side}`,
      ups: `UPS-${side}1`,
      pdu: `PDU-${side}1`,
    };
    Object.entries(titles).forEach(([key, title]) => mark(title, sim.status[key]));
    [1, 2, 3].forEach((n) => mark(`RACK ROW ${n}`, sim.status.rack));
    if (sim.generator === 'running') mark(`GEN-${side}1`, 'run');
    if (sim.loadLost)
      lines.push({ level: 'critical', text: `Feed ${side}: load lost, the UPS batteries ran out` });
    else if (sim.ats === 'emergency')
      lines.push({ level: 'run', text: `GEN-${side}1 is carrying Feed ${side} through ATS-${side}` });
    else
      lines.push({
        level: 'warning',
        text: `Feed ${side}: utility lost, UPS-${side}1 on battery, ${clock(sim.secondsLeft)} left`,
      });
  });
  return { marks, lines };
}

const healthy = () => ({
  mainPower: { state: 'ON', health: 'HEALTHY' },
  battery: { state: 'STANDBY', charge: 100 },
  generator: { state: 'OFF', fuel: 100, startupProgress: 0 },
  transferSwitch: 'MAIN',
  server: { powered: true, source: 'MAIN' },
});
const sideOf = (id) => (id.match(/-([AB])\d?$/) || [])[1] || null;
const COOLING_IT = ['crah', 'chiller', 'network', 'storage', 'server'];

// Builds the state the original diagram draws, one system per feed, from the live scenario.
// This is what makes the wires and the "who is carrying the load" display follow the student's actions.
export function driveFor(tickets, logFor, labelsOf, now) {
  const rows = { A: { system: healthy(), over: {} }, B: { system: healthy(), over: {} } };
  const extra = {};

  tickets.forEach((t) => {
    const failure = FAIL[t.failId];
    if (!failure) return;

    if (isSimTicket(t)) {
      const row = rows[t.equipId.slice(-1)];
      if (!row) return;
      const sim = runSim(logFor(t), t.at, now);
      const sys = row.system;
      sys.mainPower = { state: 'OFF', health: 'FAILURE' };
      if (sim.loadLost) {
        sys.transferSwitch = 'NONE';
        sys.server = { powered: false, source: 'NONE' };
        sys.battery = { state: 'FAILED', charge: 0 };
      } else if (sim.ats === 'emergency') {
        sys.transferSwitch = 'GENERATOR';
        sys.server = { powered: true, source: 'GENERATOR' };
        sys.battery = { state: 'CHARGING', charge: 60 };
        sys.generator = { state: 'RUNNING', fuel: 90, startupProgress: 100 };
      } else {
        sys.transferSwitch = 'BATTERY';
        sys.server = { powered: true, source: 'BATTERY' };
        sys.battery = {
          state: sim.secondsLeft < 60 ? 'LOW' : 'SUPPLYING',
          charge: Math.round(sim.secondsLeft / 1.8),
        };
        if (sim.generator === 'running') sys.generator = { state: 'READY', fuel: 90, startupProgress: 100 };
      }
      if (sim.mvTripped) row.over.switchgearStatus = 'red';
      return;
    }

    const g = runGeneric(t, logFor(t), now, labelsOf(t));
    if (g.state === 'resolved') return;
    const color = g.state === 'open' && failure.sev === 'warning' ? 'orange' : 'red';
    const title = topoTitle(t.equipId);
    if (title) extra[title] = color;
    if (g.state === 'impact' && COOLING_IT.includes(failure.kind)) {
      ['RACK ROW 1', 'RACK ROW 2', 'RACK ROW 3'].forEach((rack) => {
        extra[rack] = 'orange';
      });
    }
    const row = rows[sideOf(t.equipId)];
    if (!row || !title) return;
    const prefix = title.split('-')[0];
    if (prefix === 'UTIL') row.over.utilStatus = color;
    if (prefix === 'MV' || prefix === 'MSB') row.over.switchgearStatus = color;
    if (prefix === 'GEN') {
      row.over.genStatus = color;
      row.over.genLabel = 'FAILED';
    }
    if (prefix === 'UPS') row.over.upsStatus = color;
    if (prefix === 'PDU') row.over.pduStatus = color;
    if (g.state === 'impact') row.over.pduStatus = 'red';
  });
  return { ...rows, extra };
}
