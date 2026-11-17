// What is inside each kind of equipment: the main parts (laid out three across, two down) and the wires between them.
// A part is 'Name|what it does'. A wire is 'from|to|label|type|what it carries', where from and to are part numbers.
export const WIRE_TYPES = {
  ac: { name: 'AC power', color: '#ffb020', flow: true },
  dc: { name: 'DC power', color: '#ff4a68', flow: true },
  ctrl: { name: 'Control signal', color: '#19d3f5', flow: true },
  data: { name: 'Data', color: '#b388ff', flow: true },
  gnd: { name: 'Ground', color: '#2df5a1', flow: false },
  mech: { name: 'Mechanical link', color: '#9aa7b4', flow: false },
  fluid: { name: 'Water pipe', color: '#4da3ff', flow: true },
  fuel: { name: 'Fuel line', color: '#ff8a3d', flow: true },
};

const spec = (parts, wires) => ({
  parts: parts.map((p) => {
    const [name, note] = p.split('|');
    return { name, note };
  }),
  wires: wires.map((w) => {
    const [a, b, label, type, note] = w.split('|');
    return { a: +a, b: +b, label, type, note };
  }),
});

const SPECS = {
  util: spec(
    [
      'Incoming line|Cable arriving from the grid transformer',
      'Metering|Current and voltage transformers measure the feed',
      'Main disconnect|Isolates the site from the grid',
      'Surge arrester|Diverts voltage spikes to ground',
      'Protective relay|Trips the disconnect when it sees a fault',
      'Output terminals|Where the site takes its power',
    ],
    [
      '0|1|Incoming L1 L2 L3|ac|Three phase conductors at about 480 V',
      '1|2|Metered feed|ac|The same conductors after the measuring transformers',
      '2|5|Feed to the site|ac|What the rest of the facility receives',
      '4|2|Trip signal|ctrl|Low voltage signal that opens the main disconnect',
      '3|0|Surge path to ground|gnd|Carries spike current safely into the earth',
    ],
  ),
  mv: spec(
    [
      'Incoming bus|Medium voltage supply',
      'Circuit breaker|Interrupts fault current',
      'Outgoing bus|Feeds the step-down transformer',
      'Protection relay|Detects overcurrent and earth faults',
      'Trip coil|Releases the mechanism when the relay calls',
      'Operating mechanism|Spring that opens and closes the contacts',
    ],
    [
      '0|1|Incoming MV|ac|Medium voltage from the utility',
      '1|2|Outgoing MV|ac|Continues to the transformer when closed',
      '3|4|Trip command|ctrl|The relay energizes the trip coil',
      '4|5|Release|mech|The coil frees the stored spring energy',
      '5|1|Opens the contacts|mech|The spring moves the breaker contacts apart',
    ],
  ),
  ats: spec(
    [
      'Normal source terminals|Utility connection',
      'Normal contactor|Closes to feed the load from the utility',
      'Load terminals|Output to the building',
      'Emergency source terminals|Generator connection',
      'Emergency contactor|Closes to feed the load from the generator',
      'Transfer controller|Watches both sources and decides',
    ],
    [
      '0|1|Normal source 480 V|ac|Utility power in',
      '1|2|To the load|ac|Utility power out when the normal contactor is closed',
      '3|4|Emergency source 480 V|ac|Generator power in',
      '4|2|To the load (transferred)|ac|Generator power out when the emergency contactor is closed',
      '5|1|Normal contactor command|ctrl|Open or close order',
      '5|4|Emergency contactor command|ctrl|Open or close order',
      '0|5|Source sensing|ctrl|Lets the controller see if the utility is healthy',
    ],
  ),
  gen: spec(
    [
      'Fuel system|Tank, pump and filters',
      'Engine|Diesel engine that turns the shaft',
      'Alternator|Turns shaft rotation into electricity',
      'Voltage regulator|Keeps the output voltage steady',
      'Controller|Starts, stops and protects the set',
      'Output breaker|Connects the generator to the site',
    ],
    [
      '0|1|Fuel line|fuel|Diesel from the tank to the injectors',
      '1|2|Drive shaft|mech|The engine turns the alternator rotor',
      '2|5|3-phase output 480 V|ac|Generated power going to the breaker',
      '3|2|Field excitation|dc|Small DC current that sets the output voltage',
      '4|1|Start, stop and speed|ctrl|Controller commands to the engine',
      '4|5|Breaker close command|ctrl|Tells the output breaker when to close',
    ],
  ),
  msb: spec(
    [
      'Incoming breaker|Main protection for the board',
      'Main bus bars|Copper bars that share the power',
      'Feeder breaker 1|Protects the first outgoing circuit',
      'Ground bar|Bonds every metal part to earth',
      'Metering and protection|Measures and trips on a fault',
      'Feeder breaker 2|Protects the second outgoing circuit',
    ],
    [
      '0|1|Incoming feed|ac|Power from the ATS',
      '1|2|Feeder 1|ac|Power to the first UPS',
      '1|5|Feeder 2|ac|Power to the second UPS',
      '4|1|Voltage and current sensing|ctrl|Measurements for the protection relays',
      '3|1|Ground bond|gnd|Keeps the enclosure at earth potential',
    ],
  ),
  ups: spec(
    [
      'Input breaker|Connects the UPS to the board',
      'Rectifier|Converts AC to DC',
      'DC bus and battery|Stores energy for outages',
      'Output breaker|Feeds the protected load',
      'Static bypass|Fast switch around the inverter',
      'Inverter|Makes clean AC from DC',
    ],
    [
      '0|1|AC input|ac|Power from the switchboard',
      '1|2|DC charge|dc|Charges the batteries and feeds the inverter',
      '2|5|DC to the inverter|dc|Battery power if the input is lost',
      '5|3|Clean AC output|ac|Conditioned power to the load',
      '0|4|Bypass feed|ac|Direct path used for maintenance or a fault',
      '4|3|Bypass to the output|ac|Takes over if the inverter fails',
    ],
  ),
  pdu: spec(
    [
      'Input feed|Comes from the UPS',
      'Isolation transformer|Steps 480 V down to 208 V',
      'Main breaker|Protects the unit',
      'Output whips|Cables to the racks',
      'Branch breakers|One for each rack circuit',
      'Monitoring|Measures current on each branch',
    ],
    [
      '0|1|480 V in|ac|From the UPS',
      '1|2|208 V|ac|After the transformer',
      '2|4|To the branches|ac|Feeds the branch breaker panel',
      '4|3|Branch circuits|ac|Individual circuits to each rack',
      '5|4|Current sensing|data|Reports load to the monitoring system',
    ],
  ),
  rack: spec(
    [
      'Rack PDU A|Feed A power strip',
      'Server power supply 1|Takes power from feed A',
      'Motherboard|Runs the server',
      'Rack PDU B|Feed B power strip',
      'Server power supply 2|Takes power from feed B',
      'Top-of-rack switch|Network connection',
    ],
    [
      '0|1|Feed A power cord|ac|One of two independent feeds',
      '3|4|Feed B power cord|ac|The second, independent feed',
      '1|2|12 V rail|dc|Power to the board',
      '4|2|12 V rail|dc|Either supply can carry the whole server',
      '2|5|Network uplink|data|Connects the server to the network',
    ],
  ),
  crah: spec(
    [
      'Power supply|480 V feed for the unit',
      'Fan controller|Sets the fan speed',
      'Fan motor|Moves air through the coil',
      'Temperature sensor|Reads the air temperature',
      'Chilled water valve|Controls how much water flows',
      'Cooling coil|Water absorbs the heat from the air',
    ],
    [
      '0|1|480 V AC|ac|Power to the drive',
      '1|2|Motor drive output|ac|Variable frequency power to the fan',
      '3|1|Temperature signal|ctrl|Tells the controller how warm the air is',
      '1|4|Valve command 0 to 10 V|ctrl|Opens the valve more when it is warm',
      '4|5|Chilled water|fluid|Cold water entering the coil',
    ],
  ),
  chiller: spec(
    [
      'Variable speed drive|Controls the pump speed',
      'Pump motor|Turns the pump',
      'Pump|Moves the chilled water',
      'Loop controller|Keeps flow and temperature right',
      'Flow sensor|Measures the water flow',
      'Isolation valve|Lets maintenance close the line',
    ],
    [
      '0|1|Drive output 480 V|ac|Power to the pump motor',
      '1|2|Pump shaft|mech|The motor turns the pump',
      '2|5|Chilled water|fluid|Water leaving toward the cooling units',
      '4|3|Flow signal|ctrl|Tells the controller the flow rate',
      '3|0|Speed command|ctrl|Raises or lowers the pump speed',
    ],
  ),
  network: spec(
    [
      'Power supply A|First power input',
      'Switch fabric|Moves packets between ports',
      'Uplink optics|Fiber links to the rest of the network',
      'Power supply B|Second power input',
      'Management controller|Configuration and monitoring',
      'Ground lug|Chassis ground',
    ],
    [
      '0|1|DC power|dc|Power to the switch fabric',
      '3|1|DC power (second supply)|dc|Keeps it running if one supply fails',
      '1|2|Fiber uplink|data|Traffic to the next switch',
      '4|1|Management link|data|Configuration and status',
      '5|1|Chassis ground|gnd|Protects against static and faults',
    ],
  ),
  storage: spec(
    [
      'Power supply A|First power input',
      'Controller A|Handles reads and writes',
      'Disk shelf|Drives that hold the data',
      'Power supply B|Second power input',
      'Controller B|Partner controller',
      'Cache battery|Protects data in the write cache',
    ],
    [
      '0|1|DC power|dc|Power to controller A',
      '3|4|DC power|dc|Power to controller B',
      '1|2|Disk path A|data|Controller A talks to the disks',
      '4|2|Disk path B|data|Controller B talks to the disks',
      '1|4|Mirror link|data|Keeps the cache copy on both controllers',
      '5|4|Backup power|dc|Holds the cache if power is lost',
    ],
  ),
  server: spec(
    [
      'Power supply 1|First power supply',
      'Mainboard|Connects everything',
      'CPU and memory|Run the workloads',
      'Power supply 2|Second power supply',
      'Storage|Local drives',
      'Network card|Connects to the network',
    ],
    [
      '0|1|12 V rail|dc|Power to the board',
      '3|1|12 V rail (second)|dc|Backup path for the board',
      '1|2|Memory and CPU bus|data|Fast internal link',
      '1|4|Storage bus|data|Link to the drives',
      '1|5|PCIe link|data|Link to the network card',
    ],
  ),
  fire: spec(
    [
      'Detector loop|Smoke and heat detectors',
      'Alarm panel|Decides if there is a fire',
      'Horn and strobe|Warn people in the building',
      'Power supply and battery|24 V with a backup battery',
      'Relay outputs|Signals to other systems',
      'Suppression release|Starts gas or water release',
    ],
    [
      '0|1|Detector signal|ctrl|Low current loop from the detectors',
      '1|2|Notification circuit 24 V|dc|Sounds the horns and strobes',
      '3|1|24 V DC|dc|Keeps the panel alive during an outage',
      '1|4|Alarm relay|ctrl|Tells the building systems about the alarm',
      '4|5|Release signal|ctrl|Starts the suppression system',
    ],
  ),
  leak: spec(
    [
      'Sensing cable|Detects water along its length',
      'Leak controller|Locates the leak',
      'Network link|Sends alarms to monitoring',
      '24 V supply|Powers the controller',
      'Alarm relay|Contact output',
      'Shutoff valve|Closes the water supply',
    ],
    [
      '0|1|Sense signal|ctrl|Changes when the cable gets wet',
      '3|1|24 V DC|dc|Power to the controller',
      '1|2|Alarm to monitoring|data|Reports the leak and its location',
      '1|4|Relay output|ctrl|Closes a dry contact',
      '4|5|Close valve|ctrl|Shuts off the water',
    ],
  ),
  security: spec(
    [
      'Card reader|Reads the badge',
      'Door controller|Decides who may enter',
      'Electric lock|Holds the door closed',
      'Door sensor|Tells if the door is open',
      'Power supply and battery|12 V with a backup battery',
      'Network link|Reports events',
    ],
    [
      '0|1|Card data|data|Badge number from the reader',
      '1|2|Lock output 12 V|dc|Releases the lock for a valid badge',
      '3|1|Door position|ctrl|Open or closed',
      '4|1|12 V DC|dc|Power for the controller',
      '1|5|Event log|data|Every entry is recorded',
    ],
  ),
};

