import React, { useReducer, useState, useMemo } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BoltIcon,
  AdjustmentsHorizontalIcon,
  ArrowRightIcon,
  SparklesIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { 
  CheckIcon, 
  QuestionMarkCircleIcon 
} from '@heroicons/react/24/solid';
import { 
  EquipmentType, 
  StandardPoint, 
  MappingCell, 
  RawPoint,
  Phase3State, 
  Phase3Action,
  ConfirmedInstance
} from '@/lib/mapping-types';

interface PointMappingMatrixProps {
  equipmentTypes: EquipmentType[];
  onComplete: () => void;
}

// Enhanced standard points with categories
const STANDARD_POINTS_BY_CATEGORY: Record<string, StandardPoint[]> = {
  sensor: [
    {
      id: 'zone_air_temp',
      name: 'ZoneAirTemperature',
      displayName: 'Zone Air Temperature',
      description: 'Current temperature reading from the zone',
      expectedUnit: '°F',
      expectedKind: 'Number',
      required: true,
      category: 'sensor'
    },
    {
      id: 'airflow_feedback',
      name: 'AirflowFeedback',
      displayName: 'Airflow Feedback',
      description: 'Current airflow measurement',
      expectedUnit: 'CFM',
      expectedKind: 'Number',
      required: false,
      category: 'sensor'
    },
    {
      id: 'supply_air_temp',
      name: 'SupplyAirTemperature',
      displayName: 'Supply Air Temperature',
      description: 'Temperature of supply air',
      expectedUnit: '°F',
      expectedKind: 'Number',
      required: false,
      category: 'sensor'
    }
  ],
  command: [
    {
      id: 'damper_position',
      name: 'DamperPositionCommand',
      displayName: 'Damper Position Command',
      description: 'Control signal for damper actuator',
      expectedUnit: '%',
      expectedKind: 'Number',
      required: true,
      category: 'command'
    },
    {
      id: 'reheat_valve',
      name: 'ReheatValveCommand',
      displayName: 'Reheat Valve Command',
      description: 'Control signal for reheat valve',
      expectedUnit: '%',
      expectedKind: 'Number',
      required: false,
      category: 'command'
    }
  ],
  setpoint: [
    {
      id: 'zone_temp_setpoint',
      name: 'ZoneTemperatureSetpoint',
      displayName: 'Zone Temperature Setpoint',
      description: 'Desired temperature for the zone',
      expectedUnit: '°F',
      expectedKind: 'Number',
      required: false,
      category: 'setpoint'
    }
  ],
  status: [
    {
      id: 'fan_status',
      name: 'FanStatus',
      displayName: 'Fan Status',
      description: 'On/Off status of fan',
      expectedKind: 'Bool',
      required: false,
      category: 'status'
    }
  ]
};

// Flatten all standard points
const ALL_STANDARD_POINTS = Object.values(STANDARD_POINTS_BY_CATEGORY).flat();

// Enhanced Phase 3 reducer with matrix operations
function phase3Reducer(state: Phase3State, action: Phase3Action): Phase3State {
  switch (action.type) {
    case 'SELECT_TYPE':
      return { ...state, selectedTypeId: action.typeId };
    
    case 'MAP_INDIVIDUAL': {
      if (!state.mappingMatrix) return state;
      
      const newMatrix = state.mappingMatrix.map(row => 
        row.map(cell => {
          if (cell.instanceId === action.cell.instanceId && 
              cell.standardPointId === action.cell.standardPointId) {
            return {
              ...cell,
              mappedPoint: {
                instanceId: action.cell.instanceId,
                standardPointId: action.cell.standardPointId,
                rawPointId: action.rawPointId,
                confidence: 1.0,
                mappingMethod: 'manual' as const,
                validated: false
              },
              status: 'manual' as const
            };
          }
          return cell;
        })
      );
      
      return { ...state, mappingMatrix: newMatrix };
    }
    
    case 'START_BULK_MAPPING':
      return { 
        ...state, 
        bulkMappingMode: {
          standardPointId: action.standardPointId,
          suggestedRule: generateSuggestedRule(state, action.standardPointId),
          previewMatches: []
        }
      };
    
    case 'APPLY_BULK_RULE': {
      if (!state.mappingMatrix || !state.bulkMappingMode) return state;
      
      const newMatrix = state.mappingMatrix.map(row => 
        row.map(cell => {
          if (cell.standardPointId === state.bulkMappingMode!.standardPointId) {
            const match = action.matches.find(m => m.instanceId === cell.instanceId);
            if (match) {
              return {
                ...cell,
                mappedPoint: {
                  instanceId: cell.instanceId,
                  standardPointId: cell.standardPointId,
                  rawPointId: match.rawPointId,
                  confidence: 0.85,
                  mappingMethod: 'bulk' as const,
                  validated: false
                },
                status: 'auto-mapped' as const
              };
            }
          }
          return cell;
        })
      );
      
      return { 
        ...state, 
        mappingMatrix: newMatrix,
        bulkMappingMode: undefined
      };
    }
    
    case 'CONFIRM_ROW':
      return {
        ...state,
        completedRows: new Set([...Array.from(state.completedRows), action.standardPointId])
      };
    
    case 'DEMO_COMPLETE_ALL':
      return {
        ...state,
        mappingMatrix: action.matrix
      };
    
    default:
      return state;
  }
}

