export const USERS = [
  {
    id: 'u1',
    name: 'Alex Admin',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    active: true,
  },
  {
    id: 'u2',
    name: 'Ivy Inspector',
    username: 'instructor',
    password: 'teach123',
    role: 'instructor',
    active: true,
  },
  {
    id: 'u3',
    name: 'Sam Student',
    username: 'student',
    password: 'learn123',
    role: 'student',
    active: true,
    instructorId: 'u2',
  },
  {
    id: 'u4',
    name: 'Priya Nair',
    username: 'priya',
    password: 'learn123',
    role: 'student',
    active: true,
    instructorId: 'u2',
  },
  {
    id: 'u5',
    name: 'Marcus Lee',
    username: 'marcus',
    password: 'learn123',
    role: 'student',
    active: true,
    instructorId: 'u2',
  },
];

export const TRAINING_ROLES = {
  technician: {
    label: 'Data Center Technician',
    duties: 'Respond to alarms, execute procedures and escalate issues.',
  },
  engineer: {
    label: 'Operations Engineer',
    duties: 'Perform root cause analysis, coordinate responses and review system health.',
  },
  lead: {
    label: 'Shift Lead',
    duties: 'Allocate resources, approve decisions and command the incident.',
  },
};

export const ACCOUNT_ROLES = [
  ['student', 'Student'],
  ['instructor', 'Instructor'],
  ['viewer', 'Management viewer'],
];

USERS.push({
  id: 'u6',
  name: 'Morgan Manager',
  username: 'manager',
  password: 'view123',
  role: 'viewer',
  active: true,
});

USERS.forEach((u) => {
  if (u.role === 'instructor') u.trainingRole = 'technician';
  u.email = `${u.username}@equnix.test`;
  u.status = 'active';
  u.createdAt = Date.UTC(2026, 8, 1);
});

export const GROUPS = [{ id: 'g1', name: 'Cohort 1', instructorIds: ['u2'], studentIds: ['u3', 'u4', 'u5'] }];

const n = (id, name, kind, children = []) => ({ id, name, kind, children });
const ups = (s, i) => {
  const k = `${s}${i}`;
  return n(`UPS-${k}`, `UPS-${k}`, 'ups', [
    n(`RECT-${k}`, 'Rectifier', 'rectifier'),
    n(`INV-${k}`, 'Inverter', 'inverter'),
    n(`BYP-${k}`, 'Static bypass', 'bypass'),
    n(`BATT-${k}`, 'Battery string', 'battery'),
  ]);
};
const gen = (s, i) => {
  const k = `${s}${i}`;
  return n(`GEN-${k}`, `GEN-${k}`, 'gen', [
    n(`ENG-${k}`, 'Engine', 'engine'),
    n(`FUEL-${k}`, 'Fuel system', 'fuel'),
    n(`ALT-${k}`, 'Alternator', 'alternator'),
    n(`CTL-${k}`, 'Controller', 'gencontrol'),
  ]);
};
const feed = (s) =>
  n(`FEED-${s}`, `Feed ${s}`, 'group', [
    n(`UTIL-${s}`, `UTIL-${s}`, 'util'),
    n(`MV-${s}`, `MV-${s}`, 'mv'),
    n(`ATS-${s}`, `ATS-${s}`, 'ats', [
      n(`ATSC-${s}`, 'Transfer controller', 'atscontrol'),
      n(`ATSN-${s}`, 'Normal contactor', 'contactor'),
      n(`ATSE-${s}`, 'Emergency contactor', 'contactor'),
    ]),
    gen(s, 1),
    gen(s, 2),
    n(`MSB-${s}`, `MSB-${s}`, 'msb'),
    ups(s, 1),
    ups(s, 2),
    n(`PDU-${s}1`, `PDU-${s}1`, 'pdu'),
    n(`PDU-${s}2`, `PDU-${s}2`, 'pdu'),
  ]);
export const EQUIPMENT = [
  feed('A'),
  feed('B'),
  n(
    'RACKS',
    'Rack rows',
    'group',
    [1, 2, 3].map((r) => n(`RACK-${r}`, `Rack row ${r}`, 'rack')),
  ),
];

