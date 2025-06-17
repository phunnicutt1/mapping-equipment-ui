import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CogIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { 
  CheckIcon
} from '@heroicons/react/24/solid';

// Import our phase components
import { InstanceValidator } from './InstanceValidator';
import { EquipmentTypeDefinition } from './EquipmentTypeDefinition';
import { PointMappingMatrix } from './PointMappingMatrix';

// Import types and API hook
import { 
  Phase1State, 
  Phase2State, 
  Phase3State,
  ProposedInstance,
  ConfirmedInstance,
  EquipmentType,
  RawPoint
} from '@/lib/mapping-types';
import { useSkyspark } from '@/lib/hooks/use-skyspark';
import { processSkysarkData } from '@/lib/skyspark-parser';

// Workflow phases
type WorkflowPhase = 'phase1' | 'phase2' | 'phase3' | 'complete';

// Overall workflow state
interface WorkflowState {
  currentPhase: WorkflowPhase;
  phase1Complete: boolean;
  phase2Complete: boolean;
  phase3Complete: boolean;
  
  // Data flowing between phases
  proposedInstances: ProposedInstance[];
  confirmedInstances: ConfirmedInstance[];
  equipmentTypes: EquipmentType[];
  
  // Workflow metadata
  startTime: Date;
  phaseStartTimes: Record<WorkflowPhase, Date | null>;
  totalPoints: number;
  projectName?: string;
}

interface MappingWorkflowProps {
  projectName?: string;
  onComplete?: (results: {
    confirmedInstances: ConfirmedInstance[];
    equipmentTypes: EquipmentType[];
    totalMappings: number;
    duration: number;
  }) => void;
}

