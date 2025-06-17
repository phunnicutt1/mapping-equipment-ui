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
import { 
  haystackTagDictionary, 
  GLOBAL_HAYSTACK_TAG_LIST,
  getEnhancedTagsForPoint,
  calculateTagQuality,
  validateTagMapping
} from './haystack-dictionary';


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
      } as BACnetPoint;
    })
    .filter((p): p is BACnetPoint => p !== null && p.dis !== undefined);
};


export const parseConnectorFile = async (file: File): Promise<Partial<EquipmentInstance>[]> => {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return []; // Return early if file is empty
  
  // Detect delimiter (CSV vs TSV)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(',') ? ',' : '\t';
  const headers = firstLine.split(delimiter).map(h => h.trim());
  
  console.log('Detected delimiter:', delimiter === ',' ? 'CSV' : 'TSV');
  console.log('Parsed headers:', headers);
  
  // Look for various possible equipment name headers (more flexible matching)
  const equipNameIndex = headers.findIndex(h => {
    const lowerHeader = h.toLowerCase();
    return lowerHeader.includes('equip/connector name') || 
           lowerHeader === 'equipment' ||
           lowerHeader === 'equip name' ||
           lowerHeader === 'connector name' ||
           lowerHeader === 'name' ||
           lowerHeader === 'equip' ||
           lowerHeader === 'devicename' ||
           lowerHeader === 'device name' ||
           lowerHeader.includes('device') && lowerHeader.includes('name');
  });
  
  if (equipNameIndex === -1) {
    console.warn('Available headers:', headers);
    throw new Error(`Could not find equipment name column in connector file headers. Available headers: ${headers.join(', ')}`);
  }

  console.log(`Found equipment name column at index ${equipNameIndex}: "${headers[equipNameIndex]}"`);

  return lines.slice(1).map(line => {
    const values = line.split(delimiter);
    const equipmentName = values[equipNameIndex]?.trim();
    return equipmentName ? { 
      id: equipmentName, 
      name: equipmentName 
    } : null;
  }).filter(Boolean) as Partial<EquipmentInstance>[];
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
// === Stage 2: Enhanced Feature Engineering with Performance Monitoring
// =================================================================================

// Performance monitoring for tag generation
interface TagGenerationMetrics {
  totalPointsProcessed: number;
  averageTagsPerPoint: number;
  tagQualityDistribution: { [range: string]: number };
  processingTimeMs: number;
  tagValidationResults: {
    valid: number;
    invalid: number;
    warnings: number;
  };
}

let tagGenerationMetrics: TagGenerationMetrics = {
  totalPointsProcessed: 0,
  averageTagsPerPoint: 0,
  tagQualityDistribution: {},
  processingTimeMs: 0,
  tagValidationResults: { valid: 0, invalid: 0, warnings: 0 }
};

const getTagsForPoint = (point: BACnetPoint): Set<string> => {
  const startTime = performance.now();
  
  // Use enhanced tag mapping
  const tags = getEnhancedTagsForPoint({
    ...point,
    unit: point.unit || undefined // Convert null to undefined for compatibility
  });
  
  // Calculate quality and validate
  const quality = calculateTagQuality(tags, point.dis);
  const validation = validateTagMapping({
    ...point,
    unit: point.unit || undefined // Convert null to undefined for compatibility
  });
  
  // Update metrics
  tagGenerationMetrics.totalPointsProcessed++;
  tagGenerationMetrics.processingTimeMs += performance.now() - startTime;
  
  // Update quality distribution
  const qualityRange = Math.floor(quality / 20) * 20; // 0-19, 20-39, etc.
  const rangeKey = `${qualityRange}-${qualityRange + 19}`;
  tagGenerationMetrics.tagQualityDistribution[rangeKey] = 
    (tagGenerationMetrics.tagQualityDistribution[rangeKey] || 0) + 1;
  
  // Update validation metrics
  if (validation.isValid) {
    tagGenerationMetrics.tagValidationResults.valid++;
  } else {
    tagGenerationMetrics.tagValidationResults.invalid++;
  }
  if (validation.suggestions.length > 0) {
    tagGenerationMetrics.tagValidationResults.warnings++;
  }
  
  return tags;
};

const createFeatureVector = (tags: Set<string>): number[] => {
  return GLOBAL_HAYSTACK_TAG_LIST.map(tag => (tags.has(tag) ? 1 : 0));
};

export const generateSignatures = (
  equipmentList: EquipmentInstance[],
  allPoints: BACnetPoint[]
): (EquipmentInstance & { featureVector: number[] })[] => {
  const startTime = performance.now();
  
  // Reset metrics for this operation
  tagGenerationMetrics = {
    totalPointsProcessed: 0,
    averageTagsPerPoint: 0,
    tagQualityDistribution: {},
    processingTimeMs: 0,
    tagValidationResults: { valid: 0, invalid: 0, warnings: 0 }
  };
  
  const pointsById = new Map(allPoints.map(p => [p.id, p]));
  const results = equipmentList.map(equipment => {
    const equipmentPointTags = new Set<string>();
    let totalTags = 0;
    
    equipment.pointIds.forEach(pointId => {
      const point = pointsById.get(pointId);
      if (point) {
        const pointTags = getTagsForPoint(point);
        pointTags.forEach(tag => equipmentPointTags.add(tag));
        totalTags += pointTags.size;
      }
    });
    
    return { ...equipment, featureVector: createFeatureVector(equipmentPointTags) };
  });
  
  // Finalize metrics
  const endTime = performance.now();
  tagGenerationMetrics.processingTimeMs = endTime - startTime;
  tagGenerationMetrics.averageTagsPerPoint = 
    tagGenerationMetrics.totalPointsProcessed > 0 
      ? Object.values(tagGenerationMetrics.tagQualityDistribution).reduce((a, b) => a + b, 0) / tagGenerationMetrics.totalPointsProcessed 
      : 0;
  
  console.log('🏷️ Tag Generation Metrics:', tagGenerationMetrics);
  
  return results;
};

// =================================================================================
// === Python Service Configuration and Health Monitoring
// =================================================================================

interface PythonServiceConfig {
  maxRetries: number;
  timeoutMs: number;
  healthCheckTimeoutMs: number;
  tempFileCleanupDelayMs: number;
  maxTempFileSize: number; // in bytes
  fallbackEnabled: boolean;
}

const PYTHON_SERVICE_CONFIG: PythonServiceConfig = {
  maxRetries: 3,
  timeoutMs: 120000, // 2 minutes
  healthCheckTimeoutMs: 10000, // 10 seconds
  tempFileCleanupDelayMs: 5000, // 5 seconds delay before cleanup
  maxTempFileSize: 50 * 1024 * 1024, // 50MB
  fallbackEnabled: true
};

interface PythonServiceMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageExecutionTime: number;
  lastHealthCheck: Date | null;
  isHealthy: boolean;
  // Enhanced performance metrics
  executionTimes: number[];
  memoryUsage: number[];
  clusteringQuality: {
    averageSilhouetteScore: number;
    clusterStability: number;
    anomalyDetectionAccuracy: number;
  };
  errorPatterns: { [errorType: string]: number };
}

