import { useEffect, useMemo, useRef, useState } from 'react';
import { useEffect as useWrapEffect, useRef as useWrapRef, useState as useWrapState } from 'react';
import { groupsOf } from '../portal/access';
import { bestLog, driveFor, overlay, topoTitle } from '../portal/overlay';
import { isSimTicket, labelsFor } from '../portal/sim';
import TopologyView from '../portal/TopologyView';
import { useStore } from '../portal/store';
import { EquipModal } from '../portal/Equip3D';
import Header from '../components/Header';
import Legend from '../components/Legend';
import MainPower from '../components/MainPower';
import Battery from '../components/Battery';
import Generator from '../components/Generator';
import Server from '../components/Server';
import TransferSwitch from '../components/TransferSwitch';
import PowerLine from '../components/PowerLine';
import ControlPanel from '../components/ControlPanel';
import SystemStatus from '../components/SystemStatus';
import EventLog from '../components/EventLog';
import ScenarioPanel from '../components/ScenarioPanel';
import { addEvent, initialSystem, SOURCE_VALUES, getSourceMeta } from '../logic/simulationEngine';

const scenarios = [
  {
    id: 'normal',
    title: 'Normal Operation',
    description: 'System runs from main utility power with battery and generator on standby.',
  },
  {
    id: 'main-failure',
    title: 'Main Power Failure',
    description: 'Main utility fails, battery takes over, and generator starts to restore power.',
  },
  {
    id: 'main-restored',
    title: 'Main Restored During Startup',
    description:
      'Main power returns while generator is still starting; the system must switch back to Main and cancel startup.',
  },
  {
    id: 'fuel-out',
    title: 'Generator Out of Fuel',
    description: 'Generator runs until fuel reaches zero, then fails and battery restores the server.',
  },
  {
    id: 'battery-failure',
    title: 'Battery Failure',
    description: 'Battery drains completely while main power and generator are unavailable.',
  },
  {
    id: 'fluctuation',
    title: 'Power Fluctuation',
    description: 'Main power toggles unstable and the transfer switch should only switch when stable.',
  },
];

// ---------------------------------------------------------------------------
// 2N Power Topology Diagram — mirrors a real data-center gen/ATS routing
// schematic (UTIL -> MV -> ATS -> MSB -> UPS -> PDU -> dual-fed racks),
// driven by the same simulation state as the rest of the app.
// ---------------------------------------------------------------------------

function TopoBox({ x, y, w, h, status = 'dim', title, lines = [], tags }) {
  return (
    <g transform={`translate(${x}, ${y})`} className={`topo-node status-${status}`}>
      <rect className="topo-rect" width={w} height={h} rx={8} />
      <circle className="topo-dot" cx={w - 12} cy={12} r={4} />
      <text x={10} y={20} className="topo-title">
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={i} x={10} y={20 + (i + 1) * 14} className="topo-sub">
          {line}
        </text>
      ))}
      {/^(UTIL|MV|ATS|GEN|MSB|UPS|PDU|RACK)/i.test(title) && h >= 24 && (
        <g className="topo-info" transform={`translate(${w - 11}, ${h - 11})`}>
          <circle r={6} />
          <text y={3} textAnchor="middle">
            i
          </text>
        </g>
      )}
      {tags &&
        tags.map((tag, i) => (
          <text
            key={tag.text}
            x={tag.align === 'right' ? w - 6 : 6}
            y={-6}
            textAnchor={tag.align === 'right' ? 'end' : 'start'}
            className={`topo-tag ${tag.active ? 'active' : ''}`}
          >
            {tag.text}
          </text>
        ))}
    </g>
  );
}

function TopoLoadBar({ x, y, w, pct = 70, status = 'green' }) {
  return (
    <g transform={`translate(${x}, ${y})`} className={`topo-loadbar status-${status}`}>
      <rect className="topo-loadbar-track" width={w} height={4} rx={2} />
      <rect className="topo-loadbar-fill" width={Math.max(2, (w * pct) / 100)} height={4} rx={2} />
    </g>
  );
}

function TopoLine({ x1, y1, x2, y2, status = 'dim' }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className={`topo-line status-${status}`} />;
}

function TopoElbow({ d, status = 'dim' }) {
  return <path d={d} className={`topo-line status-${status}`} fill="none" />;
}

function TopoBreaker({ x, y, status = 'dim' }) {
  return (
    <g transform={`translate(${x}, ${y})`} className={`topo-breaker status-${status}`}>
      <rect className="topo-breaker-rect" x={-9} y={-9} width={18} height={18} rx={3} />
      <line x1={-5} y1={0} x2={5} y2={0} className="topo-breaker-dash" />
    </g>
  );
}

