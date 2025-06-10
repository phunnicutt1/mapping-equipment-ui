export interface BACnetPoint {
  id: string;
  dis: string;
  navName?: string;
  unit?: string;
  kind?: string;
  equipRef?: string | null;
  bacnetCur?: string;
  bacnetDesc?: string;
  bacnetDis?: string;
  bacnetConnRef?: string;
  bacnetDeviceName?: string;
  vendor?: string;
  model?: string;
  siteRef?: string;
  status?: 'unassigned' | 'suggested' | 'confirmed' | 'flagged';
  confidence?: number;
  point?: string;
  writable?: string;
  cmd?: string;
  sensor?: string;
  his?: string;
  curVal?: any;
  curStatus?: string;
  curErr?: string;
  writeStatus?: string;
  writeErr?: string;
  fileName?: string;
}

export interface EquipmentType {
  id: string;
  name: string;
  description?: string;
  category?: string;
  color?: string; // Random color assigned when equipment type is created
  templates?: EquipmentTemplate[]; // Available templates for this type
}

export interface EquipmentInstance {
  id: string;
  name: string;
  typeId: string;
  confidence: number;
  status: 'suggested' | 'confirmed' | 'needs-review';
  pointIds: string[];
  vendor?: string;
  model?: string;
  bacnetDeviceName?: string;
  templateId?: string; // Reference to applied template
}

export interface EquipmentTemplate {
  id: string;
  name: string;
  equipmentTypeId: string;
  createdFrom: string; // Equipment instance ID this was created from
  pointSignature: PointSignature[];
  createdAt: Date;
  appliedCount: number; // How many times this template has been applied
  color: string; // Random color assigned when template is created (e.g., 'bg-blue-500')
}

export interface PointSignature {
  navName: string;
  kind?: string;
  unit?: string;
  bacnetPointType?: string; // e.g., 'AO', 'AI', 'BO', 'BI'
  properties: string[]; // e.g., ['point', 'writable', 'cmd']
  isRequired: boolean;
}

export interface ProcessingStats {
  totalPoints: number;
  assignedPoints: number;
  equipmentGroups: number;
  templatedEquipment?: number; // New stat for template usage
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface ConsoleMessage {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface GroupingState {
  points: BACnetPoint[];
  equipmentTypes: EquipmentType[];
  equipmentInstances: EquipmentInstance[];
  templates: EquipmentTemplate[]; // Global template storage
  stats: ProcessingStats;
  consoleMessages: ConsoleMessage[];
  selectedGroupingMethod: 'none' | 'kind' | 'unit' | 'smart';
  isProcessing: boolean;
  showUnassignedDrawer: boolean;
  showConfirmedDrawer: boolean;
  selectedPoints: Set<string>;
  showCelebration: boolean;
  isComplete: boolean;
}