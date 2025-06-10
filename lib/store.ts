import { create } from 'zustand';
import { GroupingState, BACnetPoint, EquipmentInstance, ConsoleMessage } from './types';
import { processEquipmentGrouping } from './utils';

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
  saveAsTemplate: (equipmentId: string) => void;
  togglePointSelection: (pointId: string) => void;
  clearSelection: () => void;
  addConsoleMessage: (message: Omit<ConsoleMessage, 'id' | 'timestamp'>) => void;
  saveDraft: () => Promise<void>;
  finalize: () => Promise<{ success: boolean; errors?: string[] }>;
}

export const useGroupingStore = create<GroupingState & GroupingActions>((set, get) => ({
  // Initial state
  points: [],
  equipmentTypes: [],
  equipmentInstances: [],
  stats: {
    totalPoints: 0,
    assignedPoints: 0,
    equipmentGroups: 0,
    confidenceDistribution: { high: 0, medium: 0, low: 0 }
  },
  consoleMessages: [],
  selectedGroupingMethod: 'smart',
  isProcessing: false,
  showUnassignedDrawer: false,
  showConfirmedDrawer: false,
  confirmedEquipment: [],
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

  saveAsTemplate: (equipmentId) => {
    const state = get();
    const equipment = state.equipmentInstances.find(eq => eq.id === equipmentId);
    const equipmentPoints = state.points.filter(point => point.equipRef === equipmentId);
    
    if (equipment) {
      // Move equipment to confirmed list
      const confirmedEquipment = {
        ...equipment,
        status: 'template' as const,
        templateId: `template-${Date.now()}`,
        pointIds: equipmentPoints.map(p => p.id)
      };
      
      set(state => ({
        confirmedEquipment: [...state.confirmedEquipment, confirmedEquipment],
        equipmentInstances: state.equipmentInstances.filter(eq => eq.id !== equipmentId),
        points: state.points.filter(point => point.equipRef !== equipmentId)
      }));
      
      get().addConsoleMessage({
        level: 'success',
        message: `Created template for ${equipment.name} with ${equipmentPoints.length} points`
      });
    }
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
        equipmentInstances: state.equipmentInstances
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
        equipmentInstances: state.equipmentInstances
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