function DiagramRow({
  side,
  cy,
  utilStatus,
  switchgearStatus,
  atsPosition,
  genStatus,
  genLabel,
  upsStatus,
  pduStatus,
  loadPct,
}) {
  const xUtil = 10,
    wUtil = 108,
    hUtil = 58;
  const xMv = 168,
    wMv = 86,
    hMv = 58;
  const xAts = 300,
    wAts = 150,
    hAts = 100;
  const xXfmr = 498,
    wXfmr = 160,
    hXfmr = 68;
  const xMsb = 706,
    wMsb = 96,
    hMsb = 58;
  const xUps = 852,
    wUps = 190,
    hUps = 50,
    gapUps = 14;
  const xPdu = 1092,
    wPdu = 108,
    hPdu = 50;

  const ups1Y = cy - (hUps * 2 + gapUps) / 2;
  const ups2Y = ups1Y + hUps + gapUps;
  const ups1Cy = ups1Y + hUps / 2;
  const ups2Cy = ups2Y + hUps / 2;

  const genW = 88,
    genH = 26,
    genGap = 12;
  const gen1Y = cy + hAts / 2 + 26;
  const gen2Y = gen1Y + genH + genGap;

  return (
    <g>
      {/* connecting lines, drawn first so nodes sit on top */}
      <TopoLine x1={xUtil + wUtil} y1={cy} x2={xMv} y2={cy} status={utilStatus} />
      <TopoLine x1={xMv + wMv} y1={cy} x2={xAts} y2={cy} status={utilStatus} />
      <TopoLine x1={xAts + wAts} y1={cy} x2={xXfmr} y2={cy} status={switchgearStatus} />
      <TopoLine x1={xXfmr + wXfmr} y1={cy} x2={xMsb} y2={cy} status={switchgearStatus} />
      <TopoLine x1={xMsb + wMsb} y1={cy} x2={xUps} y2={ups1Cy} status={switchgearStatus} />
      <TopoLine x1={xMsb + wMsb} y1={cy} x2={xUps} y2={ups2Cy} status={switchgearStatus} />
      <TopoLine x1={xUps + wUps} y1={ups1Cy} x2={xPdu} y2={ups1Cy} status={upsStatus} />
      <TopoLine x1={xUps + wUps} y1={ups2Cy} x2={xPdu} y2={ups2Cy} status={upsStatus} />

      {/* emergency generator bus feeding into the ATS */}
      <TopoLine
        x1={10 + genW / 2}
        y1={gen1Y + genH / 2}
        x2={10 + genW / 2}
        y2={gen2Y + genH / 2}
        status={genStatus}
      />
      <TopoElbow
        d={`M ${10 + genW} ${gen1Y + genH + genGap / 2} L ${xAts + wAts * 0.28} ${gen1Y + genH + genGap / 2} L ${xAts + wAts * 0.28} ${cy + hAts / 2}`}
        status={genStatus}
      />
      <text x={10} y={gen2Y + genH + 16} className="topo-caption">
        EMERGENCY BUS • 480V • N+1
      </text>

      <TopoBreaker x={(xUtil + wUtil + xMv) / 2} y={cy} status={utilStatus} />
      <TopoBreaker x={(xXfmr + wXfmr + xMsb) / 2} y={cy} status={switchgearStatus} />

      <TopoBox
        x={xUtil}
        y={cy - hUtil / 2}
        w={wUtil}
        h={hUtil}
        status={utilStatus}
        title={`UTIL-${side}`}
        lines={['480V • 60HZ']}
        tags={[{ text: `FEED ${side}`, align: 'left' }]}
      />

      <TopoBox
        x={xMv}
        y={cy - hMv / 2}
        w={wMv}
        h={hMv}
        status={utilStatus}
        title={`MV-${side}`}
        lines={['CLOSED']}
      />

      <TopoBox
        x={xAts}
        y={cy - hAts / 2}
        w={wAts}
        h={hAts}
        status={switchgearStatus}
        title={`ATS-${side}`}
        lines={['AUTO TRANSFER', `${atsPosition} SOURCE`]}
        tags={[
          { text: 'NORMAL', align: 'left', active: atsPosition === 'NORMAL' },
          { text: 'EMERG', align: 'right', active: atsPosition === 'EMERG' },
        ]}
      />
      <text x={xAts + wAts / 2} y={cy + hAts / 2 + 14} textAnchor="middle" className="topo-caption">
        GEN SYNC BUS
      </text>

      <TopoBox
        x={xXfmr}
        y={cy - hXfmr / 2}
        w={wXfmr}
        h={hXfmr}
        status="cyan"
        title="480V DIRECT"
        lines={['NO TRANSFORMER', `ATS-${side} → MSB-${side} • LV-ONLY`]}
      />

      <TopoBox
        x={xMsb}
        y={cy - hMsb / 2}
        w={wMsb}
        h={hMsb}
        status={switchgearStatus}
        title={`MSB-${side}`}
        lines={['CLOSED']}
      />

      <TopoBox
        x={xUps}
        y={ups1Y}
        w={wUps}
        h={hUps}
        status={upsStatus}
        title={`UPS-${side}1`}
        lines={['ONLINE DBL CONV']}
      />
      <TopoLoadBar x={xUps + 10} y={ups1Y + hUps - 12} w={wUps - 60} pct={loadPct} status={upsStatus} />

      <TopoBox
        x={xUps}
        y={ups2Y}
        w={wUps}
        h={hUps}
        status={upsStatus}
        title={`UPS-${side}2`}
        lines={['ONLINE DBL CONV']}
      />
      <TopoLoadBar x={xUps + 10} y={ups2Y + hUps - 12} w={wUps - 60} pct={loadPct} status={upsStatus} />

      <TopoBox
        x={xPdu}
        y={ups1Y}
        w={wPdu}
        h={hPdu}
        status={pduStatus}
        title={`PDU-${side}1`}
        lines={['230V OK']}
      />
      <TopoBox
        x={xPdu}
        y={ups2Y}
        w={wPdu}
        h={hPdu}
        status={pduStatus}
        title={`PDU-${side}2`}
        lines={['230V OK']}
      />

      <TopoBox
        x={10}
        y={gen1Y}
        w={genW}
        h={genH}
        status={genStatus}
        title={`GEN-${side}1`}
        lines={[genLabel]}
      />
      <TopoBox
        x={10}
        y={gen2Y}
        w={genW}
        h={genH}
        status={genStatus}
        title={`GEN-${side}2`}
        lines={[genLabel]}
      />
    </g>
  );
}

