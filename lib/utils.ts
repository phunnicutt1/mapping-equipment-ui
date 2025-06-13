import { BACnetPoint, EquipmentType, EquipmentInstance, ProcessingStats } from './types';

// DEPRECATED: Hard-coded equipment types are being deprecated in favor of ML-generated clusters
// This array is maintained for backward compatibility only
// New equipment types are generated dynamically by K-Modes clustering
export const equipmentTypes: EquipmentType[] = [
  {
    id: 'ahus',
    name: 'AHUs (air handling units)',
    description: 'Equipment that conditions and delivers air via fans.',
    pattern: /AHU|Air.*Hand|ERV|MAU|RTU/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'flow', 'pressure', 'fan', 'damper', 'filter'],
    minPoints: 5,
    maxPoints: 100
  },
  {
    id: 'doas',
    name: 'DOAS (Dedicated Outside Air Systems)',
    description: 'AHUs that supply air directly to a zone.',
    pattern: /DOAS|Dedicated.*Outside.*Air|Outside.*Air.*System/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'flow', 'pressure', 'fan', 'damper', 'enthalpy'],
    minPoints: 5,
    maxPoints: 50
  },
  {
    id: 'boilers',
    name: 'Boilers',
    description: 'Equipment used to generate hot water or steam for heating.',
    pattern: /BOILER|Boiler|HW.*Boiler|Steam.*Boiler|Hot.*Water.*Gen/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'pressure', 'flow', 'status', 'setpoint', 'flame'],
    minPoints: 3,
    maxPoints: 30
  },
  {
    id: 'chillers',
    name: 'Chillers',
    description: 'Equipment used to remove heat from a liquid.',
    pattern: /CHILLER|Chiller|CW.*Chiller|CHW.*Plant|Cooling.*Plant/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'pressure', 'flow', 'status', 'setpoint', 'capacity'],
    minPoints: 5,
    maxPoints: 40
  },
  {
    id: 'vavs',
    name: 'VAVs (variable air volume terminal units)',
    description: 'Equipment in air distribution systems.',
    pattern: /VAV|Variable.*Air|VVT|Terminal.*Box/i,
    confidence: 0.85,
    pointPatterns: ['temp', 'flow', 'damper', 'setpoint', 'reheat'],
    minPoints: 3,
    maxPoints: 20
  },
  {
    id: 'heat-pumps',
    name: 'Heat Pumps',
    description: 'Equipment employing a vapor compression cycle with a reversing valve for heating or cooling.',
    pattern: /HP-|Heat.*Pump|VRF.*HP|Air.*Source.*HP|Water.*Source.*HP/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'mode', 'setpoint', 'status', 'capacity', 'reversing'],
    minPoints: 4,
    maxPoints: 25
  },
  {
    id: 'cracs',
    name: 'CRACs (Computer Room Air Conditioners)',
    description: 'Used to cool spaces housing computer and networking gear.',
    pattern: /CRAC|CRAH|Computer.*Room.*Air|Server.*Room.*AC|IT.*Cooling/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'humidity', 'airflow', 'status', 'setpoint', 'cooling'],
    minPoints: 4,
    maxPoints: 20
  },
  {
    id: 'fcus',
    name: 'FCUs (Fan Coil Units)',
    description: 'Devices with a fan used to condition air.',
    pattern: /FCU|Fan.*Coil|Unit.*Ventilator|Terminal.*Fan|Room.*Fan.*Coil/i,
    confidence: 0.85,
    pointPatterns: ['temp', 'fan', 'valve', 'setpoint', 'status'],
    minPoints: 3,
    maxPoints: 15
  },
  {
    id: 'dehumidifiers',
    name: 'Desiccant Dehumidifiers',
    description: 'Equipment that decreases air humidity using a substance that absorbs moisture.',
    pattern: /DEHUM|Dehumidifier|Desiccant|Humidity.*Control|Moisture.*Removal/i,
    confidence: 0.9,
    pointPatterns: ['humidity', 'temp', 'status', 'regen', 'wheel'],
    minPoints: 3,
    maxPoints: 15
  },
  {
    id: 'cooling-towers',
    name: 'Cooling Towers',
    description: 'Equipment used to transfer waste heat into the atmosphere.',
    pattern: /TOWER|Cooling.*Tower|CT-|Cool.*Tower|Heat.*Rejection/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'flow', 'fan', 'status', 'approach', 'range'],
    minPoints: 4,
    maxPoints: 20
  },
  {
    id: 'fume-hoods',
    name: 'Fume Hoods',
    description: 'Ventilation equipment designed to limit exposure to hazardous fumes.',
    pattern: /HOOD|Fume.*Hood|Lab.*Hood|Chemical.*Hood|Exhaust.*Hood/i,
    confidence: 0.9,
    pointPatterns: ['flow', 'sash', 'status', 'alarm', 'face.*velocity'],
    minPoints: 2,
    maxPoints: 10
  },
  {
    id: 'evse',
    name: 'EVSE (Electric Vehicle Supply Equipment)',
    description: 'Equipment that delivers power to an electric vehicle.',
    pattern: /EVSE|EV.*Charger|Electric.*Vehicle|Charging.*Station/i,
    confidence: 0.9,
    pointPatterns: ['power', 'current', 'status', 'session', 'energy'],
    minPoints: 2,
    maxPoints: 15
  },
  {
    id: 'elec-meters',
    name: 'Electric Meters',
    description: 'Representing the measurement of electricity consumption.',
    pattern: /ELEC.*METER|Electric.*Meter|KWH.*Meter|Power.*Meter|Energy.*Meter/i,
    confidence: 0.9,
    pointPatterns: ['energy', 'power', 'current', 'voltage', 'demand'],
    minPoints: 1,
    maxPoints: 10
  },
  {
    id: 'gas-meters',
    name: 'Gas Meters',
    description: 'Representing the measurement of gas consumption.',
    pattern: /GAS.*METER|Gas.*Meter|BTU.*Meter|Thermal.*Meter|Natural.*Gas.*Meter/i,
    confidence: 0.9,
    pointPatterns: ['flow', 'volume', 'energy', 'pressure', 'temperature'],
    minPoints: 1,
    maxPoints: 8
  },
  {
    id: 'water-meters',
    name: 'Water Meters',
    description: 'Representing the measurement of water consumption.',
    pattern: /WATER.*METER|Water.*Meter|Flow.*Meter|H2O.*Meter|Domestic.*Water.*Meter/i,
    confidence: 0.9,
    pointPatterns: ['flow', 'volume', 'pressure', 'rate'],
    minPoints: 1,
    maxPoints: 6
  },
  {
    id: 'steam-meters',
    name: 'Steam Meters',
    description: 'Representing the measurement of steam consumption.',
    pattern: /STEAM.*METER|Steam.*Meter|Steam.*Flow|Condensate.*Meter/i,
    confidence: 0.9,
    pointPatterns: ['flow', 'pressure', 'temp', 'mass', 'energy'],
    minPoints: 2,
    maxPoints: 8
  },
  {
    id: 'zones',
    name: 'Zones (zone occupancy, hvac, air quality, lighting)',
    description: 'Room or space control systems for occupancy, HVAC, air quality, and lighting.',
    pattern: /ZONE|Zone|Room|Space|Area|Occupancy|Lighting|CO2/i,
    confidence: 0.8,
    pointPatterns: ['temp', 'occupancy', 'co2', 'lighting', 'setpoint'],
    minPoints: 1,
    maxPoints: 15
  },
  {
    id: 'motors',
    name: 'Motors (fans, pumps, and other motors)',
    description: 'Motor-driven equipment including fans, pumps, and variable frequency drives.',
    pattern: /MOTOR|Motor|FAN|Fan|PUMP|Pump|HWP|CWP|EF-|SF-|RF-|VFD|Drive/i,
    confidence: 0.85,
    pointPatterns: ['speed', 'status', 'flow', 'pressure', 'current'],
    minPoints: 2,
    maxPoints: 25
  },
  {
    id: 'elec-panels',
    name: 'Elec Panels (electrical panels, circuits, and breakers)',
    description: 'Electrical distribution panels, circuits, and protective equipment.',
    pattern: /PANEL|Panel|MDP|DP|Circuit|Breaker|Electrical|Switch.*Gear/i,
    confidence: 0.85,
    pointPatterns: ['voltage', 'current', 'power', 'status', 'breaker'],
    minPoints: 1,
    maxPoints: 30
  },
  {
    id: 'vrf',
    name: 'VRF (variable refrigerant flow systems)',
    description: 'Variable refrigerant flow air conditioning systems.',
    pattern: /VRF|Variable.*Refrigerant|VRV|Multi.*Split/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'mode', 'setpoint', 'status', 'capacity'],
    minPoints: 3,
    maxPoints: 40
  },
  {
    id: 'ates',
    name: 'ATES (aquifer thermal energy storage)',
    description: 'Aquifer thermal energy storage systems for seasonal energy storage.',
    pattern: /ATES|Aquifer|Thermal.*Storage|Ground.*Source/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'flow', 'pressure', 'energy'],
    minPoints: 2,
    maxPoints: 20
  },
  {
    id: 'data-centers',
    name: 'Data Centers (data center spaces and equipment)',
    description: 'Data center infrastructure including servers, networking, and environmental controls.',
    pattern: /DATA.*CENTER|Server.*Room|IT.*Room|UPS|PDU/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'humidity', 'power', 'cooling', 'airflow'],
    minPoints: 3,
    maxPoints: 50
  }
];

