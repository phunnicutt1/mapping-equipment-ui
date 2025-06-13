import { create } from 'zustand';
import { 
  GroupingState, 
  BACnetPoint, 
  EquipmentInstance, 
  EquipmentTemplate, 
  EquipmentType,
  PointSignature, 
  ConsoleMessage, 
  ProcessingResult, 
  GroupingMethod,
  TemplateSimilarityMatch,
  TemplateUserFeedback,
  TemplateEffectiveness,
  TemplateActivity,
  NewEquipmentTypeCandidate
} from './types';
import { generateRandomTemplateColor, equipmentTypes } from './utils';

interface GroupingActions {
  loadPoints: (points: BACnetPoint[]) => void; // DEPRECATED: Use loadProcessedData instead
  loadProcessedData: (result: ProcessingResult) => void; // PRIMARY: ML pipeline data loading method
  setGroupingMethod: (method: GroupingMethod) => void;
  confirmEquipment: (equipmentId: string) => void;
  flagEquipment: (equipmentId: string) => void;
  confirmPoint: (pointId: string) => void;
  flagPoint: (pointId: string) => void;
  confirmAllEquipmentPoints: (equipmentId: string) => void;
  assignPoints: (pointIds: string[], equipmentId: string) => void;
  assignSinglePoint: (pointId: string, equipmentId: string) => void;
  createEquipment: (name: string, typeId: string) => void;
  toggleUnassignedDrawer: () => void;
  toggleConfirmedDrawer: () => void;
  togglePointSelection: (pointId: string) => void;
  clearSelection: () => void;
  createTemplate: (equipmentId: string, templateName?: string) => Promise<{ success: boolean; appliedCount?: number; templateId?: string }>;
  applyTemplateToSimilarEquipment: (templateId: string) => Promise<number>;
  addConsoleMessage: (message: Omit<ConsoleMessage, 'id' | 'timestamp'>) => void;
  saveDraft: () => Promise<void>;
  finalize: () => Promise<{ success: boolean; errors?: string[] }>;
  checkCompletion: () => void;
  dismissCelebration: () => void;
  triggerCelebration: () => void;
  // Advanced template management actions
  toggleTemplateManager: () => void;
  refineTemplate: (templateId: string, refinements: Partial<EquipmentTemplate>) => Promise<{ success: boolean; newTemplateId?: string }>;
  findSimilarEquipment: (templateId: string, threshold?: number) => Promise<TemplateSimilarityMatch[]>;
  applyTemplateMatch: (matchId: string, confirmed: boolean) => void;
  addTemplateFeedback: (templateId: string, feedback: Omit<TemplateUserFeedback, 'id' | 'timestamp'>) => void;
  updateTemplateEffectiveness: (templateId: string, success: boolean, confidence?: number) => void;
  deactivateTemplate: (templateId: string) => void;
  activateTemplate: (templateId: string) => void;
  exportTemplate: (templateId: string) => Promise<{ success: boolean; data?: string }>;
  importTemplate: (templateData: string) => Promise<{ success: boolean; templateId?: string }>;
  calculateTemplateAnalytics: () => void;
  mergeTemplates: (templateIds: string[], newName: string) => Promise<{ success: boolean; newTemplateId?: string }>;
  // Anomaly detection actions
  toggleAnomalyPanel: () => void;
  reviewAnomaly: (anomalyId: string, decision: 'confirm' | 'classify' | 'dismiss') => void;
  assignAnomalyToEquipmentType: (anomalyId: string, equipmentTypeId: string) => void;
  createEquipmentTypeFromAnomalies: (anomalyIds: string[], typeName: string, description: string) => Promise<{ success: boolean; typeId?: string }>;
  groupSimilarAnomalies: (anomalyIds: string[]) => Promise<{ success: boolean; candidateId?: string }>;
  runAnomalyDetection: (threshold?: number) => Promise<any>;
  approveNewEquipmentType: (candidateId: string) => void;
  rejectNewEquipmentType: (candidateId: string, reason: string) => void;
  // Performance monitoring actions
  togglePerformanceDashboard: () => void;
}

