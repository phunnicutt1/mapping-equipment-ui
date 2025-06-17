// This dictionary maps common BACnet 'dis' name fragments and other point
// properties to standardized Project Haystack tags. This is the core of the
// feature engineering process for creating equipment signatures.

export const haystackTagDictionary: { [key: string]: string[] } = {
  // ==================================================================================
  // === ENHANCED POINT TYPES & PROPERTIES ===
  // ==================================================================================
  'sp': ['sp', 'point'],
  'setpoint': ['sp', 'point'],
  'set': ['sp', 'point'],
  'cmd': ['cmd', 'point'],
  'command': ['cmd', 'point'],
  'control': ['cmd', 'point'],
  'ctl': ['cmd', 'point'],
  'sensor': ['sensor', 'point'],
  'sens': ['sensor', 'point'],
  'cur': ['cur', 'sensor', 'point'],
  'current': ['cur', 'sensor', 'point'],
  'his': ['his', 'point'],
  'history': ['his', 'point'],
  'writable': ['writable', 'point'],
  'write': ['writable', 'point'],
  'read': ['sensor', 'point'],
  'feedback': ['sensor', 'point'],
  'fb': ['sensor', 'point'],

  // ==================================================================================
  // === COMPREHENSIVE PHYSICAL PROPERTIES ===
  // ==================================================================================
  // Temperature variations
  'temp': ['temp'],
  'temperature': ['temp'],
  't': ['temp'],
  'tmp': ['temp'],
  'degf': ['temp'],
  'degc': ['temp'],
  'deg': ['temp'],
  
  // Humidity variations
  'humidity': ['humidity'],
  'humid': ['humidity'],
  'rh': ['humidity', 'rel'],
  'relhumidity': ['humidity', 'rel'],
  'relative': ['humidity', 'rel'],
  'moisture': ['humidity'],
  
  // Pressure variations
  'pressure': ['pressure'],
  'press': ['pressure'],
  'p': ['pressure'],
  'psi': ['pressure'],
  'pa': ['pressure'],
  'pascal': ['pressure'],
  'static': ['pressure', 'static'],
  'differential': ['pressure', 'differential'],
  'diff': ['pressure', 'differential'],
  'dp': ['pressure', 'differential'],
  
  // Flow variations
  'flow': ['flow'],
  'flowrate': ['flow'],
  'cfm': ['flow', 'air'],
  'gpm': ['flow', 'water'],
  'lpm': ['flow'],
  'volumetric': ['flow'],
  'mass': ['flow', 'mass'],
  'velocity': ['flow'],
  'vel': ['flow'],
  
  // Level variations
  'level': ['level'],
  'lvl': ['level'],
  'height': ['level'],
  'depth': ['level'],
  
  // Air Quality
  'co2': ['co2', 'air', 'quality'],
  'carbondioxide': ['co2', 'air', 'quality'],
  'co': ['co', 'air', 'quality'],
  'voc': ['voc', 'air', 'quality'],
  'volatile': ['voc', 'air', 'quality'],
  'organic': ['voc', 'air', 'quality'],
  'pm25': ['particulate', 'air', 'quality'],
  'pm10': ['particulate', 'air', 'quality'],
  'particulate': ['particulate', 'air', 'quality'],
  'particle': ['particulate', 'air', 'quality'],
  'dust': ['particulate', 'air', 'quality'],
  'filter': ['filter', 'air'],
  'filtration': ['filter', 'air'],
  
  // ==================================================================================
  // === ENHANCED EQUIPMENT COMPONENTS ===
  // ==================================================================================
  // Dampers
  'damper': ['damper'],
  'dpr': ['damper'],
  'damp': ['damper'],
  'economizer': ['damper', 'economizer'],
  'econ': ['damper', 'economizer'],
  'mixing': ['damper', 'mixing'],
  'mix': ['damper', 'mixing'],
  'minimum': ['damper', 'min'],
  'min': ['damper', 'min'],
  'maximum': ['damper', 'max'],
  'max': ['damper', 'max'],
  
  // Valves
  'valve': ['valve'],
  'vlv': ['valve'],
  'v': ['valve'],
  'modulating': ['valve', 'modulating'],
  'mod': ['valve', 'modulating'],
  'isolation': ['valve', 'isolation'],
  'iso': ['valve', 'isolation'],
  'bypass': ['valve', 'bypass'],
  'relief': ['valve', 'relief'],
  'check': ['valve', 'check'],
  '3way': ['valve', 'threeway'],
  '2way': ['valve', 'twoway'],
  'threeway': ['valve', 'threeway'],
  'twoway': ['valve', 'twoway'],
  
  // Fans & Motors
  'fan': ['fan'],
  'blower': ['fan'],
  'exhaust': ['exhaust'],
  'supply': ['supply'],
  'return': ['return'],
  'motor': ['motor'],
  'mtr': ['motor'],
  'drive': ['motor', 'drive'],
  'vfd': ['motor', 'drive', 'variable'],
  'variablefrequency': ['motor', 'drive', 'variable'],
  'speed': ['speed'],
  'rpm': ['speed'],
  'freq': ['freq'],
  'frequency': ['freq'],
  'hz': ['freq'],
  
  // Pumps
  'pump': ['pump'],
  'pmp': ['pump'],
  'circulator': ['pump', 'circulator'],
  'circ': ['pump', 'circulator'],
  'booster': ['pump', 'booster'],
  'primary': ['pump', 'primary'],
  'secondary': ['pump', 'secondary'],
  'standby': ['pump', 'standby'],
  'backup': ['pump', 'backup'],
  
  // ==================================================================================
  // === EXPANDED LOCATIONS & MEDIUMS ===
  // ==================================================================================
  // Air Systems
  'air': ['air'],
  'sa': ['supply', 'air'],
  'supplyair': ['supply', 'air'],
  'ra': ['return', 'air'],
  'returnair': ['return', 'air'],
  'ea': ['exhaust', 'air'],
  'exhaustair': ['exhaust', 'air'],
  'outside': ['outside'],
  'outdoor': ['outside'],
  'oa': ['outside', 'air'],
  'outsideair': ['outside', 'air'],
  'outdoorair': ['outside', 'air'],
  'fresh': ['outside', 'air'],
  'freshair': ['outside', 'air'],
  'mixed': ['mixed', 'air'],
  'ma': ['mixed', 'air'],
  'mixedair': ['mixed', 'air'],
  'discharge': ['discharge'],
  'leaving': ['leaving'],
  'entering': ['entering'],
  'inlet': ['entering'],
  'outlet': ['leaving'],
  
  // Water Systems
  'water': ['water'],
  'h2o': ['water'],
  'chilled': ['chilled'],
  'chw': ['chilled', 'water'],
  'chilledwater': ['chilled', 'water'],
  'chwp': ['chilled', 'water', 'pump'],
  'chws': ['chilled', 'water', 'supply'],
  'chwr': ['chilled', 'water', 'return'],
  'hot': ['hot'],
  'hw': ['hot', 'water'],
  'hotwater': ['hot', 'water'],
  'hwp': ['hot', 'water', 'pump'],
  'hws': ['hot', 'water', 'supply'],
  'hwr': ['hot', 'water', 'return'],
  'heating': ['hot', 'water'],
  'cooling': ['chilled', 'water'],
  'condenser': ['condenser', 'water'],
  'cw': ['condenser', 'water'],
  'condenserwater': ['condenser', 'water'],
  'cwp': ['condenser', 'water', 'pump'],
  'cws': ['condenser', 'water', 'supply'],
  'cwr': ['condenser', 'water', 'return'],
  'domestic': ['domestic', 'water'],
  'dhw': ['domestic', 'hot', 'water'],
  'domestichot': ['domestic', 'hot', 'water'],
  'makeup': ['makeup', 'water'],
  'make': ['makeup', 'water'],
  'steam': ['steam'],
  'condensate': ['condensate'],
  
  // Refrigerant
  'refrigerant': ['refrigerant'],
  'refrig': ['refrigerant'],
  'ref': ['refrigerant'],
  'freon': ['refrigerant'],
  'coolant': ['refrigerant'],
  
  // ==================================================================================
  // === SPATIAL LOCATIONS ===
  // ==================================================================================
  'zone': ['zone'],
  'room': ['zone'],
  'space': ['zone'],
  'area': ['zone'],
  'floor': ['floor'],
  'building': ['building'],
  'bldg': ['building'],
  'facility': ['building'],
  'site': ['site'],
  'campus': ['site'],
  'north': ['north'],
  'south': ['south'],
  'east': ['east'],
  'west': ['west'],
  'central': ['central'],
  'roof': ['roof'],
  'basement': ['basement'],
  'mechanical': ['mechanical'],
  'penthouse': ['penthouse'],
  'duct': ['duct'],
  'pipe': ['pipe'],
  'plenum': ['plenum'],
  
  // ==================================================================================
  // === ENHANCED STATES & STATUSES ===
  // ==================================================================================
  'enable': ['enable'],
  'enabled': ['enable'],
  'enb': ['enable'],
  'start': ['enable'],
  'disable': ['disable'],
  'disabled': ['disable'],
  'dis': ['disable'],
  'stop': ['disable'],
  'status': ['status'],
  'sts': ['status'],
  'state': ['status'],
  'condition': ['status'],
  'health': ['status'],
  'alarm': ['alarm'],
  'alm': ['alarm'],
  'alert': ['alarm'],
  'warning': ['alarm'],
  'warn': ['alarm'],
  'fault': ['fault'],
  'flt': ['fault'],
  'error': ['fault'],
  'err': ['fault'],
  'failure': ['fault'],
  'fail': ['fault'],
  'trip': ['fault'],
  'on': ['on'],
  'off': ['off'],
  'auto': ['auto'],
  'manual': ['manual'],
  'hand': ['manual'],
  'occupied': ['occupied'],
  'occ': ['occupied'],
  'occupancy': ['occupied'],
  'unoccupied': ['unoccupied'],
  'unocc': ['unoccupied'],
  'vacant': ['unoccupied'],
  'mode': ['mode'],
  'lead': ['lead'],
  'lag': ['lag'],
  'run': ['run'],
  'running': ['run'],
  'operating': ['run'],
  'operation': ['run'],
  'op': ['run'],
  'active': ['run'],
  'inactive': ['off'],
  'ready': ['ready'],
  'available': ['ready'],
  'unavailable': ['fault'],
  'maintenance': ['maintenance'],
  'maint': ['maintenance'],
  'service': ['maintenance'],
  'override': ['override'],
  'local': ['local'],
  'remote': ['remote'],
  'network': ['network'],
  'communication': ['network'],
  'comm': ['network'],
  'lost': ['fault', 'network'],
  'offline': ['fault', 'network'],
  'online': ['network'],
  
  // ==================================================================================
  // === ADDITIONAL BACNET ABBREVIATIONS ===
  // ==================================================================================
  // Equipment Types
  'ahu': ['ahu', 'air', 'handler'],
  'airhandler': ['ahu', 'air', 'handler'],
  'airhandlingunit': ['ahu', 'air', 'handler'],
  'rtu': ['rtu', 'roof', 'top'],
  'rooftop': ['rtu', 'roof', 'top'],
  'rooftopunit': ['rtu', 'roof', 'top'],
  'mau': ['mau', 'makeup', 'air'],
  'makeupair': ['mau', 'makeup', 'air'],
  'makeupairunit': ['mau', 'makeup', 'air'],
  'fcu': ['fcu', 'fan', 'coil'],
  'fancoil': ['fcu', 'fan', 'coil'],
  'fancoilunit': ['fcu', 'fan', 'coil'],
  'vav': ['vav', 'variable', 'air'],
  'variableair': ['vav', 'variable', 'air'],
  'variableairvolume': ['vav', 'variable', 'air'],
  'cav': ['cav', 'constant', 'air'],
  'constantair': ['cav', 'constant', 'air'],
  'constantairvolume': ['cav', 'constant', 'air'],
  'uv': ['uv', 'unit', 'ventilator'],
  'unitventilator': ['uv', 'unit', 'ventilator'],
  'efx': ['efx', 'exhaust', 'fan'],
  'exhaustfan': ['efx', 'exhaust', 'fan'],
  'sfx': ['sfx', 'supply', 'fan'],
  'supplyfan': ['sfx', 'supply', 'fan'],
  'rfx': ['rfx', 'return', 'fan'],
  'returnfan': ['rfx', 'return', 'fan'],
  'chiller': ['chiller'],
  'chlr': ['chiller'],
  'boiler': ['boiler'],
  'blr': ['boiler'],
  'coolingtower': ['cooling', 'tower'],
  'ct': ['cooling', 'tower'],
  'heatexchanger': ['heat', 'exchanger'],
  'hx': ['heat', 'exchanger'],
  'coil': ['coil'],
  'heatingcoil': ['heating', 'coil'],
  'coolingcoil': ['cooling', 'coil'],
  'hc': ['heating', 'coil'],
  'cc': ['cooling', 'coil'],
  'preheat': ['preheat', 'coil'],
  'reheat': ['reheat', 'coil'],
  'terminal': ['terminal'],
  'term': ['terminal'],
  'box': ['terminal'],
  
  // Advanced Equipment
  'enthalpy': ['enthalpy'],
  'energy': ['energy'],
  'power': ['power'],
  'kw': ['power'],
  'kilowatt': ['power'],
  'amp': ['current'],
  'amperage': ['current'],
  'voltage': ['voltage'],
  'volt': ['voltage'],
  'phase': ['phase'],
  'electrical': ['electrical'],
  'elec': ['electrical'],
  'lighting': ['lighting'],
  'light': ['lighting'],
  'occupancysensor': ['occupied', 'sensor'],
  'motion': ['occupied', 'sensor'],
  'photocell': ['lighting', 'sensor'],
  'daylight': ['lighting', 'sensor'],
  'schedule': ['schedule'],
  'sched': ['schedule'],
  'calendar': ['schedule'],
  'time': ['time'],
  'clock': ['time'],
  'timer': ['time'],
  
  // Environmental
  'ambient': ['outside'],
  'weather': ['weather'],
  'wind': ['wind'],
  'windspeed': ['wind', 'speed'],
  'winddirection': ['wind', 'direction'],
  'rain': ['rain'],
  'precipitation': ['rain'],
  'solar': ['solar'],
  'radiation': ['solar', 'radiation'],
  'ultraviolet': ['uv', 'radiation'],
  'dewpoint': ['dewpoint'],
  'wetbulb': ['wetbulb'],
    'drybulb': ['drybulb'],

  // Safety & Security
  'safety': ['safety'],
  'emergency': ['emergency'],
  'fire': ['fire', 'safety'],
  'smoke': ['smoke', 'safety'],
  'gas': ['gas', 'safety'],
  'leak': ['leak', 'safety'],
  'security': ['security'],
  'access': ['security', 'access'],
  'door': ['door', 'security'],
  'card': ['card', 'security'],
  'badge': ['badge', 'security'],
  'intrusion': ['intrusion', 'security'],
  'camera': ['camera', 'security'],
  'cctv': ['camera', 'security'],
  
  // Network & Communication
  'bacnet': ['bacnet', 'network'],
  'modbus': ['modbus', 'network'],
  'lonworks': ['lonworks', 'network'],
  'ethernet': ['ethernet', 'network'],
  'ip': ['ip', 'network'],
  'tcp': ['tcp', 'network'],
  'udp': ['udp', 'network'],
  'wireless': ['wireless', 'network'],
  'wifi': ['wireless', 'network'],
  'bluetooth': ['bluetooth', 'network'],
  'zigbee': ['zigbee', 'network'],
  'gateway': ['gateway', 'network'],
  'router': ['router', 'network'],
  'switch': ['switch', 'network'],
  'controller': ['controller'],
  'plc': ['controller', 'plc'],
  'ddc': ['controller', 'ddc'],
  'bms': ['controller', 'bms'],
  'bas': ['controller', 'bas'],
  'scada': ['controller', 'scada'],
  'hmi': ['hmi', 'interface'],
  'interface': ['interface'],
  'ui': ['interface'],
  'display': ['display', 'interface'],
  'panel': ['panel', 'interface'],
  'touchscreen': ['display', 'interface'],
};