export const vendorModelPatterns = [
  {
    vendor: 'Johnson Controls',
    modelPatterns: [/VMA\d+/i, /JCI\d+/i],
    equipmentTypes: ['ahu', 'control-valve']
  },
  {
    vendor: 'Siemens',
    modelPatterns: [/POL\d+/i, /SIE\d+/i],
    equipmentTypes: ['vav', 'terminal-unit']
  }
];

export function calculateJaccardSimilarity(setA: string[], setB: string[]): number {
  const sA = new Set(setA);
  const sB = new Set(setB);
  const intersection = new Set(Array.from(sA).filter(x => sB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export function normalizePointName(pointName: string): string {
  return pointName
    .replace(/[-_]/g, ' ')
    .replace(/\b(SP|STPT)\b/gi, 'Setpoint')
    .replace(/\b(TEMP|TMP)\b/gi, 'Temperature')
    .replace(/\b(FLOW|FLW)\b/gi, 'Flow')
    .trim();
}

// DEPRECATED: detectEquipmentFromFilename has been deprecated
// Equipment detection is now handled by K-Modes clustering and Project Haystack semantic tagging
// This function is kept for backward compatibility only
export function detectEquipmentFromFilename(fileName: string): { typeId: string; confidence: number } | null {
  console.warn('DEPRECATED: detectEquipmentFromFilename is deprecated. Use ML pipeline for equipment detection.');
  
  for (const type of equipmentTypes) {
    if (type.pattern?.test(fileName)) {
      return { typeId: type.id, confidence: type.confidence || 0.5 };
    }
  }
  return null;
}

// DEPRECATED: groupPointsByEquipment has been deprecated
// Point grouping is now handled by the ML pipeline using K-Modes clustering
// This function is kept for backward compatibility only
export function groupPointsByEquipment(points: BACnetPoint[]): Map<string, BACnetPoint[]> {
  console.warn('DEPRECATED: groupPointsByEquipment is deprecated. Use ML pipeline for point grouping.');
  
  const groups = new Map<string, BACnetPoint[]>();
  
  points.forEach(point => {
    if (point.fileName) {
      const detection = detectEquipmentFromFilename(point.fileName);
      if (detection) {
        const key = `${point.fileName}-${detection.typeId}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(point);
      }
    }
  });
  
  return groups;
}

// DEPRECATED: processEquipmentGrouping has been removed
// This function has been replaced by the ML-based clustering pipeline in lib/bacnet-processor.ts
// Use the upload workflow and processUploadedFiles function for new equipment processing

// DEPRECATED: determineEquipmentTypeFromName has been removed
// Equipment type determination is now handled by K-Modes clustering and Project Haystack semantic tagging
// in the ML pipeline (lib/bacnet-processor.ts)

export function getEquipmentDisplayName(fullName: string): string {
  // Split by spaces and take the last segment
  const segments = fullName.trim().split(/\s+/);
  return segments[segments.length - 1];
}

// Generate a random color for equipment templates
export function generateRandomTemplateColor(): string {
  const colors = [
    'bg-blue-500',
    'bg-purple-500', 
    'bg-green-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-teal-500',
    'bg-violet-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-lime-500',
    'bg-rose-500',
    'bg-slate-500',
    'bg-zinc-500',
    'bg-red-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-green-600',
    'bg-indigo-600',
    'bg-cyan-600',
    'bg-pink-600',
    'bg-teal-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-orange-600'
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

// Convert background color to border color
export function bgColorToBorderColor(bgColor: string): string {
  return bgColor.replace('bg-', 'border-l-');
}

// Equipment type color mapping for visual consistency across components
export function getEquipmentTypeColor(typeId: string, templates?: any[]): string {
  // If templates are provided, find the template color
  if (templates) {
    const template = templates.find(t => t.id === typeId || t.equipmentTypeId === typeId);
    if (template && template.color) {
      return template.color;
    }
  }
  
  // Fallback to predefined colors for backward compatibility
  const colors = {
    'ahu': 'bg-blue-500',
    'vav': 'bg-purple-500', 
    'terminal-unit': 'bg-green-500',
    'control-valve': 'bg-orange-500',
    'fan-unit': 'bg-red-500',
    'pump-unit': 'bg-indigo-500',
    'boiler': 'bg-red-600',
    'chiller': 'bg-cyan-500',
    'heat-exchanger': 'bg-pink-500',
    'damper': 'bg-yellow-500',
    'sensor': 'bg-teal-500',
    'controller': 'bg-violet-500',
    'vfd': 'bg-emerald-500',
    'meter': 'bg-amber-500',
    'lighting': 'bg-lime-500',
    'hvac-equipment': 'bg-slate-500',
    'mechanical-equipment': 'bg-zinc-500',
    'electrical-equipment': 'bg-rose-500',
    'auto': 'bg-gradient-to-r from-blue-400 to-purple-500'
  };
  return colors[typeId as keyof typeof colors] || 'bg-gray-500';
}

// Get border color variant for equipment type indicators
export function getEquipmentTypeBorderColor(typeId: string, templates?: any[]): string {
  // If templates are provided, find the template color and convert to border
  if (templates) {
    const template = templates.find(t => t.id === typeId || t.equipmentTypeId === typeId);
    if (template && template.color) {
      return bgColorToBorderColor(template.color);
    }
  }
  
  // Fallback to predefined colors
  const colors = {
    'ahu': 'border-l-blue-500',
    'vav': 'border-l-purple-500', 
    'terminal-unit': 'border-l-green-500',
    'control-valve': 'border-l-orange-500',
    'fan-unit': 'border-l-red-500',
    'pump-unit': 'border-l-indigo-500',
    'boiler': 'border-l-red-600',
    'chiller': 'border-l-cyan-500',
    'heat-exchanger': 'border-l-pink-500',
    'damper': 'border-l-yellow-500',
    'sensor': 'border-l-teal-500',
    'controller': 'border-l-violet-500',
    'vfd': 'border-l-emerald-500',
    'meter': 'border-l-amber-500',
    'lighting': 'border-l-lime-500',
    'hvac-equipment': 'border-l-slate-500',
    'mechanical-equipment': 'border-l-zinc-500',
    'electrical-equipment': 'border-l-rose-500',
    'auto': 'border-l-blue-500' // fallback for gradient
  };
  return colors[typeId as keyof typeof colors] || 'border-l-gray-500';
}