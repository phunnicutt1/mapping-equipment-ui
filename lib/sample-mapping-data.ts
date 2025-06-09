import { ProposedInstance, RawPoint, Phase1State } from './mapping-types';

// Sample Raw Points
export const sampleRawPoints: RawPoint[] = [
  // VAV-101 Points (High Confidence Group)
  {
    id: 'raw_001',
    bacnetDis: 'VAV-101.ZN-T',
    bacnetCur: 'VAV-101_Zone_Temp',
    unit: '°F',
    kind: 'Number',
    bacnetConnRef: 'VAV-101',
    navName: 'HVAC.Floor1.VAV-101.ZoneTemp'
  },
  {
    id: 'raw_002',
    bacnetDis: 'VAV-101.DMPR-CMD',
    bacnetCur: 'VAV-101_Damper_Command',
    unit: '%',
    kind: 'Number',
    bacnetConnRef: 'VAV-101',
    navName: 'HVAC.Floor1.VAV-101.DamperCmd'
  },
  {
    id: 'raw_003',
    bacnetDis: 'VAV-101.RH-VLV-CMD',
    bacnetCur: 'VAV-101_Reheat_Valve_Command',
    unit: '%',
    kind: 'Number',
    bacnetConnRef: 'VAV-101',
    navName: 'HVAC.Floor1.VAV-101.ReheatValve'
  },
  {
    id: 'raw_004',
    bacnetDis: 'VAV-101.ZN-T-SP',
    bacnetCur: 'VAV-101_Zone_Temp_Setpoint',
    unit: '°F',
    kind: 'Number',
    bacnetConnRef: 'VAV-101',
    navName: 'HVAC.Floor1.VAV-101.ZoneTempSP'
  },

  // VAV-102 Points (High Confidence Group)
  {
    id: 'raw_005',
    bacnetDis: 'VAV-102.ZN-T',
    bacnetCur: 'VAV-102_Zone_Temp',
    unit: '°F',
    kind: 'Number',
    bacnetConnRef: 'VAV-102',
    navName: 'HVAC.Floor1.VAV-102.ZoneTemp'
  },
  {
    id: 'raw_006',
    bacnetDis: 'VAV-102.DMPR-CMD',
    bacnetCur: 'VAV-102_Damper_Command',
    unit: '%',
    kind: 'Number',
    bacnetConnRef: 'VAV-102',
    navName: 'HVAC.Floor1.VAV-102.DamperCmd'
  },
  {
    id: 'raw_007',
    bacnetDis: 'VAV-102.RH-VLV-CMD',
    bacnetCur: 'VAV-102_Reheat_Valve_Command',
    unit: '%',
    kind: 'Number',
    bacnetConnRef: 'VAV-102',
    navName: 'HVAC.Floor1.VAV-102.ReheatValve'
  },

  // AHU-01 Points (Medium Confidence Group)
  {
    id: 'raw_008',
    bacnetDis: 'AHU-01.SA-T',
    bacnetCur: 'AHU-01_Supply_Air_Temp',
    unit: '°F',
    kind: 'Number',
    bacnetConnRef: 'AHU-01',
    navName: 'HVAC.Penthouse.AHU-01.SupplyAirTemp'
  },
  {
    id: 'raw_009',
    bacnetDis: 'AHU-01.RA-T',
    bacnetCur: 'AHU-01_Return_Air_Temp',
    unit: '°F',
    kind: 'Number',
    bacnetConnRef: 'AHU-01',
    navName: 'HVAC.Penthouse.AHU-01.ReturnAirTemp'
  },
  {
    id: 'raw_010',
    bacnetDis: 'AHU-01.SF-VFD-SPD',
    bacnetCur: 'AHU-01_Supply_Fan_Speed',
    unit: '%',
    kind: 'Number',
    bacnetConnRef: 'AHU-01',
    navName: 'HVAC.Penthouse.AHU-01.SupplyFanSpeed'
  },
  {
    id: 'raw_011',
    bacnetDis: 'AHU-01.RF-VFD-SPD',
    bacnetCur: 'AHU-01_Return_Fan_Speed',
    unit: '%',
    kind: 'Number',
    bacnetConnRef: 'AHU-01',
    navName: 'HVAC.Penthouse.AHU-01.ReturnFanSpeed'
  },
  {
    id: 'raw_012',
    bacnetDis: 'AHU-01.OA-DMPR-CMD',
    bacnetCur: 'AHU-01_Outside_Air_Damper',
    unit: '%',
    kind: 'Number',
    bacnetConnRef: 'AHU-01',
    navName: 'HVAC.Penthouse.AHU-01.OADamper'
  },

  // Ambiguous Points (Low Confidence)
  {
    id: 'raw_013',
    bacnetDis: 'ROOM_301.TEMP',
    bacnetCur: 'Room_301_Temperature',
    unit: '°F',
    kind: 'Number',
    navName: 'Sensors.Floor3.Room301.Temp'
  },
  {
    id: 'raw_014',
    bacnetDis: 'BLDG.OUTSIDE_TEMP',
    bacnetCur: 'Building_Outside_Temperature',
    unit: '°F',
    kind: 'Number',
    navName: 'Weather.OutsideTemp'
  },
  {
    id: 'raw_015',
    bacnetDis: 'ENERGY_METER.KWH',
    bacnetCur: 'Main_Energy_Meter_KWH',
    unit: 'kWh',
    kind: 'Number',
    navName: 'Utilities.Electric.MainMeter'
  }
];

