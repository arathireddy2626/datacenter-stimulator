export default function SystemStatus({ system }) {
  const { mainPower, battery, generator, transferSwitch, server, automaticMode, status } = system;

  return (
    <aside className="panel glass-panel">
      <div className="panel-title-row">
        <h3>System Status</h3>
      </div>

      <div className="status-list">
        <div className="status-row"><span>Active Power Source</span><strong>{server.source}</strong></div>
        <div className="status-row"><span>Server</span><strong>{server.powered ? 'POWERED' : 'POWER LOST'}</strong></div>
        <div className="status-row"><span>Main Power</span><strong>{mainPower.state}</strong></div>
        <div className="status-row"><span>Battery</span><strong>{battery.state}</strong></div>
        <div className="status-row"><span>Generator</span><strong>{generator.state}</strong></div>
        <div className="status-row"><span>Transfer Switch</span><strong>{transferSwitch}</strong></div>
        <div className="status-row"><span>System Mode</span><strong>{automaticMode ? 'AUTOMATIC' : 'MANUAL'}</strong></div>
        <div className="status-row"><span>Overall System</span><strong>{status}</strong></div>
      </div>
    </aside>
  );
}
