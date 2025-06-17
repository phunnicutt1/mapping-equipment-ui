import { NextRequest, NextResponse } from 'next/server';
import { mockBACnetPoints } from '../../../lib/mock-data';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Get SkySpark configuration from environment
    const skysparkBaseUrl = process.env.SKYSPARK_BASE_URL;
    const skysparkProject = process.env.SKYSPARK_PROJECT;
    const skysparkSessionCookie = process.env.SKYSPARK_SESSION_COOKIE;
    const skysparkAttestKey = process.env.SKYSPARK_ATTEST_KEY;
    const skysparkUsername = process.env.SKYSPARK_USERNAME;
    const skysparkPassword = process.env.SKYSPARK_PASSWORD;

    console.log('🔌 SkySpark Connection Attempt:', {
      baseUrl: skysparkBaseUrl,
      project: skysparkProject,
      hasSessionCookie: !!skysparkSessionCookie,
      hasAttestKey: !!skysparkAttestKey,
      hasUsername: !!skysparkUsername,
      hasPassword: !!skysparkPassword
    });

    if (!skysparkBaseUrl || !skysparkProject || !skysparkSessionCookie) {
      console.log('⚠️ SkySpark not fully configured, using mock data');
      return NextResponse.json({
        success: true,
        data: mockBACnetPoints,
        source: 'mock',
        debug: {
          reason: 'Missing SkySpark configuration',
          hasBaseUrl: !!skysparkBaseUrl,
          hasProject: !!skysparkProject,
          hasSessionCookie: !!skysparkSessionCookie
        }
      });
    }

    const apiUrl = `${skysparkBaseUrl}/api/${skysparkProject}/read`;
    
    console.log('📡 Attempting SkySpark API calls:', apiUrl);

    // Prepare headers for session cookie authentication
    const headers: Record<string, string> = {
      'Content-Type': 'text/zinc; charset=utf-8',
      'Accept': 'text/zinc,application/json,text/plain',
      'Cookie': skysparkSessionCookie,
      'User-Agent': 'CxAlloy-PointGrouping/1.0'
    };

    // Include Attest-Key for CSRF protection when using cookie auth
    if (skysparkAttestKey) {
      headers['Attest-Key'] = skysparkAttestKey;
    }

    // Create proper Haystack grids for read operations
    const pointsGrid = `ver:"3.0"\nfilter\n"point"`;
    const connectorsGrid = `ver:"3.0"\nfilter\n"bacnetConn"`;

    // Fetch points data
    console.log('📡 Fetching points data...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: pointsGrid,
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    // Fetch connector data in parallel
    console.log('🔗 Fetching BACnet connector data...');
    const connectorsPromise = fetch(apiUrl, {
      method: 'POST',
      headers,
      body: connectorsGrid,
      signal: AbortSignal.timeout(15000)
    }).catch(error => {
      console.warn('⚠️ Failed to fetch connector data:', error.message);
      return null;
    });

    const responseTime = Date.now() - startTime;
    console.log('📊 SkySpark Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      responseTime: `${responseTime}ms`,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorDetails = '';
      try {
        errorDetails = await response.text();
      } catch (e) {
        errorDetails = 'Could not read error response';
      }
      
      throw new Error(`SkySpark API error: ${response.status} ${response.statusText}. Details: ${errorDetails}`);
    }

    const responseText = await response.text();
    console.log('✅ SkySpark points data received successfully:', {
      contentType: response.headers.get('content-type'),
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200) + '...'
    });

    // Wait for connector data
    const connectorsResponse = await connectorsPromise;
    let connectorsData = { rows: [] };
    
    if (connectorsResponse && connectorsResponse.ok) {
      const connectorsText = await connectorsResponse.text();
      console.log('🔗 SkySpark connector data received:', {
        responseLength: connectorsText.length,
        responsePreview: connectorsText.substring(0, 200) + '...'
      });
      
      try {
        connectorsData = JSON.parse(connectorsText);
      } catch (jsonError) {
        connectorsData = parseZincResponse(connectorsText);
      }
      
      console.log('📊 Parsed connector data:', {
        hasRows: connectorsData.rows?.length > 0,
        connectorCount: connectorsData.rows?.length || 0,
        sampleConnector: connectorsData.rows?.[0] || null
      });
    } else {
      console.warn('⚠️ No connector data available, proceeding without it');
    }

    // Parse Zinc response or try JSON fallback for points
    let skysparkData;
    try {
      // Try to parse as JSON first (some SkySpark configurations return JSON)
      skysparkData = JSON.parse(responseText);
      console.log('📊 Parsed points as JSON:', {
        type: typeof skysparkData,
        hasRows: 'rows' in skysparkData,
        hasCols: 'cols' in skysparkData,
        rowCount: skysparkData.rows?.length || 0
      });
    } catch (jsonError) {
      // Parse as Zinc format
      console.log('📊 Parsing points as Zinc format...');
      skysparkData = parseZincResponse(responseText);
      console.log('📊 Parsed points Zinc data:', {
        hasRows: skysparkData.rows?.length > 0,
        rowCount: skysparkData.rows?.length || 0,
        sampleRow: skysparkData.rows?.[0] || null
      });
    }

    // Transform SkySpark data to our format with connector information
    const transformedPoints = transformSkysparkData(skysparkData, connectorsData);

    return NextResponse.json({
      success: true,
      data: transformedPoints,
      source: 'skyspark',
      metadata: {
        totalPoints: transformedPoints.length,
        totalConnectors: connectorsData.rows?.length || 0,
        timestamp: new Date().toISOString()
      },
      debug: {
        originalCount: skysparkData.rows?.length || 0,
        transformedCount: transformedPoints.length,
        connectorsCount: connectorsData.rows?.length || 0,
        responseTime: `${responseTime}ms`,
        hasValidData: Array.isArray(skysparkData.rows),
        hasConnectorData: Array.isArray(connectorsData.rows) && connectorsData.rows.length > 0
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('❌ SkySpark connection failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      responseTime: `${responseTime}ms`
    });
    
    // Determine error type for better user feedback
    let errorType = 'unknown';
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorType = 'network';
        errorMessage = 'Cannot reach SkySpark server - check if server is running';
      } else if (error.message.includes('timeout') || error.name === 'TimeoutError') {
        errorType = 'timeout';
        errorMessage = 'SkySpark server timeout - server may be slow or unresponsive';
      } else if (error.message.includes('401')) {
        errorType = 'auth';
        errorMessage = 'Authentication failed - check SkySpark token';
      } else if (error.message.includes('403')) {
        errorType = 'permission';
        errorMessage = 'Permission denied - token may not have required access';
      } else if (error.message.includes('404')) {
        errorType = 'endpoint';
        errorMessage = 'API endpoint not found - check SkySpark URL and path';
      }
    }
    
    // Fallback to mock data
    return NextResponse.json({
      success: true,
      data: mockBACnetPoints,
      source: 'mock_fallback',
      error: errorMessage,
      debug: {
        errorType,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${responseTime}ms`,
        fallbackPointCount: mockBACnetPoints.length
      }
    });
  }
}

function parseZincResponse(zincText: string): any {
  // Proper Zinc parser - handles quoted values with commas correctly
  const lines = zincText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return { rows: [] };
  }

  // Parse header (should be version line)
  const versionLine = lines[0];
  if (!versionLine.startsWith('ver:')) {
    console.warn('⚠️ Unexpected Zinc format - no version header');
    return { rows: [] };
  }

  // Parse column headers (second line) with proper CSV parsing
  const headerLine = lines[1];
  const columns = parseZincCsvLine(headerLine);

  // Parse data rows
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseZincCsvLine(line);
    const row: any = {};

    for (let j = 0; j < columns.length && j < values.length; j++) {
      const col = columns[j];
      let value: any = values[j];

      // Zinc value parsing with proper type conversion
      if (value === 'N' || value === 'null' || value === '') {
        value = null;
      } else if (value === 'M') {
        value = 'M'; // Marker value
      } else if (value === 'T') {
        value = true; // True marker
      } else if (value === 'F') {
        value = false; // False marker
      } else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1); // Remove quotes and unescape
        value = value.replace(/\\"/g, '"'); // Unescape quotes
      } else if (value.startsWith('`') && value.endsWith('`')) {
        value = value.slice(1, -1); // URI value, keep as string
      } else if (value.startsWith('@')) {
        value = value; // Reference value, keep as string
      } else if (!isNaN(Number(value)) && value !== '') {
        value = Number(value);
      }

      row[col] = value;
    }

    rows.push(row);
  }

  return {
    rows,
    cols: columns.map(name => ({ name }))
  };
}

/**
 * Parse a CSV-style line with proper handling of quoted values containing commas
 */
function parseZincCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let inBackticks = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : '';

    if (char === '"' && !inBackticks) {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted string
        current += '"';
        i += 2; // Skip both quotes
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        current += char;
      }
    } else if (char === '`' && !inQuotes) {
      // URI backtick handling
      inBackticks = !inBackticks;
      current += char;
    } else if (char === ',' && !inQuotes && !inBackticks) {
      // Field separator - only when not inside quotes or backticks
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }

    i++;
  }

  // Add the last field
  if (current !== '' || values.length > 0) {
    values.push(current.trim());
  }

  return values;
}

