import React, { useReducer, useMemo } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  PencilIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { 
  ProposedInstance, 
  RawPoint, 
  Phase1State, 
  Phase1Action 
} from '@/lib/mapping-types';

interface InstanceValidatorProps {
  initialState: Phase1State;
  onPhaseComplete: (confirmedInstances: any[]) => void;
}

// Reducer for Phase 1 state management
function phase1Reducer(state: Phase1State, action: Phase1Action): Phase1State {
  switch (action.type) {
    case 'SELECT_INSTANCE':
      return { ...state, selectedInstanceId: action.instanceId };
    
    case 'CONFIRM_INSTANCE': {
      const instance = state.proposedInstances.find(i => i.id === action.instanceId);
      if (!instance) return state;
      
      const confirmedInstance = {
        id: instance.id,
        name: instance.name,
        rawPoints: instance.rawPoints
      };
      
      return {
        ...state,
        confirmedInstances: [...state.confirmedInstances, confirmedInstance],
        proposedInstances: state.proposedInstances.filter(i => i.id !== action.instanceId),
        selectedInstanceId: undefined
      };
    }
    
    case 'BULK_CONFIRM': {
      const instancesToConfirm = state.proposedInstances.filter(
        i => action.instanceIds.includes(i.id)
      );
      
      const newConfirmed = instancesToConfirm.map(instance => ({
        id: instance.id,
        name: instance.name,
        rawPoints: instance.rawPoints
      }));
      
      return {
        ...state,
        confirmedInstances: [...state.confirmedInstances, ...newConfirmed],
        proposedInstances: state.proposedInstances.filter(
          i => !action.instanceIds.includes(i.id)
        ),
        bulkSelections: new Set(),
        selectedInstanceId: undefined
      };
    }
    
    case 'TOGGLE_BULK_SELECTION': {
      const newSelections = new Set(state.bulkSelections);
      if (newSelections.has(action.instanceId)) {
        newSelections.delete(action.instanceId);
      } else {
        newSelections.add(action.instanceId);
      }
      return { ...state, bulkSelections: newSelections };
    }
    
    case 'SET_FILTER':
      return { ...state, filterBy: action.filter };
      
    default:
      return state;
  }
}