// Enhanced unit-based tagging for better context awareness
export const unitBasedTags: { [unit: string]: string[] } = {
  // Temperature units
  '°f': ['temp'],
  '°c': ['temp'], 
  'degf': ['temp'],
  'degc': ['temp'],
  'deg': ['temp'],
  'k': ['temp'],
  'kelvin': ['temp'],
  'rankine': ['temp'],
  
  // Pressure units
  'psi': ['pressure'],
  'psig': ['pressure'],
  'psia': ['pressure'],
  'pa': ['pressure'],
  'kpa': ['pressure'],
  'bar': ['pressure'],
  'mbar': ['pressure'],
  'mmhg': ['pressure'],
  'inhg': ['pressure'],
  'inwc': ['pressure'],
  'mmwc': ['pressure'],
  'atm': ['pressure'],
  
  // Flow units
  'cfm': ['flow', 'air'],
  'scfm': ['flow', 'air'],
  'acfm': ['flow', 'air'],
  'gpm': ['flow', 'water'],
  'lpm': ['flow'],
  'lps': ['flow'],
  'l/s': ['flow'],
  'l/min': ['flow'],
  'm³/h': ['flow'],
  'm³/s': ['flow'],
  'ft³/min': ['flow', 'air'],
  'ft³/h': ['flow', 'air'],
  
  // Percentage
  '%': ['percent'],
  'percent': ['percent'],
  'pct': ['percent'],
  '%rh': ['humidity', 'rel'],
  '%open': ['position'],
  '%closed': ['position'],
  
  // Electrical units
  'v': ['voltage'],
  'volt': ['voltage'],
  'volts': ['voltage'],
  'kv': ['voltage'],
  'mv': ['voltage'],
  'a': ['current'],
  'amp': ['current'],
  'amps': ['current'],
  'ma': ['current'],
  'ka': ['current'],
  'w': ['power'],
  'watt': ['power'],
  'watts': ['power'],
  'kw': ['power'],
  'mw': ['power'],
  'kva': ['power', 'apparent'],
  'var': ['power', 'reactive'],
  'kvar': ['power', 'reactive'],
  'hz': ['freq'],
  'khz': ['freq'],
  'mhz': ['freq'],
  
  // Time units
  's': ['time'],
  'sec': ['time'],
  'second': ['time'],
  'seconds': ['time'],
  'min': ['time'],
  'minute': ['time'],
  'minutes': ['time'],
  'h': ['time'],
  'hr': ['time'],
  'hour': ['time'],
  'hours': ['time'],
  'd': ['time'],
  'day': ['time'],
  'days': ['time'],
  
  // Speed/Frequency
  'rpm': ['speed'],
  'rps': ['speed'],
  'rev/min': ['speed'],
  'rev/s': ['speed'],
  
  // Energy units
  'j': ['energy'],
  'joule': ['energy'],
  'kj': ['energy'],
  'mj': ['energy'],
  'btu': ['energy'],
  'kbtu': ['energy'],
  'mbtu': ['energy'],
  'kwh': ['energy'],
  'mwh': ['energy'],
  'wh': ['energy'],
  'cal': ['energy'],
  'kcal': ['energy'],
  'therm': ['energy'],
  
  // Distance/Length
  'mm': ['length'],
  'cm': ['length'],
  'm': ['length'],
  'km': ['length'],
  'in': ['length'],
  'ft': ['length'],
  'yd': ['length'],
  'mi': ['length'],
  
  // Area
  'm²': ['area'],
  'ft²': ['area'],
  'in²': ['area'],
  'sqft': ['area'],
  'sqm': ['area'],
  
  // Volume
  'l': ['volume'],
  'liter': ['volume'],
  'litre': ['volume'],
  'ml': ['volume'],
  'gal': ['volume'],
  'gallon': ['volume'],
  'qt': ['volume'],
  'pt': ['volume'],
  'ft³': ['volume'],
  'm³': ['volume'],
  'in³': ['volume'],
  
  // Mass
  'kg': ['mass'],
  'g': ['mass'],
  'mg': ['mass'],
  'lb': ['mass'],
  'lbs': ['mass'],
  'oz': ['mass'],
  'ton': ['mass'],
  'tonne': ['mass'],
  
  // Concentration
  'ppm': ['concentration'],
  'ppb': ['concentration'],
  'mg/l': ['concentration'],
  'mg/m³': ['concentration'],
  'µg/m³': ['concentration'],
  
  // Misc
  'db': ['sound'],
  'dba': ['sound'],
  'lux': ['illuminance'],
  'fc': ['illuminance'],
  'footcandle': ['illuminance'],
  'lumen': ['luminous'],
  'cd': ['luminous'],
  'candela': ['luminous'],
};