export const useGroupingStore = create<GroupingState & GroupingActions>((set, get) => ({
  // Initial state
  points: [],
  equipmentTypes: equipmentTypes, // Load predefined equipment types
  equipmentInstances: [],
  templates: [],
  suggestedTemplates: [], // New state
  stats: {
    totalPoints: 0,
    assignedPoints: 0,
    equipmentGroups: 0,
    templatedEquipment: 0,
    confidenceDistribution: { high: 0, medium: 0, low: 0 }
  },
  consoleMessages: [],
  selectedGroupingMethod: 'smart',
  isProcessing: false,
  showUnassignedDrawer: false,
  showConfirmedDrawer: false,
  selectedPoints: new Set(),
  showCelebration: false,
  isComplete: false,
  // Advanced template management state
  templateSimilarityMatches: [],
  templateAnalytics: {
    totalTemplates: 0,
    activeTemplates: 0,
    mlGeneratedTemplates: 0,
    userCreatedTemplates: 0,
    totalApplications: 0,
    successfulApplications: 0,
    averageSuccessRate: 0,
    recentActivity: []
  },
  showTemplateManager: false,
  // Anomaly detection state
  anomalies: [],
  newEquipmentTypeCandidates: [],
  showAnomalyPanel: false,
  anomalyDetectionResults: undefined,
  // Performance monitoring state
  showPerformanceDashboard: false,

  // Actions
  loadProcessedData: (result) => {
    set({ isProcessing: true });
    
    try {
      // Validate the processed data structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid result object');
      }
      
      if (!result.allPoints || !Array.isArray(result.allPoints)) {
        throw new Error('Invalid points data structure');
      }
      
      if (!result.equipmentInstances || !Array.isArray(result.equipmentInstances)) {
        throw new Error('Invalid equipment instances data structure');
      }
      
      if (!result.equipmentTemplates || !Array.isArray(result.equipmentTemplates)) {
        throw new Error('Invalid equipment templates data structure');
      }
      
      // Debug logging to examine the ML pipeline data
      console.log('🔍 ML PIPELINE DATA ANALYSIS:');
      console.log('📊 Equipment Instances:', result.equipmentInstances.length);
      console.log('📋 Equipment Sample:', result.equipmentInstances.slice(0, 3).map(eq => ({
        id: eq.id,
        name: eq.name,
        status: eq.status,
        confidence: eq.confidence,
        pointCount: eq.pointIds?.length || 0,
        cluster: eq.cluster,
        typeId: eq.typeId
      })));
      
      console.log('📍 Points Data:', result.allPoints.length);
      console.log('📝 Points Sample:', result.allPoints.slice(0, 3).map(p => ({
        id: p.id,
        dis: p.dis,
        equipRef: p.equipRef,
        status: p.status,
        fileName: p.fileName
      })));
      
      console.log('🎯 Templates Generated:', result.equipmentTemplates.length);
      console.log('📋 Template Sample:', result.equipmentTemplates.slice(0, 2).map(t => ({
        id: t.id,
        name: t.name,
        equipmentTypeId: t.equipmentTypeId,
        createdFrom: t.createdFrom
      })));
      
      // Check point-to-equipment mapping
      const pointsWithEquipRef = result.allPoints.filter(p => p.equipRef);
      const pointsWithoutEquipRef = result.allPoints.filter(p => !p.equipRef);
      console.log('🔗 Point Mapping:', {
        totalPoints: result.allPoints.length,
        mappedToEquipment: pointsWithEquipRef.length,
        unmapped: pointsWithoutEquipRef.length,
        mappingPercentage: Math.round((pointsWithEquipRef.length / result.allPoints.length) * 100)
      });
      
      // Check equipment status distribution
      const statusCounts = result.equipmentInstances.reduce((acc, eq) => {
        acc[eq.status] = (acc[eq.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📈 Equipment Status Distribution:', statusCounts);
      
      // Calculate confidence distribution
      const confidenceDistribution = result.equipmentInstances.reduce((acc, eq) => {
        if (eq.confidence >= 80) acc.high++;
        else if (eq.confidence >= 50) acc.medium++;
        else acc.low++;
        return acc;
      }, { high: 0, medium: 0, low: 0 });
      
      // Calculate processing statistics
      const stats = {
        totalPoints: result.allPoints.length,
        assignedPoints: pointsWithEquipRef.length,
        equipmentGroups: result.equipmentInstances.length,
        templatedEquipment: result.equipmentTemplates.length,
        confidenceDistribution
      };
      
      // Ensure equipment instances have valid typeIds
      const currentEquipmentTypes = get().equipmentTypes;
      const processedEquipmentInstances = result.equipmentInstances.map(equipment => {
        // If the equipment has an invalid typeId, try to detect it from the name or assign a default
        if (!currentEquipmentTypes.find(type => type.id === equipment.typeId)) {
          // Try to detect equipment type from name
          const detectedType = currentEquipmentTypes.find(type => 
            type.pattern && type.pattern.test(equipment.name)
          );
          
          if (detectedType) {
            console.log(`🔧 Auto-detected type for ${equipment.name}: ${detectedType.id}`);
            return { ...equipment, typeId: detectedType.id };
          } else {
            // Default to 'zones' for unclassified equipment
            console.log(`⚠️ No type detected for ${equipment.name}, defaulting to 'zones'`);
            return { ...equipment, typeId: 'zones' };
          }
        }
        return equipment;
      });
      
      console.log('🔧 Equipment Type Mapping:', {
        originalEquipment: result.equipmentInstances.length,
        processedEquipment: processedEquipmentInstances.length,
        typeDistribution: processedEquipmentInstances.reduce((acc, eq) => {
          acc[eq.typeId] = (acc[eq.typeId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
      set({
        equipmentInstances: processedEquipmentInstances,
        suggestedTemplates: result.equipmentTemplates,
        points: result.allPoints,
        stats,
        isProcessing: false,
        // Handle anomaly detection results
        anomalies: result.anomalyDetectionResult?.anomalies || [],
        anomalyDetectionResults: result.anomalyDetectionResult
      });
      
      get().addConsoleMessage({
        level: 'success',
        message: `ML pipeline data loaded successfully: ${result.equipmentInstances.length} equipment instances, ${result.allPoints.length} points, ${result.equipmentTemplates.length} templates.`
      });
      
      // Log detailed statistics
      get().addConsoleMessage({
        level: 'info',
        message: `Processing stats: ${stats.assignedPoints}/${stats.totalPoints} points assigned (${Math.round((stats.assignedPoints / stats.totalPoints) * 100)}%), confidence: ${stats.confidenceDistribution.high} high, ${stats.confidenceDistribution.medium} medium, ${stats.confidenceDistribution.low} low.`
      });
      
      // Log anomaly detection results if available
      if (result.anomalyDetectionResult) {
        const anomalyResult = result.anomalyDetectionResult;
        get().addConsoleMessage({
          level: anomalyResult.anomalies.length > 0 ? 'warning' : 'info',
          message: `Anomaly detection: ${anomalyResult.anomalies.length} anomalies found (${anomalyResult.anomalyRate.toFixed(1)}% anomaly rate). Quality score: ${(anomalyResult.clusterQualityMetrics.averageSilhouetteScore * 100).toFixed(1)}%.`
        });
      }
      
      console.log('✅ ML pipeline data integration complete');
      
    } catch (error) {
      console.error('❌ Error loading processed data:', error);
      set({ isProcessing: false });
      
      get().addConsoleMessage({
        level: 'error',
        message: `Failed to load ML pipeline data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      // Don't throw the error, just log it and continue with empty state
    }
  },

  loadPoints: (points) => {
    set({ isProcessing: true });
    
    // DEPRECATION NOTICE: This function now redirects to the ML pipeline
    // Legacy regex-based processing has been deprecated in favor of K-Modes clustering
    try {
      // Create a temporary file-like structure for the ML pipeline
      const mockFile = new File([JSON.stringify(points)], 'legacy-points.json', {
        type: 'application/json'
      });
      
      // Redirect to the ML processing pipeline
      get().addConsoleMessage({
        level: 'info',
        message: `DEPRECATED: loadPoints redirected to ML pipeline. Please use upload workflow for new data.`
      });
      
      // For backward compatibility, we'll simulate the old behavior by using loadProcessedData
      // This creates a simplified processing result that mimics the old structure
      const processedResult = {
        equipmentInstances: points.map((point, index) => ({
          id: point.equipRef || `legacy-${index}`,
          name: point.fileName || `Equipment ${index}`,
          typeId: 'unclassified',
          confidence: 0.5, // Low confidence for legacy data
          status: 'needs-review' as const,
          pointIds: [point.id],
          vendor: point.vendor,
          model: point.model,
          bacnetDeviceName: point.bacnetDeviceName
        })),
        equipmentTemplates: [],
        allPoints: points.map(point => ({
          ...point,
          status: point.status || 'unassigned' as const
        }))
      };
      
      // Use the new ML pipeline data loading method
      get().loadProcessedData(processedResult);
      
    } catch (error) {
      console.error('Error in deprecated loadPoints function:', error);
      set({ isProcessing: false });
      
      get().addConsoleMessage({
        level: 'error',
        message: `Error in legacy data loading: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  },
  // ... (rest of the actions remain the same)
  setGroupingMethod: (method) => {
    set({ selectedGroupingMethod: method });
    
    const state = get();
    if (state.points.length > 0) {
      if (method === 'smart') {
        // DEPRECATED: Legacy smart grouping has been replaced with ML pipeline
        get().addConsoleMessage({
          level: 'warning',
          message: `Smart grouping method deprecated. Please use file upload workflow for ML-based clustering.`
        });
        
        // For backward compatibility, maintain existing equipment instances
        get().addConsoleMessage({
          level: 'info',
          message: `Smart grouping selection maintained - using existing ML-processed data`
        });
      } else {
        // Clear equipment instances for other grouping methods
        const updatedPoints = state.points.map(point => ({
          ...point,
          equipRef: null,
          status: 'unassigned' as const
        }));
        
        const newStats = {
          totalPoints: updatedPoints.length,
          assignedPoints: 0,
          equipmentGroups: 0,
          templatedEquipment: 0,
          confidenceDistribution: { high: 0, medium: 0, low: 0 }
        };
        
        set({
          points: updatedPoints,
          equipmentInstances: [],
          stats: newStats
        });
        
        get().addConsoleMessage({
          level: 'info',
          message: `Grouping method changed to ${method} - equipment assignments cleared`
        });
      }
    }
  },

  confirmEquipment: (equipmentId) => {
    set(state => ({
      equipmentInstances: state.equipmentInstances.map(eq =>
        eq.id === equipmentId ? { ...eq, status: 'confirmed', confidence: 1.0 } : eq
      )
    }));
    get().addConsoleMessage({
      level: 'success',
      message: `Equipment confirmed: ${equipmentId} (confidence set to 100%)`
    });
    get().checkCompletion();
  },

  flagEquipment: (equipmentId) => {
    set(state => ({
      equipmentInstances: state.equipmentInstances.map(eq =>
        eq.id === equipmentId ? { ...eq, status: 'needs-review' } : eq
      )
    }));
    get().addConsoleMessage({
      level: 'warning',
      message: `Equipment flagged for review: ${equipmentId}`
    });
  },

  confirmPoint: (pointId) => {
    set(state => ({
      points: state.points.map(point =>
        point.id === pointId ? { ...point, status: 'confirmed', confidence: 1.0 } : point
      )
    }));
    get().addConsoleMessage({
      level: 'success',
      message: `Point confirmed: ${pointId} (confidence set to 100%)`
    });
    get().checkCompletion();
  },

  flagPoint: (pointId) => {
    set(state => ({
      points: state.points.map(point =>
        point.id === pointId ? { ...point, status: 'flagged' } : point
      )
    }));
    get().addConsoleMessage({
      level: 'warning',
      message: `Point flagged for review: ${pointId}`
    });
  },

  confirmAllEquipmentPoints: (equipmentId) => {
    const state = get();
    const equipmentPoints = state.points.filter(point => point.equipRef === equipmentId);
    
    set(state => ({
      points: state.points.map(point =>
        point.equipRef === equipmentId ? { ...point, status: 'confirmed', confidence: 1.0 } : point
      ),
      equipmentInstances: state.equipmentInstances.map(eq =>
        eq.id === equipmentId ? { ...eq, status: 'confirmed', confidence: 1.0 } : eq
      )
    }));
    
    get().addConsoleMessage({
      level: 'success',
      message: `Confirmed all ${equipmentPoints.length} points for equipment: ${equipmentPoints.length} (confidence set to 100%)`
    });
    get().checkCompletion();
  },

  assignPoints: (pointIds, equipmentId) => {
    set(state => ({
      points: state.points.map(point =>
        pointIds.includes(point.id) 
          ? { ...point, equipRef: equipmentId, status: 'confirmed', confidence: 1.0 }
          : point
      ),
      equipmentInstances: state.equipmentInstances.map(eq =>
        eq.id === equipmentId 
          ? { ...eq, pointIds: Array.from(new Set([...eq.pointIds, ...pointIds])), confidence: 1.0 }
          : eq
      )
    }));
    get().addConsoleMessage({
      level: 'success',
      message: `Assigned ${pointIds.length} points to equipment ${equipmentId} (confidence set to 100%)`
    });
    get().checkCompletion();
  },

  assignSinglePoint: (pointId, equipmentId) => {
    const state = get();
    const equipment = state.equipmentInstances.find(eq => eq.id === equipmentId);
    const point = state.points.find(p => p.id === pointId);
    
    set(state => ({
      points: state.points.map(point =>
        point.id === pointId 
          ? { ...point, equipRef: equipmentId, status: 'suggested' }
          : point
      ),
      equipmentInstances: state.equipmentInstances.map(eq =>
        eq.id === equipmentId 
          ? { ...eq, pointIds: Array.from(new Set([...eq.pointIds, pointId])) }
          : eq
      )
    }));
    
    get().addConsoleMessage({
      level: 'success',
      message: `Assigned "${point?.dis}" to ${equipment?.name}`
    });
    get().checkCompletion();
  },

  createEquipment: (name, typeId) => {
    const newEquipment: EquipmentInstance = {
      id: `manual-${Date.now()}`,
      name,
      typeId,
      confidence: 1.0,
      status: 'confirmed',
      pointIds: []
    };
    
    set(state => ({
      equipmentInstances: [...state.equipmentInstances, newEquipment]
    }));
    
    get().addConsoleMessage({
      level: 'info',
      message: `Created new equipment: ${name}`
    });
  },

  toggleUnassignedDrawer: () => {
    set(state => ({ showUnassignedDrawer: !state.showUnassignedDrawer }));
  },

  toggleConfirmedDrawer: () => {
    set(state => ({ showConfirmedDrawer: !state.showConfirmedDrawer }));
  },

  togglePointSelection: (pointId) => {
    set(state => {
      const newSelection = new Set(state.selectedPoints);
      if (newSelection.has(pointId)) {
        newSelection.delete(pointId);
      } else {
        newSelection.add(pointId);
      }
      return { selectedPoints: newSelection };
    });
  },

  clearSelection: () => {
    set({ selectedPoints: new Set() });
  },

  createTemplate: async (equipmentId, templateName) => {
    const state = get();
    const equipment = state.equipmentInstances.find(eq => eq.id === equipmentId);
    const equipmentType = state.equipmentTypes.find(type => type.id === equipment?.typeId);
    
    if (!equipment || !equipmentType) {
      get().addConsoleMessage({
        level: 'error',
        message: 'Equipment or equipment type not found'
      });
      return { success: false };
    }

    // Get confirmed points for this equipment
    const equipmentPoints = state.points.filter(point => 
      point.equipRef === equipmentId && point.status === 'confirmed'
    );

    if (equipmentPoints.length === 0) {
      get().addConsoleMessage({
        level: 'warning',
        message: 'No confirmed points found. Please confirm points before creating a template.'
      });
      return { success: false };
    }

    // Create point signature from confirmed points
    const pointSignature: PointSignature[] = equipmentPoints.map(point => ({
      navName: point.navName || point.dis,
      kind: point.kind,
      unit: point.unit,
      bacnetPointType: point.bacnetCur?.match(/^[A-Z]{2}/)?.[0], // Extract AO, AI, BO, BI etc.
      properties: [
        ...(point.point ? ['point'] : []),
        ...(point.writable ? ['writable'] : []),
        ...(point.cmd ? ['cmd'] : []),
        ...(point.sensor ? ['sensor'] : []),
        ...(point.his ? ['his'] : [])
      ],
      isRequired: true
    }));

    // Create template
    const template: EquipmentTemplate = {
      id: `template-${Date.now()}`,
      name: templateName || `${equipment.name} Template`,
      equipmentTypeId: equipment.typeId,
      createdFrom: equipmentId,
      pointSignature,
      featureVector: [], // featureVector is now required, but empty for manual templates
      createdAt: new Date(),
      appliedCount: 0,
      color: generateRandomTemplateColor(),
      // Advanced template management properties
      version: 1,
      isMLGenerated: false, // This is a user-created template
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
      similarityThreshold: 0.7, // Default 70% similarity threshold
      autoApplyEnabled: true
    };

    // Add template to store and update analytics
    set(state => {
      const newActivity: TemplateActivity = {
        id: `activity-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        action: 'created',
        timestamp: new Date(),
        equipmentInstanceId: equipmentId,
        details: `Created from ${equipment.name} with ${pointSignature.length} point signatures`
      };

      return {
        templates: [...state.templates, template],
        equipmentInstances: state.equipmentInstances.map(eq =>
          eq.id === equipmentId ? { ...eq, templateId: template.id } : eq
        ),
        templateAnalytics: {
          ...state.templateAnalytics,
          totalTemplates: state.templateAnalytics.totalTemplates + 1,
          activeTemplates: state.templateAnalytics.activeTemplates + 1,
          userCreatedTemplates: state.templateAnalytics.userCreatedTemplates + 1,
          recentActivity: [newActivity, ...state.templateAnalytics.recentActivity].slice(0, 50)
        }
      };
    });

    get().addConsoleMessage({
      level: 'success',
      message: `Template "${template.name}" created with ${pointSignature.length} point signatures`
    });

    // Apply template to similar equipment automatically
    const appliedCount = await get().applyTemplateToSimilarEquipment(template.id);

    // Update template effectiveness after application
    if (appliedCount > 0) {
      get().updateTemplateEffectiveness(template.id, true, 1.0);
    }

    return { 
      success: true, 
      appliedCount,
      templateId: template.id
    };
  },

  applyTemplateToSimilarEquipment: async (templateId: string) => {
    const state = get();
    const template = state.templates.find(t => t.id === templateId);
    
    if (!template) return 0;

    // Find equipment of the same type that doesn't have a template applied
    const candidateEquipment = state.equipmentInstances.filter(eq => 
      eq.typeId === template.equipmentTypeId && 
      eq.status !== 'confirmed' && 
      !eq.templateId &&
      eq.id !== template.createdFrom
    );

    let appliedCount = 0;

    for (const equipment of candidateEquipment) {
      const equipmentPoints = state.points.filter(point => point.equipRef === equipment.id);
      
      // Check if equipment has points that match the template signature
      const matchingPoints = template.pointSignature.filter(signature => 
        equipmentPoints.some(point => 
          (point.navName === signature.navName || point.dis === signature.navName) &&
          point.kind === signature.kind &&
          point.unit === signature.unit
        )
      );

      // If equipment matches at least 70% of the template signature, apply it
      const matchPercentage = matchingPoints.length / template.pointSignature.length;
      
      if (matchPercentage >= 0.7) {
        // Apply template by confirming matching points and equipment
        set(state => ({
          points: state.points.map(point => {
            if (point.equipRef === equipment.id) {
              const matchesTemplate = template.pointSignature.some(sig => 
                (point.navName === sig.navName || point.dis === sig.navName) &&
                point.kind === sig.kind &&
                point.unit === sig.unit
              );
              
              if (matchesTemplate) {
                return { ...point, status: 'confirmed', confidence: 1.0 };
              }
            }
            return point;
          }),
          equipmentInstances: state.equipmentInstances.map(eq =>
            eq.id === equipment.id 
              ? { ...eq, status: 'confirmed', confidence: 1.0, templateId: template.id }
              : eq
          ),
          templates: state.templates.map(t =>
            t.id === templateId ? { ...t, appliedCount: t.appliedCount + 1 } : t
          )
        }));

        appliedCount++;
      }
    }

    if (appliedCount > 0) {
      // Update stats
      set(state => ({
        stats: {
          ...state.stats,
          templatedEquipment: (state.stats.templatedEquipment || 0) + appliedCount
        }
      }));

      get().addConsoleMessage({
        level: 'success',
        message: `Template "${template.name}" automatically applied to ${appliedCount} similar equipment instances`
      });
      
      get().checkCompletion();
    }

    return appliedCount;
  },

  addConsoleMessage: (message) => {
    const newMessage: ConsoleMessage = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...message
    };
    
    set(state => ({
      consoleMessages: [newMessage, ...state.consoleMessages].slice(0, 100)
    }));
  },

  saveDraft: async () => {
    const state = get();
    const response = await fetch('/api/saveDraft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: state.points,
        equipmentInstances: state.equipmentInstances,
        templates: state.templates
      })
    });
    
    if (response.ok) {
      get().addConsoleMessage({
        level: 'success',
        message: 'Draft saved successfully'
      });
    } else {
      get().addConsoleMessage({
        level: 'error',
        message: 'Failed to save draft'
      });
    }
  },

  finalize: async () => {
    const state = get();
    const response = await fetch('/api/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: state.points,
        equipmentInstances: state.equipmentInstances,
        templates: state.templates
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      get().addConsoleMessage({
        level: 'success',
        message: 'Configuration finalized successfully'
      });
    } else {
      get().addConsoleMessage({
        level: 'error',
        message: `Validation failed: ${result.errors?.join(', ')}`
      });
    }
    
    return result;
  },

  checkCompletion: () => {
    const state = get();
    const totalEquipment = state.equipmentInstances.length;
    const confirmedEquipment = state.equipmentInstances.filter(eq => eq.status === 'confirmed').length;
    const unconfirmedEquipment = state.equipmentInstances.filter(eq => eq.status !== 'confirmed').length;
    
    // The main panel disappears when all equipment is confirmed (unconfirmedEquipment === 0)
    const isEquipmentComplete = totalEquipment > 0 && unconfirmedEquipment === 0;
    
    // Also check points for completeness
    const totalPoints = state.points.length;
    const assignedPoints = state.points.filter(p => p.equipRef).length;
    const unassignedPoints = state.points.filter(p => !p.equipRef).length;
    
    // Complete when equipment panel is empty AND most/all points are assigned
    const isPointsComplete = totalPoints > 0 && (assignedPoints === totalPoints || unassignedPoints === 0);
    
    const isComplete = isEquipmentComplete && isPointsComplete;
    
    // Debug logging
    console.log('🎯 Equipment Panel Completion Check:', {
      totalEquipment,
      confirmedEquipment,
      unconfirmedEquipment,
      equipmentPanelEmpty: unconfirmedEquipment === 0,
      totalPoints,
      assignedPoints,
      unassignedPoints,
      isEquipmentComplete,
      isPointsComplete,
      isComplete,
      alreadyComplete: state.isComplete,
      showingCelebration: state.showCelebration
    });
    
    if (isComplete && !state.isComplete) {
      console.log('🎉 EQUIPMENT PANEL EMPTY - TRIGGERING CELEBRATION!');
      
      // Trigger celebration and auto-save
      set({ isComplete: true, showCelebration: true });
      
      // Auto-save when complete
      get().saveDraft();
      
      get().addConsoleMessage({
        level: 'success',
        message: '🎉 All equipment mapping completed! Equipment panel cleared. Data automatically saved.'
      });
    } else if (isComplete && state.isComplete && !state.showCelebration) {
      // Handle case where completion state exists but celebration wasn't shown
      console.log('🎉 COMPLETION DETECTED - ENSURING CELEBRATION IS VISIBLE!');
      set({ showCelebration: true });
    }
  },

  dismissCelebration: () => {
    set({ showCelebration: false });
  },

  triggerCelebration: () => {
    console.log('🎉 MANUAL CELEBRATION TRIGGER!');
    set({ showCelebration: true, isComplete: true });
    
    get().addConsoleMessage({
      level: 'success',
      message: '🎉 Manual celebration triggered!'
    });
  },

  // Advanced template management actions
  toggleTemplateManager: () => {
    set(state => ({ showTemplateManager: !state.showTemplateManager }));
  },

  refineTemplate: async (templateId, refinements) => {
    const state = get();
    const originalTemplate = state.templates.find(t => t.id === templateId);
    
    if (!originalTemplate) {
      get().addConsoleMessage({
        level: 'error',
        message: 'Template not found for refinement'
      });
      return { success: false };
    }

    // Create refined template as new version
    const refinedTemplate: EquipmentTemplate = {
      ...originalTemplate,
      ...refinements,
      id: `template-${Date.now()}-refined`,
      version: originalTemplate.version + 1,
      parentTemplateId: originalTemplate.id,
      lastModified: new Date(),
      appliedCount: 0, // Reset application count for new version
      effectiveness: {
        successfulApplications: 0,
        failedApplications: 0,
        userConfirmations: 0,
        userRejections: 0,
        averageConfidenceScore: 0,
        successRate: 0
      }
    };

    // Add refined template and deactivate original
    set(state => {
      const newActivity: TemplateActivity = {
        id: `activity-${Date.now()}`,
        templateId: refinedTemplate.id,
        templateName: refinedTemplate.name,
        action: 'refined',
        timestamp: new Date(),
        details: `Refined from template v${originalTemplate.version}`
      };

      return {
        templates: [
          ...state.templates.map(t => 
            t.id === templateId ? { ...t, isActive: false } : t
          ),
          refinedTemplate
        ],
        templateAnalytics: {
          ...state.templateAnalytics,
          totalTemplates: state.templateAnalytics.totalTemplates + 1,
          activeTemplates: state.templateAnalytics.activeTemplates, // Same count (one deactivated, one added)
          recentActivity: [newActivity, ...state.templateAnalytics.recentActivity].slice(0, 50)
        }
      };
    });

    get().addConsoleMessage({
      level: 'success',
      message: `Template refined successfully. New version: ${refinedTemplate.version}`
    });

    return { success: true, newTemplateId: refinedTemplate.id };
  },

  findSimilarEquipment: async (templateId, threshold = 0.7) => {
    const state = get();
    const template = state.templates.find(t => t.id === templateId);
    
    if (!template) return [];

    const matches: TemplateSimilarityMatch[] = [];
    
    // Find unassigned equipment that could match this template
    const candidateEquipment = state.equipmentInstances.filter(eq => 
      eq.status !== 'confirmed' && 
      !eq.templateId &&
      eq.id !== template.createdFrom
    );

    for (const equipment of candidateEquipment) {
      const equipmentPoints = state.points.filter(point => point.equipRef === equipment.id);
      
      // Calculate similarity based on point signature matching
      const matchingPoints = template.pointSignature.filter(signature => 
        equipmentPoints.some(point => 
          (point.navName === signature.navName || point.dis === signature.navName) &&
          point.kind === signature.kind &&
          point.unit === signature.unit
        )
      );

      const similarityScore = matchingPoints.length / template.pointSignature.length;
      
      if (similarityScore >= threshold) {
        matches.push({
          templateId: template.id,
          equipmentInstanceId: equipment.id,
          similarityScore,
          matchingPoints: matchingPoints.map(sig => sig.navName),
          confidence: similarityScore * (equipment.confidence || 0.5),
          autoApplied: false
        });
      }
    }

    // Store matches for user review
    set(state => ({
      templateSimilarityMatches: [...state.templateSimilarityMatches, ...matches]
    }));

    return matches;
  },

  applyTemplateMatch: (matchId, confirmed) => {
    const state = get();
    const match = state.templateSimilarityMatches.find(m => 
      `${m.templateId}-${m.equipmentInstanceId}` === matchId
    );
    
    if (!match) return;

    const template = state.templates.find(t => t.id === match.templateId);
    if (!template) return;

    if (confirmed) {
      // Apply the template
      set(state => ({
        points: state.points.map(point => {
          if (point.equipRef === match.equipmentInstanceId) {
            const matchesTemplate = template.pointSignature.some(sig => 
              (point.navName === sig.navName || point.dis === sig.navName) &&
              point.kind === sig.kind &&
              point.unit === sig.unit
            );
            
            if (matchesTemplate) {
              return { ...point, status: 'confirmed', confidence: match.confidence };
            }
          }
          return point;
        }),
        equipmentInstances: state.equipmentInstances.map(eq =>
          eq.id === match.equipmentInstanceId 
            ? { ...eq, status: 'confirmed', confidence: match.confidence, templateId: template.id }
            : eq
        ),
        templates: state.templates.map(t =>
          t.id === match.templateId ? { ...t, appliedCount: t.appliedCount + 1 } : t
        ),
        templateSimilarityMatches: state.templateSimilarityMatches.filter(m => 
          `${m.templateId}-${m.equipmentInstanceId}` !== matchId
        )
      }));

      // Update template effectiveness
      get().updateTemplateEffectiveness(match.templateId, true, match.confidence);
      
      get().addConsoleMessage({
        level: 'success',
        message: `Template "${template.name}" applied successfully`
      });
    } else {
      // Remove the match and update effectiveness
      set(state => ({
        templateSimilarityMatches: state.templateSimilarityMatches.filter(m => 
          `${m.templateId}-${m.equipmentInstanceId}` !== matchId
        )
      }));

      get().updateTemplateEffectiveness(match.templateId, false);
      
      get().addConsoleMessage({
        level: 'info',
        message: `Template match rejected for "${template.name}"`
      });
    }
  },

  addTemplateFeedback: (templateId, feedback) => {
    const newFeedback: TemplateUserFeedback = {
      ...feedback,
      id: `feedback-${Date.now()}`,
      timestamp: new Date()
    };

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId 
          ? { ...t, userFeedback: [...t.userFeedback, newFeedback] }
          : t
      )
    }));

    const newActivity: TemplateActivity = {
      id: `activity-${Date.now()}`,
      templateId,
      templateName: get().templates.find(t => t.id === templateId)?.name || 'Unknown',
      action: 'feedback',
      timestamp: new Date(),
      details: `${feedback.feedbackType} feedback: ${feedback.message.substring(0, 50)}...`
    };

    set(state => ({
      templateAnalytics: {
        ...state.templateAnalytics,
        recentActivity: [newActivity, ...state.templateAnalytics.recentActivity].slice(0, 50)
      }
    }));

    get().addConsoleMessage({
      level: 'info',
      message: `Feedback added for template`
    });
  },

  updateTemplateEffectiveness: (templateId, success, confidence) => {
    set(state => ({
      templates: state.templates.map(t => {
        if (t.id === templateId) {
          const newEffectiveness = { ...t.effectiveness };
          
          if (success) {
            newEffectiveness.successfulApplications++;
            if (confidence) {
              const totalConfidence = newEffectiveness.averageConfidenceScore * (newEffectiveness.successfulApplications - 1) + confidence;
              newEffectiveness.averageConfidenceScore = totalConfidence / newEffectiveness.successfulApplications;
            }
          } else {
            newEffectiveness.failedApplications++;
          }
          
          const totalApplications = newEffectiveness.successfulApplications + newEffectiveness.failedApplications;
          newEffectiveness.successRate = totalApplications > 0 
            ? newEffectiveness.successfulApplications / totalApplications 
            : 0;
          
          newEffectiveness.lastApplicationDate = new Date();
          
          return { ...t, effectiveness: newEffectiveness };
        }
        return t;
      }),
      templateAnalytics: {
        ...state.templateAnalytics,
        totalApplications: state.templateAnalytics.totalApplications + 1,
        successfulApplications: success 
          ? state.templateAnalytics.successfulApplications + 1 
          : state.templateAnalytics.successfulApplications
      }
    }));
  },

  deactivateTemplate: (templateId) => {
    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId ? { ...t, isActive: false } : t
      ),
      templateAnalytics: {
        ...state.templateAnalytics,
        activeTemplates: Math.max(0, state.templateAnalytics.activeTemplates - 1)
      }
    }));

    const template = get().templates.find(t => t.id === templateId);
    const newActivity: TemplateActivity = {
      id: `activity-${Date.now()}`,
      templateId,
      templateName: template?.name || 'Unknown',
      action: 'deactivated',
      timestamp: new Date(),
      details: 'Template deactivated by user'
    };

    set(state => ({
      templateAnalytics: {
        ...state.templateAnalytics,
        recentActivity: [newActivity, ...state.templateAnalytics.recentActivity].slice(0, 50)
      }
    }));

    get().addConsoleMessage({
      level: 'info',
      message: `Template "${template?.name}" deactivated`
    });
  },

  activateTemplate: (templateId) => {
    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId ? { ...t, isActive: true } : t
      ),
      templateAnalytics: {
        ...state.templateAnalytics,
        activeTemplates: state.templateAnalytics.activeTemplates + 1
      }
    }));

    const template = get().templates.find(t => t.id === templateId);
    const newActivity: TemplateActivity = {
      id: `activity-${Date.now()}`,
      templateId,
      templateName: template?.name || 'Unknown',
      action: 'created', // Reactivation is similar to creation
      timestamp: new Date(),
      details: 'Template reactivated by user'
    };

    set(state => ({
      templateAnalytics: {
        ...state.templateAnalytics,
        recentActivity: [newActivity, ...state.templateAnalytics.recentActivity].slice(0, 50)
      }
    }));

    get().addConsoleMessage({
      level: 'success',
      message: `Template "${template?.name}" activated`
    });
  },

  exportTemplate: async (templateId) => {
    const state = get();
    const template = state.templates.find(t => t.id === templateId);
    
    if (!template) {
      return { success: false };
    }

    try {
      const exportData = {
        template,
        exportedAt: new Date(),
        version: '1.0'
      };
      
      const dataString = JSON.stringify(exportData, null, 2);
      
      // Create download link
      const blob = new Blob([dataString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template-${template.name.replace(/\s+/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      get().addConsoleMessage({
        level: 'success',
        message: `Template "${template.name}" exported successfully`
      });

      return { success: true, data: dataString };
    } catch (error) {
      get().addConsoleMessage({
        level: 'error',
        message: `Failed to export template: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return { success: false };
    }
  },

  importTemplate: async (templateData) => {
    try {
      const importedData = JSON.parse(templateData);
      const template = importedData.template;
      
      if (!template || !template.name || !template.pointSignature) {
        throw new Error('Invalid template format');
      }

      // Generate new ID and update metadata
      const newTemplate: EquipmentTemplate = {
        ...template,
        id: `template-${Date.now()}-imported`,
        createdAt: new Date(),
        lastModified: new Date(),
        appliedCount: 0,
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
        tags: [...(template.tags || []), 'imported']
      };

      set(state => ({
        templates: [...state.templates, newTemplate],
        templateAnalytics: {
          ...state.templateAnalytics,
          totalTemplates: state.templateAnalytics.totalTemplates + 1,
          activeTemplates: newTemplate.isActive ? state.templateAnalytics.activeTemplates + 1 : state.templateAnalytics.activeTemplates,
          userCreatedTemplates: state.templateAnalytics.userCreatedTemplates + 1
        }
      }));

      get().addConsoleMessage({
        level: 'success',
        message: `Template "${newTemplate.name}" imported successfully`
      });

      return { success: true, templateId: newTemplate.id };
    } catch (error) {
      get().addConsoleMessage({
        level: 'error',
        message: `Failed to import template: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return { success: false };
    }
  },

  calculateTemplateAnalytics: () => {
    const state = get();
    const templates = state.templates;
    
    const analytics = {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.isActive).length,
      mlGeneratedTemplates: templates.filter(t => t.isMLGenerated).length,
      userCreatedTemplates: templates.filter(t => !t.isMLGenerated).length,
      totalApplications: templates.reduce((sum, t) => sum + t.appliedCount, 0),
      successfulApplications: templates.reduce((sum, t) => sum + t.effectiveness.successfulApplications, 0),
      averageSuccessRate: 0,
      mostUsedTemplateId: undefined as string | undefined,
      leastUsedTemplateId: undefined as string | undefined,
      recentActivity: state.templateAnalytics.recentActivity
    };

    // Calculate average success rate
    const totalAttempts = templates.reduce((sum, t) => 
      sum + t.effectiveness.successfulApplications + t.effectiveness.failedApplications, 0
    );
    analytics.averageSuccessRate = totalAttempts > 0 
      ? analytics.successfulApplications / totalAttempts 
      : 0;

    // Find most and least used templates
    if (templates.length > 0) {
      const sortedByUsage = [...templates].sort((a, b) => b.appliedCount - a.appliedCount);
      analytics.mostUsedTemplateId = sortedByUsage[0]?.id;
      analytics.leastUsedTemplateId = sortedByUsage[sortedByUsage.length - 1]?.id;
    }

    set({ templateAnalytics: analytics });
  },

  mergeTemplates: async (templateIds, newName) => {
    const state = get();
    const templatesToMerge = state.templates.filter(t => templateIds.includes(t.id));
    
    if (templatesToMerge.length < 2) {
      get().addConsoleMessage({
        level: 'error',
        message: 'At least 2 templates required for merging'
      });
      return { success: false };
    }

    // Combine point signatures from all templates
    const combinedSignatures: PointSignature[] = [];
    const seenSignatures = new Set<string>();

    templatesToMerge.forEach(template => {
      template.pointSignature.forEach(sig => {
        const sigKey = `${sig.navName}-${sig.kind}-${sig.unit}`;
        if (!seenSignatures.has(sigKey)) {
          seenSignatures.add(sigKey);
          combinedSignatures.push(sig);
        }
      });
    });

    // Create merged template
    const mergedTemplate: EquipmentTemplate = {
      id: `template-${Date.now()}-merged`,
      name: newName,
      equipmentTypeId: templatesToMerge[0].equipmentTypeId,
      createdFrom: 'merged',
      pointSignature: combinedSignatures,
      featureVector: [],
      createdAt: new Date(),
      appliedCount: 0,
      color: generateRandomTemplateColor(),
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
      tags: ['merged', ...Array.from(new Set(templatesToMerge.flatMap(t => t.tags)))],
      description: `Merged from ${templatesToMerge.length} templates`,
      lastModified: new Date(),
      isActive: true,
      similarityThreshold: 0.7,
      autoApplyEnabled: true
    };

    // Add merged template and deactivate originals
    set(state => ({
      templates: [
        ...state.templates.map(t => 
          templateIds.includes(t.id) ? { ...t, isActive: false } : t
        ),
        mergedTemplate
      ],
      templateAnalytics: {
        ...state.templateAnalytics,
        totalTemplates: state.templateAnalytics.totalTemplates + 1,
        userCreatedTemplates: state.templateAnalytics.userCreatedTemplates + 1
      }
    }));

    get().addConsoleMessage({
      level: 'success',
      message: `Templates merged successfully into "${newName}"`
    });

    return { success: true, newTemplateId: mergedTemplate.id };
  },

  // Anomaly Detection Actions
  toggleAnomalyPanel: () => {
    set(state => ({ showAnomalyPanel: !state.showAnomalyPanel }));
  },

  reviewAnomaly: (anomalyId, action) => {
    set(state => ({
      anomalies: state.anomalies.map(anomaly => 
        anomaly.id === anomalyId 
          ? { 
              ...anomaly, 
              status: action === 'confirm' ? 'confirmed-anomaly' : 
                     action === 'classify' ? 'reviewing' : 'dismissed',
              reviewedAt: new Date(),
              reviewedBy: 'user' // Could be enhanced with actual user ID
            }
          : anomaly
      )
    }));

    get().addConsoleMessage({
      level: 'info',
      message: `Anomaly ${anomalyId} marked as ${action === 'confirm' ? 'confirmed' : action === 'classify' ? 'under review' : 'dismissed'}`
    });
  },

  assignAnomalyToEquipmentType: (anomalyId, equipmentTypeId) => {
    const state = get();
    const anomaly = state.anomalies.find(a => a.id === anomalyId);
    
    if (!anomaly) {
      get().addConsoleMessage({
        level: 'error',
        message: `Anomaly ${anomalyId} not found`
      });
      return;
    }

    // Create new equipment instance from the anomaly
    const newEquipment: EquipmentInstance = {
      id: anomaly.id,
      name: anomaly.name,
      typeId: equipmentTypeId,
      confidence: 0.7, // Medium confidence for manually assigned
      status: 'confirmed',
      pointIds: anomaly.pointIds,
      fileName: anomaly.fileName
    };

    // Update points to reference the new equipment
    const updatedPoints = state.points.map(point => 
      anomaly.pointIds.includes(point.id) 
        ? { ...point, equipRef: newEquipment.id, status: 'confirmed' as const }
        : point
    );

    set(state => ({
      equipmentInstances: [...state.equipmentInstances, newEquipment],
      points: updatedPoints,
      anomalies: state.anomalies.map(a => 
        a.id === anomalyId ? { ...a, status: 'classified' } : a
      )
    }));

    get().addConsoleMessage({
      level: 'success',
      message: `Anomaly "${anomaly.name}" assigned to equipment type ${equipmentTypeId}`
    });
  },

  createEquipmentTypeFromAnomalies: async (anomalyIds, typeName, description) => {
    const state = get();
    const anomalies = state.anomalies.filter(a => anomalyIds.includes(a.id));
    
    if (anomalies.length === 0) {
      get().addConsoleMessage({
        level: 'error',
        message: 'No valid anomalies found for equipment type creation'
      });
      return { success: false };
    }

    try {
      // Create new equipment type ID
      const typeId = `anomaly-type-${Date.now()}`;
      
      // Create new equipment type candidate
      const candidate: NewEquipmentTypeCandidate = {
        id: `candidate-${Date.now()}`,
        name: typeName,
        description,
        anomalyIds,
        confidence: 0.8, // High confidence for user-created types
        commonFeatures: [], // TODO: Calculate from anomaly feature vectors
        pointSignature: [], // TODO: Extract from anomaly points
        createdAt: new Date(),
        status: 'candidate'
      };

      set(state => ({
        newEquipmentTypeCandidates: [...state.newEquipmentTypeCandidates, candidate],
        anomalies: state.anomalies.map(a => 
          anomalyIds.includes(a.id) ? { ...a, status: 'reviewing' } : a
        )
      }));

      get().addConsoleMessage({
        level: 'success',
        message: `New equipment type candidate "${typeName}" created from ${anomalies.length} anomalies`
      });

      return { success: true, typeId: candidate.id };
    } catch (error) {
      get().addConsoleMessage({
        level: 'error',
        message: `Failed to create equipment type: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return { success: false };
    }
  },

  groupSimilarAnomalies: async (anomalyIds) => {
    const state = get();
    const anomalies = state.anomalies.filter(a => anomalyIds.includes(a.id));
    
    if (anomalies.length < 2) {
      get().addConsoleMessage({
        level: 'error',
        message: 'At least 2 anomalies required for grouping'
      });
      return { success: false };
    }

    try {
      // Create candidate for grouped anomalies
      const candidateId = `grouped-candidate-${Date.now()}`;
      const candidate: NewEquipmentTypeCandidate = {
        id: candidateId,
        name: `Grouped Anomalies ${Date.now()}`,
        description: `Auto-grouped from ${anomalies.length} similar anomalies`,
        anomalyIds,
        confidence: 0.7,
        commonFeatures: [], // TODO: Calculate common features
        pointSignature: [], // TODO: Extract common point signature
        createdAt: new Date(),
        status: 'candidate'
      };

      set(state => ({
        newEquipmentTypeCandidates: [...state.newEquipmentTypeCandidates, candidate],
        anomalies: state.anomalies.map(a => 
          anomalyIds.includes(a.id) 
            ? { ...a, status: 'reviewing', similarAnomalies: anomalyIds.filter(id => id !== a.id) }
            : a
        )
      }));

      get().addConsoleMessage({
        level: 'success',
        message: `${anomalies.length} anomalies grouped for new equipment type consideration`
      });

      return { success: true, candidateId };
    } catch (error) {
      get().addConsoleMessage({
        level: 'error',
        message: `Failed to group anomalies: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return { success: false };
    }
  },

  runAnomalyDetection: async (threshold = 95) => {
    // This would trigger a re-run of anomaly detection with different parameters
    // For now, return the current results
    const state = get();
    
    if (!state.anomalyDetectionResults) {
      get().addConsoleMessage({
        level: 'warning',
        message: 'No anomaly detection results available. Process equipment data first.'
      });
      return {
        anomalies: [],
        totalProcessed: 0,
        anomalyRate: 0,
        detectionThreshold: threshold,
        clusterQualityMetrics: {
          averageSilhouetteScore: 0,
          clusterSeparation: 0,
          intraClusterDistance: 0
        }
      };
    }

    return state.anomalyDetectionResults;
  },

  approveNewEquipmentType: async (candidateId) => {
    const state = get();
    const candidate = state.newEquipmentTypeCandidates.find(c => c.id === candidateId);
    
    if (!candidate) {
      get().addConsoleMessage({
        level: 'error',
        message: 'Equipment type candidate not found'
      });
      return { success: false };
    }

    try {
      const typeId = `type-${Date.now()}`;
      
      // Create new equipment type
      const newType: EquipmentType = {
        id: typeId,
        name: candidate.name,
        description: candidate.description,
        category: 'user-defined',
        color: generateRandomTemplateColor()
      };

      // Convert anomalies to equipment instances
      const anomalies = state.anomalies.filter(a => candidate.anomalyIds.includes(a.id));
      const newEquipmentInstances = anomalies.map(anomaly => ({
        id: anomaly.id,
        name: anomaly.name,
        typeId,
        confidence: candidate.confidence,
        status: 'confirmed' as const,
        pointIds: anomaly.pointIds,
        fileName: anomaly.fileName
      }));

      set(state => ({
        equipmentTypes: [...state.equipmentTypes, newType],
        equipmentInstances: [...state.equipmentInstances, ...newEquipmentInstances],
        newEquipmentTypeCandidates: state.newEquipmentTypeCandidates.map(c =>
          c.id === candidateId ? { ...c, status: 'approved' } : c
        ),
        anomalies: state.anomalies.map(a =>
          candidate.anomalyIds.includes(a.id) ? { ...a, status: 'classified' } : a
        )
      }));

      get().addConsoleMessage({
        level: 'success',
        message: `New equipment type "${candidate.name}" approved and created with ${newEquipmentInstances.length} equipment instances`
      });

      return { success: true, typeId };
    } catch (error) {
      get().addConsoleMessage({
        level: 'error',
        message: `Failed to approve equipment type: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return { success: false };
    }
  },

  rejectNewEquipmentType: (candidateId, reason) => {
    set(state => ({
      newEquipmentTypeCandidates: state.newEquipmentTypeCandidates.map(c =>
        c.id === candidateId 
          ? { ...c, status: 'rejected', userFeedback: reason }
          : c
      )
    }));

    get().addConsoleMessage({
      level: 'info',
      message: `Equipment type candidate rejected: ${reason}`
    });
  },

  // Performance monitoring actions
  togglePerformanceDashboard: () => {
    set((state) => ({ showPerformanceDashboard: !state.showPerformanceDashboard }));
  }
}));
