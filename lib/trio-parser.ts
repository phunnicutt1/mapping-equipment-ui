import fs from 'fs';
import path from 'path';
import { BACnetPoint } from '../types';

/**
 * Trio File Parser for Building Automation Data
 * Parses real SkySpark trio files to create realistic mock data
 */

export interface TrioPoint {
  dis: string;
  bacnetCur?: string;
  bacnetDesc?: string;
  kind: 'Number' | 'Bool' | 'Str';
  unit?: string;
  point: boolean;
  cmd?: boolean;
  writable?: boolean;
  enum?: string;
  fileName: string;
}

/**
 * Parse a trio file and extract BACnet points
 */
export function parseTrioFile(content: string, fileName: string): TrioPoint[] {
  const points: TrioPoint[] = [];
  const sections = content.split('---').filter(section => section.trim());

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const point: Partial<TrioPoint> = { fileName };

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Parse key:value pairs
      if (trimmedLine.includes(':')) {
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':').trim();
        
        switch (key.trim()) {
          case 'dis':
            point.dis = value;
            break;
          case 'bacnetCur':
            point.bacnetCur = value;
            break;
          case 'bacnetDesc':
            point.bacnetDesc = value.replace(/"/g, '');
            break;
          case 'kind':
            point.kind = value as 'Number' | 'Bool' | 'Str';
            break;
          case 'unit':
            point.unit = value.replace(/"/g, '');
            break;
          case 'enum':
            point.enum = value.replace(/"/g, '');
            break;
        }
      } 
      // Parse boolean flags
      else {
        switch (trimmedLine) {
          case 'point':
            point.point = true;
            break;
          case 'cmd':
            point.cmd = true;
            break;
          case 'writable':
            point.writable = true;
            break;
        }
      }
    }

    // Only add if it's a valid point with required fields
    if (point.dis && point.kind && point.point) {
      points.push(point as TrioPoint);
    }
  }

  return points;
}

/**
 * Convert trio points to BACnet format
 */
export function trioToBACnetPoints(trioPoints: TrioPoint[]): BACnetPoint[] {
  return trioPoints.map((trioPoint, index) => {
    // Generate a unique ID
    const id = `${trioPoint.fileName.replace(/\.trio\.txt$/, '')}_${trioPoint.dis}_${index}`;
    
    // Determine vendor from equipment naming patterns
    const vendor = extractVendorFromFileName(trioPoint.fileName);
    
    return {
      id,
      dis: trioPoint.dis,
      bacnetCur: trioPoint.bacnetCur || trioPoint.dis,
      bacnetDesc: trioPoint.bacnetDesc,
      bacnetConnRef: extractConnRefFromFileName(trioPoint.fileName),
      kind: trioPoint.kind,
      unit: trioPoint.unit || null,
      vendor,
      model: extractModelFromFileName(trioPoint.fileName),
      equipRef: null,
      fileName: trioPoint.fileName,
      status: 'unassigned' as const,
      // Add realistic current values based on point type
      currentValue: generateRealisticValue(trioPoint)
    };
  });
}

/**
 * Extract vendor information from filename patterns
 */
function extractVendorFromFileName(fileName: string): string | undefined {
  const vendors = [
    { pattern: /mckinstryhcp|hcp/i, vendor: 'Johnson Controls' },
    { pattern: /epsten/i, vendor: 'Siemens' },
    { pattern: /gbamat/i, vendor: 'Honeywell' },
    { pattern: /AHU|ERV/i, vendor: 'Trane' },
    { pattern: /VAV/i, vendor: 'Schneider Electric' },
    { pattern: /CV-/i, vendor: 'Belimo' }
  ];

  for (const { pattern, vendor } of vendors) {
    if (pattern.test(fileName)) {
      return vendor;
    }
  }
  return undefined;
}

/**
 * Extract model information from filename
 */
function extractModelFromFileName(fileName: string): string | undefined {
  if (fileName.includes('AHU')) return 'AHU-2000';
  if (fileName.includes('VAV')) return 'VAV-1200';
  if (fileName.includes('CV-')) return 'LRB24-3';
  if (fileName.includes('TU-')) return 'FC-4040';
  if (fileName.includes('AC-')) return 'AC-3600';
  if (fileName.includes('FC-')) return 'FC-6200';
  return undefined;
}

/**
 * Extract connection reference from filename
 */
function extractConnRefFromFileName(fileName: string): string {
  // Extract the equipment name from filename (remove .trio.txt extension)
  const equipmentName = fileName.replace(/\.trio\.txt$/, '').replace(/\.trio$/, '');
  return `${equipmentName}_CONNECTOR`;
}

/**
 * Generate realistic current values for demo purposes
 */
