/**
 * Advanced SkySpark Data Parser
 * Handles Zinc format parsing and intelligent equipment instance grouping
 */

import { ProposedInstance, RawPoint, ConfirmedInstance } from './mapping-types';



// Zinc parsing utilities
interface ZincGrid {
  ver: string;
  meta?: Record<string, any>;
  cols: Array<{ name: string; meta?: Record<string, any> }>;
  rows: Array<Record<string, any>>;
}

interface ParsedPoint {
  id: string;
  dis: string;
  cur?: string;
  unit?: string;
  kind?: string;
  equipRef?: string;
  siteRef?: string;
  navName?: string;
  tags: Set<string>;
  metadata: Record<string, any>;
}

// Equipment grouping patterns
interface GroupingPattern {
  name: string;
  pattern: RegExp;
  confidence: number;
  priority: number;
}

// Common BACnet/HVAC equipment patterns
const EQUIPMENT_PATTERNS: GroupingPattern[] = [
  // VAV patterns
  {
    name: 'VAV',
    pattern: /^(VAV|VB)[-_]?(\d+[A-Z]?|\w+)$/i,
    confidence: 0.95,
    priority: 1
  },
  {
    name: 'VAV',
    pattern: /^(\w+[-_]?)?(VAV|VB)[-_]?(\d+[A-Z]?|\w+)$/i,
    confidence: 0.90,
    priority: 2
  },
  
  // AHU patterns
  {
    name: 'AHU',
    pattern: /^(AHU|AH|RTU)[-_]?(\d+[A-Z]?|\w+)$/i,
    confidence: 0.95,
    priority: 1
  },
  {
    name: 'AHU',
    pattern: /^(\w+[-_]?)?(AHU|AH|RTU)[-_]?(\d+[A-Z]?|\w+)$/i,
    confidence: 0.88,
    priority: 2
  },
  
  // FCU patterns (Fan Coil Units)
  {
    name: 'FCU',
    pattern: /^(FCU|FC)[-_]?(\d+[A-Z]?|\w+)$/i,
    confidence: 0.92,
    priority: 1
  },
  
  // Chiller patterns
  {
    name: 'Chiller',
    pattern: /^(CH|CHILLER|CHL)[-_]?(\d+[A-Z]?|\w+)$/i,
    confidence: 0.95,
    priority: 1
  },
  
  // Boiler patterns
  {
    name: 'Boiler',
    pattern: /^(BLR|BOILER|B)[-_]?(\d+[A-Z]?|\w+)$/i,
    confidence: 0.92,
    priority: 1
  },
  
  // Pump patterns
  {
    name: 'Pump',
    pattern: /^(P|PUMP|PMP)[-_]?(\d+[A-Z]?|\w+)$/i,
    confidence: 0.88,
    priority: 2
  },
  
  // Generic equipment with numbers
  {
    name: 'Equipment',
    pattern: /^([A-Z]{2,4})[-_]?(\d+[A-Z]?|\w+)$/i,
    confidence: 0.75,
    priority: 3
  }
];

/**
 * Parse Zinc format string into structured grid
 */
export function parseZincGrid(zincData: string): ZincGrid {
  const lines = zincData.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('Invalid Zinc format: insufficient lines');
  }

  // Parse version and metadata from first line
  const versionLine = lines[0];
  const versionMatch = versionLine.match(/ver:"([^"]+)"/);
  
  if (!versionMatch) {
    throw new Error('Invalid Zinc format: no version found');
  }

  const grid: ZincGrid = {
    ver: versionMatch[1],
    cols: [],
    rows: []
  };

  // Parse column headers from second line
  if (lines.length > 1) {
    const colLine = lines[1];
    const colNames = colLine.split(',').map(col => col.trim());
    
    grid.cols = colNames.map(name => ({
      name: name.replace(/"/g, ''), // Remove quotes
      meta: {}
    }));
  }

  // Parse data rows
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseZincRow(line);
    const row: Record<string, any> = {};

    grid.cols.forEach((col, index) => {
      if (index < values.length) {
        row[col.name] = values[index];
      }
    });

    grid.rows.push(row);
  }

  return grid;
}

