import { FAIL } from './data';
// Rules for the first interactive scenario: a utility outage on one feed.
export const SIM_FAILURE = 'f1';
export const BATTERY_SECONDS = 180;
export const isSimTicket = (ticket) => ticket.failId === SIM_FAILURE;

// What each training role can do in this scenario, worded for that role.
// The engine uses the same action ids for everyone; only the wording and the allowed set change.
export const ROLE_ACTIONS = {
  technician: {
    ack: 'Acknowledge the alarm',
    startGen: 'Start the generator',
    transfer: 'Transfer ATS to emergency',
    shed: 'Shed non-critical load',
    reclose: 'Reclose the MV breaker',
    escalate: 'Escalate to shift lead',
  },
  engineer: {
    ack: 'Acknowledge the alarm',
    diagnose: 'Submit root cause analysis',
    inspect: 'Inspect the equipment on site',
    failover: 'Switch to the redundant equipment',
    restart: 'Reset or restart the equipment',
    isolate: 'Isolate and secure the equipment',
    startGen: 'Direct a technician to start the generator',
    transfer: 'Direct a technician to transfer the ATS',
    reclose: 'Direct a technician to reclose the MV breaker',
    escalate: 'Escalate to shift lead',
  },
  lead: {
    ack: 'Acknowledge the alarm',
    startGen: 'Send a technician to start the generator',
    transfer: 'Approve the emergency transfer',
    shed: 'Approve shedding non-critical load',
    escalate: 'Notify management',
  },
};
export const actionsFor = (role) => ROLE_ACTIONS[role] || ROLE_ACTIONS.technician;

export const SIM_ACTIONS = {
  diagnose: 'Submit root cause analysis',
  ack: 'Acknowledge the alarm',
  startGen: 'Start the generator',
  transfer: 'Transfer ATS to emergency',
  shed: 'Shed non-critical load',
  reclose: 'Reclose the MV breaker',
  escalate: 'Escalate to shift lead',
};

// Works out the state of the equipment from the list of actions the student has taken.
export function runSim(log, raisedAt, now) {
  const sim = {
    generator: 'standby',
    ats: 'normal',
    mvTripped: false,
    acked: false,
    diagnosed: false,
    escalated: false,
    transferAt: null,
    mistakes: [],
  };
  log.forEach(({ id, at, note }) => {
    if (id === 'ack') sim.acked = true;
    if (id === 'diagnose') {
      sim.diagnosed = note === 'utility';
      if (!sim.diagnosed) sim.mistakes.push('Root cause analysis named the wrong cause');
    }
    if (id === 'startGen') sim.generator = 'running';
    if (id === 'escalate') sim.escalated = true;
    if (id === 'transfer') {
      if (sim.generator === 'running' && sim.ats !== 'emergency') {
        sim.ats = 'emergency';
        sim.transferAt = at;
      } else if (sim.generator !== 'running') {
        sim.mistakes.push('Transferred to emergency before the generator was running');
      }
    }
    if (id === 'reclose') {
      sim.mvTripped = true;
      sim.mistakes.push('Reclosed the MV breaker into a dead utility feed');
    }
  });

  const secondsOnBattery = ((sim.transferAt ?? now) - raisedAt) / 1000;
  sim.loadLost = secondsOnBattery > BATTERY_SECONDS;
  sim.secondsLeft = sim.ats === 'emergency' ? null : Math.max(0, BATTERY_SECONDS - secondsOnBattery);

  const loadStatus = sim.loadLost ? 'critical' : 'normal';
  sim.status = {
    util: 'critical',
    mv: sim.mvTripped ? 'critical' : 'normal',
    ats: sim.ats === 'emergency' ? 'normal' : 'warning',
    gen: sim.generator === 'running' ? 'normal' : 'warning',
    msb: loadStatus,
    ups: sim.loadLost ? 'critical' : sim.ats === 'emergency' ? 'normal' : 'warning',
    pdu: loadStatus,
    rack: loadStatus,
  };
  return sim;
}

export function autoScore(log, raisedAt) {
  const sim = runSim(log, raisedAt, Date.now());
  const notes = [];
  let score = 0;
  const add = (points, text) => {
    score += points;
    notes.push(`${points > 0 ? '+' : ''}${points} ${text}`);
  };

  if (sim.acked) add(1, 'Acknowledged the alarm');
  if (sim.diagnosed) add(2, 'Found the root cause: utility feed lost');
  if (sim.generator === 'running') add(2, 'Started the generator');
  if (sim.ats === 'emergency') add(2, 'Moved the load to the generator');
  if (sim.transferAt) {
    const seconds = Math.round((sim.transferAt - raisedAt) / 1000);
    if (seconds <= 60) add(2, `Transferred within a minute (${seconds}s)`);
    else if (seconds <= BATTERY_SECONDS) add(1, `Transferred before the battery ran out (${seconds}s)`);
  }
  if (sim.escalated) add(1, 'Escalated to the shift lead');
  if (sim.ats === 'emergency' && !sim.loadLost) add(2, 'Load never dropped');
  sim.mistakes.forEach((mistake) => add(-2, mistake));

  return { score: Math.max(0, Math.min(10, score)), notes, sim };
}