function rowProps(system, over = {}) {
  const genState = system.generator.state;
  const battState = system.battery.state;
  const serverPowered = system.server.powered;
  const source = system.server.source;
  return {
    utilStatus: system.mainPower.state === 'ON' ? 'green' : 'red',
    switchgearStatus: serverPowered ? 'green' : 'red',
    atsPosition: source === 'GENERATOR' ? 'EMERG' : 'NORMAL',
    genStatus:
      genState === 'RUNNING' || genState === 'READY'
        ? 'green'
        : genState === 'STARTING'
          ? 'orange'
          : genState === 'FAILED' || genState === 'OUT_OF_FUEL'
            ? 'red'
            : 'dim',
    genLabel:
      genState === 'RUNNING'
        ? 'RUNNING'
        : genState === 'READY'
          ? 'READY'
          : genState === 'STARTING'
            ? 'STARTING'
            : genState === 'FAILED'
              ? 'FAILED'
              : genState === 'OUT_OF_FUEL'
                ? 'NO FUEL'
                : 'STOPPED',
    upsStatus: battState === 'FAILED' ? 'red' : battState === 'LOW' ? 'orange' : 'green',
    pduStatus: serverPowered ? 'green' : 'red',
    loadPct: serverPowered ? (source === 'BATTERY' ? 88 : 62) : 0,
    ...over,
  };
}

const EXTRA_BOXES = [
  ['CRAH-1', 'COOLING'],
  ['CRAH-2', 'COOLING'],
  ['CHW LOOP', 'COOLING'],
  ['CORE NETWORK', 'IT'],
  ['STORAGE', 'IT'],
  ['SERVER CLUSTER', 'IT'],
  ['FIRE PANEL', 'SAFETY'],
  ['LEAK DETECT', 'SAFETY'],
  ['ACCESS CONTROL', 'SAFETY'],
];

// `drive` (optional) holds a separate state for each feed plus status overrides for the extra boxes.
// Without it, both feeds follow the simulator's own state, exactly as before.
function PowerTopologyDiagram({ system, drive }) {
  const a = rowProps(drive?.A?.system || system, drive?.A?.over);
  const b = rowProps(drive?.B?.system || system, drive?.B?.over);
  const extra = drive?.extra || {};

  const rowACy = 150;
  const rowBCy = 440;
  const rackX = 1290,
    rackW = 140,
    rackH = 66;
  const rackYs = [70, 296, 522];
  const feedFromX = 1200;
  const rackOk = a.pduStatus === 'green' || b.pduStatus === 'green';

  return (
    <svg viewBox="0 0 1470 760" className="topo-svg" preserveAspectRatio="xMidYMid meet">
      <DiagramRow side="A" cy={rowACy} {...a} />
      <DiagramRow side="B" cy={rowBCy} {...b} />

      {rackYs.map((ry) => (
        <g key={ry}>
          <TopoLine x1={feedFromX} y1={rowACy} x2={rackX} y2={ry + rackH / 2} status={a.pduStatus} />
          <TopoLine x1={feedFromX} y1={rowBCy} x2={rackX} y2={ry + rackH / 2} status={b.pduStatus} />
        </g>
      ))}
      {rackYs.map((ry, i) => (
        <TopoBox
          key={ry}
          x={rackX}
          y={ry}
          w={rackW}
          h={rackH}
          status={extra[`RACK ROW ${i + 1}`] || (rackOk ? 'green' : 'red')}
          title={`RACK ROW ${i + 1}`}
          lines={['DUAL-FED • 2N']}
          tags={[
            { text: 'FEED A', align: 'left', active: a.utilStatus === 'green' },
            { text: 'FEED B', align: 'right', active: b.utilStatus === 'green' },
          ]}
        />
      ))}

      {EXTRA_BOXES.map(([title, group], i) => (
        <TopoBox
          key={title}
          x={40 + i * 154}
          y={650}
          w={140}
          h={56}
          status={extra[title] || 'green'}
          title={title}
          lines={[group]}
        />
      ))}
    </svg>
  );
}

