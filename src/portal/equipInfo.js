// Plain-language notes shown behind the (i) button. Values are typical, not site-specific.
export const INFO = {
  util: {
    title: 'Utility feed',
    what: 'Power from the grid, stepped down for the building.',
    normal: '480 V, 60 Hz on all three phases.',
    fail: 'The site loses its normal source. The generator must start and the ATS must move the load.',
  },
  mv: {
    title: 'Medium-voltage breaker',
    what: 'Connects or isolates the utility feed from the site.',
    normal: 'Closed, no trip flag.',
    fail: 'It opens on a fault. Never reclose it without finding the cause first.',
  },
  ats: {
    title: 'Automatic transfer switch',
    what: 'Moves the load between the utility and the generator.',
    normal: 'On utility, controller in auto.',
    fail: 'If it does not transfer, the downstream load runs on UPS batteries until they drain.',
  },
  gen: {
    title: 'Standby generator',
    what: 'Diesel engine and alternator that supply emergency power.',
    normal: 'Standby and ready, fuel above 50 percent.',
    fail: 'It needs several seconds to start and take load. Check fuel, starter batteries and controller faults.',
  },
  msb: {
    title: 'Main switchboard',
    what: 'Distributes power to the UPS systems and other loads.',
    normal: 'Breakers closed, 480 V present.',
    fail: 'Losing it drops everything fed from it.',
  },
  ups: {
    title: 'UPS',
    what: 'Rectifier, inverter and batteries that ride through short outages.',
    normal: 'Online, batteries charged, load below 80 percent.',
    fail: 'On battery it can carry the load for only a few minutes.',
  },
  pdu: {
    title: 'Power distribution unit',
    what: 'Steps voltage down and feeds the rack circuits.',
    normal: 'About 208 V, load balanced across phases.',
    fail: 'A trip drops the racks on that circuit. Dual-fed racks stay up on the other feed.',
  },
  crah: {
    title: 'CRAH unit',
    what: 'Computer room air handler that cools the hall with chilled water.',
    normal: 'Fan running, supply air about 18 to 24 C.',
    fail: 'Heat builds up in its zone. The other units must take the load.',
  },
  chiller: {
    title: 'Chilled water loop',
    what: 'Pumps and pipework that carry chilled water to the CRAH units.',
    normal: 'Pumps running, loop temperature steady.',
    fail: 'All CRAH units lose cooling and temperatures rise quickly.',
  },
  network: {
    title: 'Core network',
    what: 'Switches and routers that connect the servers to each other and to customers.',
    normal: 'All uplinks up, no packet loss.',
    fail: 'Services become unreachable even though the servers are powered.',
  },
  storage: {
    title: 'Storage array',
    what: 'Shared disk storage used by the server cluster.',
    normal: 'Both controllers healthy, latency in single-digit milliseconds.',
    fail: 'Applications slow down or stop if latency grows or a controller fails.',
  },
  server: {
    title: 'Server cluster',
    what: 'The compute nodes that run customer workloads.',
    normal: 'All nodes up, workloads balanced.',
    fail: 'Workloads move to other nodes, or stop if too many nodes fail.',
  },
  fire: {
    title: 'Fire alarm panel',
    what: 'Collects smoke and heat detector signals and triggers the response.',
    normal: 'No active zones, panel healthy.',
    fail: 'Follow the evacuation procedure. Do not reset the panel without authority.',
  },
  leak: {
    title: 'Leak detection',
    what: 'Sensors that detect water under floors and near cooling equipment.',
    normal: 'All sensors dry.',
    fail: 'Water near power or IT equipment is a safety and uptime risk.',
  },
  security: {
    title: 'Access control',
    what: 'Door readers, cameras and alarms that control who can enter.',
    normal: 'All doors secure, readers online.',
    fail: 'Unauthorised entry is a safety and compliance risk. Do not confront anyone.',
  },
  rack: {
    title: 'Server racks',
    what: 'IT equipment, usually fed from both the A and B sides.',
    normal: 'Both feeds present, inlet temperature below 27 C.',
    fail: 'Losing both feeds takes the servers offline.',
  },
};
