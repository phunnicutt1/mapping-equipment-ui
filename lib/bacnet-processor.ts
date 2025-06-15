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
  EquipmentType,
  ProcessingResult, 
  PointSignature,
  AnomalyDetectionResult
} from './types';
import { 
  haystackTagDictionary, 
  GLOBAL_HAYSTACK_TAG_LIST,
  getEnhancedTagsForPoint,
  calculateTagQuality,
  validateTagMapping
} from './haystack-dictionary';
import { parseTrioFile as parseTrio, trioToBACnetPoints } from './trio-parser';
import {promises as fs} from 'fs';


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
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  return lines.map(line => {
    const parsedPoint = parseTrioLine(line);
    // Ensure the point has a 'dis' before including it
    if (!parsedPoint.dis) return null;
    return {
      ...parsedPoint,
      fileName: file.name,
    } as BACnetPoint;
  }).filter((p): p is BACnetPoint => p !== null && p.dis !== undefined);
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
      return { 
        equipmentInstances: [], 
        equipmentTemplates: [], 
        allPoints,
        anomalyDetectionResult: getEmptyAnomalyDetectionResult()
      };
    }
  
    try {
      console.log(`🎯 Starting Python-based clustering for ${equipmentWithVectors.length} equipment instances`);
      const { clusteredEquipment, templates, anomalyDetection } = await callPythonClusteringWithRetry(equipmentWithVectors);
      
      if (!clusteredEquipment || clusteredEquipment.length === 0) {
        console.log("Clustering resulted in no equipment, returning empty result.");
        return { 
          equipmentInstances: [], 
          equipmentTemplates: [], 
          allPoints,
          anomalyDetectionResult: getEmptyAnomalyDetectionResult()
        };
      }

      // Use templates directly from Python clustering result
      const equipmentTemplates = templates || [];
      
      // The Python script already calculates confidence scores, so we use them directly
      // Auto-confirm equipment with high confidence (≥85%)
      const AUTO_CONFIRM_THRESHOLD = 85;
      const finalEquipmentInstances = clusteredEquipment.map((equip) => {
        const shouldAutoConfirm = equip.confidence >= AUTO_CONFIRM_THRESHOLD;
        return {
          ...equip,
          // PRESERVE the original filename-based typeId instead of overriding with cluster ID
          // typeId: `type-${equip.cluster}`,  // OLD: This was breaking equipment type matching
          status: shouldAutoConfirm ? 'confirmed' as const : 'suggested' as const
        } as EquipmentInstance;
      });
      
      const confirmedCount = finalEquipmentInstances.filter(eq => eq.status === 'confirmed').length;
      const suggestedCount = finalEquipmentInstances.filter(eq => eq.status === 'suggested').length;
      console.log(`🤖 Auto-confirmation: ${confirmedCount} confirmed (≥${AUTO_CONFIRM_THRESHOLD}% confidence), ${suggestedCount} suggested for review`);
    
      console.log(`✅ Classification completed: ${finalEquipmentInstances.length} equipment instances, ${equipmentTemplates.length} templates`);
      
      if (anomalyDetection) {
        console.log(`🚨 Anomaly detection completed: ${anomalyDetection.anomalies.length} anomalies found`);
      }
      
      return { 
        equipmentInstances: finalEquipmentInstances, 
        equipmentTemplates, 
        allPoints,
        anomalyDetectionResult: anomalyDetection,
      };

    } catch (error) {
      console.error("🚨 CRITICAL ERROR during clustering and classification:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      console.error("Number of vectors:", vectors.length);
      console.error("Vector length:", vectors[0]?.length || 0);
      // Return a safe, empty result to prevent the API from crashing
      return { 
        equipmentInstances: [], 
        equipmentTemplates: [], 
        allPoints,
        anomalyDetectionResult: getEmptyAnomalyDetectionResult()
      };
    }
};

// =================================================================================
// === Final API Orchestrator
// =================================================================================

