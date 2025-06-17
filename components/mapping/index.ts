// Equipment Mapping Components
export { InstanceValidator } from './InstanceValidator';
export { EquipmentTypeDefinition } from './EquipmentTypeDefinition';
export { PointMappingMatrix } from './PointMappingMatrix';
export { MappingWorkflow } from './MappingWorkflow';

// Re-export types for convenience
export type {
  ProposedInstance,
  ConfirmedInstance,
  EquipmentType,
  StandardPoint,
  RawPoint,
  Phase1State,
  Phase2State,
  Phase3State,
  MappingCell,
  MappedPoint
} from '@/lib/mapping-types'; 