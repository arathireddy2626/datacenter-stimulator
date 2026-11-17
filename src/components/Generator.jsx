import { Gauge, Power, RefreshCw, TriangleAlert } from 'lucide-react';
import FuelIndicator from './FuelIndicator';

export default function Generator({ generator }) {
  const isActive = generator.state === 'RUNNING' || generator.state === 'READY';
  const isStarting = generator.state === 'STARTING';
  const isFailed = generator.state === 'FAILED' || generator.state === 'OUT_OF_FUEL';

  return (
    <div className={`device-card ${isActive ? 'active' : isStarting ? 'starting' : isFailed ? 'offline' : 'idle'}`}>
      <div className="device-header">
        <span className="device-label">GEN-1</span>
        <span className={`state-badge ${isActive ? 'online' : isStarting ? 'warning' : isFailed ? 'offline' : 'idle'}`}>
          {generator.state}
        </span>
      </div>

      <div className="device-body generator-body">
        <div className="device-icon">
          {isStarting ? <RefreshCw size={28} className="spin" /> : isFailed ? <TriangleAlert size={28} /> : isActive ? <Power size={28} /> : <Gauge size={28} />}
        </div>
        <div className="device-metrics compact">
          <div>State: <strong>{generator.state}</strong></div>
          <div>Fuel: <strong>{Math.round(generator.fuel)}%</strong></div>
        </div>
      </div>

      {isStarting && (
        <div className="startup-box">
          <div className="progress-label">Generator Starting...</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${generator.startupProgress}%` }}></div>
          </div>
          <div className="progress-label small">{Math.round(generator.startupProgress)}%</div>
        </div>
      )}

      <FuelIndicator fuel={generator.fuel} state={generator.state} />
    </div>
  );
}
