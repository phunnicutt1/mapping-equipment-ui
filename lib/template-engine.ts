import { BACnetPoint, EquipmentInstance, EquipmentTemplate, PointSignature } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Template Engine for Equipment-Point Mapping
 * Supports robust point signature matching and template automation
 */

export interface TemplateMatchResult {
  templateId: string;
  equipmentId: string;
  confidence: number;
  matchingPoints: string[];
  missingPoints: PointSignature[];
  extraPoints: string[];
}

export interface TemplateSignature {
  equipmentType: string;
  pointCount: number;
  pointSignatures: PointSignature[];
  signatureHash: string;
}

/**
 * Create a robust point signature from a BACnet point
 */
export function createPointSignature(point: BACnetPoint): PointSignature {
  return {
    navName: point.navName || '',
    kind: point.kind || '',
    unit: point.unit || '',
    bacnetPointType: point.bacnetCur || '',
    properties: [
      ...(point.writable ? ['writable'] : []),
      ...(point.point ? ['point'] : []),
      ...(point.cmd ? ['cmd'] : []),
      ...(point.his ? ['his'] : []),
      ...(point.sensor ? ['sensor'] : [])
    ],
    isRequired: true
  };
}

/**
 * Generate a hash for template signature to enable fast comparison
 */
export function generateSignatureHash(signatures: PointSignature[]): string {
  const sortedSignatures = signatures
    .map(sig => `${sig.kind}:${sig.unit}:${sig.navName}`)
    .sort()
    .join('|');
  
  // Simple hash function for demonstration
  let hash = 0;
  for (let i = 0; i < sortedSignatures.length; i++) {
    const char = sortedSignatures.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Create a template from confirmed equipment and points
 */
export function createTemplate(
  equipment: EquipmentInstance,
  confirmedPoints: BACnetPoint[],
  templateName: string
): EquipmentTemplate {
  const pointSignatures = confirmedPoints.map(createPointSignature);
  const signatureHash = generateSignatureHash(pointSignatures);
  
  return {
    id: uuidv4(),
    name: templateName,
    equipmentTypeId: equipment.typeId,
    createdFrom: equipment.id,
    pointSignature: pointSignatures,
    featureVector: [], // Empty for now, would be populated by ML pipeline
    createdAt: new Date(),
    appliedCount: 0,
    color: '#3B82F6', // Default blue color
    confidence: 0.95,
    version: 1,
    isMLGenerated: false,
    effectiveness: {
      successfulApplications: 0,
      failedApplications: 0,
      userConfirmations: 0,
      userRejections: 0,
      averageConfidenceScore: 0,
      successRate: 0
    },
    userFeedback: [],
    tags: [equipment.typeId, 'user-created'],
    description: `Template created from ${equipment.name}`,
    lastModified: new Date(),
    isActive: true,
    similarityThreshold: 0.8,
    autoApplyEnabled: true
  };
}

/**
 * Calculate similarity between two point signatures
 */
export function calculatePointSimilarity(sig1: PointSignature, sig2: PointSignature): number {
  let score = 0;
  let totalWeight = 0;
  
  // Kind matching (highest weight)
  if (sig1.kind === sig2.kind) score += 0.4;
  totalWeight += 0.4;
  
  // Unit matching (high weight)
  if (sig1.unit === sig2.unit) score += 0.3;
  totalWeight += 0.3;
  
  // NavName similarity (medium weight)
  if (sig1.navName && sig2.navName) {
    const nameSimilarity = calculateStringSimilarity(sig1.navName, sig2.navName);
    score += nameSimilarity * 0.2;
  }
  totalWeight += 0.2;
  
  // Properties matching (lower weight)
  const propSimilarity = calculatePropertiesSimilarity(sig1.properties, sig2.properties);
  score += propSimilarity * 0.1;
  totalWeight += 0.1;
  
  return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len2][len1]) / maxLen;
}

/**
 * Calculate properties similarity
 */
function calculatePropertiesSimilarity(props1: string[], props2: string[]): number {
  const set1 = new Set(props1);
  const set2 = new Set(props2);
  const allProps = new Set([...props1, ...props2]);
  
  if (allProps.size === 0) return 1; // Both empty
  
  let matches = 0;
  Array.from(allProps).forEach(prop => {
    if (set1.has(prop) && set2.has(prop)) matches++;
  });
  
  return matches / allProps.size;
}

/**
 * Find equipment that matches a template
 */
