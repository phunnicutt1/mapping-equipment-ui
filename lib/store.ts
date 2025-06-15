'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  BACnetPoint,
  EquipmentInstance,
  GroupingMethod,
  EquipmentTemplate,
  ConsoleMessage,
  ProcessingResult,
  AnomalyInstance,
  TemplateAnalytics,
  TemplateActivity,
  TemplateSimilarityMatch,
  TemplateUserFeedback,
  NewEquipmentTypeCandidate,
  EquipmentType,
  PointSignature,
  GroupingState,
} from './types';
import { generateRandomTemplateColor } from './utils';
import { processUploadedFiles } from './bacnet-processor';

// All server-side processing has been moved to API routes.
// This store should only contain client-side state management and API calls.

interface GroupingActions {
  loadProcessedData: (equipment: EquipmentInstance[], points: BACnetPoint[]) => Promise<void>;
  setProcessedData: (result: ProcessingResult) => void;
  uploadFiles: (files: File[]) => Promise<void>;
  setGroupingMethod: (method: GroupingMethod) => void;
  confirmEquipment: (equipmentId: string) => void;
  flagEquipment: (equipmentId: string) => void;
  confirmPoint: (pointId: string) => void;
  flagPoint: (pointId: string) => void;
  unassignPoint: (pointId: string) => void;
  unassignEquipment: (equipmentId: string) => void;
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
  toggleAnomalyPanel: () => void;
  reviewAnomaly: (anomalyId: string, decision: 'confirm' | 'classify' | 'dismiss') => void;
  assignAnomalyToEquipmentType: (anomalyId: string, equipmentTypeId: string) => void;
  createEquipmentTypeFromAnomalies: (anomalyIds: string[], typeName: string, description: string) => Promise<{ success: boolean; typeId?: string }>;
  groupSimilarAnomalies: (anomalyIds: string[]) => Promise<{ success: boolean; candidateId?: string }>;
  runAnomalyDetection: (threshold?: number) => Promise<any>;
  approveNewEquipmentType: (candidateId: string) => Promise<{ success: boolean, typeId?: string }>;
  rejectNewEquipmentType: (candidateId: string, reason: string) => void;
  togglePerformanceDashboard: () => void;
}