// Any equipment without its own diagram (for example one the admin added) gets a general layout.
const GENERIC = spec(
  [
    'Input terminals|Where the supply connects',
    'Protection|Breaker or fuse',
    'Main function|What the equipment does',
    'Monitoring|Measures what is happening',
    'Control|Decides what to do',
    'Output terminals|Where it passes power or service on',
  ],
  [
    '0|1|Supply in|ac|Incoming feed',
    '1|2|Protected supply|ac|Feed after the protection device',
    '2|5|Output|ac|What the equipment delivers',
    '3|4|Status signal|data|Measurements sent to the control',
    '4|2|Control signal|ctrl|Commands to the main function',
  ],
);

// What goes wrong when a wire of each type fails.
const FAIL_BY_TYPE = {
  ac: 'Everything fed through it loses power.',
  dc: 'The parts that depend on this DC supply stop working or fall back to a backup.',
  ctrl: 'The equipment stops responding to its controller, so it may not start, switch or trip when it should.',
  data: 'Monitoring and communication are lost, so problems are no longer reported.',
  gnd: 'Faults are no longer safely drained to earth, which is a shock and fire hazard.',
  mech: 'The two parts are no longer joined, so one keeps moving without driving the other.',
  fluid: 'The water flow stops and cooling is lost.',
  fuel: 'The engine is starved of fuel and stops.',
};
const PART_COLORS = ['#52627a', '#3f7a74', '#6f7d3f', '#66708a', '#7a6a4d', '#455268'];

