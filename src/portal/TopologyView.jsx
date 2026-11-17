import { useState } from 'react';
import { alarmMap } from './ui';
import { EquipModal } from './Equip3D';
import TopoCanvas from './TopoCanvas';

// A topology the admin published, with live failure status on each piece of equipment.
export default function TopologyView({ topo, tickets }) {
  const [picked, setPicked] = useState(null);
  const marks = alarmMap(tickets);
  const status = (id) => marks[id] || 'normal';
  return (
    <div className="pt-panel">
      <TopoCanvas topo={topo} status={status} onNodeClick={setPicked} />
      <p className="pt-empty">Click any equipment for its 3D view and notes.</p>
      {picked && (
        <EquipModal
          node={{ key: picked.kind, name: picked.name }}
          status={status(picked.id)}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  );
}