const cloneState = (state) => JSON.parse(JSON.stringify(state));

function SimulatorCore({ drive }) {
  const [system, setSystem] = useState(initialSystem);
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0]);
  const startupRef = useRef(null);
  const fuelIntervalRef = useRef(null);
  const batteryDrainRef = useRef(null);

  const currentSource = system.server.source;
  const activeSourceMeta = getSourceMeta(currentSource);

  const powerState = useMemo(
    () => ({
      mainActive: system.mainPower.state === 'ON',
      batteryActive: system.transferSwitch === 'BATTERY' && system.battery.state === 'SUPPLYING',
      generatorActive:
        system.transferSwitch === 'GENERATOR' &&
        (system.generator.state === 'RUNNING' || system.generator.state === 'READY'),
      serverPowered: system.server.powered,
    }),
    [system],
  );

  const pushEvent = (message, type = 'INFO') => {
    setSystem((prev) => ({
      ...prev,
      events: addEvent(prev.events, message, type),
    }));
  };

  const setActiveSource = (source, reason = 'logic') => {
    setSystem((prev) => {
      const next = cloneState(prev);
      next.server = { powered: true, source };
      next.transferSwitch = source;

      if (source === 'MAIN') {
        next.mainPower = { ...next.mainPower, state: 'ON', health: 'HEALTHY' };
        next.battery = { ...next.battery, state: 'STANDBY' };
        next.generator = {
          ...next.generator,
          state: next.generator.state === 'RUNNING' ? 'RUNNING' : 'OFF',
          startupProgress: 0,
        };
        next.server.powered = true;
      }

      if (source === 'BATTERY') {
        next.mainPower = { ...next.mainPower, state: 'OFF', health: 'FAILURE' };
        next.battery = { ...next.battery, state: 'SUPPLYING' };
        next.server.powered = true;
      }

      if (source === 'GENERATOR') {
        next.mainPower = { ...next.mainPower, state: 'OFF', health: 'FAILURE' };
        next.generator = { ...next.generator, state: 'RUNNING' };
        next.battery = { ...next.battery, state: 'CHARGING' };
        next.server.powered = true;
      }

      if (source === 'NONE') {
        next.server = { powered: false, source: 'NONE' };
        next.transferSwitch = 'NONE';
      }

      next.events = addEvent(
        next.events,
        `${reason}: source switched to ${source}.`,
        source === 'MAIN' ? 'SUCCESS' : source === 'NONE' ? 'ERROR' : 'INFO',
      );
      return next;
    });
  };

  const failMainPower = () => {
    setSystem((prev) => {
      const next = cloneState(prev);
      next.mainPower = { ...next.mainPower, state: 'OFF', health: 'FAILURE' };
      next.transferSwitch = 'BATTERY';
      next.server = { powered: true, source: 'BATTERY' };
      next.battery = { ...next.battery, state: 'SUPPLYING', charge: Math.max(0, next.battery.charge - 2) };
      next.generator = { ...next.generator, state: 'STARTING', startupProgress: 0 };
      next.status = 'DEGRADED';
      next.events = addEvent(next.events, 'Main power failure detected', 'WARNING');
      next.events = addEvent(next.events, 'Transfer switch moved to BATTERY', 'SUCCESS');
      next.events = addEvent(next.events, 'Generator startup initiated', 'INFO');
      return next;
    });
  };

  const restoreMainPower = () => {
    setSystem((prev) => {
      const next = cloneState(prev);
      next.mainPower = { ...next.mainPower, state: 'ON', health: 'HEALTHY' };
      next.transferSwitch = 'MAIN';
      next.server = { powered: true, source: 'MAIN' };
      next.battery = { ...next.battery, state: 'STANDBY' };
      if (next.generator.state === 'STARTING' || next.generator.state === 'READY') {
        next.generator = { ...next.generator, state: 'OFF', startupProgress: 0 };
      }
      next.status = 'NORMAL';
      next.events = addEvent(next.events, 'Main power restored — switching server to Main power.', 'SUCCESS');
      next.events = addEvent(next.events, 'Generator startup cancelled.', 'WARNING');
      return next;
    });
  };

  const startGenerator = () => {
    setSystem((prev) => {
      const next = cloneState(prev);
      next.generator = { ...next.generator, state: 'STARTING', startupProgress: 0 };
      next.battery = { ...next.battery, state: 'SUPPLYING' };
      next.events = addEvent(next.events, 'Generator startup initiated', 'INFO');
      return next;
    });
  };

  const generatorReady = () => {
    setSystem((prev) => {
      const next = cloneState(prev);
      next.generator = { ...next.generator, state: 'READY', startupProgress: 100 };
      next.transferSwitch = 'GENERATOR';
      next.server = { powered: true, source: 'GENERATOR' };
      next.battery = { ...next.battery, state: 'CHARGING' };
      next.events = addEvent(next.events, 'Generator ready', 'SUCCESS');
      next.events = addEvent(next.events, 'Transfer switch moved to GENERATOR', 'SUCCESS');
      next.events = addEvent(next.events, 'Battery charging started', 'INFO');
      return next;
    });
  };

  const generatorFailure = () => {
    setSystem((prev) => {
      const next = cloneState(prev);
      next.generator = { ...next.generator, state: 'FAILED', fuel: Math.max(0, next.generator.fuel - 10) };
      next.transferSwitch = 'BATTERY';
      next.server = { powered: true, source: 'BATTERY' };
      next.battery = { ...next.battery, state: 'SUPPLYING' };
      next.events = addEvent(next.events, 'Generator failure detected', 'ERROR');
      next.events = addEvent(next.events, 'Battery backup activated.', 'SUCCESS');
      return next;
    });
  };

  const generatorOutOfFuel = () => {
    setSystem((prev) => {
      const next = cloneState(prev);
      next.generator = { ...next.generator, state: 'OUT_OF_FUEL', fuel: 0 };
      next.transferSwitch = 'BATTERY';
      next.server = { powered: true, source: 'BATTERY' };
      next.battery = { ...next.battery, state: 'SUPPLYING' };
      next.events = addEvent(next.events, 'Generator stopped: out of fuel.', 'ERROR');
      next.events = addEvent(next.events, 'Battery backup activated.', 'SUCCESS');
      return next;
    });
  };

  const drainBattery = () => {
    setSystem((prev) => {
      const next = cloneState(prev);
      next.battery = { ...next.battery, charge: 0, state: 'FAILED' };
      next.server = { powered: false, source: 'NONE' };
      next.transferSwitch = 'NONE';
      next.events = addEvent(next.events, 'Battery depleted to 0%', 'ERROR');
      next.events = addEvent(next.events, 'CRITICAL: SERVER POWER LOST', 'ERROR');
      return next;
    });
  };

  const resetSystem = () => {
    setSystem({
      ...cloneState(initialSystem),
      events: addEvent([], 'System reset', 'INFO'),
    });
  };

  const toggleAutoMode = () => {
    setSystem((prev) => ({
      ...prev,
      automaticMode: !prev.automaticMode,
      events: addEvent(
        prev.events,
        `Automatic mode ${!prev.automaticMode ? 'enabled' : 'disabled'}.`,
        'INFO',
      ),
    }));
  };

  const clearEvents = () => {
    setSystem((prev) => ({
      ...prev,
      events: [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString([], { hour12: false }),
          type: 'INFO',
          message: 'Event log cleared',
        },
      ],
    }));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSystem((prev) => {
        const next = cloneState(prev);

        if (next.generator.state === 'STARTING') {
          next.generator = {
            ...next.generator,
            startupProgress: Math.min(100, next.generator.startupProgress + 5),
          };

          if (next.generator.startupProgress >= 100) {
            next.generator = {
              ...next.generator,
              state: 'READY',
              startupProgress: 100,
            };
            next.transferSwitch = 'GENERATOR';
            next.server = { powered: true, source: 'GENERATOR' };
            next.battery = { ...next.battery, state: 'CHARGING' };
            next.events = addEvent(next.events, 'Generator ready', 'SUCCESS');
            next.events = addEvent(next.events, 'Transfer switch moved to GENERATOR', 'SUCCESS');
            next.events = addEvent(next.events, 'Battery charging started', 'INFO');
          }
        }

        if (next.generator.state === 'RUNNING' && next.mainPower.state === 'OFF') {
          next.generator = {
            ...next.generator,
            fuel: Math.max(0, next.generator.fuel - 1),
          };

          if (next.generator.fuel <= 25) {
            next.events = addEvent(next.events, 'Generator fuel critically low', 'WARNING');
          }

          if (next.generator.fuel <= 0) {
            next.generator = { ...next.generator, state: 'FAILED', fuel: 0 };
            next.transferSwitch = 'BATTERY';
            next.server = { powered: true, source: 'BATTERY' };
            next.battery = { ...next.battery, state: 'SUPPLYING' };
            next.events = addEvent(next.events, 'Generator stopped: out of fuel.', 'ERROR');
            next.events = addEvent(next.events, 'Battery backup activated.', 'SUCCESS');
          }
        }

        if (next.battery.state === 'SUPPLYING' && next.server.source === 'BATTERY') {
          next.battery = {
            ...next.battery,
            charge: Math.max(0, next.battery.charge - 0.7),
          };
        }

        if (next.battery.state === 'CHARGING') {
          next.battery = {
            ...next.battery,
            charge: Math.min(100, next.battery.charge + 0.8),
          };
        }

        if (next.battery.charge <= 0 && next.server.source === 'BATTERY') {
          next.battery = { ...next.battery, state: 'FAILED', charge: 0 };
          next.server = { powered: false, source: 'NONE' };
          next.transferSwitch = 'NONE';
          next.events = addEvent(next.events, 'CRITICAL: SERVER POWER LOST', 'ERROR');
        }

        return next;
      });
    }, 1100);

    return () => clearInterval(interval);
  }, []);

  const startScenario = () => {
    const scenarioId = selectedScenario.id;

    if (scenarioId === 'normal') {
      resetSystem();
      return;
    }

    if (scenarioId === 'main-failure') {
      setSystem((prev) => {
        const next = cloneState(prev);
        next.mainPower = { ...next.mainPower, state: 'ON', health: 'HEALTHY' };
        next.battery = { ...next.battery, state: 'STANDBY', charge: 100 };
        next.generator = { ...next.generator, state: 'OFF', startupProgress: 0, fuel: 100 };
        next.transferSwitch = 'MAIN';
        next.server = { powered: true, source: 'MAIN' };
        next.events = addEvent(next.events, 'Scenario: Main Power Failure initialized', 'INFO');
        return next;
      });
      setTimeout(() => failMainPower(), 300);
      setTimeout(() => {
        setSystem((prev) => {
          const next = cloneState(prev);
          next.generator = { ...next.generator, state: 'STARTING', startupProgress: 0 };
          next.events = addEvent(next.events, 'Generator startup initiated', 'INFO');
          return next;
        });
      }, 800);
      return;
    }

    if (scenarioId === 'main-restored') {
      setSystem((prev) => {
        const next = cloneState(prev);
        next.mainPower = { ...next.mainPower, state: 'ON', health: 'HEALTHY' };
        next.battery = { ...next.battery, state: 'STANDBY', charge: 100 };
        next.generator = { ...next.generator, state: 'OFF', fuel: 100, startupProgress: 0 };
        next.transferSwitch = 'MAIN';
        next.server = { powered: true, source: 'MAIN' };
        next.events = addEvent(next.events, 'Scenario: Main Restored During Startup initialized', 'INFO');
        return next;
      });
      setTimeout(() => failMainPower(), 300);
      setTimeout(() => {
        setSystem((prev) => {
          const next = cloneState(prev);
          next.generator = { ...next.generator, state: 'STARTING', startupProgress: 20 };
          return next;
        });
      }, 900);
      setTimeout(() => restoreMainPower(), 1800);
      return;
    }

    if (scenarioId === 'fuel-out') {
      setSystem((prev) => {
        const next = cloneState(prev);
        next.mainPower = { ...next.mainPower, state: 'OFF', health: 'FAILURE' };
        next.battery = { ...next.battery, state: 'STANDBY', charge: 100 };
        next.generator = { ...next.generator, state: 'STARTING', startupProgress: 100, fuel: 100 };
        next.transferSwitch = 'BATTERY';
        next.server = { powered: true, source: 'BATTERY' };
        next.events = addEvent(next.events, 'Scenario: Generator Out of Fuel initialized', 'INFO');
        return next;
      });
      setTimeout(() => generatorReady(), 500);
      return;
    }

    if (scenarioId === 'battery-failure') {
      setSystem((prev) => {
        const next = cloneState(prev);
        next.mainPower = { ...next.mainPower, state: 'OFF', health: 'FAILURE' };
        next.battery = { ...next.battery, state: 'SUPPLYING', charge: 20 };
        next.generator = { ...next.generator, state: 'FAILED', fuel: 0, startupProgress: 0 };
        next.transferSwitch = 'BATTERY';
        next.server = { powered: true, source: 'BATTERY' };
        next.events = addEvent(next.events, 'Scenario: Battery Failure initialized', 'INFO');
        return next;
      });
      return;
    }

    if (scenarioId === 'fluctuation') {
      setSystem((prev) => {
        const next = cloneState(prev);
        next.mainPower = { ...next.mainPower, state: 'ON', health: 'HEALTHY' };
        next.battery = { ...next.battery, state: 'STANDBY', charge: 100 };
        next.generator = { ...next.generator, state: 'OFF', fuel: 100, startupProgress: 0 };
        next.transferSwitch = 'MAIN';
        next.server = { powered: true, source: 'MAIN' };
        next.events = addEvent(next.events, 'Scenario: Power Fluctuation initialized', 'INFO');
        return next;
      });
      setTimeout(() => failMainPower(), 600);
      setTimeout(() => restoreMainPower(), 1500);
      setTimeout(() => failMainPower(), 2200);
      return;
    }
  };

  return (
    <div className="app-shell">
      <Header automaticMode={system.automaticMode} status={system.status} />
      <Legend />

      <main className="dashboard-grid">
        <section className="center-column">
          <div className="diagram-panel glass-panel">
            <div className="main-title-bar topo-title-bar">
              <div className="topo-title-group">
                <span className="title-tag">
                  {system.server.source === 'GENERATOR' ? 'GEN' : 'UTIL'}→ATS ROUTING • DIRECT 480V
                </span>
                <span className="topo-subtitle">
                  GEN SYNC BUS • 4X UPS N+1 • 8X BATT • 480V DIRECT • NO TX
                </span>
              </div>
              <div className="mini-metrics topo-metrics">
                <span className="topo-metric">
                  <em>AVAIL</em>
                  <b className={system.server.powered ? 'ok' : 'bad'}>
                    {system.server.powered ? '100.00%' : '0.00%'}
                  </b>
                </span>
                <span className="topo-metric">
                  <em>IT LOAD</em>
                  <b>{system.server.powered ? '559.5 kW' : '0.0 kW'}</b>
                </span>
                <span className="topo-metric">
                  <em>PUE</em>
                  <b>1.34</b>
                </span>
                <span className="topo-metric">
                  <em>ALARMS</em>
                  <b className={system.status === 'NORMAL' ? 'ok' : 'bad'}>
                    {system.events.filter((e) => e.type === 'ERROR' || e.type === 'WARNING').length}
                  </b>
                </span>
                <span className="topo-metric topo-chem">
                  <em>CHEM</em>
                  <span className={`chem-pill ${system.battery.state !== 'FAILED' ? 'active' : ''}`}>
                    VRLA
                  </span>
                  <span className="chem-pill">LI-ION</span>
                </span>
              </div>
            </div>

            <div className="system-diagram topo-wrap">
              <div className="diagram-board topo-board">
                <PowerTopologyDiagram system={system} drive={drive} />
              </div>
            </div>
          </div>
        </section>

        <aside className="right-column-stack">
          <SystemStatus system={system} />
          <ControlPanel
            onFailMain={failMainPower}
            onRestoreMain={restoreMainPower}
            onGeneratorReady={generatorReady}
            onGeneratorFailure={generatorFailure}
            onGeneratorOutOfFuel={generatorOutOfFuel}
            onDrainBattery={drainBattery}
            onReset={resetSystem}
            onToggleAuto={toggleAutoMode}
            automaticMode={system.automaticMode}
            mainPower={system.mainPower}
            generator={system.generator}
            battery={system.battery}
          />
          <ScenarioPanel
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            setSelectedScenario={setSelectedScenario}
            startScenario={startScenario}
          />
        </aside>
      </main>

      <div className="bottom-grid">
        <EventLog events={system.events} onClear={clearEvents} />
      </div>
    </div>
  );
}