const serviceMetrics: PythonServiceMetrics = {
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  averageExecutionTime: 0,
  lastHealthCheck: null,
  isHealthy: false,
  executionTimes: [],
  memoryUsage: [],
  clusteringQuality: {
    averageSilhouetteScore: 0,
    clusterStability: 0,
    anomalyDetectionAccuracy: 0
  },
  errorPatterns: {}
};

// Performance analytics for user interactions
interface UserInteractionMetrics {
  confirmationRate: number;
  rejectionRate: number;
  averageConfidenceBeforeUserAction: number;
  mostCommonUserActions: { [action: string]: number };
  timeToFirstInteraction: number;
  sessionsCompleted: number;
  averageSessionDuration: number;
}

let userInteractionMetrics: UserInteractionMetrics = {
  confirmationRate: 0,
  rejectionRate: 0,
  averageConfidenceBeforeUserAction: 0,
  mostCommonUserActions: {},
  timeToFirstInteraction: 0,
  sessionsCompleted: 0,
  averageSessionDuration: 0
};

// Clustering quality metrics
interface ClusteringQualityMetrics {
  silhouetteScores: number[];
  averageSilhouetteScore: number;
  clusterSeparation: number;
  intraClusterDistances: number[];
  interClusterDistances: number[];
  stabilityScore: number;
  optimalClusterCount: number;
  actualClusterCount: number;
}

let clusteringQualityMetrics: ClusteringQualityMetrics = {
  silhouetteScores: [],
  averageSilhouetteScore: 0,
  clusterSeparation: 0,
  intraClusterDistances: [],
  interClusterDistances: [],
  stabilityScore: 0,
  optimalClusterCount: 0,
  actualClusterCount: 0
};

