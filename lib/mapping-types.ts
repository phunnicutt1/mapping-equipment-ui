// Core Data Types for BACnet Equipment Mapping

export interface RawPoint {
  id: string;
  bacnetDis: string;
  bacnetCur: string;
  unit?: string;
  kind: 'Number' | 'Bool' | 'Str';
  bacnetConnRef?: string;
  navName?: string;
  metadata?: Record<string, any>;
}

export interface StandardPoint {
  id: string;
  name: string; // e.g., "ZoneAirTemperature"
  displayName: string; // e.g., "Zone Air Temperature"
  description: string;
  expectedUnit?: string;
  expectedKind: 'Number' | 'Bool' | 'Str';
  required: boolean;
  category: 'sensor' | 'command' | 'status' | 'setpoint';
}

export interface EquipmentClass {
  id: string;
  name: string; // e.g., "VAV-Reheat"
  displayName: string;
  description: string;
  standardPoints: StandardPoint[];
  category: 'hvac' | 'lighting' | 'security' | 'utility';
}

export interface ProposedInstance {
  id: string;
  name: string; // e.g., "VAV-101"
  confidence: number; // 0-1
  confidenceLevel: 'high' | 'medium' | 'low';
  rawPoints: RawPoint[];
  derivedFrom: 'pattern' | 'grouping' | 'manual';
  metadata?: {
    commonIdentifier?: string;
    sourceCount?: number;
    similarityScore?: number;
    patternUsed?: string;
  };
}

export interface ConfirmedInstance {
  id: string;
  name: string;
  rawPoints: RawPoint[];
  typeId?: string; // References EquipmentType after Phase 2
}

export interface ProposedType {
  id: string;
  name: string; // e.g., "VAV-like Equipment"
  confidence: number;
  instances: ConfirmedInstance[];
  suggestedClassId?: string;
  similarityMetrics: {
    jaccardSimilarity: number;
    commonPointsCount: number;
    instanceCount: number;
  };
}

export interface EquipmentType {
  id: string;
  name: string; // e.g., "Trane VAVs - Floors 1-3"
  classId: string; // References EquipmentClass
  instances: ConfirmedInstance[];
  customMappings?: Record<string, string>; // Override standard mappings
}

export interface MappedPoint {
  instanceId: string;
  standardPointId: string;
  rawPointId: string;
  confidence: number;
  mappingMethod: 'auto' | 'bulk' | 'manual';
  validated: boolean;
}

export interface MappingCell {
  instanceId: string;
  standardPointId: string;
  mappedPoint?: MappedPoint;
  status: 'auto-mapped' | 'unmapped' | 'missing' | 'manual';
  availableRawPoints: RawPoint[];
}

// Phase-specific State Types
export interface Phase1State {
  proposedInstances: ProposedInstance[];
  confirmedInstances: ConfirmedInstance[];
  selectedInstanceId?: string;
  bulkSelections: Set<string>;
  filterBy: 'all' | 'high' | 'medium' | 'low';
}

export interface Phase2State {
  confirmedInstances: ConfirmedInstance[];
  proposedTypes: ProposedType[];
  equipmentClasses: EquipmentClass[];
  selectedTypeId?: string;
  activeModal?: 'define-type' | 'edit-type';
  definedTypes: EquipmentType[];
}

export interface Phase3State {
  selectedTypeId?: string;
  equipmentTypes: EquipmentType[];
  mappingMatrix: MappingCell[][];
  unmappedPoints: RawPoint[];
  bulkMappingMode?: {
    standardPointId: string;
    suggestedRule: string;
    previewMatches: string[];
  };
  completedRows: Set<string>;
}

// Action Types
export type Phase1Action = 
  | { type: 'SELECT_INSTANCE'; instanceId: string }
  | { type: 'CONFIRM_INSTANCE'; instanceId: string }
  | { type: 'BULK_CONFIRM'; instanceIds: string[] }
  | { type: 'EDIT_INSTANCE_NAME'; instanceId: string; name: string }
  | { type: 'MERGE_INSTANCES'; instanceIds: string[] }
  | { type: 'SPLIT_INSTANCE'; instanceId: string; pointIds: string[] }
  | { type: 'TOGGLE_BULK_SELECTION'; instanceId: string }
  | { type: 'SET_FILTER'; filter: Phase1State['filterBy'] };

export type Phase2Action =
  | { type: 'SELECT_PROPOSED_TYPE'; typeId: string }
  | { type: 'DEFINE_TYPE'; typeData: Omit<EquipmentType, 'id'> }
  | { type: 'OPEN_DEFINE_MODAL'; proposedTypeId?: string }
  | { type: 'CLOSE_MODAL' }
  | { type: 'AUTO_SUGGEST_TYPES' };

export type Phase3Action =
  | { type: 'SELECT_TYPE'; typeId: string }
  | { type: 'MAP_INDIVIDUAL'; cell: { instanceId: string; standardPointId: string }; rawPointId: string }
  | { type: 'START_BULK_MAPPING'; standardPointId: string }
  | { type: 'APPLY_BULK_RULE'; rule: string; matches: Array<{ instanceId: string; rawPointId: string }> }
  | { type: 'CONFIRM_ROW'; standardPointId: string }
  | { type: 'VALIDATE_MAPPING'; mappingId: string }
  | { type: 'DEMO_COMPLETE_ALL'; matrix: MappingCell[][] }; 