// Wraps the real topology diagram: boxes light up for live failures, and clicking a box opens its 3D view.
// With a `ticket`, the student acts on the diagram; without one it shows what is happening for the user's groups.
const KINDS = [
  [/^UTIL/i, 'util'],
  [/^MV/i, 'mv'],
  [/^ATS/i, 'ats'],
  [/^GEN/i, 'gen'],
  [/^MSB/i, 'msb'],
  [/^UPS/i, 'ups'],
  [/^PDU/i, 'pdu'],
  [/^RACK/i, 'rack'],
  [/^CRAH/i, 'crah'],
  [/^CHW/i, 'chiller'],
  [/^CORE/i, 'network'],
  [/^STORAGE/i, 'storage'],
  [/^SERVER/i, 'server'],
  [/^FIRE/i, 'fire'],
  [/^LEAK/i, 'leak'],
  [/^ACCESS/i, 'security'],
];
const ACT = { util: 'ack', mv: 'reclose', ats: 'transfer', gen: 'startGen', msb: 'shed' };

function statusOf(group) {
  const cls = [...group.classList].find((c) => c.startsWith('status-')) || '';
  if (/red|crit|alarm|fault/.test(cls)) return 'critical';
  if (/amber|orange|yellow|warn/.test(cls)) return 'warning';
  return 'normal';
}

