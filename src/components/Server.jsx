import { ServerCog, PowerOff } from 'lucide-react';

export default function Server({ server }) {
  const powered = server.powered;

  return (
    <div className={`server-card ${powered ? 'powered' : 'down'}`}>
      <div className="server-icon">
        {powered ? <ServerCog size={32} /> : <PowerOff size={32} />}
      </div>
      <div className="server-title">LOAD</div>
      <div className="server-status">{powered ? 'POWERED' : 'POWER LOST'}</div>
      <div className="server-source">Feed: {powered ? server.source : 'NONE'}</div>
    </div>
  );
}