function generateRealisticValue(point: TrioPoint): number | boolean | string | null {
  const dis = point.dis.toLowerCase();
  
  if (point.kind === 'Bool') {
    // Generate realistic boolean values based on point type
    if (dis.includes('fan') || dis.includes('pump')) {
      return Math.random() > 0.3; // Most fans/pumps running
    }
    if (dis.includes('alarm') || dis.includes('fault')) {
      return Math.random() > 0.95; // Few alarms
    }
    if (dis.includes('occupied') || dis.includes('occ')) {
      return Math.random() > 0.4; // Many spaces occupied
    }
    return Math.random() > 0.5;
  }
  
  if (point.kind === 'Number') {
    // Generate realistic numeric values based on unit and point type
    if (point.unit === '°F') {
      if (dis.includes('space') || dis.includes('room')) {
        return Math.round((Math.random() * 10 + 68) * 10) / 10; // 68-78°F
      }
      if (dis.includes('supply') || dis.includes('sa')) {
        return Math.round((Math.random() * 10 + 55) * 10) / 10; // 55-65°F
      }
      if (dis.includes('return') || dis.includes('ra')) {
        return Math.round((Math.random() * 8 + 72) * 10) / 10; // 72-80°F
      }
      if (dis.includes('outside') || dis.includes('oa')) {
        return Math.round((Math.random() * 40 + 30) * 10) / 10; // 30-70°F
      }
      return Math.round((Math.random() * 50 + 50) * 10) / 10; // Default temp range
    }
    
    if (point.unit === '%') {
      if (dis.includes('speed') || dis.includes('vfd')) {
        return Math.round(Math.random() * 80 + 20); // 20-100% fan speed
      }
      if (dis.includes('damper') || dis.includes('valve')) {
        return Math.round(Math.random() * 100); // 0-100% position
      }
      if (dis.includes('humidity') || dis.includes('rh')) {
        return Math.round(Math.random() * 30 + 35); // 35-65% RH
      }
      return Math.round(Math.random() * 100); // Generic percentage
    }
    
    if (point.unit === 'cfm') {
      if (dis.includes('supply') || dis.includes('sa')) {
        return Math.round(Math.random() * 5000 + 1000); // 1000-6000 CFM
      }
      if (dis.includes('exhaust') || dis.includes('ea')) {
        return Math.round(Math.random() * 3000 + 500); // 500-3500 CFM
      }
      return Math.round(Math.random() * 2000 + 200); // Default CFM
    }
    
    if (point.unit === 'inH₂O' || point.unit?.includes('inH')) {
      return Math.round(Math.random() * 2 * 100) / 100; // 0-2 inches of water
    }
    
    if (point.unit === 'ppm') {
      return Math.round(Math.random() * 500 + 400); // 400-900 ppm CO2
    }
    
    // Default numeric value
    return Math.round(Math.random() * 100 * 100) / 100;
  }
  
  if (point.kind === 'Str') {
    // Handle string/enum values
    if (point.enum) {
      const options = point.enum.split(',');
      return options[Math.floor(Math.random() * options.length)];
    }
    return 'AUTO';
  }
  
  return null;
}

/**
 * Load and parse all trio files from sample data directories
 */
export async function loadSampleTrioData(): Promise<BACnetPoint[]> {
  const sampleDataPath = path.join(process.cwd(), 'sample_data');
  const allPoints: BACnetPoint[] = [];
  
  try {
    // Define directories to scan
    const directories = [
      'converted_mckinstryhcp',  // Rich AHU and VAV data
      'converted_epsten',        // Multiple terminal units
      'gbamat'                   // Air conditioning and fan coils
    ];
    
    for (const dir of directories) {
      const dirPath = path.join(sampleDataPath, dir);
      
      if (!fs.existsSync(dirPath)) {
        console.log(`Directory not found: ${dirPath}`);
        continue;
      }
      
      const files = fs.readdirSync(dirPath)
        .filter(file => file.endsWith('.trio.txt') || file.endsWith('.trio'))
        .slice(0, 15); // Limit to first 15 files per directory for performance
      
      console.log(`📁 Loading ${files.length} files from ${dir}`);
      
      for (const file of files) {
        try {
          const filePath = path.join(dirPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const trioPoints = parseTrioFile(content, file);
          const bacnetPoints = trioToBACnetPoints(trioPoints);
          
          allPoints.push(...bacnetPoints);
          
          console.log(`  ✅ ${file}: ${trioPoints.length} points`);
        } catch (error) {
          console.log(`  ❌ ${file}: ${error.message}`);
        }
      }
    }
    
    console.log(`🎯 Total loaded: ${allPoints.length} points from ${directories.length} directories`);
    
  } catch (error) {
    console.error('Error loading sample trio data:', error);
  }
  
  return allPoints;
}

/**
 * Generate enhanced mock data with both simple and trio-based points
 */
export async function generateEnhancedMockData(): Promise<BACnetPoint[]> {
  console.log('🔧 Generating enhanced mock data...');
  
  try {
    // Load real trio data
    const trioPoints = await loadSampleTrioData();
    
    if (trioPoints.length > 0) {
      console.log(`✅ Using ${trioPoints.length} real building automation points`);
      return trioPoints;
    } else {
      console.log('⚠️ No trio data found, falling back to simple mock data');
      return getSimpleMockData();
    }
  } catch (error) {
    console.error('Error generating enhanced mock data:', error);
    console.log('📋 Falling back to simple mock data');
    return getSimpleMockData();
  }
}

/**
 * Simple fallback mock data (existing mock data)
 */
function getSimpleMockData(): BACnetPoint[] {
  return [
    {
      id: 'ahu1-temp-supply',
      dis: 'Supply Air Temperature',
      bacnetCur: 'AI001',
      bacnetDesc: 'AHU-1 Supply Air Temperature Sensor',
      kind: 'Number',
      unit: '°F',
      vendor: 'Johnson Controls',
      model: 'VMA1400',
      equipRef: null,
      fileName: 'AHU-1.trio.txt',
      status: 'unassigned'
    },
    {
      id: 'ahu1-fan-speed',
      dis: 'Supply Fan Speed',
      bacnetCur: 'AO001',
      bacnetDesc: 'AHU-1 Supply Fan VFD Speed',
      kind: 'Number',
      unit: '%',
      vendor: 'Johnson Controls',
      model: 'VMA1400',
      equipRef: null,
      fileName: 'AHU-1.trio.txt',
      status: 'unassigned'
    },
    // Add more simple mock points...
  ];
}
