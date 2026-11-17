import { Activity, Wifi, Zap } from 'lucide-react';

export default function Header({ automaticMode, status }) {
  return (
    <header className="app-header glass-panel">
      <div>
        <div className="header-kicker">SYSTEM MONITORING</div>
        <h1>Power Distribution Simulator</h1>
      </div>

      <div className="header-right">
        <div className="status-pill online">
          <Activity size={14} />
          <span>SYSTEM ONLINE</span>
        </div>
        <div className="status-pill subtle">
          <Wifi size={14} />
          <span>AUTO MODE: {automaticMode ? 'ON' : 'OFF'}</span>
        </div>
        <div className="status-pill accent">
          <Zap size={14} />
          <span>{status}</span>
        </div>
      </div>
    </header>
  );
}
