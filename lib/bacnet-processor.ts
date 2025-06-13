//
// This is the complete and corrected BACnet processing module.
// It includes all logic for parsing, feature engineering, clustering,
// classification, and scoring, with consolidated imports and no duplicates.
//

import { v4 as uuidv4 } from 'uuid';
import { 
  BACnetPoint, 
  EquipmentInstance, 
  EquipmentTemplate, 
  ProcessingResult, 
  PointSignature 
} from './types';
import { haystackTagDictionary, GLOBAL_HAYSTACK_TAG_LIST } from './haystack-dictionary';


// =================================================================================
// === Stage 1: Parsing and Data Unification
// =================================================================================

const parseTrioLine = (line: string): Partial<BACnetPoint> => {
  const parts = line.split(' ');
  const dis = parts[0];
  if (!dis) return {}; // Handle empty or malformed lines

  const tags = parts.slice(1);
  const point: Partial<BACnetPoint> = { dis, id: dis };
  tags.forEach(tag => {
    if (tag.includes(':')) {
      const [key, value] = tag.split(':');
      point[key as keyof BACnetPoint] = value;
    } else if (tag) { // Ensure tag is not an empty string
      point[tag as keyof BACnetPoint] = '✓';
    }
  });
  return point;
};

export const parseTrioFile = async (file: File): Promise<BACnetPoint[]> => {
  const text = await file.text();
  return text.split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      const parsedPoint = parseTrioLine(line);
      // Ensure the point has a 'dis' before including it
      if (!parsedPoint.dis) return null;
      return {
        ...parsedPoint,
        fileName: file.name,
      };
    })
    .filter((p): p is BACnetPoint => p !== null);
};


export const parseConnectorFile = async (file: File): Promise<Partial<EquipmentInstance>[]> => {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return []; // Return early if file is empty
  const headers = lines[0].split('\t').map(h => h.trim());
  const equipNameIndex = headers.findIndex(h => h.toLowerCase().includes('equip/connector name'));
  
  if (equipNameIndex === -1) {
    throw new Error("Could not find 'Equip/Connector Name' in connector file headers.");
  }

  return lines.slice(1).map(line => {
    const values = line.split('\t');
    return { id: values[equipNameIndex], name: values[equipNameIndex] };
  });
};

export const unifyBacnetData = (
  equipmentData: Partial<EquipmentInstance>[],
  allPoints: BACnetPoint[]
): { unifiedEquipment: EquipmentInstance[], allPoints: BACnetPoint[] } => {
  const pointMap = new Map<string, BACnetPoint[]>();
  allPoints.forEach(point => {
    const key = point.fileName?.replace('.trio', '');
    if (key) {
      if (!pointMap.has(key)) pointMap.set(key, []);
      pointMap.get(key)?.push(point);
    }
  });

  const unifiedEquipment = equipmentData.map(equip => ({
    ...equip,
    pointIds: (pointMap.get(equip.name!) || []).map(p => p.id),
    typeId: 'unclassified',
    confidence: 0,
    status: 'suggested',
  } as EquipmentInstance)).filter(equip => equip.pointIds.length > 0);

  // Set equipRef on points to create bidirectional relationship
  const updatedPoints = allPoints.map(point => {
    const equipment = unifiedEquipment.find(eq => eq.pointIds.includes(point.id));
    return {
      ...point,
      equipRef: equipment?.id || null,
      status: equipment ? 'suggested' as const : 'unassigned' as const
    };
  });

  return { unifiedEquipment, allPoints: updatedPoints };
};

// =================================================================================
// === Stage 2: Feature Engineering
// =================================================================================

const getTagsForPoint = (point: BACnetPoint): Set<string> => {
  const tags = new Set<string>();
  const disTokens = point.dis.toLowerCase().split(/[-_.]+/);
  disTokens.forEach(token => {
    if (haystackTagDictionary[token]) {
      haystackTagDictionary[token].forEach(tag => tags.add(tag));
    }
  });

  if (point.unit) {
    const unit = point.unit.toLowerCase();
    if (unit.includes('°f') || unit.includes('°c')) tags.add('temp');
    if (unit.includes('%')) tags.add('humidity');
    if (unit.includes('psi') || unit.includes('pa')) tags.add('pressure');
  }
  if (point.writable === '✓' || point.cmd === '✓') tags.add('cmd');
  if (point.sensor === '✓') tags.add('sensor');
  
  return tags;
};

const createFeatureVector = (tags: Set<string>): number[] => {
  return GLOBAL_HAYSTACK_TAG_LIST.map(tag => (tags.has(tag) ? 1 : 0));
};

export const generateSignatures = (
  equipmentList: EquipmentInstance[],
  allPoints: BACnetPoint[]
): (EquipmentInstance & { featureVector: number[] })[] => {
  const pointsById = new Map(allPoints.map(p => [p.id, p]));
  return equipmentList.map(equipment => {
    const equipmentPointTags = new Set<string>();
    equipment.pointIds.forEach(pointId => {
      const point = pointsById.get(pointId);
      if (point) {
        getTagsForPoint(point).forEach(tag => equipmentPointTags.add(tag));
      }
    });
    return { ...equipment, featureVector: createFeatureVector(equipmentPointTags) };
  });
};