// Health check for Python service
const checkPythonServiceHealth = async (): Promise<boolean> => {
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs');
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    try {
      // Try to use virtual environment Python first, fall back to system Python
      const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';
      
      const healthCheck = spawn(pythonCmd, ['-c', 'import kmodes, numpy, sklearn; print("healthy")'], {
        timeout: PYTHON_SERVICE_CONFIG.healthCheckTimeoutMs
      });
      
      let output = '';
      
      healthCheck.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      healthCheck.on('close', (code: number) => {
        const isHealthy = code === 0 && output.trim() === 'healthy';
        serviceMetrics.lastHealthCheck = new Date();
        serviceMetrics.isHealthy = isHealthy;
        
        const duration = Date.now() - startTime;
        console.log(`🏥 Python service health check: ${isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'} (${duration}ms)`);
        
        resolve(isHealthy);
      });
      
      healthCheck.on('error', () => {
        serviceMetrics.lastHealthCheck = new Date();
        serviceMetrics.isHealthy = false;
        console.log('🏥 Python service health check: ❌ UNHEALTHY (spawn error)');
        resolve(false);
      });
      
    } catch (error) {
      serviceMetrics.lastHealthCheck = new Date();
      serviceMetrics.isHealthy = false;
      console.log('🏥 Python service health check: ❌ UNHEALTHY (exception)');
      resolve(false);
    }
  });
};