// Helper function to generate suggested mapping rules
function generateSuggestedRule(state: Phase3State, standardPointId: string): string {
  const standardPoint = ALL_STANDARD_POINTS.find(p => p.id === standardPointId);
  if (!standardPoint) return '';
  
  // Enhanced rule generation based on standard point characteristics
  switch (standardPointId) {
    case 'zone_air_temp':
      return 'contains "ZN-T" or contains "ZONE_TEMP" or contains "ROOM_TEMP"';
    case 'damper_position':
      return 'contains "DMPR" and contains "CMD"';
    case 'reheat_valve':
      return 'contains "RH" and contains "VLV"';
    case 'zone_temp_setpoint':
      return 'contains "SP" and contains "TEMP"';
    case 'airflow_feedback':
      return 'contains "FLOW" or contains "CFM"';
    case 'supply_air_temp':
      return 'contains "SUPPLY" and contains "TEMP"';
    case 'fan_status':
      return 'contains "FAN" and contains "STATUS"';
    default:
      return '';
  }
}

// Smart matching algorithm
function findSmartMatches(rawPoints: RawPoint[], standardPoint: StandardPoint): Array<{point: RawPoint; confidence: number}> {
  const matches: Array<{point: RawPoint; confidence: number}> = [];
  
  rawPoints.forEach(point => {
    let confidence = 0;
    const dis = point.bacnetDis.toLowerCase();
    const pointName = standardPoint.name.toLowerCase();
    const displayName = standardPoint.displayName.toLowerCase();
    
    // Direct name matching
    if (dis.includes(pointName)) confidence += 0.8;
    if (dis.includes(displayName.replace(/\s+/g, '_'))) confidence += 0.6;
    
    // Unit matching
    if (point.unit && standardPoint.expectedUnit) {
      if (point.unit === standardPoint.expectedUnit) confidence += 0.3;
    }
    
    // Kind matching
    if (point.kind === standardPoint.expectedKind) confidence += 0.2;
    
    // Category-specific pattern matching
    switch (standardPoint.category) {
      case 'sensor':
        if (dis.includes('sensor') || dis.includes('feedback')) confidence += 0.1;
        break;
      case 'command':
        if (dis.includes('cmd') || dis.includes('command')) confidence += 0.1;
        break;
      case 'setpoint':
        if (dis.includes('sp') || dis.includes('setpoint')) confidence += 0.1;
        break;
      case 'status':
        if (dis.includes('status') || dis.includes('state')) confidence += 0.1;
        break;
    }
    
    if (confidence > 0.3) { // Only include reasonable matches
      matches.push({ point, confidence: Math.min(confidence, 1.0) });
    }
  });
  
  return matches.sort((a, b) => b.confidence - a.confidence);
}

