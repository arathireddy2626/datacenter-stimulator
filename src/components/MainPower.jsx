import { PlugZap, PowerOff } from 'lucide-react';

export default function MainPower({ mainPower }) {
  const active = mainPower.state === 'ON';
  const Icon = active ? PlugZap : PowerOff;

  return (
    <div className={`device-card ${active ? 'active' : 'offline'}`}>
      <div className="device-header">
        <span className="device-label">UTIL-A</span>
        <span className={`state-badge ${active ? 'online' : 'offline'}`}>{mainPower.state}</span>
      </div>

      <div className="device-body">
        <div className="device-icon">
          <Icon size={28} />
        </div>
        <div className="device-metrics">
          <div>480V / 60Hz</div>
          <div>State: <strong>{mainPower.state}</strong></div>
          <div>Health: <strong>{mainPower.health}</strong></div>
        </div>
      </div>
    </div>
  );
}