// Turns the compact spec into the 3D layout: six boxes in two rows (back and front), wires as coloured tubes.
function toScene(spec) {
  const parts = spec.parts.map((p, i) => ({
    id: 'p' + i,
    name: p.name,
    desc: p.note,
    size: [2.4, 1.2, 1.1],
    pos: [((i % 3) - 1) * 3.1, 0.63, i < 3 ? -1 : 1],
    color: PART_COLORS[i % PART_COLORS.length],
  }));
  const wires = spec.wires.map((w, i) => ({
    id: 'w' + i,
    label: w.label,
    from: 'p' + w.a,
    to: 'p' + w.b,
    color: WIRE_TYPES[w.type].color,
    thick: ['ac', 'dc', 'gnd'].includes(w.type),
    carries: `${WIRE_TYPES[w.type].name}. ${w.note}.`,
    fail: FAIL_BY_TYPE[w.type],
  }));
  return { shell: [9.8, 3.6, 4.4], parts, wires };
}

const built = Object.fromEntries(Object.entries(SPECS).map(([kind, spec]) => [kind, toScene(spec)]));
const general = toScene(GENERIC);

// Every kind of equipment can be opened. Anything without its own diagram (for example one the admin added) gets the general layout.
export const INTERNALS = new Proxy(built, {
  get: (target, key) => (typeof key === 'string' ? target[key] || general : target[key]),
});
