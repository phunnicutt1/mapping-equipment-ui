export interface BACnetPoint {
  id: string;
  dis: string;
  bacnetCur: string;
  kind: 'Number' | 'Bool' | 'Str';
  unit: string | null;
  vendor?: string;
  model?: string;
  equipRef?: string | null;
  equipName?: string | null;
  navName?: string | null;
  bacnetDesc?: string | null;
  bacnetDis?: string | null;
  bacnetConnRef?: string | null;
  fileName?: string;
  confidence?: number;
  status: 'unassigned' | 'suggested' | 'confirmed' | 'flagged';
  // Additional SkySpark fields
  markers?: string[]; // Marker tags like 'point', 'bacnetPoint', 'cur', 'his'
  source?: string; // Data source like 'read(point)' or 'read(bacnetConn)'
  equipTypeName?: string; // Parent equipment type name
}

export interface EquipmentType {
  id: string;
  name: string;
  pattern: RegExp;
  confidence: number;
  pointPatterns: string[];
  minPoints: number;
  maxPoints: number;
}

export interface EquipmentInstance {
  id: string;
  name: string;
  typeId: string;
  equipTypeName?: string; // Parent equipment type name for display
  vendor?: string;
  model?: string;
  confidence: number;
  status: 'suggested' | 'confirmed' | 'needs-review';
  pointIds: string[];
  fileName?: string;
}

export interface ProcessingStats {
  totalPoints: number;
  assignedPoints: number;
  equipmentGroups: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface ConsoleMessage {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface GroupingState {
  points: BACnetPoint[];
  equipmentTypes: EquipmentType[];
  equipmentInstances: EquipmentInstance[];
  stats: ProcessingStats;
  consoleMessages: ConsoleMessage[];
  selectedGroupingMethod: 'none' | 'kind' | 'unit' | 'smart';
  isProcessing: boolean;
  showUnassignedDrawer: boolean;
  selectedPoints: Set<string>;
}