// ---- Scenarios other than the utility outage ----
// Every other failure uses the same small set of actions. What counts as right depends on the failure.
export const GENERIC_ACTIONS = {
  ack: 'Acknowledge the alarm',
  inspect: 'Inspect the equipment on site',
  failover: 'Switch to the redundant equipment',
  restart: 'Reset or restart the equipment',
  isolate: 'Isolate and secure the equipment',
  escalate: 'Escalate to shift lead',
};

const GENERIC_ROLE_LABELS = {
  technician: GENERIC_ACTIONS,
  engineer: {
    ack: 'Acknowledge the alarm',
    inspect: 'Analyze the alarm data',
    failover: 'Direct a technician to switch to the redundant equipment',
    restart: 'Direct a technician to restart it',
    isolate: 'Direct a technician to isolate it',
    escalate: 'Escalate to shift lead',
  },
  lead: {
    ack: 'Acknowledge the alarm',
    failover: 'Approve switching to the redundant equipment',
    restart: 'Approve a restart',
    isolate: 'Approve isolating the equipment',
    escalate: 'Notify management',
  },
};

export const labelsFor = (ticket, role) =>
  isSimTicket(ticket) ? actionsFor(role) : GENERIC_ROLE_LABELS[role] || GENERIC_ACTIONS;

// A restart is a reasonable step for these. For breakers, overloads and hazards it is a trap.
const RESTART_OK = [
  'gen',
  'engine',
  'gencontrol',
  'atscontrol',
  'server',
  'network',
  'storage',
  'crah',
  'inverter',
  'rectifier',
  'fuel',
  'alternator',
];
const SAFETY_KINDS = ['fire', 'leak', 'security'];

export function playbook(failure) {
  if (SAFETY_KINDS.includes(failure.kind) || failure.cat === 'Safety') {
    return { fix: ['ack', 'isolate', 'escalate'], trap: ['restart'] };
  }
  const fix = ['ack', 'inspect', 'failover'];
  if (failure.sev === 'critical') fix.push('escalate');
  return { fix, trap: RESTART_OK.includes(failure.kind) ? [] : ['restart'] };
}

export function runGeneric(ticket, log, now, labels) {
  const failure = FAIL[ticket.failId];
  const pb = playbook(failure);
  const fix = pb.fix.filter((id) => labels[id]);
  const when = (id) => log.find((entry) => entry.id === id)?.at;
  const fixedAt = fix.length && fix.every(when) ? Math.max(...fix.map(when)) : null;
  const limit = failure.sev === 'critical' ? 180 : 300;
  const seconds = ((fixedAt ?? now) - ticket.at) / 1000;
  const trapped = log.filter((entry) => pb.trap.includes(entry.id));
  let state = 'open';
  if (fixedAt) state = 'resolved';
  else if (trapped.length) state = 'escalated';
  else if (seconds > limit) state = 'impact';
  return {
    failure,
    fix,
    fixedAt,
    limit,
    trapped,
    state,
    secondsLeft: fixedAt ? null : Math.max(0, limit - seconds),
    done: (id) => Boolean(when(id)),
  };
}

export function scoreGeneric(ticket, log, labels) {
  const r = runGeneric(ticket, log, Date.now(), labels);
  const notes = [];
  let score = 0;
  const add = (points, text) => {
    score += points;
    notes.push(`${points > 0 ? '+' : ''}${Math.round(points * 10) / 10} ${text}`);
  };
  const share = r.fix.length ? 8 / r.fix.length : 0;
  r.fix.forEach((id) => r.done(id) && add(share, labels[id]));
  if (r.fixedAt) {
    const seconds = (r.fixedAt - ticket.at) / 1000;
    if (seconds <= r.limit / 2) add(2, `Finished in ${Math.round(seconds)}s`);
    else if (seconds <= r.limit) add(1, `Finished in ${Math.round(seconds)}s`);
  }
  r.trapped.forEach((entry) => add(-2, `Unsafe step: ${labels[entry.id] || entry.id}`));
  return { score: Math.max(0, Math.min(10, Math.round(score))), notes, state: r.state };
}

export const scoreTicket = (ticket, log, labels) =>
  isSimTicket(ticket) ? autoScore(log, ticket.at) : scoreGeneric(ticket, log, labels);