// Context-aware tag enhancement based on equipment patterns
export const contextEnhancement: { pattern: RegExp; additionalTags: string[] }[] = [
  // Equipment-specific contexts
  { pattern: /ahu|air.?handler/i, additionalTags: ['ahu', 'air', 'handler'] },
  { pattern: /rtu|roof.?top/i, additionalTags: ['rtu', 'roof', 'top'] },
  { pattern: /vav/i, additionalTags: ['vav', 'variable', 'air'] },
  { pattern: /fcu|fan.?coil/i, additionalTags: ['fcu', 'fan', 'coil'] },
  { pattern: /chiller/i, additionalTags: ['chiller'] },
  { pattern: /boiler/i, additionalTags: ['boiler'] },
  { pattern: /pump/i, additionalTags: ['pump'] },
  { pattern: /fan/i, additionalTags: ['fan'] },
  { pattern: /damper/i, additionalTags: ['damper'] },
  { pattern: /valve/i, additionalTags: ['valve'] },
  
  // System-specific contexts
  { pattern: /supply.*temp|sa.*temp/i, additionalTags: ['supply', 'air', 'temp'] },
  { pattern: /return.*temp|ra.*temp/i, additionalTags: ['return', 'air', 'temp'] },
  { pattern: /outside.*temp|oa.*temp/i, additionalTags: ['outside', 'air', 'temp'] },
  { pattern: /chw.*temp|chilled.*water.*temp/i, additionalTags: ['chilled', 'water', 'temp'] },
  { pattern: /hw.*temp|hot.*water.*temp/i, additionalTags: ['hot', 'water', 'temp'] },
  
  // Control contexts
  { pattern: /.*setpoint|.*sp$/i, additionalTags: ['sp'] },
  { pattern: /.*command|.*cmd$/i, additionalTags: ['cmd'] },
  { pattern: /.*status|.*sts$/i, additionalTags: ['status'] },
  { pattern: /.*alarm|.*alm$/i, additionalTags: ['alarm'] },
  { pattern: /.*feedback|.*fb$/i, additionalTags: ['sensor'] },
];