// Sample Proposed Instances for Phase 1
export const sampleProposedInstances: ProposedInstance[] = [
  {
    id: 'proposed_001',
    name: 'VAV-101',
    confidence: 0.95,
    confidenceLevel: 'high',
    rawPoints: sampleRawPoints.slice(0, 4), // First 4 VAV-101 points
    derivedFrom: 'pattern',
    metadata: {
      commonIdentifier: 'VAV-101',
      sourceCount: 4,
      similarityScore: 0.92
    }
  },
  {
    id: 'proposed_002',
    name: 'VAV-102',
    confidence: 0.92,
    confidenceLevel: 'high',
    rawPoints: sampleRawPoints.slice(4, 7), // VAV-102 points
    derivedFrom: 'pattern',
    metadata: {
      commonIdentifier: 'VAV-102',
      sourceCount: 3,
      similarityScore: 0.89
    }
  },
  {
    id: 'proposed_003',
    name: 'AHU-01',
    confidence: 0.78,
    confidenceLevel: 'medium',
    rawPoints: sampleRawPoints.slice(7, 12), // AHU-01 points
    derivedFrom: 'grouping',
    metadata: {
      commonIdentifier: 'AHU-01',
      sourceCount: 5,
      similarityScore: 0.75
    }
  },
  {
    id: 'proposed_004',
    name: 'Uncategorized_Group_1',
    confidence: 0.45,
    confidenceLevel: 'low',
    rawPoints: sampleRawPoints.slice(12), // Remaining ambiguous points
    derivedFrom: 'manual',
    metadata: {
      commonIdentifier: undefined,
      sourceCount: 3,
      similarityScore: 0.22
    }
  }
];

// Sample Phase 1 Initial State
export const samplePhase1State: Phase1State = {
  proposedInstances: sampleProposedInstances,
  confirmedInstances: [],
  selectedInstanceId: undefined,
  bulkSelections: new Set(),
  filterBy: 'all'
};

// Helper functions for component development
export const getInstancesByConfidence = (instances: ProposedInstance[], level?: 'high' | 'medium' | 'low') => {
  if (!level) return instances;
  return instances.filter(instance => instance.confidenceLevel === level);
};

export const getConfidenceCounts = (instances: ProposedInstance[]) => {
  return {
    high: instances.filter(i => i.confidenceLevel === 'high').length,
    medium: instances.filter(i => i.confidenceLevel === 'medium').length,
    low: instances.filter(i => i.confidenceLevel === 'low').length,
    total: instances.length
  };
};

export const getTotalPointsCount = (instances: ProposedInstance[]) => {
  return instances.reduce((total, instance) => total + instance.rawPoints.length, 0);
}; 