EQUIPMENT.push(
  n('COOLING', 'Cooling', 'group', [
    n('CRAH-1', 'CRAH-1', 'crah'),
    n('CRAH-2', 'CRAH-2', 'crah'),
    n('CHW-LOOP', 'Chilled water loop', 'chiller'),
  ]),
  n('IT', 'IT systems', 'group', [
    n('NET-CORE', 'Core network', 'network'),
    n('STOR-1', 'Storage array', 'storage'),
    n('SRV-CL', 'Server cluster', 'server'),
  ]),
  n('SAFETY', 'Safety and security', 'group', [
    n('FIRE-PNL', 'Fire alarm panel', 'fire'),
    n('LEAK-DET', 'Leak detection', 'leak'),
    n('ACCESS', 'Access control', 'security'),
  ]),
);

export const FLAT = [];
const walk = (list, p = '') =>
  list.forEach((e) => {
    FLAT.push({ id: e.id, kind: e.kind, label: p + e.name });
    walk(e.children, e.kind === 'group' ? '' : p + e.name + ' / ');
  });
walk(EQUIPMENT);

export const FAILURES = [
  {
    id: 'f1',
    kind: 'util',
    title: 'Utility outage',
    sev: 'critical',
    expect:
      'Confirm ATS moved to emergency source, verify generator started and is carrying load, notify facilities.',
  },
  {
    id: 'f2',
    kind: 'mv',
    title: 'Breaker tripped',
    sev: 'critical',
    expect:
      'Do not reclose blindly. Inspect for cause, confirm Feed B is carrying load, escalate to electrical.',
  },
  {
    id: 'f3',
    kind: 'ats',
    title: 'Failed to transfer',
    sev: 'critical',
    expect:
      'Check controller state, attempt manual transfer per procedure, confirm load is on a live source.',
  },
  {
    id: 'f4',
    kind: 'gen',
    title: 'Failed to start',
    sev: 'critical',
    expect: 'Check fuel, starter batteries and controller faults; attempt manual start; escalate to vendor.',
  },
  {
    id: 'f5',
    kind: 'gen',
    title: 'Low fuel (below 20%)',
    sev: 'warning',
    expect: 'Verify tank level, order fuel delivery, estimate remaining runtime.',
  },
  {
    id: 'f6',
    kind: 'ups',
    title: 'Running on battery',
    sev: 'warning',
    expect: 'Identify input loss cause, check remaining runtime, prepare for generator transfer.',
  },
  {
    id: 'f7',
    kind: 'ups',
    title: 'Overload (above 100%)',
    sev: 'critical',
    expect: 'Identify loads, shed non-critical load, verify bypass is not required, escalate.',
  },
  {
    id: 'f8',
    kind: 'battery',
    title: 'High temperature',
    sev: 'warning',
    expect: 'Check cabinet cooling, inspect for swelling or leaks, reduce charge rate, log for maintenance.',
  },
  {
    id: 'f9',
    kind: 'battery',
    title: 'Low runtime',
    sev: 'critical',
    expect: 'Confirm runtime estimate, plan load transfer, escalate battery replacement.',
  },
  {
    id: 'f10',
    kind: 'msb',
    title: 'Bus overcurrent',
    sev: 'critical',
    expect: 'Identify the feeder at fault, isolate it, confirm the other feed is carrying load.',
  },
  {
    id: 'f11',
    kind: 'pdu',
    title: 'Breaker tripped',
    sev: 'warning',
    expect: 'Check the downstream circuit for a fault before resetting; confirm racks keep one live feed.',
  },
  {
    id: 'f12',
    kind: 'rack',
    title: 'Over-temperature',
    sev: 'warning',
    expect: 'Check cooling, inspect airflow and blanking panels, move load if needed.',
  },
  {
    id: 'f13',
    kind: 'rack',
    title: 'Lost redundant feed',
    sev: 'critical',
    expect: 'Confirm the surviving feed is healthy, avoid any work on it, restore the lost feed.',
  },
  {
    id: 'f14',
    kind: 'inverter',
    title: 'Fan failure',
    sev: 'warning',
    expect: 'Check temperature trend, schedule fan replacement, monitor for derating.',
  },
  {
    id: 'f15',
    kind: 'rectifier',
    title: 'Rectifier module fault',
    sev: 'critical',
    expect: 'Check module alarms, confirm remaining modules carry the load, escalate for replacement.',
  },
  {
    id: 'f16',
    kind: 'rectifier',
    title: 'Input phase imbalance',
    sev: 'warning',
    expect:
      'Check incoming voltage on each phase, look for a loose connection upstream, log for the engineer.',
  },
  {
    id: 'f17',
    kind: 'inverter',
    title: 'Inverter fault, load on bypass',
    sev: 'critical',
    expect: 'Confirm the load moved to bypass, check the other UPS is healthy, escalate to the vendor.',
  },
  {
    id: 'f18',
    kind: 'bypass',
    title: 'Static bypass not available',
    sev: 'warning',
    expect: 'Check bypass source voltage and sync, avoid maintenance on the UPS, escalate.',
  },
  {
    id: 'f19',
    kind: 'bypass',
    title: 'Static switch fault',
    sev: 'critical',
    expect: 'Do not transfer to bypass, confirm the inverter is carrying the load, escalate immediately.',
  },
  {
    id: 'f20',
    kind: 'engine',
    title: 'High coolant temperature',
    sev: 'warning',
    expect: 'Check coolant level and radiator airflow, reduce load if allowed, prepare for shutdown.',
  },
  {
    id: 'f21',
    kind: 'engine',
    title: 'Overspeed shutdown',
    sev: 'critical',
    expect:
      'Do not restart, inspect the governor and controller log, confirm the other generator is available.',
  },
  {
    id: 'f22',
    kind: 'fuel',
    title: 'Fuel leak detected',
    sev: 'critical',
    expect: 'Isolate the fuel supply, keep ignition sources away, follow spill procedure and notify safety.',
  },
  {
    id: 'f23',
    kind: 'fuel',
    title: 'Fuel filter clogged',
    sev: 'warning',
    expect: 'Check pressure readings, switch to the backup filter if fitted, schedule replacement.',
  },
  {
    id: 'f24',
    kind: 'alternator',
    title: 'Voltage regulator fault',
    sev: 'critical',
    expect: 'Check output voltage, confirm the load can move to the other generator, escalate.',
  },
  {
    id: 'f25',
    kind: 'alternator',
    title: 'Winding temperature high',
    sev: 'warning',
    expect: 'Check load and cooling airflow, reduce load if needed, log for maintenance.',
  },
  {
    id: 'f26',
    kind: 'gencontrol',
    title: 'Controller communication loss',
    sev: 'warning',
    expect: 'Check network cables and the controller display, confirm the generator still responds locally.',
  },
  {
    id: 'f27',
    kind: 'gencontrol',
    title: 'Controller fault, will not start',
    sev: 'critical',
    expect: 'Try a manual start from the local panel, check for fault codes, escalate to the vendor.',
  },
  {
    id: 'f28',
    kind: 'atscontrol',
    title: 'Controller communication loss',
    sev: 'warning',
    expect: 'Check the controller display, confirm the ATS position locally, escalate if it cannot be read.',
  },
  {
    id: 'f29',
    kind: 'atscontrol',
    title: 'Sync check failed',
    sev: 'critical',
    expect: 'Check source frequency and voltage, do not force a transfer, escalate to the engineer.',
  },
  {
    id: 'f30',
    kind: 'contactor',
    title: 'Contactor stuck',
    sev: 'critical',
    expect: 'Confirm which source is feeding the load, do not operate under load, escalate for repair.',
  },
  {
    id: 'f31',
    kind: 'contactor',
    title: 'Contact overheating',
    sev: 'warning',
    expect: 'Check thermal readings, reduce load if possible, schedule an inspection.',
  },
  {
    id: 'f100',
    kind: 'crah',
    title: 'CRAH fan failure',
    sev: 'warning',
    expect: 'Check airflow and temperature trend, bring the standby CRAH up, schedule a repair.',
  },
  {
    id: 'f101',
    kind: 'crah',
    title: 'CRAH offline',
    sev: 'critical',
    expect: 'Confirm the other CRAH units can carry the heat load, watch rack inlet temperatures, escalate.',
  },
  {
    id: 'f102',
    kind: 'crah',
    title: 'High temperature alarm',
    sev: 'warning',
    expect: 'Find the hot zone, check airflow and blanking panels, move load if needed.',
  },
  {
    id: 'f103',
    kind: 'chiller',
    title: 'Cooling loop interruption',
    sev: 'critical',
    expect:
      'Check pumps and valves, switch to the redundant loop, warn the IT teams about rising temperatures.',
  },
  {
    id: 'f104',
    kind: 'chiller',
    title: 'Chilled water loss',
    sev: 'critical',
    expect: 'Confirm the chiller plant status, start emergency cooling steps, prepare to shed IT load.',
  },
  {
    id: 'f105',
    kind: 'network',
    title: 'Network outage',
    sev: 'critical',
    expect:
      'Find which uplinks are down, check power to the network gear, fail over to the backup path, escalate.',
  },
  {
    id: 'f106',
    kind: 'network',
    title: 'Packet loss on core uplink',
    sev: 'warning',
    expect: 'Check optics and cabling on the uplink, compare with the backup path, log for the network team.',
  },
  {
    id: 'f107',
    kind: 'storage',
    title: 'Storage latency spike',
    sev: 'warning',
    expect: 'Check array load and rebuild activity, identify the busiest hosts, tell the application owners.',
  },
  {
    id: 'f108',
    kind: 'storage',
    title: 'Storage controller failure',
    sev: 'critical',
    expect: 'Confirm the partner controller took over, check cache battery state, open a vendor case.',
  },
  {
    id: 'f109',
    kind: 'server',
    title: 'Server failure',
    sev: 'warning',
    expect: 'Check power and console, move the workload to a spare, open a ticket for hardware repair.',
  },
  {
    id: 'f110',
    kind: 'server',
    title: 'Cluster node down',
    sev: 'critical',
    expect: 'Confirm the cluster is still healthy, check the rack power feed, escalate to the platform team.',
  },
  {
    id: 'f111',
    kind: 'rack',
    title: 'Rack power loss',
    sev: 'critical',
    expect: 'Check both rack feeds and the PDU breakers, restore power safely, tell the customer.',
  },
  {
    id: 'f112',
    kind: 'pdu',
    title: 'PDU overload',
    sev: 'critical',
    expect:
      'Find which circuits are overloaded, move load to the other side, do not reset until the cause is known.',
  },
  {
    id: 'f113',
    kind: 'ups',
    title: 'UPS failure',
    sev: 'critical',
    expect: 'Confirm the load moved to bypass or the second UPS, check alarms, escalate to the vendor.',
  },
  {
    id: 'f114',
    kind: 'battery',
    title: 'Battery degradation',
    sev: 'warning',
    expect: 'Check battery health reports and runtime, schedule a replacement, increase monitoring.',
  },
  {
    id: 'f115',
    kind: 'msb',
    title: 'Arc flash hazard',
    sev: 'critical',
    expect:
      'Keep everyone clear, do not operate equipment, follow the arc flash procedure and call the electrical safety lead.',
    cat: 'Safety',
  },
  {
    id: 'f116',
    kind: 'fire',
    title: 'Fire alarm activation',
    sev: 'critical',
    expect: 'Follow the evacuation procedure, confirm the alarm zone, call emergency services if confirmed.',
  },
  {
    id: 'f117',
    kind: 'leak',
    title: 'Water leak detected',
    sev: 'critical',
    expect: 'Find the source safely, isolate the water supply, protect equipment, notify facilities.',
  },
  {
    id: 'f118',
    kind: 'security',
    title: 'Physical security breach',
    sev: 'critical',
    expect: 'Alert security, do not confront anyone, lock down the area and record what you saw.',
  },
];
export const FAIL = Object.fromEntries(FAILURES.map((f) => [f.id, f]));
export const ACTIONS = [
  'Acknowledge and monitor',
  'Verify on site',
  'Transfer or shed load',
  'Start or reset equipment',
  'Escalate to vendor or engineer',
  'Other',
];