export const useGroupingStore = create<GroupingState & GroupingActions>((set, get) => ({
  // Initial state
  points: [],
  equipmentTypes: [],
  equipmentInstances: [],
  templates: [],
  suggestedTemplates: [],
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
  // UI state for equipment expansion/collapse (human review process)
  expandedEquipmentTypes: new Set(),
  expandedEquipment: new Set(),
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
  anomalies: [],
  newEquipmentTypeCandidates: [],
  showAnomalyPanel: false,
  anomalyDetectionResults: undefined,
  showPerformanceDashboard: false,
  analytics: null,

  // Actions
  loadProcessedData: async (equipment, points) => {
    set({ isProcessing: true });
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment, points }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      const { equipmentInstances, allPoints, equipmentTypes, templates, analytics } = result.data as ProcessingResult;
      
      // Use only the equipment types from the processing result (no defaults)
      const finalEquipmentTypes = equipmentTypes || [];
      
              set({
          equipmentInstances,
          points: allPoints,
          equipmentTypes: finalEquipmentTypes,
          templates: templates || [],
          analytics,
          isProcessing: false,
        });

      get().addConsoleMessage({
        level: 'success',
        message: `Successfully processed ${allPoints.length} points and ${equipmentInstances.length} equipment instances.`
      });
    } catch (error) {
      set({ isProcessing: false });
      get().addConsoleMessage({
        level: 'error',
        message: error instanceof Error ? error.message : 'An unknown error occurred during processing.'
      });
    }
  },

  setProcessedData: (result: ProcessingResult) => {
    console.log('🔍 setProcessedData called with:', {
      equipmentInstances: result.equipmentInstances?.length || 0,
      allPoints: result.allPoints?.length || 0,
      equipmentTypes: result.equipmentTypes?.length || 0,
      equipmentTemplates: result.equipmentTemplates?.length || 0,
      firstEquipment: result.equipmentInstances?.[0],
      equipmentInstancesData: result.equipmentInstances?.slice(0, 3).map(eq => ({ 
        id: eq.id, 
        name: eq.name, 
        typeId: eq.typeId, 
        status: eq.status,
        pointIds: eq.pointIds?.length || 0
      }))
    });

    // Create equipment types from unique typeIds found in equipment instances
    const uniqueTypeIds = Array.from(new Set(result.equipmentInstances?.map(eq => eq.typeId) || []));
    const dynamicEquipmentTypes = uniqueTypeIds.map(typeId => ({
      id: typeId,
      name: typeId.replace(/^type-/, 'Equipment Type ').replace(/^\w/, c => c.toUpperCase()),
      description: `Auto-generated equipment type for ${typeId}`,
      color: '#3B82F6', // Default blue color
      icon: 'Building2' as const
    }));

    // Use only dynamic equipment types (no defaults)
    const finalEquipmentTypes = [
      ...dynamicEquipmentTypes,
      ...(result.equipmentTypes || []).filter(newType => 
        !dynamicEquipmentTypes.some(dynamicType => dynamicType.id === newType.id)
      )
    ];

    console.log('🔍 Final equipment types:', finalEquipmentTypes.map(et => ({ id: et.id, name: et.name })));

    set({
      equipmentInstances: result.equipmentInstances,
      points: result.allPoints,
      equipmentTypes: finalEquipmentTypes,
      templates: result.equipmentTemplates || [],
      suggestedTemplates: result.equipmentTemplates || [],
      anomalies: result.anomalyDetectionResult?.anomalies || [],
      anomalyDetectionResults: result.anomalyDetectionResult,
      analytics: result.analytics,
      isProcessing: false,
    });

    get().addConsoleMessage({
      level: 'success',
      message: `Data loaded: ${result.equipmentInstances.length} equipment instances, ${result.allPoints.length} points.`
    });
  },

  uploadFiles: async (files) => {
    set({ isProcessing: true });
    
    try {
      // HARD RESET: Clear all existing data when uploading new files
      console.log('🔄 Hard Reset: Clearing all existing data for new upload');
      get().addConsoleMessage({ level: 'info', message: `🔄 Hard Reset: Clearing all data and uploading ${files.length} new files...`});
      
      // Reset all state to initial values
      set({
        equipmentInstances: [],
        points: [],
        equipmentTypes: [], // NO default equipment types
        templates: [],
        suggestedTemplates: [],
        anomalies: [],
        anomalyDetectionResults: undefined,
        analytics: undefined,
        selectedPoints: new Set(),
        showUnassignedDrawer: false,
        showConfirmedDrawer: false,
        showCelebration: false,
        isComplete: false,
        // Reset UI state for equipment expansion/collapse (human review process)
        expandedEquipmentTypes: new Set(),
        expandedEquipment: new Set(),
        consoleMessages: [
          {
            id: uuidv4(),
            timestamp: new Date(),
            level: 'info',
            message: `🔄 Hard Reset: Clearing all data and uploading ${files.length} new files...`
          }
        ],
        showTemplateManager: false,
        showAnomalyPanel: false,
        showPerformanceDashboard: false,
        isProcessing: true, // Keep processing state
        // Reset stats
        stats: {
          totalPoints: 0,
          assignedPoints: 0,
          equipmentGroups: 0,
          templatedEquipment: 0,
          confidenceDistribution: { high: 0, medium: 0, low: 0 }
        },
        // Reset template analytics
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
        templateSimilarityMatches: [],
        newEquipmentTypeCandidates: [],
      });

      const formData = new FormData();
      files.forEach((file, index) => formData.append(`file_${index}`, file));
  
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
  
      const result = await response.json();
  
      if (!result.success) {
        throw new Error(result.error || 'File processing failed on the server.');
      }
      
      const processedResult = result.data as ProcessingResult;

      // Create ONLY dynamic equipment types from unique typeIds found in equipment instances
      // NO default equipment types - only filename-based types
      const uniqueTypeIds = Array.from(new Set(processedResult.equipmentInstances?.map(eq => eq.typeId) || []));
      console.log('🔧 Store Debug - Creating dynamic equipment types (NO DEFAULTS):', {
        uniqueTypeIds,
        equipmentInstancesCount: processedResult.equipmentInstances?.length || 0,
        equipmentInstances: processedResult.equipmentInstances?.map(eq => ({ id: eq.id, typeId: eq.typeId })) || []
      });
      
      const dynamicEquipmentTypes = uniqueTypeIds.map(typeId => ({
        id: typeId, // Use the exact typeId from equipment instances (e.g., "tu", "ahu", "f")
        name: typeId.toUpperCase(), // Display name: "TU", "AHU", "F"
        description: `${typeId.toUpperCase()} equipment type (auto-detected from filenames)`,
        color: '#3B82F6', // Default blue color
        icon: 'Building2' as const
      }));
      
      console.log('🔧 Store Debug - Dynamic equipment types created:', dynamicEquipmentTypes);

      // Use ONLY dynamic equipment types (no merging with defaults)
      const finalEquipmentTypes = [
        ...dynamicEquipmentTypes,
        ...(processedResult.equipmentTypes || []).filter(newType => 
          !dynamicEquipmentTypes.some(dynamicType => dynamicType.id === newType.id)
        )
      ];
      
      console.log('🔧 Store Debug - Final equipment types (dynamic only):', {
        totalTypes: finalEquipmentTypes.length,
        dynamicTypesCount: dynamicEquipmentTypes.length,
        processedTypesCount: (processedResult.equipmentTypes || []).length,
        finalTypeIds: finalEquipmentTypes.map(et => et.id),
        dynamicTypeIds: dynamicEquipmentTypes.map(dt => dt.id)
      });

      set({
        equipmentInstances: processedResult.equipmentInstances,
        points: processedResult.allPoints,
        equipmentTypes: finalEquipmentTypes,
        templates: processedResult.equipmentTemplates || [],
        suggestedTemplates: processedResult.equipmentTemplates || [],
        anomalies: processedResult.anomalyDetectionResult?.anomalies || [],
        anomalyDetectionResults: processedResult.anomalyDetectionResult,
        analytics: processedResult.analytics,
        isProcessing: false,
      });

      get().addConsoleMessage({
        level: 'success',
        message: `✅ Successfully processed ${files.length} files with hard reset. Created ${finalEquipmentTypes.length} equipment types from filenames.`
      });

    } catch (error) {
      set({ isProcessing: false });
      get().addConsoleMessage({
        level: 'error',
        message: `❌ File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  },

  setGroupingMethod: (method) => {
    set({ selectedGroupingMethod: method });
    get().addConsoleMessage({ level: 'info', message: `Grouping method changed to ${method}.` });
  },

  confirmEquipment: (equipmentId) => {
    set(state => {
      const newInstances = state.equipmentInstances.map(eq => 
        eq.id === equipmentId ? { ...eq, status: 'confirmed' as const } : eq
      );
      const allConfirmed = newInstances.every(eq => eq.status === 'confirmed');
      if (allConfirmed && newInstances.length > 0) {
        return { equipmentInstances: newInstances, showConfirmedDrawer: true };
      }
      return { equipmentInstances: newInstances };
    });
    get().addConsoleMessage({ level: 'success', message: `Equipment ${equipmentId} confirmed.` });
    get().checkCompletion();
  },

  flagEquipment: (equipmentId) => {
    set(state => ({
      equipmentInstances: state.equipmentInstances.map(eq =>
        eq.id === equipmentId ? { ...eq, status: 'needs-review' } : eq
      )
    }));
    get().addConsoleMessage({ level: 'warning', message: `Equipment flagged for review: ${equipmentId}` });
  },

  confirmPoint: (pointId) => {
    set(state => ({
      points: state.points.map(point =>
        point.id === pointId ? { ...point, status: 'confirmed', confidence: 1.0 } : point
      )
    }));
    get().addConsoleMessage({ level: 'success', message: `Point confirmed: ${pointId}` });
    get().checkCompletion();
  },

  flagPoint: (pointId) => {
    set(state => ({
      points: state.points.map(point =>
        point.id === pointId ? { ...point, status: 'flagged' } : point
      )
    }));
    get().addConsoleMessage({ level: 'warning', message: `Point flagged for review: ${pointId}` });
  },

  unassignPoint: (pointId) => {
    set(state => {
      // Find the point and its current equipment
      const point = state.points.find(p => p.id === pointId);
      if (!point || !point.equipRef) return state;

      const equipmentId = point.equipRef;
      
      // Update point to be unassigned
      const newPoints = state.points.map(p =>
        p.id === pointId ? { ...p, equipRef: null, status: 'unassigned' as const } : p
      );

      // Remove point from equipment's pointIds
      const newEquipmentInstances = state.equipmentInstances.map(eq => {
        if (eq.id === equipmentId) {
          const updatedPointIds = eq.pointIds.filter(id => id !== pointId);
          
          // If equipment was confirmed and loses a point, change status to suggested
          const newStatus = eq.status === 'confirmed' ? 'suggested' : eq.status;
          
          return {
            ...eq,
            pointIds: updatedPointIds,
            status: newStatus
          };
        }
        return eq;
      });

      return {
        ...state,
        points: newPoints,
        equipmentInstances: newEquipmentInstances
      };
    });
    
    get().addConsoleMessage({ 
      level: 'info', 
      message: `Point unassigned and moved to unassigned drawer` 
    });
    get().checkCompletion();
  },

  unassignEquipment: (equipmentId) => {
    set(state => {
      // Find the equipment
      const equipment = state.equipmentInstances.find(eq => eq.id === equipmentId);
      if (!equipment) return state;

      // Update all points assigned to this equipment to be unassigned
      const newPoints = state.points.map(p =>
        p.equipRef === equipmentId 
          ? { ...p, equipRef: null, status: 'unassigned' as const } 
          : p
      );

      // Update equipment status to suggested and clear pointIds
      const newEquipmentInstances = state.equipmentInstances.map(eq =>
        eq.id === equipmentId 
          ? { ...eq, status: 'suggested' as const, pointIds: [] }
          : eq
      );

      return {
        ...state,
        points: newPoints,
        equipmentInstances: newEquipmentInstances
      };
    });
    
    get().addConsoleMessage({ 
      level: 'info', 
      message: `Equipment unassigned - all points moved to unassigned drawer and equipment moved to suggested status` 
    });
    get().checkCompletion();
  },

  confirmAllEquipmentPoints: (equipmentId) => {
    set(state => {
      const newInstances = state.equipmentInstances.map(eq => 
        eq.id === equipmentId ? { ...eq, status: 'confirmed' as const } : eq
      );
      const newPoints = state.points.map(p => 
        p.equipRef === equipmentId ? { ...p, status: 'confirmed' as const } : p
      );
      const allConfirmed = newInstances.every(eq => eq.status === 'confirmed');
      if (allConfirmed && newInstances.length > 0) {
        return { equipmentInstances: newInstances, points: newPoints, showConfirmedDrawer: true };
      }
      return { equipmentInstances: newInstances, points: newPoints };
    });
    get().addConsoleMessage({ level: 'success', message: `All points for equipment ${equipmentId} confirmed.` });
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
          ? { ...eq, pointIds: Array.from(new Set([...eq.pointIds, ...pointIds])) }
          : eq
      )
    }));
    get().addConsoleMessage({ level: 'success', message: `Assigned ${pointIds.length} points to equipment ${equipmentId}.` });
    get().checkCompletion();
  },
  
  assignSinglePoint: (pointId, equipmentId) => {
    set(state => ({
      points: state.points.map(point =>
        point.id === pointId ? { ...point, equipRef: equipmentId, status: 'suggested' } : point
      ),
      equipmentInstances: state.equipmentInstances.map(eq =>
        eq.id === equipmentId ? { ...eq, pointIds: Array.from(new Set([...eq.pointIds, pointId])) } : eq
      )
    }));
    get().addConsoleMessage({ level: 'success', message: `Assigned a point to equipment ${equipmentId}` });
    get().checkCompletion();
  },

  createEquipment: (name, typeId) => {
    const newEquipment: EquipmentInstance = {
      id: `manual-${uuidv4()}`,
      name,
      typeId,
      confidence: 1.0,
      status: 'confirmed',
      pointIds: [],
    };
    set(state => ({ equipmentInstances: [...state.equipmentInstances, newEquipment] }));
    get().addConsoleMessage({ level: 'info', message: `Created new equipment: ${name}` });
  },

  toggleUnassignedDrawer: () => set(state => ({ showUnassignedDrawer: !state.showUnassignedDrawer })),
  toggleConfirmedDrawer: () => set(state => ({ showConfirmedDrawer: !state.showConfirmedDrawer })),
  
  togglePointSelection: (pointId) => {
    set(state => {
      const newSelection = new Set(state.selectedPoints);
      if (newSelection.has(pointId)) newSelection.delete(pointId);
      else newSelection.add(pointId);
      return { selectedPoints: newSelection };
    });
  },

  clearSelection: () => set({ selectedPoints: new Set() }),

  addConsoleMessage: (message) => {
    const newMessage: ConsoleMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      ...message
    };
    set(state => ({ consoleMessages: [newMessage, ...state.consoleMessages].slice(0, 100) }));
  },

  checkCompletion: () => {
    const state = get();
    const isComplete = state.equipmentInstances.length > 0 && state.equipmentInstances.every(eq => eq.status === 'confirmed');
    if (isComplete && !state.isComplete) {
      set({ isComplete: true, showCelebration: true });
      get().addConsoleMessage({ level: 'success', message: '🎉 All equipment mapping completed!' });
    }
  },

  dismissCelebration: () => set({ showCelebration: false }),
  triggerCelebration: () => set({ showCelebration: true, isComplete: true }),
  toggleTemplateManager: () => set(state => ({ showTemplateManager: !state.showTemplateManager })),
  toggleAnomalyPanel: () => set(state => ({ showAnomalyPanel: !state.showAnomalyPanel })),
  togglePerformanceDashboard: () => set((state) => ({ showPerformanceDashboard: !state.showPerformanceDashboard })),

  // Placeholder for server-dependent actions. These would typically involve API calls.
  createTemplate: async (equipmentId, templateName) => { 
    console.warn("createTemplate not fully implemented in client-side store");
    return { success: false }; 
  },
  applyTemplateToSimilarEquipment: async (templateId) => { 
    console.warn("applyTemplateToSimilarEquipment not implemented");
    return 0;
  },
  saveDraft: async () => { console.warn("saveDraft not implemented"); },
  finalize: async () => { 
    console.warn("finalize not implemented");
    return { success: false };
  },
  refineTemplate: async (templateId, refinements) => { return { success: false }; },
  findSimilarEquipment: async (templateId, threshold = 0.7) => {
    const state = get();
    const template = [...state.templates, ...state.suggestedTemplates].find(t => t.id === templateId);
    if (!template) return [];
    
    // Find equipment instances that could match this template
    const potentialMatches: TemplateSimilarityMatch[] = [];
    
    state.equipmentInstances.forEach(equipment => {
      // Skip if equipment already has a template or is not the same type
      if (equipment.templateId || equipment.typeId !== template.equipmentTypeId) return;
      
      // Calculate similarity based on point count and type
      const equipmentPointCount = equipment.pointIds.length;
      const templatePointCount = template.pointSignature.length;
      
      // Simple similarity calculation based on point count similarity
      const pointCountSimilarity = Math.min(equipmentPointCount, templatePointCount) / 
                                  Math.max(equipmentPointCount, templatePointCount);
      
      if (pointCountSimilarity >= threshold) {
        // Find matching points (simplified - in real implementation would compare point signatures)
        const matchingPoints = equipment.pointIds.slice(0, Math.min(equipmentPointCount, templatePointCount));
        
        potentialMatches.push({
          templateId: template.id,
          equipmentInstanceId: equipment.id,
          similarityScore: pointCountSimilarity,
          matchingPoints,
          confidence: pointCountSimilarity * 0.9, // Slightly lower confidence than similarity
          autoApplied: false,
          userConfirmed: undefined
        });
      }
    });
    
    // Update the store with new matches
    set(state => ({
      templateSimilarityMatches: [...state.templateSimilarityMatches, ...potentialMatches]
    }));
    
    return potentialMatches;
  },
  applyTemplateMatch: (matchId, confirmed) => {
    const state = get();
    const [templateId, equipmentInstanceId] = matchId.split('-');
    
    if (confirmed) {
      // Apply the template to the equipment
      set(state => ({
        equipmentInstances: state.equipmentInstances.map(eq =>
          eq.id === equipmentInstanceId 
            ? { ...eq, templateId, status: 'confirmed' as const }
            : eq
        ),
        // Update template applied count
        templates: state.templates.map(t =>
          t.id === templateId 
            ? { ...t, appliedCount: t.appliedCount + 1 }
            : t
        ),
        suggestedTemplates: state.suggestedTemplates.map(t =>
          t.id === templateId 
            ? { ...t, appliedCount: t.appliedCount + 1 }
            : t
        ),
        // Remove the match from pending matches
        templateSimilarityMatches: state.templateSimilarityMatches.filter(
          match => `${match.templateId}-${match.equipmentInstanceId}` !== matchId
        )
      }));
      
      get().addConsoleMessage({
        level: 'success',
        message: `Template applied to equipment ${equipmentInstanceId}`
      });
    } else {
      // Just remove the match
      set(state => ({
        templateSimilarityMatches: state.templateSimilarityMatches.filter(
          match => `${match.templateId}-${match.equipmentInstanceId}` !== matchId
        )
      }));
      
      get().addConsoleMessage({
        level: 'info',
        message: `Template match rejected for equipment ${equipmentInstanceId}`
      });
    }
    
    // Recalculate analytics
    get().calculateTemplateAnalytics();
  },
  addTemplateFeedback: (templateId, feedback) => {},
  updateTemplateEffectiveness: (templateId, success, confidence) => {},
  deactivateTemplate: (templateId) => {},
  activateTemplate: (templateId) => {},
  exportTemplate: async (templateId) => { return { success: false }; },
  importTemplate: async (templateData) => { return { success: false }; },
  calculateTemplateAnalytics: () => {
    const state = get();
    const allTemplates = [...state.templates, ...state.suggestedTemplates];
    
    // Calculate analytics from actual template data
    const totalTemplates = allTemplates.length;
    const activeTemplates = allTemplates.filter(t => t.isActive).length;
    const mlGeneratedTemplates = allTemplates.filter(t => t.isMLGenerated).length;
    const userCreatedTemplates = allTemplates.filter(t => !t.isMLGenerated).length;
    
    // Calculate application statistics
    const totalApplications = allTemplates.reduce((sum, t) => sum + t.appliedCount, 0);
    const successfulApplications = allTemplates.reduce((sum, t) => 
      sum + (t.effectiveness?.successfulApplications || 0), 0);
    const averageSuccessRate = totalApplications > 0 
      ? successfulApplications / totalApplications 
      : 0;
    
    // Find most and least used templates
    const sortedByUsage = allTemplates.filter(t => t.appliedCount > 0)
      .sort((a, b) => b.appliedCount - a.appliedCount);
    const mostUsedTemplateId = sortedByUsage[0]?.id;
    const leastUsedTemplateId = sortedByUsage[sortedByUsage.length - 1]?.id;
    
    // Generate recent activity from templates
    const recentActivity: TemplateActivity[] = allTemplates
      .map(template => ({
        id: `activity-${template.id}`,
        templateId: template.id,
        templateName: template.name,
        action: 'applied' as const,
        timestamp: template.lastModified || template.createdAt,
        details: `Applied ${template.appliedCount} times`
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
    
    const analytics: TemplateAnalytics = {
      totalTemplates,
      activeTemplates,
      mlGeneratedTemplates,
      userCreatedTemplates,
      totalApplications,
      successfulApplications,
      averageSuccessRate,
      mostUsedTemplateId,
      leastUsedTemplateId,
      recentActivity
    };
    
    set({ templateAnalytics: analytics });
  },
  mergeTemplates: async (templateIds, newName) => { return { success: false }; },
  reviewAnomaly: (anomalyId, decision) => {},
  assignAnomalyToEquipmentType: (anomalyId, equipmentTypeId) => {},
  createEquipmentTypeFromAnomalies: async (anomalyIds, typeName, description) => { return { success: false }; },
  groupSimilarAnomalies: async (anomalyIds) => { return { success: false }; },
  runAnomalyDetection: async (threshold) => { return {}; },
  approveNewEquipmentType: async (candidateId) => { return { success: false }; },
  rejectNewEquipmentType: (candidateId, reason) => {},

}));