// Enhanced temporary file management
const createTempFile = (data: string): { filePath: string; cleanup: () => void } => {
  const path = require('path');
  const fs = require('fs');
  const os = require('os');
  
  const tempDir = os.tmpdir();
  const fileName = `clustering_input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.json`;
  const filePath = path.join(tempDir, fileName);
  
  // Check file size before writing
  const dataSize = Buffer.byteLength(data, 'utf8');
  if (dataSize > PYTHON_SERVICE_CONFIG.maxTempFileSize) {
    throw new Error(`Input data too large: ${Math.round(dataSize / 1024 / 1024)}MB exceeds limit of ${Math.round(PYTHON_SERVICE_CONFIG.maxTempFileSize / 1024 / 1024)}MB`);
  }
  
  fs.writeFileSync(filePath, data);
  console.log(`📁 Created temporary file: ${filePath} (${Math.round(dataSize / 1024)}KB)`);
  
  const cleanup = () => {
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up temporary file: ${filePath}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to clean up temporary file ${filePath}:`, error);
      }
    }, PYTHON_SERVICE_CONFIG.tempFileCleanupDelayMs);
  };
  
  return { filePath, cleanup };
};

// Enhanced Python clustering with retry logic and monitoring
const callPythonClusteringWithRetry = async (
  equipmentWithVectors: (EquipmentInstance & { featureVector: number[] })[]
): Promise<{
  clusteredEquipment: (EquipmentInstance & { featureVector: number[], cluster: number })[],
  templates: EquipmentTemplate[],
  anomalyDetection?: any
}> => {
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs');
  
  // Update metrics
  serviceMetrics.totalCalls++;
  
  // Check service health first
  const isHealthy = await checkPythonServiceHealth();
  if (!isHealthy && !PYTHON_SERVICE_CONFIG.fallbackEnabled) {
    throw new Error('Python service is unhealthy and fallback is disabled');
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= PYTHON_SERVICE_CONFIG.maxRetries; attempt++) {
    const startTime = Date.now();
    console.log(`🐍 Python clustering attempt ${attempt}/${PYTHON_SERVICE_CONFIG.maxRetries} with ${equipmentWithVectors.length} equipment instances`);
    
    let tempFile: { filePath: string; cleanup: () => void } | null = null;
    
    try {
      // Create temporary file with enhanced management
      const inputData = JSON.stringify(equipmentWithVectors, null, 2);
      tempFile = createTempFile(inputData);
      
      const scriptPath = path.join(process.cwd(), 'scripts', 'kmodes_clustering.py');
      const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';
      
      console.log(`🔧 Using Python interpreter: ${pythonCmd}`);
      
      const result = await new Promise<{
        clusteredEquipment: (EquipmentInstance & { featureVector: number[], cluster: number })[],
        templates: EquipmentTemplate[],
        anomalyDetection?: any
      }>((resolve, reject) => {
        const python = spawn(pythonCmd, [scriptPath, '--input', tempFile!.filePath], {
          timeout: PYTHON_SERVICE_CONFIG.timeoutMs
        });
        
        let stdout = '';
        let stderr = '';
        
        python.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
        
        python.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
        
        python.on('close', (code: number) => {
          const duration = Date.now() - startTime;
          
          if (code !== 0) {
            console.error(`❌ Python script failed with code ${code} (${duration}ms):`, stderr);
            reject(new Error(`Python script failed with code ${code}: ${stderr}`));
            return;
          }
          
          try {
            const result = JSON.parse(stdout);
            if (!result.success) {
              reject(new Error(result.error || 'Python clustering failed'));
              return;
            }
            
            // Update success metrics
            serviceMetrics.successfulCalls++;
            const newAverage = (serviceMetrics.averageExecutionTime * (serviceMetrics.successfulCalls - 1) + duration) / serviceMetrics.successfulCalls;
            serviceMetrics.averageExecutionTime = newAverage;
            
            console.log(`✅ Python clustering completed successfully in ${duration}ms. Found ${result.clustered_equipment.length} clustered equipment and ${result.templates.length} templates`);
            
            if (result.anomaly_detection) {
              console.log(`🚨 Anomaly detection: ${result.anomaly_detection.anomalies.length} anomalies detected (${result.anomaly_detection.anomalyRate.toFixed(1)}% rate)`);
            }
            
            console.log(`📊 Service metrics: ${serviceMetrics.successfulCalls}/${serviceMetrics.totalCalls} successful, avg: ${Math.round(serviceMetrics.averageExecutionTime)}ms`);
            
            resolve({
              clusteredEquipment: result.clustered_equipment,
              templates: result.templates,
              anomalyDetection: result.anomaly_detection
            });
          } catch (error) {
            console.error('❌ Failed to parse Python script output:', error);
            reject(new Error('Failed to parse clustering results'));
          }
        });
        
        python.on('error', (error: Error) => {
          const duration = Date.now() - startTime;
          console.error(`❌ Failed to spawn Python process (${duration}ms):`, error);
          reject(new Error(`Failed to start Python script: ${error.message}`));
        });
      });
      
      // Success - cleanup and return
      tempFile.cleanup();
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`❌ Attempt ${attempt} failed (${duration}ms):`, lastError.message);
      
      // Cleanup temp file on error
      if (tempFile) {
        tempFile.cleanup();
      }
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < PYTHON_SERVICE_CONFIG.maxRetries) {
        const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        console.log(`⏳ Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // All attempts failed
  serviceMetrics.failedCalls++;
  console.error(`❌ All ${PYTHON_SERVICE_CONFIG.maxRetries} attempts failed. Last error:`, lastError?.message);
  
  throw lastError || new Error('Python clustering failed after all retry attempts');
};

// Fallback clustering implementation
const fallbackClustering = (
  equipmentWithVectors: (EquipmentInstance & { featureVector: number[] })[]
): {
  clusteredEquipment: (EquipmentInstance & { featureVector: number[], cluster: number })[],
  templates: EquipmentTemplate[]
} => {
  console.log(`🔄 Using fallback clustering for ${equipmentWithVectors.length} equipment instances`);
  
  // Simple fallback: group by similar feature vectors using Hamming distance
  const clusters: number[][] = [];
  const clusterAssignments: number[] = [];
  
  equipmentWithVectors.forEach((equipment, index) => {
    let assignedCluster = -1;
    
    // Try to find a similar cluster (within threshold)
    for (let i = 0; i < clusters.length; i++) {
      const centroid = clusters[i];
      const distance = equipment.featureVector.reduce((dist, bit, j) => 
        dist + (bit === centroid[j] ? 0 : 1), 0
      );
      
      // If distance is less than 30% of vector length, assign to this cluster
      if (distance < equipment.featureVector.length * 0.3) {
        assignedCluster = i;
        break;
      }
    }
    
    // Create new cluster if no similar one found
    if (assignedCluster === -1) {
      assignedCluster = clusters.length;
      clusters.push([...equipment.featureVector]);
    }
    
    clusterAssignments.push(assignedCluster);
  });
  
  // Create clustered equipment with fallback confidence scores
  const clusteredEquipment = equipmentWithVectors.map((equipment, index) => ({
    ...equipment,
    cluster: clusterAssignments[index],
    confidence: 40, // Lower confidence for fallback
    status: 'needs-review' as const
  }));
  
  // Create basic templates
  const templates: EquipmentTemplate[] = clusters.map((centroid, index) => ({
    id: `fallback-template-${index}`,
    name: `Fallback Template ${index + 1}`,
    equipmentTypeId: `fallback-type-${index}`,
    createdFrom: 'fallback-clustering',
    pointSignature: [],
    featureVector: centroid,
    createdAt: new Date(),
    appliedCount: clusterAssignments.filter(c => c === index).length,
    color: 'bg-gray-500',
    confidence: 0.4, // Low confidence for fallback
    // Advanced template management properties
    version: 1,
    isMLGenerated: true, // This is still ML-generated, just fallback
    effectiveness: {
      successfulApplications: 0,
      failedApplications: 0,
      userConfirmations: 0,
      userRejections: 0,
      averageConfidenceScore: 0.4, // Start with fallback confidence
      successRate: 0
    },
    userFeedback: [],
    tags: ['fallback', 'k-modes', `cluster-${index}`],
    description: `Fallback template from basic clustering (cluster ${index})`,
    lastModified: new Date(),
    isActive: true,
    similarityThreshold: 0.6, // Lower threshold for fallback templates
    autoApplyEnabled: false // Disable auto-apply for fallback templates
  }));
  
  console.log(`🔄 Fallback clustering completed: ${clusters.length} clusters, ${templates.length} templates`);
  
  return { clusteredEquipment, templates };
};

// =================================================================================
// === Stage 3: K-Modes Clustering
// =================================================================================

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
    const { clusteredEquipment, templates } = await callPythonClusteringWithRetry(equipmentWithVectors);
    
    // Extract centroids from templates (they contain the feature vectors)
    const centroids = templates.map(template => template.featureVector || []);
    
    return { clusteredEquipment, centroids };
  } catch (error) {
    console.error('❌ Python clustering failed, attempting graceful degradation:', error);
    
    // Check if fallback is enabled
    if (PYTHON_SERVICE_CONFIG.fallbackEnabled) {
      console.log('🔄 Attempting fallback clustering...');
      
      try {
        const { clusteredEquipment, templates } = fallbackClustering(equipmentWithVectors);
        const centroids = templates.map(template => template.featureVector || []);
        
        return { clusteredEquipment, centroids };
      } catch (fallbackError) {
        console.error('❌ Fallback clustering also failed:', fallbackError);
      }
    }
    
    // Final fallback: simple assignment to single cluster
    console.log('🔄 Using minimal fallback: single cluster assignment');
    const clusteredEquipment = equipmentWithVectors.map((equip, index) => ({
      ...equip,
      cluster: 0,
      confidence: 30, // Very low confidence for minimal fallback
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
      const uniqueClusters = Array.from(new Set(clusters)).filter(c => c !== clusterId);
      
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
        name: `ML Template ${index + 1}`,
        equipmentTypeId: `ml-type-${index}`,
        createdFrom: 'auto-generated',
        pointSignature,
        featureVector: centroid,
        createdAt: new Date(),
        appliedCount: 0,
        color: `bg-sky-500`, // Standard color for ML templates
        confidence: 0.8, // Default ML confidence
        // Advanced template management properties
        version: 1,
        isMLGenerated: true, // This is an ML-generated template
        effectiveness: {
          successfulApplications: 0,
          failedApplications: 0,
          userConfirmations: 0,
          userRejections: 0,
          averageConfidenceScore: 0.8, // Start with ML confidence
          successRate: 0
        },
        userFeedback: [],
        tags: ['ml-generated', 'k-modes', `cluster-${index}`],
        description: `ML-generated template from K-Modes clustering (cluster ${index})`,
        lastModified: new Date(),
        isActive: true,
        similarityThreshold: 0.75, // Slightly higher threshold for ML templates
        autoApplyEnabled: true
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
      const { clusteredEquipment, templates, anomalyDetection } = await callPythonClusteringWithRetry(equipmentWithVectors);
      
      if (!clusteredEquipment || clusteredEquipment.length === 0) {
        console.log("Clustering resulted in no equipment, returning empty result.");
        return { equipmentInstances: [], equipmentTemplates: [], allPoints };
      }

      // Use templates directly from Python clustering result
      const equipmentTemplates = templates || [];
      
      // The Python script already calculates confidence scores, so we use them directly
      const finalEquipmentInstances = clusteredEquipment.map((equip) => ({
        ...equip,
        typeId: `type-${equip.cluster}`,
        // Python script already set confidence and status
      } as EquipmentInstance));
    
      console.log(`✅ Classification completed: ${finalEquipmentInstances.length} equipment instances, ${equipmentTemplates.length} templates`);
      
      if (anomalyDetection) {
        console.log(`🚨 Anomaly detection completed: ${anomalyDetection.anomalies.length} anomalies found`);
      }
      
      return { 
        equipmentInstances: finalEquipmentInstances, 
        equipmentTemplates, 
        allPoints,
        anomalyDetectionResult: anomalyDetection
      };

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
        console.log("File names:", Array.from(new Set(allPoints.map(p => p.fileName))));
    }

    console.log(`🎯 Starting classification process...`);
    return await processAndClassify(unifiedEquipment, unifiedPoints);
};

// =================================================================================
// === Service Monitoring and Health Check APIs
// =================================================================================

// Get current service metrics
export const getPythonServiceMetrics = (): PythonServiceMetrics & {
  successRate: number;
  isRecentlyHealthy: boolean;
} => {
  const successRate = serviceMetrics.totalCalls > 0 
    ? (serviceMetrics.successfulCalls / serviceMetrics.totalCalls) * 100 
    : 0;
  
  const isRecentlyHealthy = serviceMetrics.lastHealthCheck 
    ? (Date.now() - serviceMetrics.lastHealthCheck.getTime()) < 300000 // 5 minutes
    : false;
  
  return {
    ...serviceMetrics,
    successRate: Math.round(successRate * 100) / 100,
    isRecentlyHealthy: isRecentlyHealthy && serviceMetrics.isHealthy
  };
};

// Force a health check
export const forcePythonHealthCheck = async (): Promise<boolean> => {
  return await checkPythonServiceHealth();
};

// Reset service metrics
export const resetPythonServiceMetrics = (): void => {
  serviceMetrics.totalCalls = 0;
  serviceMetrics.successfulCalls = 0;
  serviceMetrics.failedCalls = 0;
  serviceMetrics.averageExecutionTime = 0;
  console.log('📊 Python service metrics reset');
};

// Update service configuration
export const updatePythonServiceConfig = (updates: Partial<PythonServiceConfig>): PythonServiceConfig => {
  Object.assign(PYTHON_SERVICE_CONFIG, updates);
  console.log('⚙️ Python service configuration updated:', updates);
  return { ...PYTHON_SERVICE_CONFIG };
};

// Get current service configuration
export const getPythonServiceConfig = (): PythonServiceConfig => {
  return { ...PYTHON_SERVICE_CONFIG };
};

// =================================================================================
// === Performance Monitoring and Analytics Dashboard
// =================================================================================

// User interaction tracking
export const trackUserInteraction = (action: string, equipment: EquipmentInstance, confidence?: number): void => {
  userInteractionMetrics.mostCommonUserActions[action] = 
    (userInteractionMetrics.mostCommonUserActions[action] || 0) + 1;
  
  if (confidence !== undefined) {
    const currentAvg = userInteractionMetrics.averageConfidenceBeforeUserAction;
    const count = Object.values(userInteractionMetrics.mostCommonUserActions).reduce((a, b) => a + b, 0);
    userInteractionMetrics.averageConfidenceBeforeUserAction = 
      (currentAvg * (count - 1) + confidence) / count;
  }
  
  // Update confirmation/rejection rates
  const totalActions = Object.values(userInteractionMetrics.mostCommonUserActions).reduce((a, b) => a + b, 0);
  const confirmations = userInteractionMetrics.mostCommonUserActions['confirm'] || 0;
  const rejections = userInteractionMetrics.mostCommonUserActions['reject'] || 0;
  
  userInteractionMetrics.confirmationRate = confirmations / totalActions;
  userInteractionMetrics.rejectionRate = rejections / totalActions;
  
  console.log(`📊 User interaction tracked: ${action} (confidence: ${confidence?.toFixed(1)}%)`);
};

// Clustering quality analysis
export const updateClusteringQualityMetrics = (
  silhouetteScores: number[],
  clusterCount: number,
  optimalK?: number
): void => {
  clusteringQualityMetrics.silhouetteScores = silhouetteScores;
  clusteringQualityMetrics.averageSilhouetteScore = 
    silhouetteScores.length > 0 ? 
    silhouetteScores.reduce((a, b) => a + b, 0) / silhouetteScores.length : 0;
  
  clusteringQualityMetrics.actualClusterCount = clusterCount;
  
  if (optimalK !== undefined) {
    clusteringQualityMetrics.optimalClusterCount = optimalK;
  }
  
  // Update service metrics
  serviceMetrics.clusteringQuality.averageSilhouetteScore = 
    clusteringQualityMetrics.averageSilhouetteScore;
  
  console.log(`📈 Clustering quality updated: avg silhouette ${clusteringQualityMetrics.averageSilhouetteScore.toFixed(3)}, ${clusterCount} clusters`);
};

// Performance analytics aggregation
export const getPerformanceAnalytics = (): {
  tagGeneration: TagGenerationMetrics;
  pythonService: PythonServiceMetrics & { successRate: number; isRecentlyHealthy: boolean };
  userInteractions: UserInteractionMetrics;
  clusteringQuality: ClusteringQualityMetrics;
  summary: {
    overallHealthScore: number;
    recommendations: string[];
    performanceGrade: string;
    keyMetrics: { [key: string]: number | string };
  };
} => {
  const pythonMetrics = getPythonServiceMetrics();
  
  // Calculate overall health score (0-100)
  let healthScore = 0;
  
  // Python service health (30%)
  if (pythonMetrics.isHealthy) healthScore += 15;
  if (pythonMetrics.successRate > 0.8) healthScore += 15;
  
  // Tag generation quality (25%)
  const validTagsRatio = tagGenerationMetrics.tagValidationResults.valid / 
    Math.max(1, tagGenerationMetrics.totalPointsProcessed);
  healthScore += validTagsRatio * 25;
  
  // Clustering quality (25%)
  if (clusteringQualityMetrics.averageSilhouetteScore > 0.3) healthScore += 12.5;
  if (clusteringQualityMetrics.averageSilhouetteScore > 0.5) healthScore += 12.5;
  
  // User interaction patterns (20%)
  if (userInteractionMetrics.confirmationRate > 0.7) healthScore += 10;
  if (userInteractionMetrics.averageConfidenceBeforeUserAction > 70) healthScore += 10;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (pythonMetrics.successRate < 0.9) {
    recommendations.push('Consider optimizing Python service reliability');
  }
  if (clusteringQualityMetrics.averageSilhouetteScore < 0.3) {
    recommendations.push('Clustering quality is low - review feature engineering');
  }
  if (userInteractionMetrics.confirmationRate < 0.6) {
    recommendations.push('Low user confirmation rate - improve ML predictions');
  }
  if (tagGenerationMetrics.tagValidationResults.invalid > tagGenerationMetrics.tagValidationResults.valid * 0.1) {
    recommendations.push('High tag validation error rate - expand dictionary coverage');
  }
  if (pythonMetrics.averageExecutionTime > 30000) {
    recommendations.push('Python service execution time is high - consider optimization');
  }
  
  // Performance grade
  let performanceGrade = 'F';
  if (healthScore >= 90) performanceGrade = 'A';
  else if (healthScore >= 80) performanceGrade = 'B';
  else if (healthScore >= 70) performanceGrade = 'C';
  else if (healthScore >= 60) performanceGrade = 'D';
  
  const keyMetrics = {
    'Health Score': `${Math.round(healthScore)}%`,
    'Service Success Rate': `${Math.round(pythonMetrics.successRate * 100)}%`,
    'Avg Execution Time': `${Math.round(pythonMetrics.averageExecutionTime)}ms`,
    'User Confirmation Rate': `${Math.round(userInteractionMetrics.confirmationRate * 100)}%`,
    'Avg Silhouette Score': clusteringQualityMetrics.averageSilhouetteScore.toFixed(3),
    'Tag Validation Rate': `${Math.round(validTagsRatio * 100)}%`,
    'Total Processing Calls': pythonMetrics.totalCalls,
    'Points Processed': tagGenerationMetrics.totalPointsProcessed
  };
  
  return {
    tagGeneration: tagGenerationMetrics,
    pythonService: pythonMetrics,
    userInteractions: userInteractionMetrics,
    clusteringQuality: clusteringQualityMetrics,
    summary: {
      overallHealthScore: healthScore,
      recommendations,
      performanceGrade,
      keyMetrics
    }
  };
};

// Reset analytics data
export const resetPerformanceAnalytics = (): void => {
  tagGenerationMetrics = {
    totalPointsProcessed: 0,
    averageTagsPerPoint: 0,
    tagQualityDistribution: {},
    processingTimeMs: 0,
    tagValidationResults: { valid: 0, invalid: 0, warnings: 0 }
  };
  
  userInteractionMetrics = {
    confirmationRate: 0,
    rejectionRate: 0,
    averageConfidenceBeforeUserAction: 0,
    mostCommonUserActions: {},
    timeToFirstInteraction: 0,
    sessionsCompleted: 0,
    averageSessionDuration: 0
  };
  
  clusteringQualityMetrics = {
    silhouetteScores: [],
    averageSilhouetteScore: 0,
    clusterSeparation: 0,
    intraClusterDistances: [],
    interClusterDistances: [],
    stabilityScore: 0,
    optimalClusterCount: 0,
    actualClusterCount: 0
  };
  
  resetPythonServiceMetrics();
  
  console.log('📊 Performance analytics reset');
};

// Advanced clustering metrics calculation
export const calculateAdvancedClusteringMetrics = (
  equipmentWithClusters: (EquipmentInstance & { featureVector: number[], cluster: number })[],
  centroids: number[][]
): ClusteringQualityMetrics => {
  if (equipmentWithClusters.length === 0) {
    return clusteringQualityMetrics;
  }
  
  const vectors = equipmentWithClusters.map(eq => eq.featureVector);
  const clusters = equipmentWithClusters.map(eq => eq.cluster);
  
  // Calculate dissimilarity matrix
  const dissimilarityMatrix = calculateDissimilarityMatrix(vectors);
  
  // Calculate silhouette scores
  const silhouetteScores = calculateSilhouetteScores(dissimilarityMatrix, clusters);
  
  // Calculate intra-cluster distances
  const intraClusterDistances: number[] = [];
  const interClusterDistances: number[] = [];
  
  for (let i = 0; i < centroids.length; i++) {
    const clusterPoints = equipmentWithClusters.filter(eq => eq.cluster === i);
    
    // Intra-cluster distances (within cluster)
    for (let j = 0; j < clusterPoints.length; j++) {
      for (let k = j + 1; k < clusterPoints.length; k++) {
        const distance = hammingDistance(clusterPoints[j].featureVector, clusterPoints[k].featureVector);
        intraClusterDistances.push(distance);
      }
    }
    
    // Inter-cluster distances (between centroids)
    for (let j = i + 1; j < centroids.length; j++) {
      const distance = hammingDistance(centroids[i], centroids[j]);
      interClusterDistances.push(distance);
    }
  }
  
  // Calculate cluster separation (ratio of inter to intra distances)
  const avgIntraDistance = intraClusterDistances.length > 0 
    ? intraClusterDistances.reduce((a, b) => a + b, 0) / intraClusterDistances.length 
    : 0;
  const avgInterDistance = interClusterDistances.length > 0 
    ? interClusterDistances.reduce((a, b) => a + b, 0) / interClusterDistances.length 
    : 0;
  
  const clusterSeparation = avgIntraDistance > 0 ? avgInterDistance / avgIntraDistance : 0;
  
  const metrics: ClusteringQualityMetrics = {
    silhouetteScores,
    averageSilhouetteScore: silhouetteScores.reduce((a, b) => a + b, 0) / silhouetteScores.length,
    clusterSeparation,
    intraClusterDistances,
    interClusterDistances,
    stabilityScore: Math.min(1, clusterSeparation / 2), // Normalized stability
    optimalClusterCount: clusteringQualityMetrics.optimalClusterCount,
    actualClusterCount: centroids.length
  };
  
  // Update global metrics
  clusteringQualityMetrics = metrics;
  
  console.log(`📊 Advanced clustering metrics calculated: separation ${clusterSeparation.toFixed(2)}, stability ${metrics.stabilityScore.toFixed(2)}`);
  
  return metrics;
};

// Export current analytics state for external monitoring
export const exportAnalyticsData = (): string => {
  const analytics = getPerformanceAnalytics();
  const exportData = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    analytics,
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  
  return JSON.stringify(exportData, null, 2);
};

// A/B Testing framework for algorithm improvements
interface ABTestConfig {
  testName: string;
  variants: { [variantName: string]: any };
  trafficSplit: { [variantName: string]: number };
  metrics: string[];
  duration: number; // in milliseconds
}

let activeABTests: ABTestConfig[] = [];

export const startABTest = (config: ABTestConfig): void => {
  activeABTests.push({
    ...config,
    duration: Date.now() + config.duration
  });
  console.log(`🧪 A/B test started: ${config.testName}`);
};

export const getABTestVariant = (testName: string, defaultVariant: string = 'control'): string => {
  const test = activeABTests.find(t => t.testName === testName && Date.now() < t.duration);
  if (!test) return defaultVariant;
  
  const random = Math.random();
  let cumulative = 0;
  
  for (const [variant, split] of Object.entries(test.trafficSplit)) {
    cumulative += split;
    if (random <= cumulative) {
      return variant;
    }
  }
  
  return defaultVariant;
};

export const stopABTest = (testName: string): void => {
  activeABTests = activeABTests.filter(t => t.testName !== testName);
  console.log(`🧪 A/B test stopped: ${testName}`);
};

// Automated quality alerts
export const checkQualityAlerts = (): string[] => {
  const alerts: string[] = [];
  const analytics = getPerformanceAnalytics();
  
  // Critical alerts
  if (analytics.pythonService.successRate < 0.5) {
    alerts.push('CRITICAL: Python service success rate below 50%');
  }
  if (analytics.clusteringQuality.averageSilhouetteScore < 0.1) {
    alerts.push('CRITICAL: Clustering quality extremely poor');
  }
  
  // Warning alerts
  if (analytics.pythonService.averageExecutionTime > 60000) {
    alerts.push('WARNING: Python service execution time over 1 minute');
  }
  if (analytics.userInteractions.confirmationRate < 0.5) {
    alerts.push('WARNING: User confirmation rate below 50%');
  }
  if (analytics.tagGeneration.tagValidationResults.invalid > analytics.tagGeneration.tagValidationResults.valid * 0.2) {
    alerts.push('WARNING: High tag validation error rate');
  }
  
  // Info alerts
  if (analytics.summary.overallHealthScore < 70) {
    alerts.push('INFO: Overall system health below 70%');
  }
  
  if (alerts.length > 0) {
    console.log('🚨 Quality alerts:', alerts);
  }
  
  return alerts;
};

console.log('🔧 Enhanced BACnet Processor with Performance Monitoring loaded');
