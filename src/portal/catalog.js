import { EQUIPMENT, FLAT, KIND_CATEGORY, KIND_LABELS } from './data';
import { INFO } from './equipInfo';

let knownTypes = [];
let baseIds = null;

// Keeps the shared equipment lists in step with what the admin built:
// custom equipment types, plus one group per custom topology (status board, scenario setup and failure library all read these).
export function syncCatalog(types = [], topologies = []) {
  knownTypes
    .filter((key) => !types.some((t) => t.key === key))
    .forEach((key) => {
      delete KIND_LABELS[key];
      delete INFO[key];
    });
  types.forEach((t) => {
    KIND_LABELS[t.key] = t.label;
    KIND_CATEGORY[t.key] = t.category;
    INFO[t.key] = { title: t.label, what: t.what, normal: t.normal, fail: t.fail };
  });
  knownTypes = types.map((t) => t.key);

  for (let i = EQUIPMENT.length - 1; i >= 0; i--) if (EQUIPMENT[i].custom) EQUIPMENT.splice(i, 1);
  for (let i = FLAT.length - 1; i >= 0; i--) if (FLAT[i].custom) FLAT.splice(i, 1);
  if (!baseIds) baseIds = new Set(FLAT.filter((f) => !f.custom).map((f) => f.id));
  topologies.forEach((topo) => {
    const fresh = topo.nodes.filter((n) => !baseIds.has(n.id));
    if (!topo.published || !fresh.length) return;
    EQUIPMENT.push({
      id: 'TOPO-' + topo.id,
      name: topo.name,
      kind: 'group',
      custom: true,
      children: fresh.map((n) => ({ id: n.id, name: n.name, kind: n.kind, children: [] })),
    });
    fresh.forEach((n) =>
      FLAT.push({ id: n.id, kind: n.kind, label: `${topo.name} / ${n.name}`, custom: true }),
    );
  });
}