/**
 * Parse a single Zinc row into values
 */
function parseZincRow(line: string): any[] {
  const values: any[] = [];
  let current = '';
  let inQuotes = false;
  let escapeNext = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(parseZincValue(current.trim()));
      current = '';
      continue;
    }

    current += char;
  }

  // Add the last value
  if (current.trim()) {
    values.push(parseZincValue(current.trim()));
  }

  return values;
}

/**
 * Parse individual Zinc values
 */
function parseZincValue(value: string): any {
  if (!value || value === 'N') return null;
  if (value === 'T') return true;
  if (value === 'F') return false;
  if (value === 'M') return undefined; // Marker
  
  // Number with unit
  const numberUnitMatch = value.match(/^(-?\d+(?:\.\d+)?)\s*([A-Za-z°%]+)?$/);
  if (numberUnitMatch) {
    const num = parseFloat(numberUnitMatch[1]);
    const unit = numberUnitMatch[2];
    return unit ? { val: num, unit } : num;
  }

  // Ref (like @site1)
  if (value.startsWith('@')) {
    return { _kind: 'ref', val: value.substring(1) };
  }

  // String
  return value;
}

/**
 * Transform SkySpark grid data to our RawPoint format
 */
export function transformToRawPoints(grid: ZincGrid): ParsedPoint[] {
  return grid.rows.map(row => {
    const tags = new Set<string>();
    const metadata: Record<string, any> = {};

    // Extract common tags from row data
    Object.entries(row).forEach(([key, value]) => {
      if (value === true || value === undefined) { // Marker tags
        tags.add(key);
      } else {
        metadata[key] = value;
      }
    });

    return {
      id: row.id || `point_${Math.random().toString(36).substr(2, 9)}`,
      dis: row.dis || row.navName || 'Unknown Point',
      cur: formatCurrentValue(row.curVal || row.cur),
      unit: extractUnit(row.curVal || row.cur || row.unit),
      kind: determineKind(row.kind || row.curVal),
      equipRef: extractRef(row.equipRef),
      siteRef: extractRef(row.siteRef),
      navName: row.navName,
      tags,
      metadata
    };
  });
}

/**
 * Helper functions for data transformation
 */
function formatCurrentValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object' && value.val !== undefined) {
    return value.unit ? `${value.val}${value.unit}` : String(value.val);
  }
  return String(value);
}

function extractUnit(value: any): string | undefined {
  if (typeof value === 'object' && value.unit) {
    return value.unit;
  }
  const match = String(value || '').match(/([A-Za-z°%]+)$/);
  return match ? match[1] : undefined;
}

function determineKind(value: any): 'Number' | 'Bool' | 'Str' {
  if (typeof value === 'boolean') return 'Bool';
  if (typeof value === 'number') return 'Number';
  if (typeof value === 'object' && value.val !== undefined) {
    return typeof value.val === 'number' ? 'Number' : 'Str';
  }
  return 'Str';
}

function extractRef(ref: any): string | undefined {
  if (typeof ref === 'object' && ref.val) {
    return ref.val;
  }
  if (typeof ref === 'string' && ref.startsWith('@')) {
    return ref.substring(1);
  }
  return ref;
}

/**
 * Intelligent equipment instance grouping
 */