// List of all unique tags that can be generated. This defines the order
// and length of the feature vectors.
export const GLOBAL_HAYSTACK_TAG_LIST = Array.from(
  new Set([
    ...Object.values(haystackTagDictionary).flat(),
    ...Object.values(unitBasedTags).flat(),
    ...contextEnhancement.flatMap(c => c.additionalTags)
  ])
).sort();

// Enhanced tag mapping function with context awareness
export const getEnhancedTagsForPoint = (point: { dis: string; unit?: string; [key: string]: any }): Set<string> => {
  const tags = new Set<string>();
  
  // Standard dictionary mapping
  const disTokens = point.dis.toLowerCase().split(/[-_.]+/);
  disTokens.forEach(token => {
    if (haystackTagDictionary[token]) {
      haystackTagDictionary[token].forEach(tag => tags.add(tag));
    }
  });
  
  // Unit-based enhancement
  if (point.unit) {
    const unit = point.unit.toLowerCase().replace(/[^\w]/g, '');
    if (unitBasedTags[unit]) {
      unitBasedTags[unit].forEach(tag => tags.add(tag));
    }
    
    // Additional unit-specific logic
    if (unit.includes('°f') || unit.includes('°c') || unit.includes('deg')) {
      tags.add('temp');
    }
    if (unit.includes('%')) {
      if (point.dis.toLowerCase().includes('humid') || point.dis.toLowerCase().includes('rh')) {
        tags.add('humidity');
      } else {
        tags.add('percent');
      }
    }
    if (unit.includes('psi') || unit.includes('pa') || unit.includes('bar')) {
      tags.add('pressure');
    }
    if (unit.includes('cfm') || unit.includes('gpm') || unit.includes('lpm')) {
      tags.add('flow');
    }
  }
  
  // Context-aware enhancement
  contextEnhancement.forEach(({ pattern, additionalTags }) => {
    if (pattern.test(point.dis)) {
      additionalTags.forEach(tag => tags.add(tag));
    }
  });
  
  // Property-based tagging
  if (point.writable === '✓' || point.cmd === '✓') {
    tags.add('cmd');
    tags.add('writable');
  }
  if (point.sensor === '✓') {
    tags.add('sensor');
  }
  if (point.point === '✓') {
    tags.add('point');
  }
  if (point.his === '✓') {
    tags.add('his');
  }
  
  return tags;
};