// Main component implementation
export function PointMappingMatrix({ equipmentTypes, onComplete }: PointMappingMatrixProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>(
    equipmentTypes.length > 0 ? equipmentTypes[0].id : undefined
  );
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['sensor', 'command']) // Start with sensor and command expanded
  );
  
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmedEquipment, setShowConfirmedEquipment] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'completion' | 'instances'>('name');
  
  // Store completion data for all equipment types persistently
  const [equipmentCompletionData, setEquipmentCompletionData] = useState<Map<string, MappingCell[][]>>(new Map());

  // Initialize matrix state
  const selectedType = equipmentTypes.find(type => type.id === selectedTypeId);
  
  const initialState: Phase3State = useMemo(() => {
    if (!selectedType) {
      return {
        equipmentTypes: [],
        mappingMatrix: [],
        unmappedPoints: [],
        completedRows: new Set()
      };
    }

    // Check if we have persistent completion data for this equipment type
    const persistentMatrix = equipmentCompletionData.get(selectedType.id);
    
    if (persistentMatrix) {
      // Use the persistent completed data
      return {
        selectedTypeId,
        equipmentTypes,
        mappingMatrix: persistentMatrix,
        unmappedPoints: [],
        completedRows: new Set()
      };
    }

    // Create new mapping matrix for ALL standard points (filtering is only for display)
    const matrix: MappingCell[][] = [];
    
    ALL_STANDARD_POINTS.forEach(standardPoint => {
      const row: MappingCell[] = [];
      
      selectedType.instances.forEach(instance => {
        const smartMatches = findSmartMatches(instance.rawPoints, standardPoint);
        const bestMatch = smartMatches[0];
        
        const cell: MappingCell = {
          instanceId: instance.id,
          standardPointId: standardPoint.id,
          availableRawPoints: instance.rawPoints,
          status: bestMatch && bestMatch.confidence > 0.4 ? 'auto-mapped' : 'unmapped',
          mappedPoint: bestMatch && bestMatch.confidence > 0.4 ? {
            instanceId: instance.id,
            standardPointId: standardPoint.id,
            rawPointId: bestMatch.point.id,
            confidence: bestMatch.confidence,
            mappingMethod: 'auto',
            validated: false
          } : undefined
        };
        
        row.push(cell);
      });
      
      matrix.push(row);
    });

    return {
      selectedTypeId,
      equipmentTypes,
      mappingMatrix: matrix,
      unmappedPoints: [],
      completedRows: new Set()
    };
  }, [selectedType, equipmentTypes, equipmentCompletionData]);

  const [state, dispatch] = useReducer(phase3Reducer, initialState);

  // Filter standard points based on search and category
  const filteredStandardPoints = useMemo(() => {
    let points = filterCategory === 'all' 
      ? ALL_STANDARD_POINTS 
      : STANDARD_POINTS_BY_CATEGORY[filterCategory] || [];
    
    if (searchTerm) {
      points = points.filter(point => 
        point.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        point.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return points;
  }, [filterCategory, searchTerm]);

  // Calculate completion statistics for each equipment type using persistent data
  const equipmentCompletionStats = useMemo(() => {
    const stats = new Map<string, { mapped: number; total: number; percentage: number }>();
    
    equipmentTypes.forEach(equipType => {
      const totalCells = ALL_STANDARD_POINTS.length * equipType.instances.length;
      let mappedCells = 0;
      
      // Check if we have persistent completion data for this equipment type
      const persistentMatrix = equipmentCompletionData.get(equipType.id);
      
      if (persistentMatrix) {
        // Use persistent data
        persistentMatrix.forEach(row => {
          row.forEach(cell => {
            if (cell.mappedPoint) {
              mappedCells++;
            }
          });
        });
      } else if (selectedType && equipType.id === selectedType.id && state.mappingMatrix) {
        // Use current state data for selected type
        ALL_STANDARD_POINTS.forEach((standardPoint, pointIndex) => {
          const matrixRow = state.mappingMatrix[pointIndex];
          if (matrixRow) {
            matrixRow.forEach(cell => {
              if (cell.mappedPoint) {
                mappedCells++;
              }
            });
          }
        });
      } else {
        // For unworked equipment types, calculate auto-mapping potential
        ALL_STANDARD_POINTS.forEach(standardPoint => {
          equipType.instances.forEach(instance => {
            const smartMatches = findSmartMatches(instance.rawPoints, standardPoint);
            const bestMatch = smartMatches[0];
            if (bestMatch && bestMatch.confidence > 0.4) {
              mappedCells++;
            }
          });
        });
      }
      
      stats.set(equipType.id, {
        mapped: mappedCells,
        total: totalCells,
        percentage: totalCells > 0 ? Math.round((mappedCells / totalCells) * 100) : 0
      });
    });
    
    return stats;
  }, [state.mappingMatrix, equipmentTypes, selectedType, equipmentCompletionData]);

  // Calculate completion statistics for selected type
  const completionStats = useMemo(() => {
    if (!selectedType) return { mapped: 0, total: 0, percentage: 0 };
    return equipmentCompletionStats.get(selectedType.id) || { mapped: 0, total: 0, percentage: 0 };
  }, [equipmentCompletionStats, selectedType]);

  // Separate equipment types into active and confirmed
  const { activeEquipmentTypes, confirmedEquipmentTypes } = useMemo(() => {
    const active: EquipmentType[] = [];
    const confirmed: EquipmentType[] = [];
    
    equipmentTypes.forEach(equipType => {
      const stats = equipmentCompletionStats.get(equipType.id);
      if (stats && stats.percentage === 100) {
        confirmed.push(equipType);
      } else {
        active.push(equipType);
      }
    });
    
    // Sort equipment types based on sortBy preference
    const sortEquipment = (types: EquipmentType[]) => {
      return [...types].sort((a, b) => {
        switch (sortBy) {
          case 'completion':
            const aStats = equipmentCompletionStats.get(a.id) || { percentage: 0 };
            const bStats = equipmentCompletionStats.get(b.id) || { percentage: 0 };
            return bStats.percentage - aStats.percentage;
          case 'instances':
            return b.instances.length - a.instances.length;
          case 'name':
          default:
            return a.name.localeCompare(b.name);
        }
      });
    };
    
    return {
      activeEquipmentTypes: sortEquipment(active),
      confirmedEquipmentTypes: sortEquipment(confirmed)
    };
  }, [equipmentTypes, equipmentCompletionStats, sortBy]);



  const handleComplete = () => {
    onComplete();
  };

  const handleCellMapping = (cell: MappingCell, rawPointId: string) => {
    dispatch({
      type: 'MAP_INDIVIDUAL',
      cell: { instanceId: cell.instanceId, standardPointId: cell.standardPointId },
      rawPointId
    });
    
    // Also update persistent data if this equipment becomes complete
    setTimeout(() => {
      if (selectedType && state.mappingMatrix) {
        // Check if this equipment type is now complete
        const totalCells = ALL_STANDARD_POINTS.length * selectedType.instances.length;
        let mappedCells = 0;
        
        state.mappingMatrix.forEach(row => {
          row.forEach(cell => {
            if (cell.mappedPoint) {
              mappedCells++;
            }
          });
        });
        
        const percentage = totalCells > 0 ? Math.round((mappedCells / totalCells) * 100) : 0;
        
        if (percentage === 100) {
          setEquipmentCompletionData(prev => {
            const newData = new Map(prev);
            newData.set(selectedType.id, state.mappingMatrix);
            return newData;
          });
        }
      }
    }, 100); // Small delay to allow state update
  };

  const handleBulkMapping = (standardPointId: string) => {
    dispatch({ type: 'START_BULK_MAPPING', standardPointId });
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (!selectedType) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Phase 3: Point Mapping Matrix
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            No equipment types available for mapping
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <AdjustmentsHorizontalIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No equipment types available. Please complete Phase 2 first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Phase 3: Point Mapping Matrix
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Map raw points to standardized equipment point definitions
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{completionStats.mapped}</span> of{' '}
              <span className="font-medium">{completionStats.total}</span> mappings completed
              <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionStats.percentage}%` }}
                ></div>
              </div>
            </div>
                          <div className="flex items-center space-x-2">
                {/* Debug: Show persistent completion count */}
                <div className="text-xs text-gray-500">
                  Confirmed: {equipmentCompletionData.size} equipment types
                </div>
                <button
                onClick={() => {
                  // Demo: Mark current equipment as 100% complete and store persistently
                  if (selectedType && state.mappingMatrix) {
                    const newMatrix = state.mappingMatrix.map(row => 
                      row.map(cell => ({
                        ...cell,
                        status: 'manual' as const,
                        mappedPoint: cell.mappedPoint || {
                          instanceId: cell.instanceId,
                          standardPointId: cell.standardPointId,
                          rawPointId: cell.availableRawPoints[0]?.id || 'demo-point',
                          confidence: 1.0,
                          mappingMethod: 'manual' as const,
                          validated: true
                        }
                      }))
                    );
                    
                    // Store the completed matrix persistently
                    setEquipmentCompletionData(prev => {
                      const newData = new Map(prev);
                      newData.set(selectedType.id, newMatrix);
                      return newData;
                    });
                    
                    // Also update the current state
                    dispatch({ type: 'DEMO_COMPLETE_ALL', matrix: newMatrix });
                  }
                }}
                className="px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700"
              >
                Demo: Complete All
              </button>
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Complete Mapping ({completionStats.percentage}%)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Equipment Type & Controls */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Equipment Type Selector */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Equipment Type
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs px-2 py-1 border border-gray-300 rounded"
              >
                <option value="name">Sort by Name</option>
                <option value="completion">Sort by Completion</option>
                <option value="instances">Sort by Instances</option>
              </select>
            </div>
            <select
              value={selectedTypeId || ''}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <optgroup label="Active Equipment Types">
                {activeEquipmentTypes.map((type) => {
                  const stats = equipmentCompletionStats.get(type.id);
                  return (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.instances.length} instances) - {stats?.percentage || 0}%
                    </option>
                  );
                })}
              </optgroup>
              {confirmedEquipmentTypes.length > 0 && (
                <optgroup label="Confirmed Equipment Types">
                  {confirmedEquipmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      ✓ {type.name} ({type.instances.length} instances) - 100%
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Confirmed Equipment Toggle */}
          {confirmedEquipmentTypes.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={() => setShowConfirmedEquipment(!showConfirmedEquipment)}
                className="w-full flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="font-medium">Confirmed Equipment</span>
                  <span className="text-sm">({confirmedEquipmentTypes.length})</span>
                </div>
                {showConfirmedEquipment ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
              
              {showConfirmedEquipment && (
                <div className="mt-2 space-y-1">
                  {confirmedEquipmentTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedTypeId(type.id)}
                      className={`w-full text-left p-2 rounded-md transition-colors text-sm ${
                        selectedTypeId === type.id
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-white text-green-700 hover:bg-green-50 border border-green-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">✓ {type.name}</span>
                        <span className="text-xs text-green-600">100%</span>
                      </div>
                      <div className="text-xs text-green-600">
                        {type.instances.length} instances
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search standard points..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Categories</option>
              <option value="sensor">Sensors</option>
              <option value="command">Commands</option>
              <option value="setpoint">Setpoints</option>
              <option value="status">Status</option>
            </select>

            {/* All Equipment Confirmed Notification */}
            {activeEquipmentTypes.length === 0 && confirmedEquipmentTypes.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    All equipment types confirmed!
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  All equipment types have been fully mapped and confirmed.
                </p>
              </div>
            )}
          </div>

          {/* Standard Points by Category */}
          <div className="flex-1 overflow-y-auto">
            {Object.entries(STANDARD_POINTS_BY_CATEGORY).map(([category, points]) => {
              const categoryPoints = points.filter(point => 
                filteredStandardPoints.includes(point)
              );
              
              if (categoryPoints.length === 0) return null;
              
              const isExpanded = expandedCategories.has(category);
              
              return (
                <div key={category} className="border-b border-gray-200">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {category}s
                      </span>
                      <span className="text-xs text-gray-500">
                        ({categoryPoints.length})
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="pb-2">
                      {categoryPoints.map((point) => (
                        <div key={point.id} className="px-4 py-2 hover:bg-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {point.displayName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {point.description}
                              </p>
                              {point.expectedUnit && (
                                <span className="text-xs text-blue-600">
                                  {point.expectedUnit}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              {point.required && (
                                <span className="w-2 h-2 bg-red-400 rounded-full" title="Required" />
                              )}
                              <button
                                onClick={() => handleBulkMapping(point.id)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="Bulk map this point"
                              >
                                <SparklesIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Mapping Matrix */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Matrix Header */}
              <div className={`px-4 py-3 border-b border-gray-200 ${
                completionStats.percentage === 100 ? 'bg-green-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Mapping Matrix: {selectedType.name}
                    </h3>
                    {completionStats.percentage === 100 && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Confirmed</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Auto-mapped</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Manual</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-gray-300 rounded"></div>
                      <span>Unmapped</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matrix Grid */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Standard Point
                      </th>
                      {selectedType.instances.map((instance) => (
                        <th key={instance.id} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                          {instance.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStandardPoints.map((standardPoint) => {
                      const rowIndex = ALL_STANDARD_POINTS.findIndex(p => p.id === standardPoint.id);
                      const matrixRow = state.mappingMatrix[rowIndex];
                      
                      if (!matrixRow) return null;
                      
                      return (
                        <tr key={standardPoint.id}>
                          <td className="sticky left-0 bg-white px-4 py-3 border-r border-gray-200">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {standardPoint.displayName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {standardPoint.expectedUnit && `${standardPoint.expectedUnit} • `}
                                  {standardPoint.category}
                                </p>
                              </div>
                              {standardPoint.required && (
                                <span className="w-2 h-2 bg-red-400 rounded-full" />
                              )}
                            </div>
                          </td>
                          {matrixRow.map((cell) => (
                            <MappingCellComponent
                              key={`${cell.instanceId}-${cell.standardPointId}`}
                              cell={cell}
                              standardPoint={standardPoint}
                              onMapIndividual={handleCellMapping}
                            />
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Mapping Cell Component
interface MappingCellProps {
  cell: MappingCell;
  standardPoint: StandardPoint;
  onMapIndividual: (cell: MappingCell, rawPointId: string) => void;
}

function MappingCellComponent({ cell, standardPoint, onMapIndividual }: MappingCellProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Find smart matches for this cell
  const smartMatches = useMemo(() => 
    findSmartMatches(cell.availableRawPoints, standardPoint),
    [cell.availableRawPoints, standardPoint]
  );

  const getCellStyles = () => {
    switch (cell.status) {
      case 'auto-mapped':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'manual':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'unmapped':
        return 'bg-gray-50 border-gray-200 text-gray-600';
      case 'missing':
        return 'bg-red-50 border-red-200 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const getCellIcon = () => {
    switch (cell.status) {
      case 'auto-mapped':
      case 'manual':
        return <CheckIcon className="w-4 h-4 text-green-600" />;
      case 'missing':
        return <ExclamationCircleIcon className="w-4 h-4 text-red-600" />;
      default:
        return <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const currentMapping = cell.mappedPoint;
  const mappedPoint = currentMapping 
    ? cell.availableRawPoints.find(p => p.id === currentMapping.rawPointId)
    : null;

  return (
    <td className="px-3 py-3">
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full min-h-16 p-3 border rounded-lg text-left transition-colors ${getCellStyles()} hover:shadow-sm`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {mappedPoint ? (
                <>
                  <p className="text-sm font-medium truncate">
                    {mappedPoint.bacnetDis}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {mappedPoint.bacnetCur}
                    {currentMapping && (
                      <span className="ml-2 text-blue-600">
                        {Math.round(currentMapping.confidence * 100)}% match
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  <p>Click to map</p>
                  {smartMatches.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      {smartMatches.length} suggestions
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="ml-2 flex-shrink-0">
              {getCellIcon()}
            </div>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 z-10 w-72 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-2 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                Available Points ({cell.availableRawPoints.length})
              </p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {/* Smart matches first */}
              {smartMatches.length > 0 && (
                <>
                  <div className="px-3 py-2 bg-blue-50 border-b border-gray-200">
                    <p className="text-xs font-medium text-blue-900 flex items-center">
                      <SparklesIcon className="w-3 h-3 mr-1" />
                      Smart Suggestions
                    </p>
                  </div>
                  {smartMatches.slice(0, 3).map(({ point, confidence }) => (
                    <button
                      key={point.id}
                      onClick={() => {
                        onMapIndividual(cell, point.id);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {point.bacnetDis}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500 truncate">
                          {point.bacnetCur} • {point.unit || 'no unit'}
                        </p>
                        <span className="text-xs text-blue-600 font-medium">
                          {Math.round(confidence * 100)}%
                        </span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              
              {/* All other points */}
              {cell.availableRawPoints
                .filter(point => !smartMatches.some(m => m.point.id === point.id))
                .map((point) => (
                  <button
                    key={point.id}
                    onClick={() => {
                      onMapIndividual(cell, point.id);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {point.bacnetDis}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {point.bacnetCur} • {point.unit || 'no unit'}
                    </p>
                  </button>
                ))}
              
              {/* Clear mapping option */}
              {mappedPoint && (
                <button
                  onClick={() => {
                    // You would implement clearing logic here
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-red-50 border-t border-gray-200 text-red-600 flex items-center"
                >
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Clear mapping
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </td>
  );
} 