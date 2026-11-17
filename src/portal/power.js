// A small power model: electricity flows from the sources (utility and generators) along any cable that is not cut.
export const linkKey = (l) => `${l.from}>${l.to}`;
const SOURCES = ['util', 'gen'];

export function solvePower(topo, cuts = []) {
  const cut = new Set(cuts);
  const open = topo.links.filter((l) => !cut.has(linkKey(l)));
  const powered = new Set(topo.nodes.filter((n) => SOURCES.includes(n.kind)).map((n) => n.id));
  let grew = true;
  while (grew) {
    grew = false;
    open.forEach((l) => {
      const a = powered.has(l.from);
      const b = powered.has(l.to);
      if (a !== b) {
        powered.add(a ? l.to : l.from);
        grew = true;
      }
    });
  }
  const live = new Set(open.filter((l) => powered.has(l.from) && powered.has(l.to)).map(linkKey));
  const lost = topo.nodes.filter((n) => !powered.has(n.id));
  return { powered, live, lost };
}

// A built-in example so the 3D view always has something to show. Rack row 1 is fed by two paths.
const node = (id, name, kind, x, y) => ({ id, name, kind, x, y });
export const DEMO = {
  id: 'demo',
  name: 'Demo power path (redundant)',
  published: true,
  nodes: [
    node('UTIL-A', 'UTIL-A', 'util', 20, 60),
    node('GEN-A1', 'GEN-A1', 'gen', 20, 300),
    node('ATS-A', 'ATS-A', 'ats', 200, 175),
    node('MSB-A', 'MSB-A', 'msb', 380, 175),
    node('UPS-A1', 'UPS-A1', 'ups', 550, 20),
    node('UPS-A2', 'UPS-A2', 'ups', 550, 330),
    node('PDU-A1', 'PDU-A1', 'pdu', 720, 20),
    node('PDU-A2', 'PDU-A2', 'pdu', 720, 330),
    node('RACK-1', 'RACK ROW 1', 'rack', 720, 175),
  ],
  links: [
    { from: 'UTIL-A', to: 'ATS-A' },
    { from: 'GEN-A1', to: 'ATS-A' },
    { from: 'ATS-A', to: 'MSB-A' },
    { from: 'MSB-A', to: 'UPS-A1' },
    { from: 'MSB-A', to: 'UPS-A2' },
    { from: 'UPS-A1', to: 'PDU-A1' },
    { from: 'UPS-A2', to: 'PDU-A2' },
    { from: 'PDU-A1', to: 'RACK-1' },
    { from: 'PDU-A2', to: 'RACK-1' },
  ],
};

// The original power distribution, as an editable topology: two feeds, each with utility, MV breaker, ATS,
// two generators, switchboard, two UPS and two PDUs, plus three dual-fed rack rows.
function buildDefaultTopology() {
  const nodes = [];
  const links = [];
  const add = (id, kind, x, y) => nodes.push({ id, name: id, kind, x, y });
  const link = (from, to) => links.push({ from, to });
  [
    ['A', 8],
    ['B', 238],
  ].forEach(([s, y]) => {
    add(`UTIL-${s}`, 'util', 4, y);
    add(`MV-${s}`, 'mv', 128, y);
    add(`ATS-${s}`, 'ats', 252, y);
    add(`MSB-${s}`, 'msb', 376, y);
    add(`UPS-${s}1`, 'ups', 500, y);
    add(`PDU-${s}1`, 'pdu', 624, y);
    add(`GEN-${s}1`, 'gen', 252, y + 100);
    add(`GEN-${s}2`, 'gen', 376, y + 100);
    add(`UPS-${s}2`, 'ups', 500, y + 100);
    add(`PDU-${s}2`, 'pdu', 624, y + 100);
    link(`UTIL-${s}`, `MV-${s}`);
    link(`MV-${s}`, `ATS-${s}`);
    link(`GEN-${s}1`, `ATS-${s}`);
    link(`GEN-${s}2`, `ATS-${s}`);
    link(`ATS-${s}`, `MSB-${s}`);
    link(`MSB-${s}`, `UPS-${s}1`);
    link(`MSB-${s}`, `UPS-${s}2`);
    link(`UPS-${s}1`, `PDU-${s}1`);
    link(`UPS-${s}2`, `PDU-${s}2`);
  });
  [1, 2, 3].forEach((n) => add(`RACK-${n}`, 'rack', 770, 8 + (n - 1) * 165));
  [
    ['PDU-A1', 'RACK-1'],
    ['PDU-B1', 'RACK-1'],
    ['PDU-A2', 'RACK-2'],
    ['PDU-B2', 'RACK-2'],
    ['PDU-A1', 'RACK-3'],
    ['PDU-B2', 'RACK-3'],
  ].forEach(([a, b]) => link(a, b));
  return { id: 'default-power', name: 'Power distribution (original design)', published: true, nodes, links };
}
export const DEFAULT_TOPOLOGY = buildDefaultTopology();