export function InstanceValidator({ initialState, onPhaseComplete }: InstanceValidatorProps) {
  const [state, dispatch] = useReducer(phase1Reducer, initialState);

  // Filtered instances based on confidence level
  const filteredInstances = useMemo(() => {
    if (state.filterBy === 'all') return state.proposedInstances;
    return state.proposedInstances.filter(
      instance => instance.confidenceLevel === state.filterBy
    );
  }, [state.proposedInstances, state.filterBy]);

  // Confidence level groups for display
  const confidenceGroups = useMemo(() => {
    const groups = {
      high: state.proposedInstances.filter(i => i.confidenceLevel === 'high'),
      medium: state.proposedInstances.filter(i => i.confidenceLevel === 'medium'),
      low: state.proposedInstances.filter(i => i.confidenceLevel === 'low')
    };
    return groups;
  }, [state.proposedInstances]);

  const selectedInstance = state.proposedInstances.find(
    i => i.id === state.selectedInstanceId
  );

  const handleBulkConfirm = (level: 'high' | 'medium' | 'low') => {
    const instanceIds = confidenceGroups[level].map(i => i.id);
    dispatch({ type: 'BULK_CONFIRM', instanceIds });
  };

  const handlePhaseComplete = () => {
    onPhaseComplete(state.confirmedInstances);
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-700 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case 'high': return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'medium': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      case 'low': return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default: return <ExclamationTriangleIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Phase 1: Equipment Instance Validation
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and confirm automatically detected equipment instances
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {state.confirmedInstances.length} confirmed, {state.proposedInstances.length} remaining
            </span>
            <button
              onClick={handlePhaseComplete}
              disabled={state.proposedInstances.length > 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Continue to Phase 2
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Instance List */}
        <div className="w-1/2 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Confidence
                </label>
                <select
                  value={state.filterBy}
                  onChange={(e) => dispatch({ 
                    type: 'SET_FILTER', 
                    filter: e.target.value as any 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Instances</option>
                  <option value="high">High Confidence</option>
                  <option value="medium">Medium Confidence</option>
                  <option value="low">Low Confidence</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* High Confidence Group */}
            {confidenceGroups.high.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <h3 className="font-medium text-gray-900">
                      High Confidence ({confidenceGroups.high.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => handleBulkConfirm('high')}
                    className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full hover:bg-green-200"
                  >
                    Confirm All
                  </button>
                </div>
                <div className="space-y-2">
                  {confidenceGroups.high.map((instance) => (
                    <InstanceCard
                      key={instance.id}
                      instance={instance}
                      isSelected={state.selectedInstanceId === instance.id}
                      isInBulkSelection={state.bulkSelections.has(instance.id)}
                      onSelect={() => dispatch({ type: 'SELECT_INSTANCE', instanceId: instance.id })}
                      onConfirm={() => dispatch({ type: 'CONFIRM_INSTANCE', instanceId: instance.id })}
                      onToggleBulkSelection={() => dispatch({ 
                        type: 'TOGGLE_BULK_SELECTION', 
                        instanceId: instance.id 
                      })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Medium Confidence Group */}
            {confidenceGroups.medium.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-medium text-gray-900">
                      Medium Confidence ({confidenceGroups.medium.length})
                    </h3>
                  </div>
                </div>
                <div className="space-y-2">
                  {confidenceGroups.medium.map((instance) => (
                    <InstanceCard
                      key={instance.id}
                      instance={instance}
                      isSelected={state.selectedInstanceId === instance.id}
                      isInBulkSelection={state.bulkSelections.has(instance.id)}
                      onSelect={() => dispatch({ type: 'SELECT_INSTANCE', instanceId: instance.id })}
                      onConfirm={() => dispatch({ type: 'CONFIRM_INSTANCE', instanceId: instance.id })}
                      onToggleBulkSelection={() => dispatch({ 
                        type: 'TOGGLE_BULK_SELECTION', 
                        instanceId: instance.id 
                      })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Low Confidence Group */}
            {confidenceGroups.low.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    <h3 className="font-medium text-gray-900">
                      Needs Review ({confidenceGroups.low.length})
                    </h3>
                  </div>
                </div>
                <div className="space-y-2">
                  {confidenceGroups.low.map((instance) => (
                    <InstanceCard
                      key={instance.id}
                      instance={instance}
                      isSelected={state.selectedInstanceId === instance.id}
                      isInBulkSelection={state.bulkSelections.has(instance.id)}
                      onSelect={() => dispatch({ type: 'SELECT_INSTANCE', instanceId: instance.id })}
                      onConfirm={() => dispatch({ type: 'CONFIRM_INSTANCE', instanceId: instance.id })}
                      onToggleBulkSelection={() => dispatch({ 
                        type: 'TOGGLE_BULK_SELECTION', 
                        instanceId: instance.id 
                      })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Point Details */}
        <div className="w-1/2 bg-gray-50 flex flex-col">
          {selectedInstance ? (
            <PointDetailsPanel instance={selectedInstance} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select an Instance
                </h3>
                <p className="text-gray-600">
                  Choose an equipment instance from the left panel to view its points
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Instance Card Component
interface InstanceCardProps {
  instance: ProposedInstance;
  isSelected: boolean;
  isInBulkSelection: boolean;
  onSelect: () => void;
  onConfirm: () => void;
  onToggleBulkSelection: () => void;
}

function InstanceCard({ 
  instance, 
  isSelected, 
  isInBulkSelection,
  onSelect, 
  onConfirm, 
  onToggleBulkSelection 
}: InstanceCardProps) {
  const confidenceColor = instance.confidenceLevel === 'high' ? 'border-green-200 bg-green-50' :
                         instance.confidenceLevel === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                         'border-red-200 bg-red-50';

  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500 ' + confidenceColor : 
        'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={isInBulkSelection}
            onChange={onToggleBulkSelection}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300"
          />
          <div>
            <h4 className="font-medium text-gray-900">{instance.name}</h4>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{instance.rawPoints.length} points</span>
              <span>•</span>
              <span>{Math.round(instance.confidence * 100)}% confidence</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            className="p-1 text-green-600 hover:bg-green-100 rounded"
          >
            <CheckIcon className="w-4 h-4" />
          </button>
          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}

// Point Details Panel Component
interface PointDetailsPanelProps {
  instance: ProposedInstance;
}

function PointDetailsPanel({ instance }: PointDetailsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {instance.name}
            </h2>
            <p className="text-sm text-gray-600">
              {instance.rawPoints.length} points • {Math.round(instance.confidence * 100)}% confidence
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-sm font-medium text-gray-700">Display Name</th>
                <th className="text-left py-2 text-sm font-medium text-gray-700">Current Name</th>
                <th className="text-left py-2 text-sm font-medium text-gray-700">Unit</th>
                <th className="text-left py-2 text-sm font-medium text-gray-700">Kind</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {instance.rawPoints.map((point) => (
                <tr key={point.id} className="hover:bg-gray-50">
                  <td className="py-2 text-sm text-gray-900 font-mono">
                    {point.bacnetDis}
                  </td>
                  <td className="py-2 text-sm text-gray-600 font-mono">
                    {point.bacnetCur}
                  </td>
                  <td className="py-2 text-sm text-gray-600">
                    {point.unit || '—'}
                  </td>
                  <td className="py-2 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      point.kind === 'Number' ? 'bg-blue-100 text-blue-700' :
                      point.kind === 'Bool' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {point.kind}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 