// Tag quality scoring function
export const calculateTagQuality = (tags: Set<string>, pointName: string): number => {
  let quality = 0;
  
  // Base score for having any tags
  if (tags.size > 0) quality += 10;
  
  // Bonus for specific important tags
  if (tags.has('point')) quality += 15;
  if (tags.has('temp') || tags.has('pressure') || tags.has('flow')) quality += 10;
  if (tags.has('supply') || tags.has('return') || tags.has('exhaust')) quality += 8;
  if (tags.has('sensor') || tags.has('cmd')) quality += 12;
  
  // Penalty for too many generic tags
  const genericTags = ['air', 'water', 'status'];
  const genericCount = Array.from(tags).filter(tag => genericTags.includes(tag)).length;
  if (genericCount > 3) quality -= (genericCount - 3) * 2;
  
  // Bonus for balanced tag distribution
  const categoryBonus = Math.min(tags.size / 3, 5);
  quality += categoryBonus;
  
  // Length-based quality adjustment
  const nameLength = pointName.length;
  if (nameLength > 20 && tags.size < 3) quality -= 5; // Long names should have more tags
  if (nameLength < 10 && tags.size > 6) quality -= 3; // Short names shouldn't have too many tags
  
  return Math.max(0, Math.min(100, quality));
};

// Tag validation function
export const validateTagMapping = (point: { dis: string; unit?: string; [key: string]: any }): {
  isValid: boolean;
  quality: number;
  suggestions: string[];
  issues: string[];
} => {
  const tags = getEnhancedTagsForPoint(point);
  const quality = calculateTagQuality(tags, point.dis);
  const suggestions: string[] = [];
  const issues: string[] = [];
  
  // Check for common issues
  if (tags.size === 0) {
    issues.push('No tags generated for this point');
    suggestions.push('Consider adding manual tags or updating the dictionary');
  }
  
  if (tags.size > 8) {
    issues.push('Too many tags generated - may indicate over-mapping');
    suggestions.push('Review tag dictionary for overly broad mappings');
  }
  
  if (!tags.has('point') && (point.point === '✓' || point.dis.toLowerCase().includes('point'))) {
    issues.push('Missing "point" tag for what appears to be a point');
    suggestions.push('Ensure point identification is working correctly');
  }
  
  // Temperature-specific validation
  if (point.unit && (point.unit.includes('°') || point.unit.includes('deg'))) {
    if (!tags.has('temp')) {
      issues.push('Temperature unit detected but no temp tag');
      suggestions.push('Add temperature tag mapping for this unit');
    }
  }
  
  // Control point validation
  if (point.dis.toLowerCase().includes('setpoint') || point.dis.toLowerCase().includes('sp')) {
    if (!tags.has('sp')) {
      issues.push('Setpoint indicated in name but no sp tag');
      suggestions.push('Check setpoint tag mapping');
    }
  }
  
  return {
    isValid: issues.length === 0,
    quality,
    suggestions,
    issues
  };
};