function useTick() {
  const [now, setNow] = useWrapState(Date.now());
  useWrapEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function SimulatorApp({ ticket, log = [], labels = {}, locked, onAct, onTrack }) {
  const [s, dispatch] = useStore();
  const [picked, setPicked] = useWrapState(null);
  const [view, setView] = useWrapState('main');
  const published = (s.topologies || []).filter((t) => t.published);
  const host = useWrapRef(null);
  const now = useTick();
  const uid = sessionStorage.getItem('equnix-session');
  const me = s.users.find((u) => u.id === uid);
  const myGroups = groupsOf(s, uid).map((g) => g.id);
  const seeAll = !me || !['student', 'instructor'].includes(me.role);
  const tickets = ticket ? [ticket] : s.tickets.filter((t) => seeAll || myGroups.includes(t.groupId));
  const logFor = (t) => {
    if (ticket) return log;
    return me?.role === 'student' ? (s.acts || {})[t.id + ':' + uid] || [] : bestLog(s.acts, t.id);
  };
  const roleOf = (t) => s.users.find((u) => u.id === t.by)?.trainingRole;
  const labelsOf = (t) => (ticket ? labels : labelsFor(t, roleOf(t)));
  const { marks, lines } = overlay(tickets, logFor, now, labelsOf);
  const drive = driveFor(tickets, logFor, labelsOf, now);

  // React redraws the diagram, so the highlight classes are re-applied regularly.
  useWrapEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const paint = () =>
      el.querySelectorAll('.topo-node').forEach((g) => {
        const title = (g.querySelector('.topo-title')?.textContent || '').trim().toUpperCase();
        ['critical', 'warning', 'run'].forEach((k) => g.classList.toggle(`pt-mark-${k}`, marks[title] === k));
      });
    paint();
    const timer = setInterval(paint, 400);
    return () => clearInterval(timer);
  });

  const onClick = (e) => {
    const group = e.target.closest('.topo-node');
    if (!group) return;
    const name = (group.querySelector('.topo-title')?.textContent || '').trim();
    const match = KINDS.find(([pattern]) => pattern.test(name));
    if (!match) return;
    const key = match[1];
    let actions = null;
    if (ticket && !locked) {
      const done = (id) => log.some((entry) => entry.id === id);
      if (isSimTicket(ticket)) {
        const act = ACT[key];
        const ownSide = name.split('-')[1]?.[0] === ticket.equipId.slice(-1);
        const primary = key !== 'gen' || name.endsWith('1');
        if (act && labels[act] && ownSide && primary)
          actions = [{ id: act, label: labels[act], done: done(act) }];
      } else if (name.toUpperCase() === topoTitle(ticket.equipId)) {
        actions = ['ack', 'inspect', 'failover', 'restart', 'isolate']
          .filter((id) => labels[id])
          .map((id) => ({ id, label: labels[id], done: done(id) }));
      }
    }
    const mark = marks[name.toUpperCase()];
    setPicked({
      key,
      name,
      actions,
      status: mark === 'critical' || mark === 'warning' ? mark : statusOf(group),
    });
    const detail = `Opened ${name} on the diagram`;
    if (onTrack) onTrack(detail);
    else dispatch({ t: 'log', uid, type: 'inspect', detail });
  };

  return (
    <div ref={host} onClick={onClick}>
      {!ticket && lines.length > 0 && (
        <ul className="pt-livelines">
          {lines.map((line, i) => (
            <li key={i} className={line.level}>
              {line.text}
            </li>
          ))}
        </ul>
      )}
      <p className="pt-empty">Click any equipment on the diagram for a 3D view and details.</p>
      {!ticket && published.length > 0 && (
        <select
          className="pt-viewpick"
          value={view}
          onChange={(e) => setView(e.target.value)}
          aria-label="Choose a topology"
        >
          <option value="main">Power distribution (original)</option>
          {published.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
      {!ticket && view !== 'main' && published.find((t) => t.id === view) ? (
        <TopologyView topo={published.find((t) => t.id === view)} tickets={tickets} />
      ) : (
        <SimulatorCore drive={drive} />
      )}
      {picked && (
        <EquipModal
          node={picked}
          status={picked.status}
          actions={picked.actions}
          onDo={(id) => {
            onAct(id);
            setPicked(null);
          }}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  );
}