export const DEFAULT_FAILURES = FAILURES.slice();

export const KIND_LABELS = {
  util: 'Utility feed',
  mv: 'MV breaker',
  ats: 'Transfer switch',
  gen: 'Generator',
  msb: 'Main switchboard',
  ups: 'UPS',
  battery: 'Battery string',
  pdu: 'PDU',
  rack: 'Rack row',
  rectifier: 'Rectifier',
  inverter: 'Inverter',
  bypass: 'Static bypass',
  engine: 'Engine',
  fuel: 'Fuel system',
  alternator: 'Alternator',
  gencontrol: 'Generator controller',
  atscontrol: 'ATS controller',
  contactor: 'Contactor',
  crah: 'CRAH unit',
  chiller: 'Chilled water loop',
  network: 'Core network',
  storage: 'Storage array',
  server: 'Server cluster',
  fire: 'Fire alarm panel',
  leak: 'Leak detection',
  security: 'Access control',
};

export const KIND_CATEGORY = {
  crah: 'Cooling',
  chiller: 'Cooling',
  network: 'IT operations',
  storage: 'IT operations',
  server: 'IT operations',
  fire: 'Safety',
  leak: 'Safety',
  security: 'Safety',
};
export const categoryOf = (f) => f.cat || KIND_CATEGORY[f.kind] || 'Critical infrastructure';