export function groupPointsIntoInstances(points: ParsedPoint[]): ProposedInstance[] {
  // First, try to group by equipRef if available
  const explicitEquipInstances = groupByEquipRef(points);
  
  // Then, use pattern-based grouping for ungrouped points
  const usedPointIds = new Set(
    explicitEquipInstances.flatMap(inst => inst.rawPoints.map(p => p.id))
  );
  
  const remainingPoints = points.filter(point => !usedPointIds.has(point.id));
  const patternInstances = groupByPatterns(remainingPoints);
  
  // Combine results
  const allInstances = [...explicitEquipInstances, ...patternInstances];
  
  // Sort by confidence and return
  return allInstances.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Group points by explicit equipRef tags
 */
function groupByEquipRef(points: ParsedPoint[]): ProposedInstance[] {
  const equipGroups = new Map<string, ParsedPoint[]>();
  
  points.forEach(point => {
    if (point.equipRef) {
      if (!equipGroups.has(point.equipRef)) {
        equipGroups.set(point.equipRef, []);
      }
      equipGroups.get(point.equipRef)!.push(point);
    }
  });

  const instances: ProposedInstance[] = [];
  
  equipGroups.forEach((points, equipRef) => {
    const rawPoints: RawPoint[] = points.map(point => ({
      id: point.id,
      bacnetDis: point.dis,
      bacnetCur: point.cur || 'null',
      unit: point.unit,
      kind: point.kind as any,
      bacnetConnRef: point.equipRef,
      navName: point.navName,
      metadata: point.metadata
    }));

    instances.push({
      id: equipRef,
      name: equipRef,
      confidence: 0.95, // High confidence for explicit equipment references
      confidenceLevel: 'high',
      rawPoints,
      derivedFrom: 'grouping',
      metadata: {
        commonIdentifier: equipRef,
        sourceCount: points.length,
        similarityScore: 0.95
      }
    });
  });

  return instances;
}

/**
 * Group points using pattern matching
 */
function groupByPatterns(points: ParsedPoint[]): ProposedInstance[] {
  const instances: ProposedInstance[] = [];
  const usedPoints = new Set<string>();

  // Try each pattern in order of priority
  const sortedPatterns = [...EQUIPMENT_PATTERNS].sort((a, b) => a.priority - b.priority);

  sortedPatterns.forEach(pattern => {
    const patternGroups = new Map<string, ParsedPoint[]>();
    
    points.forEach(point => {
      if (usedPoints.has(point.id)) return;
      
      const match = extractEquipmentIdentifier(point.dis, pattern);
      if (match) {
        const key = match.toLowerCase();
        if (!patternGroups.has(key)) {
          patternGroups.set(key, []);
        }
        patternGroups.get(key)!.push(point);
      }
    });

    // Convert pattern groups to instances
    patternGroups.forEach((groupPoints, identifier) => {
      if (groupPoints.length < 2) return; // Skip single-point groups
      
      const rawPoints: RawPoint[] = groupPoints.map(point => ({
        id: point.id,
        bacnetDis: point.dis,
        bacnetCur: point.cur || 'null',
        unit: point.unit,
        kind: point.kind as any,
        navName: point.navName,
        metadata: point.metadata
      }));

      // Calculate confidence based on pattern and point count
      const baseConfidence = pattern.confidence;
      const countBonus = Math.min(0.1, (groupPoints.length - 2) * 0.02);
      const confidence = Math.min(0.98, baseConfidence + countBonus);

      instances.push({
        id: `${pattern.name.toLowerCase()}-${identifier}`,
        name: identifier.toUpperCase(),
        confidence,
        confidenceLevel: confidence >= 0.9 ? 'high' : confidence >= 0.75 ? 'medium' : 'low',
        rawPoints,
        derivedFrom: 'pattern',
        metadata: {
          commonIdentifier: identifier,
          sourceCount: groupPoints.length,
          similarityScore: confidence,
          patternUsed: pattern.name
        }
      });

      // Mark points as used
      groupPoints.forEach(point => usedPoints.add(point.id));
    });
  });

  return instances;
}

/**
 * Extract equipment identifier from point display name using pattern
 */
function extractEquipmentIdentifier(dis: string, pattern: GroupingPattern): string | null {
  const match = dis.match(pattern.pattern);
  if (!match) return null;

  // Return the equipment identifier (usually the captured group)
  return match[1] && match[2] ? `${match[1]}${match[2]}` : match[0];
}

/**
 * Main processing function that combines everything
 */
export async function processSkysarkData(zincData: string): Promise<ProposedInstance[]> {
  try {
    // Parse Zinc format
    const grid = parseZincGrid(zincData);
    
    // Transform to our point format
    const parsedPoints = transformToRawPoints(grid);
    
    // Group into equipment instances
    const proposedInstances = groupPointsIntoInstances(parsedPoints);
    
    // Sort by confidence
    return proposedInstances.sort((a, b) => b.confidence - a.confidence);
    
  } catch (error) {
    console.error('Error processing SkySpark data:', error);
    throw new Error(`Failed to process SkySpark data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 