function transformSkysparkData(skysparkData: any, connectorsData: any = { rows: [] }) {
  if (!skysparkData.rows || !Array.isArray(skysparkData.rows)) {
    console.warn('⚠️ Invalid SkySpark data format:', {
      hasRows: 'rows' in skysparkData,
      rowsType: typeof skysparkData.rows,
      isArray: Array.isArray(skysparkData.rows),
      sampleData: JSON.stringify(skysparkData).substring(0, 200) + '...'
    });
    return mockBACnetPoints;
  }

  // Create a map of connector references to connector data for quick lookup
  const connectorMap = new Map();
  if (connectorsData.rows && Array.isArray(connectorsData.rows)) {
    connectorsData.rows.forEach((connector: any) => {
      const connectorId = connector.id?.val || connector.id;
      if (connectorId) {
        connectorMap.set(connectorId, {
          vendorName: connector.vendorName?.val || connector.vendorName || null,
          modelName: connector.modelName?.val || connector.modelName || null,
          dis: connector.dis?.val || connector.dis || null,
          bacnetDeviceName: connector.bacnetDeviceName?.val || connector.bacnetDeviceName || null,
          uri: connector.uri?.val || connector.uri || null
        });
      }
    });
  }

  console.log('🔄 Transforming SkySpark data:', {
    totalRows: skysparkData.rows.length,
    totalConnectors: connectorMap.size,
    sampleRowKeys: skysparkData.rows[0] ? Object.keys(skysparkData.rows[0]) : [],
    firstRow: skysparkData.rows[0],
    sampleConnector: connectorMap.size > 0 ? Array.from(connectorMap.values())[0] : null
  });

  const transformedPoints = skysparkData.rows.map((row: any, index: number) => {
    try {
      // GUARANTEED FIELDS - These are always present
      const id = row.id?.val || row.id || `point-${index}`;
      const dis = row.dis?.val || row.dis || `Point ${index + 1}`;
      const bacnetCur = row.bacnetCur?.val || row.bacnetCur || row.addr?.val || row.addr || id;
      
      // OPTIONAL FIELDS - May be missing, especially early in project
      const kind = row.kind?.val || row.kind || null;
      const unit = row.unit?.val || row.unit || null;
      const navName = row.navName?.val || row.navName || row.path?.val || row.path || null;
      const bacnetDesc = row.bacnetDesc?.val || row.bacnetDesc || null;
      const bacnetDis = row.bacnetDis?.val || row.bacnetDis || null;
      const bacnetConnRef = row.bacnetConnRef?.val || row.bacnetConnRef || null;
      
      // CONNECTOR-BASED VENDOR/MODEL DETECTION - Try to get from connector data first
      let vendor = row.vendor?.val || row.vendor || null;
      let model = row.model?.val || row.model || null;
      let connectorInfo = null;
      
      if (bacnetConnRef && connectorMap.has(bacnetConnRef)) {
        connectorInfo = connectorMap.get(bacnetConnRef);
        // Use connector data if point doesn't have vendor/model directly
        if (!vendor && connectorInfo.vendorName) {
          vendor = connectorInfo.vendorName;
        }
        if (!model && connectorInfo.modelName) {
          model = connectorInfo.modelName;
        }
      }
      
      // EQUIPMENT REFERENCE EXTRACTION - Primary method
      const rawEquipRef = row.equipRef?.val || row.equipRef || null;
      let equipRef = null;
      let extractedEquipName = null;
      let confidence = 0.0;
      
      if (rawEquipRef && typeof rawEquipRef === 'string') {
        // Parse SkySpark reference format: @p:site:r:id "Equipment Name"
        const refMatch = rawEquipRef.match(/@p:[^"]*"([^"]+)"/);
        if (refMatch) {
          extractedEquipName = refMatch[1];
          // Create a normalized equipment ID
          equipRef = extractedEquipName.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
          confidence = 0.95; // High confidence when equipRef exists
        }
      }
      
      // FALLBACK EQUIPMENT DETECTION - Use guaranteed fields when equipRef is missing
      if (!equipRef) {
        // First try: Use connector display name if available (often more reliable)
        if (connectorInfo && connectorInfo.dis) {
          const connectorDetection = detectEquipmentFromDisplayName(connectorInfo.dis);
          if (connectorDetection) {
            equipRef = connectorDetection.equipRef;
            extractedEquipName = connectorDetection.equipName;
            confidence = connectorDetection.confidence * 0.95; // High confidence for connector names
          }
        }
        
        // Second try: Use connector bacnetDeviceName
        if (!equipRef && connectorInfo && connectorInfo.bacnetDeviceName) {
          const deviceDetection = detectEquipmentFromDisplayName(connectorInfo.bacnetDeviceName);
          if (deviceDetection) {
            equipRef = deviceDetection.equipRef;
            extractedEquipName = deviceDetection.equipName;
            confidence = deviceDetection.confidence * 0.9; // High confidence for device names
          }
        }
        
        // Third try: detect equipment from display name (dis) - this is guaranteed to exist
        if (!equipRef) {
          const equipmentDetection = detectEquipmentFromDisplayName(dis);
          if (equipmentDetection) {
            equipRef = equipmentDetection.equipRef;
            extractedEquipName = equipmentDetection.equipName;
            confidence = equipmentDetection.confidence;
          }
        }
        
        // Fourth try: navName if available
        if (!equipRef && navName) {
          const navDetection = detectEquipmentFromDisplayName(navName);
          if (navDetection) {
            equipRef = navDetection.equipRef;
            extractedEquipName = navDetection.equipName;
            confidence = navDetection.confidence * 0.8; // Lower confidence for navName
          }
        }
      }
      
      // VENDOR DETECTION - Try from existing data or extract from display name
      const detectedVendor = vendor || extractVendorFromName(dis);
      
      // FILENAME DETERMINATION - Use navName, dis, or equipRef for grouping
      const fileName = determineFileName(navName || dis, dis);
      
      // MARKER TAGS EXTRACTION - Extract property markers from SkySpark data
      const markers: string[] = [];
      Object.keys(row).forEach(key => {
        const value = row[key];
        // Check if this is a marker (boolean true or just presence indicates marker)
        if (value === true || value === 'm:' || (typeof value === 'object' && value?.val === undefined && !value?.val)) {
          // Common SkySpark marker tags
          const markerName = key.replace(/Marker$/, ''); // Remove 'Marker' suffix if present
          markers.push(markerName);
        }
      });
      
      // Always include 'point' as a base marker since this is a point
      if (!markers.includes('point')) {
        markers.unshift('point');
      }
      
      // DETERMINE SOURCE - Based on available data
      const source = bacnetConnRef ? 'read(bacnetConn)' : 'read(point)';

      const transformedPoint = {
        id,
        dis,
        bacnetCur,
        bacnetDesc,
        bacnetDis,
        bacnetConnRef,
        bacnetDeviceName: connectorInfo?.bacnetDeviceName || null, // Include valuable location/descriptive info
        kind: normalizeKind(kind),
        unit,
        vendor: detectedVendor,
        model,
        equipRef,
        equipName: extractedEquipName,
        navName,
        fileName,
        markers,
        source,
        status: equipRef ? 'suggested' as const : 'unassigned' as const,
        confidence,
        // Include original data for debugging
        originalData: process.env.DEBUG_EQUIPMENT_GROUPING === 'true' ? row : undefined
      };

    return transformedPoint;
    } catch (error) {
      console.error(`⚠️ Error transforming point ${index}:`, error, { originalRow: row });
      // Return a minimal valid point if transformation fails
      return {
        id: `error-point-${index}`,
        dis: `Error Point ${index + 1}`,
        bacnetCur: `error-${index}`,
        bacnetDesc: null,
        bacnetDis: null,
        bacnetConnRef: null,
        kind: 'Number' as const,
        unit: null,
        vendor: null,
        model: null,
        equipRef: null,
        navName: null,
        fileName: 'error_points.trio',
        markers: ['point'],
        source: 'read(point)',
        status: 'unassigned' as const
      };
    }
  });

  // Generate equipment groups from the transformed points
  const equipmentGroups = generateEquipmentGroups(transformedPoints);
  
  console.log('✅ SkySpark transformation completed:', {
    originalCount: skysparkData.rows.length,
    transformedCount: transformedPoints.length,
    pointsWithEquipRef: transformedPoints.filter((p: any) => p.equipRef).length,
    equipmentGroups: equipmentGroups.length,
    vendorDistribution: getVendorDistribution(transformedPoints),
    fileNameDistribution: getFileNameDistribution(transformedPoints),
    sampleEquipmentGroups: equipmentGroups.slice(0, 3).map(g => ({
      name: g.name,
      pointCount: g.pointCount,
      confidence: g.confidence
    }))
  });
  
  return transformedPoints;
}

function getVendorDistribution(points: any[]) {
  const vendors = points.reduce((acc, point) => {
    const vendor = point.vendor || 'Unknown';
    acc[vendor] = (acc[vendor] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return vendors;
}

function getFileNameDistribution(points: any[]) {
  const files = points.reduce((acc, point) => {
    acc[point.fileName] = (acc[point.fileName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return files;
}

function extractVendorFromName(name: string): string | undefined {
  const vendorPatterns = [
    { pattern: /johnson|jci|vma/i, vendor: 'Johnson Controls' },
    { pattern: /siemens|pol/i, vendor: 'Siemens' },
    { pattern: /trane|tr\d/i, vendor: 'Trane' },
    { pattern: /honeywell/i, vendor: 'Honeywell' },
    { pattern: /schneider/i, vendor: 'Schneider Electric' }
  ];

  for (const { pattern, vendor } of vendorPatterns) {
    if (pattern.test(name)) {
      return vendor;
    }
  }
  return undefined;
}

function determineFileName(navName: string, dis: string): string {
  // Try to extract equipment identifier from navName or dis
  const name = navName || dis;
  
  // Look for common equipment patterns
  const equipPatterns = [
    { pattern: /AHU[-_]?\d+/i, type: 'AHU' },
    { pattern: /VAV[-_]?\d+/i, type: 'VAV' },
    { pattern: /TU[-_]?\d+/i, type: 'TU' },
    { pattern: /FC[-_]?\d+/i, type: 'FC' },
    { pattern: /ERV[-_]?\d+/i, type: 'ERV' },
    { pattern: /FAN[-_]?\d+/i, type: 'FAN' },
    { pattern: /PUMP[-_]?\d+/i, type: 'PUMP' },
    { pattern: /CHILLER[-_]?\d+/i, type: 'CHILLER' },
    { pattern: /BOILER[-_]?\d+/i, type: 'BOILER' }
  ];

  for (const { pattern, type } of equipPatterns) {
    const match = name.match(pattern);
    if (match) {
      return `${match[0]}.trio.txt`;
    }
  }

  // Try to extract any equipment-like identifier
  const genericMatch = name.match(/([A-Z]{2,}[-_]?\d+)/i);
  if (genericMatch) {
    return `${genericMatch[1]}.trio.txt`;
  }

  // Default filename
  return 'misc_points.trio';
}

function normalizeKind(kind: any): 'Number' | 'Bool' | 'Str' {
  // Convert to string and handle null/undefined cases
  const kindStr = String(kind || 'Number');
  const kindLower = kindStr.toLowerCase();
  
  if (kindLower.includes('bool') || kindLower.includes('binary')) {
    return 'Bool';
  }
  if (kindLower.includes('str') || kindLower.includes('string') || kindLower.includes('text')) {
    return 'Str';
  }
  return 'Number';
}

function generateEquipmentGroups(points: any[]) {
  const equipmentMap = new Map();
  
  // Group points by equipRef
  points.forEach((point: any) => {
    if (point.equipRef) {
      if (!equipmentMap.has(point.equipRef)) {
        equipmentMap.set(point.equipRef, {
          id: point.equipRef,
          name: point.equipName || point.equipRef,
          points: [],
          vendor: point.vendor,
          model: point.model,
          fileName: point.fileName
        });
      }
      equipmentMap.get(point.equipRef).points.push(point);
    }
  });
  
  // Convert to equipment group format
  return Array.from(equipmentMap.values()).map((group: any) => {
    const equipType = determineEquipmentType(group.name);
    return {
      id: group.id,
      name: group.name,
      equipTypeName: equipType,
      pointCount: group.points.length,
      confidence: Math.min(0.95, 0.7 + (group.points.length * 0.05)), // Higher confidence with more points
      status: 'suggested',
      type: equipType,
      vendor: group.vendor,
      model: group.model,
      fileName: group.fileName,
      pointIds: group.points.map((p: any) => p.id)
    };
  });
}

function detectEquipmentFromDisplayName(displayName: string): { equipRef: string; equipName: string; confidence: number } | null {
  if (!displayName) return null;
  
  // Enhanced equipment detection patterns for building automation systems
  const equipmentPatterns = [
    // Air Handling Units
    { pattern: /\b(AHU[-_]?\d+[A-Z]*)\b/i, type: 'AHU', confidence: 0.9 },
    { pattern: /\b(Air[-_]?Hand(?:ling)?[-_]?Unit[-_]?\d+)\b/i, type: 'AHU', confidence: 0.85 },
    
    // Variable Air Volume Units  
    { pattern: /\b(VAV[-_]?\d+[A-Z]*)\b/i, type: 'VAV', confidence: 0.9 },
    { pattern: /\b(VV\d+[-_]?\d*)\b/i, type: 'VAV', confidence: 0.85 }, // VV1-05 style
    { pattern: /\b(Variable[-_]?Air[-_]?Volume[-_]?\d+)\b/i, type: 'VAV', confidence: 0.8 },
    
    // Terminal Units
    { pattern: /\b(TU[-_]?\d+[A-Z]*)\b/i, type: 'Terminal Unit', confidence: 0.9 },
    { pattern: /\b(Terminal[-_]?Unit[-_]?\d+)\b/i, type: 'Terminal Unit', confidence: 0.85 },
    
    // Fan Units
    { pattern: /\b(F[-_]?\d+[A-Z]*)\b/i, type: 'Fan', confidence: 0.75 },
    { pattern: /\b(FAN[-_]?\d+[A-Z]*)\b/i, type: 'Fan', confidence: 0.85 },
    { pattern: /\b(EF[-_]?\d+)\b/i, type: 'Exhaust Fan', confidence: 0.8 }, // Exhaust fans
    { pattern: /\b(SF[-_]?\d+)\b/i, type: 'Supply Fan', confidence: 0.8 }, // Supply fans
    
    // Control Valves
    { pattern: /\b(CV[-_]?\d+[A-Z]*)\b/i, type: 'Control Valve', confidence: 0.85 },
    { pattern: /\b(Control[-_]?Valve[-_]?\d+)\b/i, type: 'Control Valve', confidence: 0.8 },
    
    // Pumps
    { pattern: /\b(P[-_]?\d+[A-Z]*)\b/i, type: 'Pump', confidence: 0.75 },
    { pattern: /\b(PUMP[-_]?\d+[A-Z]*)\b/i, type: 'Pump', confidence: 0.85 },
    
    // Chillers
    { pattern: /\b(CH[-_]?\d+[A-Z]*)\b/i, type: 'Chiller', confidence: 0.85 },
    { pattern: /\b(CHILL(?:ER)?[-_]?\d+)\b/i, type: 'Chiller', confidence: 0.85 },
    
    // Boilers
    { pattern: /\b(B[-_]?\d+[A-Z]*)\b/i, type: 'Boiler', confidence: 0.75 },
    { pattern: /\b(BOIL(?:ER)?[-_]?\d+)\b/i, type: 'Boiler', confidence: 0.85 },
    
    // Heat Exchangers
    { pattern: /\b(HX[-_]?\d+[A-Z]*)\b/i, type: 'Heat Exchanger', confidence: 0.8 },
    
    // Energy Recovery Ventilators
    { pattern: /\b(ERV[-_]?\d+[A-Z]*)\b/i, type: 'ERV', confidence: 0.85 },
    
    // Generic equipment patterns (lower confidence)
    { pattern: /\b([A-Z]{2,4}[-_]?\d+[A-Z]*)\b/i, type: 'Equipment', confidence: 0.6 }
  ];
  
  for (const { pattern, type, confidence } of equipmentPatterns) {
    const match = displayName.match(pattern);
    if (match) {
      const equipName = match[1];
      const equipRef = equipName.toLowerCase().replace(/[-_]+/g, '_');
      
      return {
        equipRef,
        equipName,
        confidence
      };
    }
  }
  
  return null;
}

function determineEquipmentType(equipmentName: string): string {
  const name = equipmentName.toUpperCase();
  
  if (name.includes('AHU') || name.includes('AIR_HAND')) return 'AHU';
  if (name.includes('VAV') || name.includes('VARIABLE_AIR')) return 'VAV';
  if (name.includes('VV') && /\d/.test(name)) return 'VAV'; // VV1-05 style naming
  if (name.includes('TU') || name.includes('TERMINAL')) return 'Terminal Unit';
  if (name.includes('FAN') || name.includes('EXHAUST')) return 'Fan';
  if (name.includes('PUMP')) return 'Pump';
  if (name.includes('CHILLER')) return 'Chiller';
  if (name.includes('BOILER')) return 'Boiler';
  
  return 'Equipment';
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // For file upload, we'd process the uploaded file here
  // For now, return the current data source
  return NextResponse.json({
    success: true,
    message: 'File upload endpoint - implement file processing logic here',
    body
  });
}