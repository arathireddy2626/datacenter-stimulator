import { BatteryCharging, BatteryFull, BatteryWarning } from 'lucide-react';

export default function Battery({ battery }) {
  const charge = Math.max(0, Math.min(100, battery.charge));
  const iconMap = {
    STANDBY: BatteryFull,
    SUPPLYING: BatteryFull,
    CHARGING: BatteryCharging,
    LOW: BatteryWarning,
    FAILED: BatteryWarning
  };

  const Icon = iconMap[battery.state] || BatteryFull;

  return (
    <div className={`device-card ${battery.state.toLowerCase()} ${battery.state === 'SUPPLYING' ? 'active' : ''}`}>
      <div className="device-header">
        <span className="device-label">UPS-A</span>
        <span className={`state-badge ${battery.state.toLowerCase()}`}>{battery.state}</span>
      </div>

      <div className="device-body">
        <div className="device-icon">
          <Icon size={28} />
        </div>
        <div className="device-metrics">
          <div>Charge: <strong>{Math.round(charge)}%</strong></div>
          <div>State: <strong>{battery.state}</strong></div>
        </div>
      </div>

      <div className="meter">
        <div className="meter-fill" style={{ width: `${charge}%` }}></div>
      </div>
    </div>
  );
}