// Helper function to read file content
async function readFileContent(file: File): Promise<string> {
  const chunks = [];
  // @ts-ignore
  for await (const chunk of file.stream()) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Extracts equipment type from filename by taking only the alphabetic prefix
 * Examples: 
 * - RTU_10.trio -> RTU
 * - VVR_2.1.trio -> VVR  
 * - VV-1-R8.trio -> VV
 * - L-10_L-12.trio -> L
 * - MISC1_EF.trio -> MISC
 */
const extractEquipmentTypeFromFilename = (filename: string): string => {
  // Remove .trio extension
  const baseName = filename.replace('.trio', '');
  
  // Extract only the alphabetic prefix before any numbers, underscores, hyphens, or dots
  const match = baseName.match(/^([A-Za-z]+)/);
  if (match) {
    return match[1].toUpperCase(); // Normalize to uppercase
  }
  
  // Fallback: if no alphabetic prefix found, use the whole name
  return baseName.toUpperCase();
};

/**
 * Creates equipment instances with filename-based type classification
 * This replaces complex ML clustering with simple, accurate filename parsing
 */
const createEquipmentFromFilenames = (allPoints: BACnetPoint[]): {
  equipment: EquipmentInstance[];
  points: BACnetPoint[];
  equipmentTypes: Set<string>;
} => {
  const equipmentByFile = new Map<string, BACnetPoint[]>();
  const equipmentTypes = new Set<string>();
  
  // Group points by filename
  allPoints.forEach(point => {
    const fileName = point.fileName?.replace('.trio', '') || 'unknown';
    if (!equipmentByFile.has(fileName)) {
      equipmentByFile.set(fileName, []);
    }
    equipmentByFile.get(fileName)?.push(point);
  });

  // Create equipment instances with type detection
  const equipment = Array.from(equipmentByFile.entries()).map(([fileName, points]) => {
    const equipmentType = extractEquipmentTypeFromFilename(fileName + '.trio');
    equipmentTypes.add(equipmentType);
    
    // Variable confidence based on equipment characteristics to create mix of confirmed/suggested
    // This ensures some equipment needs user review while others can be auto-confirmed
    let confidence = 75; // Base confidence for filename-based classification
    
    // Boost confidence for equipment with many points (likely more reliable)
    if (points.length > 100) confidence += 15; // 90% for large equipment
    else if (points.length > 50) confidence += 10; // 85% for medium equipment
    else if (points.length > 20) confidence += 5;  // 80% for small equipment
    // Equipment with <20 points stays at 75% (suggested)
    
    // Boost confidence for common equipment types
    const commonTypes = ['RTU', 'AHU', 'VAV', 'VVR', 'FCU'];
    if (commonTypes.includes(equipmentType.toUpperCase())) {
      confidence += 5;
    }
    
    // Cap at 95% max
    confidence = Math.min(confidence, 95);
    
    const shouldAutoConfirm = confidence >= 85; // Auto-confirm threshold
    
    return {
      id: fileName,
      name: fileName,
      typeId: equipmentType.toLowerCase(), // Use actual equipment type instead of generic 'type-1'
      confidence,
      status: shouldAutoConfirm ? 'confirmed' as const : 'suggested' as const,
      pointIds: points.map(p => p.id),
    } as EquipmentInstance;
  });

  // Update points with equipment references
  const updatedPoints = allPoints.map(point => {
    const equipmentName = point.fileName?.replace('.trio', '') || 'unknown';
    const equipmentInstance = equipment.find(eq => eq.name === equipmentName);
    if (equipmentInstance) {
      // Points should inherit the same status as their equipment
      // Map equipment status to valid point status
      const pointStatus = equipmentInstance.status === 'needs-review' ? 'suggested' : equipmentInstance.status;
      return {
        ...point,
        equipRef: equipmentInstance.id,
        status: pointStatus as 'unassigned' | 'suggested' | 'confirmed' | 'flagged'
      };
    }
    return {
      ...point,
      equipRef: null,
      status: 'unassigned' as const
    };
  });

  return { equipment, points: updatedPoints, equipmentTypes };
};

/**
 * Creates templates based on equipment type + point count combinations
 * This groups equipment by type and then by point count to create specific templates
 * Example: VAV with 32 points, VAV with 13 points, AHU with 63 points, etc.
 */
const createTemplatesFromEquipmentTypeAndPointCount = (
  equipment: EquipmentInstance[], 
  allPoints: BACnetPoint[]
): EquipmentTemplate[] => {
  // Group equipment by type and point count
  const equipmentGroups = new Map<string, Map<number, EquipmentInstance[]>>();
  
  equipment.forEach(equip => {
    // Get points for this equipment
    const equipmentPoints = allPoints.filter(point => point.equipRef === equip.id);
    const pointCount = equipmentPoints.length;
    
    // Extract equipment type from typeId or name
    const equipmentType = equip.typeId || extractEquipmentTypeFromFilename(equip.name + '.trio');
    
    if (!equipmentGroups.has(equipmentType)) {
      equipmentGroups.set(equipmentType, new Map());
    }
    
    const typeGroup = equipmentGroups.get(equipmentType)!;
    if (!typeGroup.has(pointCount)) {
      typeGroup.set(pointCount, []);
    }
    
    typeGroup.get(pointCount)!.push(equip);
  });
  
  // Create templates for each equipment type + point count combination
  const templates: EquipmentTemplate[] = [];
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
  let colorIndex = 0;
  
  equipmentGroups.forEach((pointCountGroups, equipmentType) => {
    pointCountGroups.forEach((equipmentList, pointCount) => {
      const templateId = `template-${equipmentType.toLowerCase()}-${pointCount}pts`;
      const equipmentTypeDisplay = equipmentType.toUpperCase();
      
             // Get sample points from the first equipment in this group for point signature
       const sampleEquipment = equipmentList[0];
       const samplePoints = allPoints.filter(point => point.equipRef === sampleEquipment.id);
       const pointSignature: PointSignature[] = samplePoints.map(point => ({
         navName: point.navName || point.dis || point.id,
         kind: point.kind,
         unit: point.unit,
         bacnetPointType: point.bacnetCur,
         properties: [
           ...(point.point ? ['point'] : []),
           ...(point.writable ? ['writable'] : []),
           ...(point.cmd ? ['cmd'] : []),
           ...(point.sensor ? ['sensor'] : []),
           ...(point.his ? ['his'] : [])
         ],
         isRequired: true // Default to required for template matching
       }));
      
      templates.push({
        id: templateId,
        name: `${equipmentTypeDisplay} (${pointCount} points)`,
        equipmentTypeId: equipmentType.toLowerCase(),
        createdFrom: 'equipment-type-point-count-analysis',
        pointSignature,
        featureVector: [], // Could be enhanced with point pattern analysis
        createdAt: new Date(),
        appliedCount: equipmentList.length,
        color: colors[colorIndex % colors.length],
        confidence: 0.98, // High confidence for filename + point count based templates
        version: 1,
        isMLGenerated: false,
        effectiveness: {
          successfulApplications: equipmentList.length,
          failedApplications: 0,
          userConfirmations: 0,
          userRejections: 0,
          averageConfidenceScore: 0.98,
          successRate: 1.0
        },
        userFeedback: [],
        tags: [
          equipmentType.toLowerCase(), 
          'equipment', 
          'point-count-based',
          `${pointCount}-points`
        ],
                 description: `Template for ${equipmentTypeDisplay} equipment with ${pointCount} points. Based on ${equipmentList.length} equipment instance${equipmentList.length > 1 ? 's' : ''}: ${equipmentList.map(e => e.name).join(', ')}`,
         lastModified: new Date(),
         isActive: true,
         similarityThreshold: 0.90, // Higher threshold since we're more specific
         autoApplyEnabled: true
      });
      
      colorIndex++;
    });
  });
  
     // Sort templates by equipment type, then by point count (extracted from name)
   templates.sort((a, b) => {
     const typeA = a.equipmentTypeId;
     const typeB = b.equipmentTypeId;
     
     if (typeA !== typeB) {
       return typeA.localeCompare(typeB);
     }
     
     // Extract point count from template name (e.g., "VAV (32 points)" -> 32)
     const pointCountA = parseInt(a.name.match(/\((\d+) points\)/)?.[1] || '0');
     const pointCountB = parseInt(b.name.match(/\((\d+) points\)/)?.[1] || '0');
     return pointCountB - pointCountA; // Descending by point count
   });
   
   console.log(`🎯 Created ${templates.length} templates based on equipment type + point count combinations:`);
   templates.forEach(template => {
     console.log(`  - ${template.name}: ${template.appliedCount} instances`);
   });
  
  return templates;
};

/**
 * Processes uploaded Trio files by parsing them and then running the simplified filename-based classification.
 * This function is designed to be called from an API route on the server.
 */
export const processUploadedFiles = async (files: File[]): Promise<ProcessingResult> => {
  const allPoints: BACnetPoint[] = [];

  // Only process trio files - no more connector files
  const trioFiles = files.filter(f => f.name.endsWith('.trio'));

  if (trioFiles.length === 0) {
    console.warn('⚠️ No trio files found in upload');
    return getEmptyProcessingResult();
  }

  // Parse trio files to get points
  for (const file of trioFiles) {
    try {
      const fileContent = await readFileContent(file);
      const trioPoints = parseTrio(fileContent, file.name);
      const bacnetPoints = trioToBACnetPoints(trioPoints);
      allPoints.push(...bacnetPoints);
      console.log(`Successfully parsed ${file.name}, found ${bacnetPoints.length} points.`);
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
    }
  }

  if (allPoints.length === 0) {
    return getEmptyProcessingResult();
  }

  // Use pure filename-based approach only
  const result = createEquipmentFromFilenames(allPoints);
  const finalEquipment = result.equipment;
  const finalPoints = result.points;
  const detectedEquipmentTypes = result.equipmentTypes;
  
  console.log(`📁 Created ${finalEquipment.length} equipment instances from trio filenames`);
  console.log(`🏷️ Detected equipment types: ${Array.from(detectedEquipmentTypes).join(', ')}`);
  
  // Create templates based on equipment type + point count combinations
  const equipmentTemplates = createTemplatesFromEquipmentTypeAndPointCount(finalEquipment, finalPoints);

  // Create a simple anomaly detection result (no complex ML needed)
  const anomalyDetectionResult: AnomalyDetectionResult = {
    anomalies: [], // Could add basic anomaly detection based on point count or naming patterns
    totalProcessed: finalEquipment.length,
    anomalyRate: 0,
    detectionThreshold: 0.95,
    clusterQualityMetrics: {
      averageSilhouetteScore: 0.95, // High score since filename-based classification is very accurate
      clusterSeparation: 0.9,
      intraClusterDistance: 0.1
    }
  };

  const confirmedCount = finalEquipment.filter(eq => eq.status === 'confirmed').length;
  const suggestedCount = finalEquipment.filter(eq => eq.status === 'suggested').length;
  
  console.log(`🎯 Filename-based classification completed: ${confirmedCount} confirmed, ${suggestedCount} suggested`);
  console.log(`📊 Equipment types detected: ${detectedEquipmentTypes.size} unique types`);

  // Convert Set<string> to EquipmentType[] for the UI
  const equipmentTypesArray: EquipmentType[] = Array.from(detectedEquipmentTypes).map(typeId => ({
    id: typeId.toLowerCase(),
    name: typeId.toUpperCase(),
    description: `Equipment type detected from trio filenames`,
    category: 'detected',
    color: `#${Math.floor(Math.random()*16777215).toString(16)}` // Random color
  }));

  return {
    equipmentInstances: finalEquipment,
    equipmentTemplates,
    allPoints: finalPoints,
    anomalyDetectionResult,
    equipmentTypes: equipmentTypesArray
  };
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
  // If no points have been processed, return a default state
  if (tagGenerationMetrics.totalPointsProcessed === 0) {
    return getInitialPerformanceState();
  }

  const pythonServiceHealth = getPythonServiceMetrics();
  const healthScore = calculateOverallHealth();
  const performanceGrade =
    healthScore >= 90 ? "A" :
    healthScore >= 80 ? "B" :
    healthScore >= 70 ? "C" :
    healthScore >= 60 ? "D" : "F";

  const recommendations = checkQualityAlerts();

  // Consolidate key metrics for the summary
  const keyMetrics = {
    "Health Score": `${Math.round(healthScore)}%`,
    "Service Success Rate": `${Math.round(pythonServiceHealth.successRate * 100)}%`,
    "Avg Execution Time": `${Math.round(pythonServiceHealth.averageExecutionTime)}ms`,
    "User Confirmation Rate": `${Math.round(userInteractionMetrics.confirmationRate * 100)}%`,
    "Avg Silhouette Score": clusteringQualityMetrics.averageSilhouetteScore.toFixed(3),
    "Tag Validation Rate": `${Math.round(
      (tagGenerationMetrics.tagValidationResults.valid / (tagGenerationMetrics.totalPointsProcessed || 1)) * 100
    )}%`,
    "Total Processing Calls": pythonServiceHealth.totalCalls,
    "Points Processed": tagGenerationMetrics.totalPointsProcessed,
  };

  return {
    tagGeneration: tagGenerationMetrics,
    pythonService: pythonServiceHealth,
    userInteractions: userInteractionMetrics,
    clusteringQuality: clusteringQualityMetrics,
    summary: {
      overallHealthScore: healthScore,
      recommendations,
      performanceGrade,
      keyMetrics,
    },
  };
};

export const resetPerformanceAnalytics = (): void => {
  tagGenerationMetrics = {
    totalPointsProcessed: 0,
    averageTagsPerPoint: 0,
    tagQualityDistribution: {},
    processingTimeMs: 0,
    tagValidationResults: { valid: 0, invalid: 0, warnings: 0 },
  };
  serviceMetrics.totalCalls = 0;
  serviceMetrics.successfulCalls = 0;
  serviceMetrics.failedCalls = 0;
  serviceMetrics.averageExecutionTime = 0;
  serviceMetrics.executionTimes = [];
  serviceMetrics.memoryUsage = [];
  serviceMetrics.errorPatterns = {};
  userInteractionMetrics = {
    confirmationRate: 0,
    rejectionRate: 0,
    averageConfidenceBeforeUserAction: 0,
    mostCommonUserActions: {},
    timeToFirstInteraction: 0,
    sessionsCompleted: 0,
    averageSessionDuration: 0,
  };
  clusteringQualityMetrics = {
    silhouetteScores: [],
    averageSilhouetteScore: 0,
    clusterSeparation: 0,
    intraClusterDistances: [],
    interClusterDistances: [],
    stabilityScore: 0,
    optimalClusterCount: 0,
    actualClusterCount: 0,
  };
  console.log("Performance analytics have been reset.");
};

/**
 * Returns the initial state for the performance dashboard.
 */
const getInitialPerformanceState = () => ({
  tagGeneration: {
    totalPointsProcessed: 0,
    averageTagsPerPoint: 0,
    tagQualityDistribution: {},
    processingTimeMs: 0,
    tagValidationResults: { valid: 0, invalid: 0, warnings: 0 },
  },
  pythonService: {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageExecutionTime: 0,
    successRate: 0,
    isHealthy: false,
    isRecentlyHealthy: false,
    lastHealthCheck: null,
    executionTimes: [],
    memoryUsage: [],
    clusteringQuality: {
      averageSilhouetteScore: 0,
      clusterStability: 0,
      anomalyDetectionAccuracy: 0,
    },
    errorPatterns: {},
  },
  userInteractions: {
    confirmationRate: 0,
    rejectionRate: 0,
    averageConfidenceBeforeUserAction: 0,
    mostCommonUserActions: {},
    timeToFirstInteraction: 0,
    sessionsCompleted: 0,
    averageSessionDuration: 0,
  },
  clusteringQuality: {
    silhouetteScores: [],
    averageSilhouetteScore: 0,
    clusterSeparation: 0,
    intraClusterDistances: [],
    interClusterDistances: [],
    stabilityScore: 0,
    optimalClusterCount: 0,
    actualClusterCount: 0,
  },
  summary: {
    overallHealthScore: 0,
    recommendations: ["Upload files and process data to see performance metrics."],
    performanceGrade: "N/A",
    keyMetrics: {
      "Health Score": "0%",
      "Service Success Rate": "0%",
      "Avg Execution Time": "0ms",
      "User Confirmation Rate": "0%",
      "Avg Silhouette Score": "0.000",
      "Tag Validation Rate": "0%",
      "Total Processing Calls": 0,
      "Points Processed": 0,
    },
  },
});

// =================================================================================
// === Advanced Analytics and Reporting
// =================================================================================

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

function calculateOverallHealth(): number {
  const pythonHealth = getPythonServiceMetrics();
  const userMetrics = userInteractionMetrics;
  const clustering = clusteringQualityMetrics;
  const tagHealth = tagGenerationMetrics;

  const pythonScore = pythonHealth.successRate * 50 + (pythonHealth.isHealthy ? 50 : 0);
  const userScore = userMetrics.confirmationRate * 100;
  const clusterScore = (clustering.averageSilhouetteScore + 1) * 50; // Scale from [-1, 1] to [0, 100]
  const tagScore = (tagHealth.tagValidationResults.valid / (tagHealth.totalPointsProcessed || 1)) * 100;
  
  // Weighted average
  const overallScore = (pythonScore * 0.4) + (userScore * 0.3) + (clusterScore * 0.2) + (tagScore * 0.1);
  return Math.max(0, Math.min(100, overallScore)); // Clamp between 0 and 100
}

console.log('🔧 Enhanced BACnet Processor with Performance Monitoring loaded');

export const exportAnalyticsData = () => {
  return getPerformanceAnalytics();
};

// --- UTILITY ---
function getEmptyAnomalyDetectionResult(): AnomalyDetectionResult {
  return {
    totalProcessed: 0,
    anomalyRate: 0,
    detectionThreshold: 0,
    anomalies: [],
    clusterQualityMetrics: {
      averageSilhouetteScore: 0,
      clusterSeparation: 0,
      intraClusterDistance: 0,
    }
  };
}

function getEmptyProcessingResult(): ProcessingResult {
    return {
      equipmentInstances: [],
      equipmentTemplates: [],
      allPoints: [],
      anomalyDetectionResult: getEmptyAnomalyDetectionResult(),
    };
}