// =================================================================================
// === Stage 3: K-Modes Clustering
// =================================================================================

// Call Python clustering script
const callPythonClustering = async (equipmentWithVectors: (EquipmentInstance & { featureVector: number[] })[]): Promise<{
  clusteredEquipment: (EquipmentInstance & { featureVector: number[], cluster: number })[],
  templates: EquipmentTemplate[]
}> => {
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs');
  const os = require('os');
  
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'kmodes_clustering.py');
    
    // Create temporary file for input data to avoid E2BIG error
    const tempDir = os.tmpdir();
    const tempInputFile = path.join(tempDir, `clustering_input_${Date.now()}.json`);
    const inputData = JSON.stringify(equipmentWithVectors, null, 2);
    
    console.log(`🐍 Calling Python clustering script with ${equipmentWithVectors.length} equipment instances`);
    console.log(`📁 Using temporary file: ${tempInputFile} (${Math.round(inputData.length / 1024)}KB)`);
    
    try {
      // Write data to temporary file
      fs.writeFileSync(tempInputFile, inputData);
      
      // Try to use virtual environment Python first, fall back to system Python
      const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';
      
      console.log(`Using Python interpreter: ${pythonCmd}`);
      const python = spawn(pythonCmd, [scriptPath, '--input', tempInputFile]);
    
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      python.on('close', (code: number) => {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempInputFile);
          console.log(`🗑️ Cleaned up temporary file: ${tempInputFile}`);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary file:', cleanupError);
        }
        
        if (code !== 0) {
          console.error('Python clustering script failed:', stderr);
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          if (!result.success) {
            reject(new Error(result.error || 'Python clustering failed'));
            return;
          }
          
          console.log(`✅ Python clustering completed successfully. Found ${result.clustered_equipment.length} clustered equipment and ${result.templates.length} templates`);
          
          resolve({
            clusteredEquipment: result.clustered_equipment,
            templates: result.templates
          });
        } catch (error) {
          console.error('Failed to parse Python script output:', error);
          reject(new Error('Failed to parse clustering results'));
        }
      });
      
      python.on('error', (error: Error) => {
        // Clean up temporary file on error
        try {
          fs.unlinkSync(tempInputFile);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary file on error:', cleanupError);
        }
        console.error('Failed to spawn Python process:', error);
        reject(new Error(`Failed to start Python script: ${error.message}`));
      });
      
    } catch (error) {
      console.error('Failed to write temporary file:', error);
      reject(new Error(`Failed to prepare clustering data: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
};

export const clusterEquipment = async (
  equipmentWithVectors: (EquipmentInstance & { featureVector: number[], cluster?: number })[]
): Promise<{
  clusteredEquipment: (EquipmentInstance & { featureVector: number[], cluster: number })[],
  centroids: number[][]
}> => {
  if (equipmentWithVectors.length === 0) {
    return { clusteredEquipment: [], centroids: [] };
  }

  try {
    const { clusteredEquipment, templates } = await callPythonClustering(equipmentWithVectors);
    
    // Extract centroids from templates (they contain the feature vectors)
    const centroids = templates.map(template => template.featureVector || []);
    
    return { clusteredEquipment, centroids };
  } catch (error) {
    console.error('Clustering failed, falling back to simple approach:', error);
    
    // Fallback: simple assignment to single cluster
    const clusteredEquipment = equipmentWithVectors.map((equip, index) => ({
      ...equip,
      cluster: 0,
      confidence: 50,
      status: 'needs-review' as const
    }));
    
    return { clusteredEquipment, centroids: [] };
  }
};

// =================================================================================
// === Stage 4: Classification, Scoring, and Templating
// =================================================================================

const hammingDistance = (vecA: number[], vecB: number[]): number => {
    return vecA.reduce((dist, bit, i) => dist + (bit === vecB[i] ? 0 : 1), 0);
};
  
const calculateDissimilarityMatrix = (vectors: number[][]): number[][] => {
    const n = vectors.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = hammingDistance(vectors[i], vectors[j]);
        matrix[i][j] = dist;
        matrix[j][i] = dist;
      }
    }
    return matrix;
};

const calculateSilhouetteScores = (matrix: number[][], clusters: number[]): number[] => {
    const n = matrix.length;
    return clusters.map((_, i) => {
      const clusterId = clusters[i];
      const a = (matrix[i].reduce((sum, dist, j) => sum + (clusters[j] === clusterId ? dist : 0), 0)) / (clusters.filter(c => c === clusterId).length || 1);
      
      let minB = Infinity;
      const uniqueClusters = [...new Set(clusters)].filter(c => c !== clusterId);
      
      uniqueClusters.forEach(otherClusterId => {
        const b = (matrix[i].reduce((sum, dist, j) => sum + (clusters[j] === otherClusterId ? dist : 0), 0)) / (clusters.filter(c => c === otherClusterId).length || 1);
        if (b < minB) minB = b;
      });
  
      if (minB === Infinity) return 0;
  
      return (minB - a) / Math.max(a, minB);
    });
};

const generateTemplatesFromCentroids = (centroids: number[][]): EquipmentTemplate[] => {
    return centroids.map((centroid, index) => {
      const pointSignature: PointSignature[] = centroid.map((val, i) => 
        val === 1 ? {
          navName: GLOBAL_HAYSTACK_TAG_LIST[i],
          isRequired: true,
          properties: [GLOBAL_HAYSTACK_TAG_LIST[i]]
        } : null
      ).filter((p): p is PointSignature => p !== null);
  
      return {
        id: uuidv4(),
        name: `Suggested Template ${index + 1}`,
        equipmentTypeId: `type-${index}`,
        createdFrom: 'auto-generated',
        pointSignature,
        featureVector: centroid,
        createdAt: new Date(),
        appliedCount: 0,
        color: `bg-sky-500` // Standard color for now
      };
    });
};

export const processAndClassify = async (
    equipmentList: EquipmentInstance[],
    allPoints: BACnetPoint[]
): Promise<ProcessingResult> => {
    const equipmentWithVectors = generateSignatures(equipmentList, allPoints);
    const vectors = equipmentWithVectors.map(e => e.featureVector);
  
    if (vectors.length === 0) {
      console.log("No feature vectors generated, returning empty result.");
      return { equipmentInstances: [], equipmentTemplates: [], allPoints };
    }
  
    try {
      console.log(`🎯 Starting Python-based clustering for ${equipmentWithVectors.length} equipment instances`);
      const { clusteredEquipment, centroids } = await clusterEquipment(equipmentWithVectors);
      
      if (!clusteredEquipment || clusteredEquipment.length === 0) {
        console.log("Clustering resulted in no equipment, returning empty result.");
        return { equipmentInstances: [], equipmentTemplates: [], allPoints };
      }

      // Generate templates from centroids if we have them
      const equipmentTemplates = centroids.length > 0 ? generateTemplatesFromCentroids(centroids) : [];
      
      // The Python script already calculates confidence scores, so we use them directly
      const finalEquipmentInstances = clusteredEquipment.map((equip) => ({
        ...equip,
        typeId: `type-${equip.cluster}`,
        // Python script already set confidence and status
      } as EquipmentInstance));
    
      console.log(`✅ Classification completed: ${finalEquipmentInstances.length} equipment instances, ${equipmentTemplates.length} templates`);
      return { equipmentInstances: finalEquipmentInstances, equipmentTemplates, allPoints };

    } catch (error) {
      console.error("🚨 CRITICAL ERROR during clustering and classification:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      console.error("Number of vectors:", vectors.length);
      console.error("Vector length:", vectors[0]?.length || 0);
      // Return a safe, empty result to prevent the API from crashing
      return { equipmentInstances: [], equipmentTemplates: [], allPoints };
    }
};

// =================================================================================
// === Final API Orchestrator
// =================================================================================

export const processUploadedFiles = async (files: File[]): Promise<ProcessingResult> => {
    console.log(`🔍 Processing ${files.length} uploaded files:`, files.map(f => f.name));
    
    const connectorFile = files.find(f => f.name.endsWith('.csv') || f.name.endsWith('.txt'));
    if (!connectorFile) throw new Error("No connector file (.csv or .txt) found.");
    console.log(`📋 Found connector file: ${connectorFile.name}`);

    const trioFiles = files.filter(f => f.name.endsWith('.trio'));
    if (trioFiles.length === 0) throw new Error("No .trio point data files found.");
    console.log(`🔧 Found ${trioFiles.length} .trio files`);

    console.log(`📊 Parsing connector file...`);
    const equipmentData = await parseConnectorFile(connectorFile);
    console.log(`📊 Parsed ${equipmentData.length} equipment entries from connector file`);

    console.log(`🔍 Parsing .trio files...`);
    const allPoints = (await Promise.all(trioFiles.map(parseTrioFile))).flat();
    console.log(`🔍 Parsed ${allPoints.length} total points from .trio files`);

    console.log(`🔗 Unifying equipment and points...`);
    const { unifiedEquipment, allPoints: unifiedPoints } = unifyBacnetData(equipmentData, allPoints);
    console.log(`🔗 Unified result: ${unifiedEquipment.length} equipment with points`);

    if (unifiedEquipment.length === 0) {
        console.warn("⚠️ No equipment could be unified with points. Check file name matching logic.");
        console.log("Equipment names:", equipmentData.map(e => e.name));
        console.log("File names:", [...new Set(allPoints.map(p => p.fileName))]);
    }

    console.log(`🎯 Starting classification process...`);
    return await processAndClassify(unifiedEquipment, unifiedPoints);
};
