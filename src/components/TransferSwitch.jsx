import { ArrowRightLeft } from 'lucide-react';

export default function TransferSwitch({ transferSwitch, sourceLabel }) {
  const positions = ['MAIN', 'BATTERY', 'GENERATOR'];

  return (
    <div className="switch-card glass-panel">
      <div className="switch-header">
        <span className="device-label">TRANSFER SWITCH</span>
        <ArrowRightLeft size={18} />
      </div>

      <div className="switch-visual">
        <div className={`switch-node ${transferSwitch === 'MAIN' ? 'active' : ''}`}>MAIN</div>
        <div className={`switch-node ${transferSwitch === 'BATTERY' ? 'active' : ''}`}>BATTERY</div>
        <div className={`switch-node ${transferSwitch === 'GENERATOR' ? 'active' : ''}`}>GENERATOR</div>
      </div>

      <div className="switch-current">CURRENT SOURCE: {sourceLabel}</div>
    </div>
  );
}