export function findTemplateMatches(
  template: EquipmentTemplate,
  equipment: EquipmentInstance[],
  allPoints: BACnetPoint[],
  threshold: number = 0.8
): TemplateMatchResult[] {
  const matches: TemplateMatchResult[] = [];
  
  // Filter equipment by type and exclude those already templated
  const candidateEquipment = equipment.filter(eq => 
    eq.typeId === template.equipmentTypeId && 
    !eq.templateId &&
    eq.status !== 'confirmed'
  );
  
  for (const eq of candidateEquipment) {
    const equipmentPoints = allPoints.filter(p => p.equipRef === eq.id);
    const equipmentSignatures = equipmentPoints.map(createPointSignature);
    
    const matchResult = matchTemplateSignatures(
      template.pointSignature,
      equipmentSignatures,
      equipmentPoints.map(p => p.id)
    );
    
    if (matchResult.confidence >= threshold) {
      matches.push({
        templateId: template.id,
        equipmentId: eq.id,
        confidence: matchResult.confidence,
        matchingPoints: matchResult.matchingPoints,
        missingPoints: matchResult.missingPoints,
        extraPoints: matchResult.extraPoints
      });
    }
  }
  
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Match template signatures against equipment point signatures
 */
function matchTemplateSignatures(
  templateSignatures: PointSignature[],
  equipmentSignatures: PointSignature[],
  pointIds: string[]
): {
  confidence: number;
  matchingPoints: string[];
  missingPoints: PointSignature[];
  extraPoints: string[];
} {
  const matchingPoints: string[] = [];
  const missingPoints: PointSignature[] = [];
  const usedEquipmentIndices = new Set<number>();
  
  // Find best matches for each template signature
  for (const templateSig of templateSignatures) {
    let bestMatch = -1;
    let bestSimilarity = 0;
    
    for (let i = 0; i < equipmentSignatures.length; i++) {
      if (usedEquipmentIndices.has(i)) continue;
      
      const similarity = calculatePointSimilarity(templateSig, equipmentSignatures[i]);
      if (similarity > bestSimilarity && similarity > 0.6) {
        bestSimilarity = similarity;
        bestMatch = i;
      }
    }
    
    if (bestMatch >= 0) {
      matchingPoints.push(pointIds[bestMatch]);
      usedEquipmentIndices.add(bestMatch);
    } else {
      missingPoints.push(templateSig);
    }
  }
  
  // Find extra points (not matched by template)
  const extraPoints: string[] = [];
  for (let i = 0; i < pointIds.length; i++) {
    if (!usedEquipmentIndices.has(i)) {
      extraPoints.push(pointIds[i]);
    }
  }
  
  // Calculate overall confidence
  const matchRatio = matchingPoints.length / templateSignatures.length;
  const penaltyForMissing = missingPoints.length * 0.1;
  const penaltyForExtra = extraPoints.length * 0.05;
  
  const confidence = Math.max(0, matchRatio - penaltyForMissing - penaltyForExtra);
  
  return {
    confidence,
    matchingPoints,
    missingPoints,
    extraPoints
  };
}

/**
 * Apply template to equipment automatically
 */
export function applyTemplate(
  template: EquipmentTemplate,
  equipment: EquipmentInstance,
  matchResult: TemplateMatchResult,
  allPoints: BACnetPoint[]
): {
  updatedEquipment: EquipmentInstance;
  updatedPoints: BACnetPoint[];
} {
  // Update equipment with template
  const updatedEquipment: EquipmentInstance = {
    ...equipment,
    templateId: template.id,
    status: matchResult.confidence >= 0.9 ? 'confirmed' : 'suggested',
    confidence: Math.max(equipment.confidence, matchResult.confidence)
  };
  
  // Update points status based on template match
  const updatedPoints = allPoints.map(point => {
    if (matchResult.matchingPoints.includes(point.id)) {
      const newStatus = matchResult.confidence >= 0.9 ? 'confirmed' : 'suggested';
      return {
        ...point,
        status: newStatus as 'confirmed' | 'suggested',
        confidence: Math.max(point.confidence || 0, matchResult.confidence)
      };
    }
    return point;
  });
  
  return {
    updatedEquipment,
    updatedPoints
  };
}

/**
 * Validate template effectiveness
 */
export function validateTemplateEffectiveness(
  template: EquipmentTemplate,
  appliedEquipment: EquipmentInstance[],
  userFeedback: { equipmentId: string; success: boolean; confidence: number }[]
): {
  successRate: number;
  averageConfidence: number;
  recommendedThreshold: number;
} {
  const feedback = userFeedback.filter(f => 
    appliedEquipment.some(eq => eq.id === f.equipmentId && eq.templateId === template.id)
  );
  
  if (feedback.length === 0) {
    return {
      successRate: 0,
      averageConfidence: 0,
      recommendedThreshold: 0.8
    };
  }
  
  const successCount = feedback.filter(f => f.success).length;
  const successRate = successCount / feedback.length;
  const averageConfidence = feedback.reduce((sum, f) => sum + f.confidence, 0) / feedback.length;
  
  // Adjust recommended threshold based on success rate
  let recommendedThreshold = 0.8;
  if (successRate < 0.7) {
    recommendedThreshold = 0.9; // Require higher confidence
  } else if (successRate > 0.9) {
    recommendedThreshold = 0.7; // Allow lower confidence
  }
  
  return {
    successRate,
    averageConfidence,
    recommendedThreshold
  };
} 