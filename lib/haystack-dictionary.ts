// This dictionary maps common BACnet 'dis' name fragments and other point
// properties to standardized Project Haystack tags. This is the core of the
// feature engineering process for creating equipment signatures.

export const haystackTagDictionary: { [key: string]: string[] } = {
  // Common Point Types & Properties
  'sp': ['sp', 'point'],
  'cmd': ['cmd', 'point'],
  'sensor': ['sensor', 'point'],
  'cur': ['cur', 'sensor', 'point'],
  'his': ['his', 'point'],
  'writable': ['writable', 'point'],

  // Physical Properties
  'temp': ['temp'],
  't': ['temp'],
  'humidity': ['humidity'],
  'rh': ['humidity', 'rel'],
  'pressure': ['pressure'],
  'p': ['pressure'],
  'press': ['pressure'],
  'flow': ['flow'],
  'level': ['level'],
  'lvl': ['level'],
  'co2': ['co2', 'air', 'quality'],
  'voc': ['voc', 'air', 'quality'],
  'damper': ['damper'],
  'dpr': ['damper'],
  'valve': ['valve'],
  'vlv': ['valve'],
  'fan': ['fan'],
  'pump': ['pump'],
  'motor': ['motor'],
  'speed': ['speed'],
  'freq': ['freq'],
  
  // Locations & Mediums
  'air': ['air'],
  'water': ['water'],
  'chilled': ['chilled'],
  'chw': ['chilled', 'water'],
  'hot': ['hot'],
  'hw': ['hot', 'water'],
  'steam': ['steam'],
  'supply': ['supply'],
  'sa': ['supply', 'air'],
  'return': ['return'],
  'ra': ['return', 'air'],
  'exhaust': ['exhaust'],
  'ea': ['exhaust', 'air'],
  'outside': ['outside'],
  'oa': ['outside', 'air'],
  'zone': ['zone'],
  'room': ['zone'],
  'discharge': ['discharge'],
  'leaving': ['leaving'],
  'entering': ['entering'],
  'duct': ['duct'],
  'pipe': ['pipe'],

  // States & Statuses
  'enable': ['enable'],
  'enb': ['enable'],
  'disable': ['disable'],
  'dis': ['disable'],
  'status': ['status'],
  'sts': ['status'],
  'alarm': ['alarm'],
  'alm': ['alarm'],
  'fault': ['fault'],
  'flt': ['fault'],
  'on': ['on'],
  'off': ['off'],
  'occupied': ['occupied'],
  'occ': ['occupied'],
  'unoccupied': ['unoccupied'],
  'unocc': ['unoccupied'],
  'mode': ['mode'],
  'lead': ['lead'],
  'lag': ['lag'],
  'run': ['run'],
};

// List of all unique tags that can be generated. This defines the order
// and length of the feature vectors.
export const GLOBAL_HAYSTACK_TAG_LIST = Array.from(
  new Set(Object.values(haystackTagDictionary).flat())
).sort();
