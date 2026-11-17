export const SOURCE_VALUES = ['MAIN', 'BATTERY', 'GENERATOR', 'NONE'];

export const initialSystem = {
  mainPower: { state: 'ON', health: 'HEALTHY' },
  battery: { state: 'STANDBY', charge: 100 },
  generator: { state: 'OFF', fuel: 100, startupProgress: 0 },
  transferSwitch: 'MAIN',
  server: { powered: true, source: 'MAIN' },
  automaticMode: true,
  status: 'NORMAL',
  events: [
    { id: 1, time: '00:00:00', type: 'INFO', message: 'System initialized' }
  ]
};

export const formatNow = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour12: false });
};

export const addEvent = (events, message, type = 'INFO') => {
  const next = [
    ...events,
    {
      id: Date.now() + Math.random(),
      time: formatNow(),
      type,
      message
    }
  ];
  return next.slice(-40);
};

export const setSource = (state, source) => {
  const next = { ...state };

  if (source === 'MAIN') {
    next.mainPower = { ...next.mainPower, state: 'ON', health: 'HEALTHY' };
    next.transferSwitch = 'MAIN';
    next.server = { powered: true, source: 'MAIN' };
    next.battery = { ...next.battery, state: 'STANDBY' };
    next.status = 'NORMAL';

    if (next.generator.state === 'STARTING' || next.generator.state === 'READY') {
      next.generator = { ...next.generator, state: 'OFF', startupProgress: 0 };
    }
  }

  if (source === 'BATTERY') {
    next.mainPower = { ...next.mainPower, state: 'OFF', health: 'FAILURE' };
    next.transferSwitch = 'BATTERY';
    next.server = { powered: true, source: 'BATTERY' };
    next.battery = { ...next.battery, state: 'SUPPLYING' };
    next.status = 'DEGRADED';
  }

  if (source === 'GENERATOR') {
    next.mainPower = { ...next.mainPower, state: 'OFF', health: 'FAILURE' };
    next.transferSwitch = 'GENERATOR';
    next.server = { powered: true, source: 'GENERATOR' };
    next.battery = { ...next.battery, state: 'CHARGING' };
    next.generator = { ...next.generator, state: 'RUNNING' };
    next.status = 'NORMAL';
  }

  if (source === 'NONE') {
    next.mainPower = { ...next.mainPower, state: 'OFF', health: 'FAILURE' };
    next.transferSwitch = 'NONE';
    next.server = { powered: false, source: 'NONE' };
    next.battery = { ...next.battery, state: 'FAILED' };
    next.status = 'CRITICAL';
  }

  return next;
};

export const getSourceMeta = (source) => {
  const map = {
    MAIN: { label: 'MAIN POWER', color: 'green' },
    BATTERY: { label: 'BATTERY', color: 'blue' },
    GENERATOR: { label: 'GENERATOR', color: 'green' },
    NONE: { label: 'NO POWER', color: 'red' }
  };
  return map[source] || map.NONE;
};

export const getGeneratorDisplayState = (state) => {
  const map = {
    OFF: 'OFF',
    STARTING: 'STARTING',
    READY: 'READY',
    RUNNING: 'RUNNING',
    FAILED: 'FAILED',
    OUT_OF_FUEL: 'OUT OF FUEL'
  };
  return map[state] || state;
};
