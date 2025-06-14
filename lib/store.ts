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
  Anomaly,
  TemplateAnalytics,
  TemplateActivity,
  TemplateSimilarityMatch,
  TemplateUserFeedback,
  NewEquipmentTypeCandidate,
  EquipmentType,
  PointSignature,
  GroupingState,
} from './types';
import { generateRandomTemplateColor, equipmentTypes as defaultEquipmentTypes } from './utils';

// All server-side processing has been moved to API routes.
// This store should only contain client-side state management and API calls.

interface GroupingActions {
  loadProcessedData: (equipment: EquipmentInstance[], points: BACnetPoint[]) => Promise<void>;
  uploadFiles: (files: File[]) => Promise<void>;
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
  equipmentTypes: defaultEquipmentTypes,
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
      
      set({
        equipmentInstances,
        points: allPoints,
        equipmentTypes,
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

  uploadFiles: async (files) => {
    set({ isProcessing: true });
    get().addConsoleMessage({ level: 'info', message: `Uploading ${files.length} files...`});
    
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
  
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
  
      const result = await response.json();
  
      if (!result.success) {
        throw new Error(result.error || 'File processing failed on the server.');
      }
      
      const processedResult = result.data as ProcessingResult;

      set({
        equipmentInstances: processedResult.equipmentInstances,
        points: processedResult.allPoints,
        equipmentTypes: processedResult.equipmentTypes,
        templates: processedResult.equipmentTemplates || [],
        suggestedTemplates: processedResult.equipmentTemplates || [],
        anomalies: processedResult.anomalyDetectionResult?.anomalies || [],
        anomalyDetectionResults: processedResult.anomalyDetectionResult,
        analytics: processedResult.analytics,
        isProcessing: false,
      });

      get().addConsoleMessage({
        level: 'success',
        message: `Successfully processed ${files.length} files.`
      });

    } catch (error) {
      set({ isProcessing: false });
      get().addConsoleMessage({
        level: 'error',
        message: `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      timestamp: Date.now(),
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
  findSimilarEquipment: async (templateId, threshold) => { return []; },
  applyTemplateMatch: (matchId, confirmed) => {},
  addTemplateFeedback: (templateId, feedback) => {},
  updateTemplateEffectiveness: (templateId, success, confidence) => {},
  deactivateTemplate: (templateId) => {},
  activateTemplate: (templateId) => {},
  exportTemplate: async (templateId) => { return { success: false }; },
  importTemplate: async (templateData) => { return { success: false }; },
  calculateTemplateAnalytics: () => {},
  mergeTemplates: async (templateIds, newName) => { return { success: false }; },
  reviewAnomaly: (anomalyId, decision) => {},
  assignAnomalyToEquipmentType: (anomalyId, equipmentTypeId) => {},
  createEquipmentTypeFromAnomalies: async (anomalyIds, typeName, description) => { return { success: false }; },
  groupSimilarAnomalies: async (anomalyIds) => { return { success: false }; },
  runAnomalyDetection: async (threshold) => { return {}; },
  approveNewEquipmentType: async (candidateId) => { return { success: false }; },
  rejectNewEquipmentType: (candidateId, reason) => {},

}));