export function MappingWorkflow({ projectName, onComplete }: MappingWorkflowProps) {
  // SkySpark API integration
  const {
    points,
    loading: skysparkLoading,
    error: skysparkError,
    connectionStatus,
    testConnection,
    executeQuery
  } = useSkyspark();

  // Main workflow state
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    currentPhase: 'phase1',
    phase1Complete: false,
    phase2Complete: false,
    phase3Complete: false,
    proposedInstances: [],
    confirmedInstances: [],
    equipmentTypes: [],
    startTime: new Date(),
    phaseStartTimes: {
      phase1: new Date(),
      phase2: null,
      phase3: null,
      complete: null
    },
    totalPoints: 0,
    projectName
  });

  // Loading and error states
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Initialize workflow with SkySpark data
  const initializeWorkflow = useCallback(async () => {
    setIsInitializing(true);
    setInitializationError(null);

    try {
      // Test SkySpark connection first
      const connectionTest = await testConnection();
      if (!connectionTest) {
        throw new Error('Unable to connect to SkySpark server');
      }

      // Fetch raw points data from SkySpark
      const pointsData = await executeQuery('read(point and equipRef)');
      
      if (!pointsData) {
        throw new Error('Failed to fetch points data from SkySpark');
      }

      // Transform SkySpark data into proposed instances
      // This is where the intelligent grouping would happen
      const proposedInstances = await processRawPointsToInstances(pointsData);

      setWorkflowState(prev => ({
        ...prev,
        proposedInstances,
        totalPoints: proposedInstances.reduce((sum, inst) => sum + inst.rawPoints.length, 0)
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize workflow';
      setInitializationError(errorMessage);
      console.error('Workflow initialization failed:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [testConnection, executeQuery]);

  // Initialize on mount
  useEffect(() => {
    initializeWorkflow();
  }, [initializeWorkflow]);

  // Process raw SkySpark data into proposed instances
  const processRawPointsToInstances = async (rawPointsData: string): Promise<ProposedInstance[]> => {
    try {
      // Use the sophisticated SkySpark parser
      const proposedInstances = await processSkysarkData(rawPointsData);
      
      // If no instances found from real data, fall back to mock data for demo
      if (proposedInstances.length === 0) {
        console.warn('No equipment instances found in SkySpark data, using mock data for demo');
        return getMockInstances();
      }
      
      return proposedInstances;
    } catch (error) {
      console.warn('Error parsing SkySpark data, falling back to mock data:', error);
      return getMockInstances();
    }
  };

  // Mock data fallback for demo purposes
  const getMockInstances = (): ProposedInstance[] => [
    {
      id: 'vav-101',
      name: 'VAV-101',
      confidence: 0.95,
      confidenceLevel: 'high',
      rawPoints: [
        {
          id: 'vav101_zn_temp',
          bacnetDis: 'VAV-101 Zone Temperature',
          bacnetCur: '72.5°F',
          unit: '°F',
          kind: 'Number'
        },
        {
          id: 'vav101_dmpr_cmd',
          bacnetDis: 'VAV-101 Damper Command',
          bacnetCur: '45%',
          unit: '%',
          kind: 'Number'
        }
      ],
      derivedFrom: 'pattern',
      metadata: {
        commonIdentifier: 'VAV-101',
        sourceCount: 8,
        similarityScore: 0.95,
        patternUsed: 'VAV'
      }
    },
    {
      id: 'ahu-01',
      name: 'AHU-01',
      confidence: 0.88,
      confidenceLevel: 'high',
      rawPoints: [
        {
          id: 'ahu01_supply_temp',
          bacnetDis: 'AHU-01 Supply Air Temperature',
          bacnetCur: '55.2°F',
          unit: '°F',
          kind: 'Number'
        },
        {
          id: 'ahu01_fan_status',
          bacnetDis: 'AHU-01 Supply Fan Status',
          bacnetCur: 'On',
          kind: 'Bool'
        }
      ],
      derivedFrom: 'grouping',
      metadata: {
        commonIdentifier: 'AHU-01',
        sourceCount: 12,
        similarityScore: 0.88,
        patternUsed: 'AHU'
      }
    }
  ];

  // Phase transition handlers
  const handlePhase1Complete = (confirmedInstances: ConfirmedInstance[]) => {
    setWorkflowState(prev => ({
      ...prev,
      currentPhase: 'phase2',
      phase1Complete: true,
      confirmedInstances,
      phaseStartTimes: {
        ...prev.phaseStartTimes,
        phase2: new Date()
      }
    }));
  };

  const handlePhase2Complete = (equipmentTypes: EquipmentType[]) => {
    setWorkflowState(prev => ({
      ...prev,
      currentPhase: 'phase3',
      phase2Complete: true,
      equipmentTypes,
      phaseStartTimes: {
        ...prev.phaseStartTimes,
        phase3: new Date()
      }
    }));
  };

  const handlePhase3Complete = () => {
    const completionTime = new Date();
    const duration = completionTime.getTime() - workflowState.startTime.getTime();
    
    setWorkflowState(prev => ({
      ...prev,
      currentPhase: 'complete',
      phase3Complete: true,
      phaseStartTimes: {
        ...prev.phaseStartTimes,
        complete: completionTime
      }
    }));

    // Calculate total mappings
    const totalMappings = workflowState.equipmentTypes.reduce(
      (sum, type) => sum + type.instances.length, 0
    );

    // Call completion callback
    onComplete?.({
      confirmedInstances: workflowState.confirmedInstances,
      equipmentTypes: workflowState.equipmentTypes,
      totalMappings,
      duration
    });
  };

  // Navigation handlers
  const goToPhase = (phase: WorkflowPhase) => {
    // Only allow navigation to completed phases or next phase
    const phaseOrder: WorkflowPhase[] = ['phase1', 'phase2', 'phase3', 'complete'];
    const currentIndex = phaseOrder.indexOf(workflowState.currentPhase);
    const targetIndex = phaseOrder.indexOf(phase);

    if (targetIndex <= currentIndex + 1) {
      setWorkflowState(prev => ({
        ...prev,
        currentPhase: phase
      }));
    }
  };

  // Render phase indicator
  const renderPhaseIndicator = () => {
    const phases = [
      { id: 'phase1', name: 'Instance Validation', complete: workflowState.phase1Complete },
      { id: 'phase2', name: 'Type Definition', complete: workflowState.phase2Complete },
      { id: 'phase3', name: 'Point Mapping', complete: workflowState.phase3Complete }
    ];

    return (
      <div className="flex items-center justify-center space-x-8 mb-8">
        {phases.map((phase, index) => {
          const isCurrent = workflowState.currentPhase === phase.id;
          const isComplete = phase.complete;
          const isAccessible = index === 0 || phases[index - 1].complete;

          return (
            <div key={phase.id} className="flex items-center">
              <button
                onClick={() => goToPhase(phase.id as WorkflowPhase)}
                disabled={!isAccessible}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : isComplete
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                    : isAccessible
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isComplete
                    ? 'bg-green-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {isComplete ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span className="font-medium">{phase.name}</span>
              </button>
              
              {index < phases.length - 1 && (
                <ArrowRightIcon className="w-5 h-5 text-gray-400 mx-4" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render workflow statistics
  const renderWorkflowStats = () => {
    const stats = [
      {
        label: 'Total Points',
        value: workflowState.totalPoints,
        icon: ChartBarIcon,
        color: 'text-blue-600'
      },
      {
        label: 'Confirmed Instances',
        value: workflowState.confirmedInstances.length,
        icon: CheckCircleIcon,
        color: 'text-green-600'
      },
      {
        label: 'Equipment Types',
        value: workflowState.equipmentTypes.length,
        icon: CogIcon,
        color: 'text-purple-600'
      }
    ];

    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <ClockIcon className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Initializing Equipment Mapping Workflow
          </h2>
          <p className="text-gray-600 mb-4">
            Connecting to SkySpark and analyzing equipment data...
          </p>
          <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (initializationError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Initialization Failed
          </h2>
          <p className="text-gray-600 mb-4">{initializationError}</p>
          <button
            onClick={initializeWorkflow}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry Initialization
          </button>
        </div>
      </div>
    );
  }

  // Completion state
  if (workflowState.currentPhase === 'complete') {
    const duration = workflowState.phaseStartTimes.complete?.getTime()! - workflowState.startTime.getTime();
    const totalMappings = workflowState.equipmentTypes.reduce(
      (sum, type) => sum + type.instances.length, 0
    );

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center max-w-2xl">
          <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Equipment Mapping Complete!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Successfully processed {workflowState.totalPoints} points across{' '}
            {workflowState.confirmedInstances.length} equipment instances into{' '}
            {workflowState.equipmentTypes.length} equipment types.
          </p>
          
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Time</h3>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(duration / 1000 / 60)} minutes
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Mappings</h3>
              <p className="text-2xl font-bold text-green-600">{totalMappings}</p>
            </div>
          </div>

          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => goToPhase('phase1')}
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Review Results
            </button>
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Export Configuration
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main workflow interface
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Equipment Mapping Workflow
            {projectName && <span className="text-gray-600"> - {projectName}</span>}
          </h1>
          <p className="text-gray-600">
            Intelligent three-phase process for mapping BACnet points to standardized equipment types
          </p>
        </div>

        {/* Phase Indicator */}
        {renderPhaseIndicator()}

        {/* Workflow Statistics */}
        {renderWorkflowStats()}

        {/* Phase Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {workflowState.currentPhase === 'phase1' && (
            <InstanceValidator
              initialState={{
                proposedInstances: workflowState.proposedInstances,
                confirmedInstances: workflowState.confirmedInstances,
                selectedInstanceId: undefined,
                bulkSelections: new Set(),
                filterBy: 'all'
              }}
              onPhaseComplete={handlePhase1Complete}
            />
          )}

          {workflowState.currentPhase === 'phase2' && (
            <EquipmentTypeDefinition
              confirmedInstances={workflowState.confirmedInstances}
              onComplete={handlePhase2Complete}
            />
          )}

          {workflowState.currentPhase === 'phase3' && (
            <PointMappingMatrix
              equipmentTypes={workflowState.equipmentTypes}
              onComplete={handlePhase3Complete}
            />
          )}
        </div>
      </div>
    </div>
  );
} 