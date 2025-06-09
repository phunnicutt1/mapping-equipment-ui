import { BACnetPoint, EquipmentType, EquipmentInstance, ProcessingStats } from './types';

export const equipmentTypes: EquipmentType[] = [
  {
    id: 'ahu',
    name: 'Air Handling Units',
    pattern: /AHU|Air.*Hand|ERV/i,
    confidence: 0.9,
    pointPatterns: ['temp', 'flow', 'pressure', 'fan', 'damper'],
    minPoints: 5,
    maxPoints: 100
  },
  {
    id: 'vav',
    name: 'VAV Terminal Units', 
    pattern: /VAV|Variable.*Air/i,
    confidence: 0.85,
    pointPatterns: ['temp', 'flow', 'damper', 'setpoint'],
    minPoints: 3,
    maxPoints: 20
  },
  {
    id: 'terminal-unit',
    name: 'Terminal Units',
    pattern: /TU|Terminal.*Unit/i,
    confidence: 0.8,
    pointPatterns: ['temp', 'valve', 'setpoint'],
    minPoints: 2,
    maxPoints: 15
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
  const intersection = new Set([...sA].filter(x => sB.has(x)));
  const union = new Set([...sA, ...sB]);
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

export function detectEquipmentFromFilename(fileName: string): { typeId: string; confidence: number } | null {
  for (const type of equipmentTypes) {
    if (type.pattern.test(fileName)) {
      return { typeId: type.id, confidence: type.confidence };
    }
  }
  return null;
}

export function groupPointsByEquipment(points: BACnetPoint[]): Map<string, BACnetPoint[]> {
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

export function processEquipmentGrouping(points: BACnetPoint[]) {
  const equipmentInstances: EquipmentInstance[] = [];
  const updatedPoints = [...points];
  
  // Group points by equipRef (if available) or by detected equipment patterns
  const equipmentGroups = new Map<string, BACnetPoint[]>();
  
  points.forEach(point => {
    let groupKey = null;
    
    if (point.equipRef) {
      // Primary method: Use SkySpark equipRef if available
      groupKey = point.equipRef;
    } else {
      // Fallback method: Group by filename detection (for early project stages)
      const detection = detectEquipmentFromFilename(point.fileName || '');
      if (detection) {
        groupKey = `${point.fileName}-${detection.typeId}`;
      }
    }
    
    if (groupKey) {
      if (!equipmentGroups.has(groupKey)) {
        equipmentGroups.set(groupKey, []);
      }
      equipmentGroups.get(groupKey)!.push(point);
    }
  });
  
  // Create equipment instances from grouped points
  equipmentGroups.forEach((groupPoints, groupKey) => {
    // Determine if this is a SkySpark equipRef group or filename-based group
    const isEquipRefGroup = groupPoints[0]?.equipRef === groupKey;
    
    let equipmentName: string;
    let typeId: string;
    let confidence: number;
    let fileName: string | undefined;
    
    if (isEquipRefGroup) {
      // Use SkySpark equipment data
      equipmentName = groupPoints[0]?.equipName || groupKey;
      typeId = determineEquipmentTypeFromName(equipmentName);
      confidence = groupPoints[0]?.confidence || 0.9;
      fileName = groupPoints[0]?.fileName;
    } else {
      // Use filename-based detection
      const [fileNamePart, detectedTypeId] = groupKey.split('-');
      equipmentName = fileNamePart.replace(/\.(trio|txt)$/, '');
      typeId = detectedTypeId;
      confidence = 0.7; // Lower confidence for filename-based detection
      fileName = fileNamePart;
    }
    
    const equipment: EquipmentInstance = {
      id: isEquipRefGroup ? groupKey : `${typeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: equipmentName,
      typeId,
      confidence: Math.min(0.95, confidence + (groupPoints.length * 0.02)), // Slightly higher confidence with more points
      status: 'suggested',
      pointIds: groupPoints.map(p => p.id),
      fileName
    };
    
    equipmentInstances.push(equipment);
    
    // Update points with equipment reference (if they don't already have one)
    groupPoints.forEach(point => {
      const pointIndex = updatedPoints.findIndex(p => p.id === point.id);
      if (pointIndex !== -1 && !updatedPoints[pointIndex].equipRef) {
        updatedPoints[pointIndex] = {
          ...updatedPoints[pointIndex],
          equipRef: equipment.id,
          status: 'suggested'
        };
      }
    });
  });
  
  // Calculate stats
  const assignedPoints = updatedPoints.filter(p => p.equipRef).length;
  const stats: ProcessingStats = {
    totalPoints: points.length,
    assignedPoints,
    equipmentGroups: equipmentInstances.length,
    confidenceDistribution: {
      high: equipmentInstances.filter(e => e.confidence >= 0.8).length,
      medium: equipmentInstances.filter(e => e.confidence >= 0.6 && e.confidence < 0.8).length,
      low: equipmentInstances.filter(e => e.confidence < 0.6).length
    }
  };
  
  return {
    points: updatedPoints,
    equipmentTypes,
    equipmentInstances,
    stats
  };
}

function determineEquipmentTypeFromName(equipmentName: string): string {
  const name = equipmentName.toUpperCase();
  
  if (name.includes('AHU') || name.includes('AIR_HAND')) return 'ahu';
  if (name.includes('VAV') || name.includes('VARIABLE_AIR') || (name.includes('VV') && /\d/.test(name))) return 'vav';
  if (name.includes('TU') || name.includes('TERMINAL')) return 'terminal-unit';
  if (name.includes('FAN') || name.includes('EXHAUST')) return 'fan';
  if (name.includes('PUMP')) return 'pump';
  if (name.includes('CHILLER')) return 'chiller';
  if (name.includes('BOILER')) return 'boiler';
  if (name.includes('ERV')) return 'erv';
  if (name.includes('CV') || name.includes('VALVE')) return 'control-valve';
  
  return 'equipment';
}