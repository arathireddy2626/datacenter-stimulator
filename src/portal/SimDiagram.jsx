import { useEffect, useState } from 'react';
import { SIM_ACTIONS, isSimTicket, labelsFor, runGeneric, runSim } from './sim';
import { when } from './ui';
import SimulatorApp from '../simulator/SimulatorApp';

const CAUSES = [
  ['utility', 'Utility feed lost'],
  ['generator', 'Generator fault'],
  ['ups', 'UPS fault'],
  ['ats', 'ATS controller fault'],
];

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

// The student works on the real topology diagram; this adds the status bar, role tools and action log around it.
export default function SimDiagram({ ticket, log, onAct, locked, onTrack, role }) {
  const now = useNow();
  const [cause, setCause] = useState(CAUSES[0][0]);
  const labels = labelsFor(ticket, role);
  const isDone = (id) => log.some((entry) => entry.id === id);
  const power = isSimTicket(ticket);

  let banner;
  if (power) {
    const sim = runSim(log, ticket.at, now);
    banner = ['run', `GEN-${ticket.equipId.slice(-1)}1 is carrying the load through the ATS.`];
    if (sim.loadLost)
      banner = ['critical', 'Load lost: the UPS batteries ran out before power was restored.'];
    else if (sim.secondsLeft !== null)
      banner = ['warning', `Utility lost. UPS is on battery, about ${clock(sim.secondsLeft)} left.`];
  } else {
    const g = runGeneric(ticket, log, now, labels);
    const texts = {
      resolved: ['run', 'Resolved. The equipment is back to normal operation.'],
      escalated: ['critical', 'An unsafe step made it worse. Complete the right steps to recover.'],
      impact: ['critical', 'Service impact: the problem was not handled in time.'],
      open: [
        'warning',
        `${g.failure.title} on ${ticket.equipId}. About ${clock(g.secondsLeft)} before service is affected.`,
      ],
    };
    banner = texts[g.state];
  }

  return (
    <div>
      <p className={`pt-simbar ${banner[0]}`}>{banner[1]}</p>
      <SimulatorApp
        ticket={ticket}
        log={log}
        labels={labels}
        locked={locked}
        onAct={onAct}
        onTrack={onTrack}
      />
      {labels.diagnose && (
        <div className="pt-field inline">
          <label>
            Likely root cause
            <select
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              disabled={locked || isDone('diagnose')}
            >
              {CAUSES.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="pt-btn"
            disabled={locked || isDone('diagnose')}
            onClick={() => onAct('diagnose', cause)}
          >
            {labels.diagnose}
          </button>
        </div>
      )}
      <div className="pt-actions">
        <button
          className="pt-btn ghost"
          disabled={locked || isDone('escalate')}
          onClick={() => onAct('escalate')}
        >
          {labels.escalate}
        </button>
      </div>
      {log.length > 0 && (
        <ul className="pt-list">
          {log.map((entry, i) => (
            <li key={i}>
              <span>{labels[entry.id] || SIM_ACTIONS[entry.id]}</span>
              <small>{when(entry.at)}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
