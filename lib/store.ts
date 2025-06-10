import { create } from 'zustand';
import { GroupingState, BACnetPoint, EquipmentInstance, EquipmentTemplate, PointSignature, ConsoleMessage } from './types';
import { processEquipmentGrouping } from './utils';
import { generateRandomTemplateColor } from './utils';

interface GroupingActions {
  loadPoints: (points: BACnetPoint[]) => void;
  setGroupingMethod: (method: GroupingState['selectedGroupingMethod']) => void;
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
}

export const useGroupingStore = create<GroupingState & GroupingActions>((set, get) => ({
  // Initial state
  points: [],
  equipmentTypes: [],
  equipmentInstances: [],
  templates: [],
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

  // Actions
  loadPoints: (points) => {
    set({ isProcessing: true });
    
    try {
      const processed = processEquipmentGrouping(points);
      set({
        points: processed.points,
        equipmentTypes: processed.equipmentTypes,
        equipmentInstances: processed.equipmentInstances,
        stats: processed.stats,
        isProcessing: false
      });
      
      get().addConsoleMessage({
        level: 'success',
        message: `Processed ${points.length} points, detected ${processed.equipmentInstances.length} equipment instances`
      });
    } catch (error) {
      console.error('Error processing points:', error);
      set({ isProcessing: false });
      
      get().addConsoleMessage({
        level: 'error',
        message: `Error processing points: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  },

  setGroupingMethod: (method) => {
    set({ selectedGroupingMethod: method });
    
    const state = get();
    if (state.points.length > 0) {
      if (method === 'smart') {
        // Process equipment grouping for smart mode
        const processed = processEquipmentGrouping(state.points);
        set({
          equipmentInstances: processed.equipmentInstances,
          stats: processed.stats
        });
        
        get().addConsoleMessage({
          level: 'info',
          message: `Smart grouping enabled - detected ${processed.equipmentInstances.length} equipment instances`
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
      message: `Confirmed all ${equipmentPoints.length} points for equipment: ${equipmentId} (confidence set to 100%)`
    });
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
      createdAt: new Date(),
      appliedCount: 0,
      color: generateRandomTemplateColor()
    };

    // Add template to store
    set(state => ({
      templates: [...state.templates, template],
      equipmentInstances: state.equipmentInstances.map(eq =>
        eq.id === equipmentId ? { ...eq, templateId: template.id } : eq
      )
    }));

    get().addConsoleMessage({
      level: 'success',
      message: `Template "${template.name}" created with ${pointSignature.length} point signatures`
    });

    // Apply template to similar equipment automatically
    const appliedCount = await get().applyTemplateToSimilarEquipment(template.id);

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
  }
}));