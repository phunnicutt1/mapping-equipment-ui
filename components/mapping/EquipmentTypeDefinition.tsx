import React, { useReducer, useState } from 'react';
import { 
  TagIcon,
  FolderPlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { 
  CheckIcon, 
  XMarkIcon 
} from '@heroicons/react/24/solid';
import { 
  ConfirmedInstance, 
  EquipmentType, 
  EquipmentClass,
  ProposedType
} from '@/lib/mapping-types';

interface EquipmentTypeDefinitionProps {
  confirmedInstances: ConfirmedInstance[];
  onComplete: (equipmentTypes: EquipmentType[]) => void;
}

// Custom state for our component
interface ComponentState {
  confirmedInstances: ConfirmedInstance[];
  equipmentTypes: EquipmentType[];
  selectedInstances: Set<string>;
}

// Custom actions for our component
type ComponentAction =
  | { type: 'CREATE_TYPE'; name: string; classId: string; description: string; instanceIds: string[] }
  | { type: 'EDIT_TYPE'; typeId: string; name: string; description: string }
  | { type: 'DELETE_TYPE'; typeId: string }
  | { type: 'ADD_INSTANCES_TO_TYPE'; typeId: string; instanceIds: string[] }
  | { type: 'REMOVE_INSTANCE_FROM_TYPE'; typeId: string; instanceId: string }
  | { type: 'SELECT_INSTANCE'; instanceId: string }
  | { type: 'AUTO_GROUP_SIMILAR' };

// Component reducer for equipment type definition
function componentReducer(state: ComponentState, action: ComponentAction): ComponentState {
  switch (action.type) {
    case 'CREATE_TYPE':
      const selectedInstances = state.confirmedInstances.filter(inst => action.instanceIds.includes(inst.id));
      const newType: EquipmentType = {
        id: `type_${Date.now()}`,
        name: action.name,
        classId: action.classId,
        instances: selectedInstances,
        customMappings: {}
      };
      return {
        ...state,
        equipmentTypes: [...state.equipmentTypes, newType],
        selectedInstances: new Set()
      };

    case 'EDIT_TYPE':
      return {
        ...state,
        equipmentTypes: state.equipmentTypes.map(type =>
          type.id === action.typeId
            ? { ...type, name: action.name }
            : type
        )
      };

    case 'DELETE_TYPE':
      return {
        ...state,
        equipmentTypes: state.equipmentTypes.filter(type => type.id !== action.typeId)
      };

    case 'ADD_INSTANCES_TO_TYPE':
      const additionalInstances = state.confirmedInstances.filter(inst => action.instanceIds.includes(inst.id));
      return {
        ...state,
        equipmentTypes: state.equipmentTypes.map(type =>
          type.id === action.typeId
            ? { 
                ...type, 
                instances: [...type.instances, ...additionalInstances.filter(inst => 
                  !type.instances.some(existing => existing.id === inst.id)
                )]
              }
            : type
        ),
        selectedInstances: new Set()
      };

    case 'REMOVE_INSTANCE_FROM_TYPE':
      return {
        ...state,
        equipmentTypes: state.equipmentTypes.map(type =>
          type.id === action.typeId
            ? { 
                ...type, 
                instances: type.instances.filter(inst => inst.id !== action.instanceId)
              }
            : type
        )
      };

    case 'SELECT_INSTANCE':
      const newSelected = new Set(state.selectedInstances);
      if (newSelected.has(action.instanceId)) {
        newSelected.delete(action.instanceId);
      } else {
        newSelected.add(action.instanceId);
      }
      return { ...state, selectedInstances: newSelected };    case 'AUTO_GROUP_SIMILAR':
      const autoTypes = createAutoTypes(state.confirmedInstances, state.equipmentTypes);
      return {
        ...state,
        equipmentTypes: [...state.equipmentTypes, ...autoTypes]
      };

    default:
      return state;
  }
}



// Auto-group similar instances into types
function createAutoTypes(confirmedInstances: ConfirmedInstance[], existingTypes: EquipmentType[]): EquipmentType[] {
  const unassignedInstances = confirmedInstances.filter(instance => 
    !existingTypes.some(type => type.instances.some(inst => inst.id === instance.id))
  );

  // Simple auto-grouping: create a single type for unassigned instances
  if (unassignedInstances.length >= 2) {
    return [{
      id: `auto_type_${Date.now()}`,
      name: `Auto-grouped Equipment`,
      classId: 'generic',
      instances: unassignedInstances,
      customMappings: {}
    }];
  }
  
  return [];
}export function EquipmentTypeDefinition({ 
  confirmedInstances, 
  onComplete 
}: EquipmentTypeDefinitionProps) {
  const [state, dispatch] = useReducer<React.Reducer<ComponentState, ComponentAction>>(componentReducer, {
    confirmedInstances,
    equipmentTypes: [],
    selectedInstances: new Set<string>()
  });

  const [showNewTypeForm, setShowNewTypeForm] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Get unique equipment classes for category selection (simplified)
  const equipmentClasses = ['VAV', 'AHU', 'Terminal Unit', 'Fan Coil', 'Other'];
  
  // Get unassigned instances (not yet part of any type)
  const unassignedInstances = confirmedInstances.filter(instance => 
    !state.equipmentTypes.some((type: EquipmentType) => type.instances.some((inst: ConfirmedInstance) => inst.id === instance.id))
  );

  const handleCreateType = () => {
    if (!newTypeName.trim() || state.selectedInstances.size === 0) return;

    dispatch({
      type: 'CREATE_TYPE',
      name: newTypeName.trim(),
      classId: selectedCategory,
      description: newTypeDescription.trim(),
      instanceIds: Array.from(state.selectedInstances)
    });

    // Reset form
    setNewTypeName('');
    setNewTypeDescription('');
    setSelectedCategory('');
    setShowNewTypeForm(false);
  };

  const handleAutoGroup = () => {
    dispatch({ type: 'AUTO_GROUP_SIMILAR' });
  };

  const handleComplete = () => {
    onComplete(state.equipmentTypes);
  };  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Phase 2: Equipment Type Definition
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Group similar equipment instances into reusable types
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleAutoGroup}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
              Auto-Group Similar
            </button>
            <button
              onClick={() => setShowNewTypeForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <FolderPlusIcon className="h-4 w-4 mr-2" />
              Create Type
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-900">Total Instances</div>
            <div className="text-2xl font-bold text-blue-600">{confirmedInstances.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm font-medium text-green-900">Types Created</div>
            <div className="text-2xl font-bold text-green-600">{state.equipmentTypes.length}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-sm font-medium text-yellow-900">Unassigned</div>
            <div className="text-2xl font-bold text-yellow-600">{unassignedInstances.length}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-sm font-medium text-purple-900">Progress</div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(((confirmedInstances.length - unassignedInstances.length) / confirmedInstances.length) * 100)}%
            </div>
          </div>
        </div>
      </div>      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-3 gap-6 p-6">
          {/* Left Panel: Unassigned Instances */}
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900">
                Unassigned Instances ({unassignedInstances.length})
              </h3>
              <p className="text-sm text-gray-500">
                Select instances to group into types
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {unassignedInstances.map(instance => (
                <div
                  key={instance.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    state.selectedInstances.has(instance.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => dispatch({ type: 'SELECT_INSTANCE', instanceId: instance.id })}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{instance.name}</div>
                      <div className="text-sm text-gray-500">Equipment Instance</div>
                      <div className="text-xs text-gray-400">{instance.rawPoints.length} points</div>
                    </div>
                    {state.selectedInstances.has(instance.id) && (
                      <CheckIcon className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {state.selectedInstances.size > 0 && (
              <div className="border-t border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-2">
                  {state.selectedInstances.size} instance(s) selected
                </div>
                <button
                  onClick={() => setShowNewTypeForm(true)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Create Type from Selected
                </button>
              </div>
            )}
          </div>          {/* Middle Panel: Equipment Types */}
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900">
                Equipment Types ({state.equipmentTypes.length})
              </h3>
              <p className="text-sm text-gray-500">
                Defined equipment type templates
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {state.equipmentTypes.map((type: EquipmentType) => (
                <EquipmentTypeCard
                  key={type.id}
                  type={type}
                  instances={type.instances}
                  onEdit={(name, description) => dispatch({ 
                    type: 'EDIT_TYPE', 
                    typeId: type.id, 
                    name, 
                    description 
                  })}
                  onDelete={() => dispatch({ type: 'DELETE_TYPE', typeId: type.id })}
                  onRemoveInstance={(instanceId) => dispatch({ 
                    type: 'REMOVE_INSTANCE_FROM_TYPE', 
                    typeId: type.id, 
                    instanceId 
                  })}
                />
              ))}

              {state.equipmentTypes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <TagIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No equipment types created yet</p>
                  <p className="text-sm">Select instances and create types to get started</p>
                </div>
              )}
            </div>
          </div>          {/* Right Panel: Type Preview & Actions */}
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900">Actions</h3>
            </div>
            
            <div className="flex-1 p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Progress Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Instances Grouped:</span>
                    <span className="font-medium">
                      {confirmedInstances.length - unassignedInstances.length} / {confirmedInstances.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Types Created:</span>
                    <span className="font-medium">{state.equipmentTypes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equipment Classes:</span>
                    <span className="font-medium">{equipmentClasses.length}</span>
                  </div>
                </div>
              </div>

              {/* Equipment Type Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Type Summary</h4>
                <div className="space-y-2">
                  {state.equipmentTypes.map((type: EquipmentType) => (
                    <div key={type.id} className="flex justify-between text-sm">
                      <span className="truncate">{type.name}</span>
                      <span className="font-medium ml-2">
                        {type.instances.length} instances
                      </span>
                    </div>
                  ))}
                  {state.equipmentTypes.length === 0 && (
                    <div className="text-sm text-gray-500">No types created yet</div>
                  )}
                </div>
              </div>              {/* Completion Actions */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleComplete}
                  disabled={state.equipmentTypes.length === 0}
                  className={`w-full py-3 px-4 rounded-md font-medium flex items-center justify-center ${
                    state.equipmentTypes.length > 0
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ArrowRightIcon className="h-4 w-4 mr-2" />
                  Proceed to Point Mapping
                </button>
                
                {unassignedInstances.length > 0 && (
                  <p className="mt-2 text-xs text-amber-600 text-center">
                    {unassignedInstances.length} instances remain unassigned
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Type Form Modal */}
      {showNewTypeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Equipment Type</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type Name
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g., Standard VAV"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category...</option>
                  {equipmentClasses.map(className => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newTypeDescription}
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                  placeholder="Describe this equipment type..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                Will include {state.selectedInstances.size} selected instance(s)
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewTypeForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateType}
                disabled={!newTypeName.trim() || state.selectedInstances.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                Create Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}// Equipment Type Card Component
interface EquipmentTypeCardProps {
  type: EquipmentType;
  instances: ConfirmedInstance[];
  onEdit: (name: string, description: string) => void;
  onDelete: () => void;
  onRemoveInstance: (instanceId: string) => void;
}

function EquipmentTypeCard({ 
  type, 
  instances, 
  onEdit, 
  onDelete, 
  onRemoveInstance 
}: EquipmentTypeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(type.name);
  const [editDescription, setEditDescription] = useState('');

  const handleSave = () => {
    onEdit(editName, editDescription);
    setIsEditing(false);
  };

  const getTypeColor = () => {
    return 'text-blue-600 bg-blue-100';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="font-medium text-gray-900 border-b border-gray-300 focus:outline-none focus:border-blue-500 w-full"
            />
          ) : (
            <h4 className="font-medium text-gray-900">{type.name}</h4>
          )}
          <div className="text-sm text-gray-500">{type.classId}</div>
        </div>        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor()}`}>
            {type.instances.length} instances
          </span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-gray-400 hover:text-gray-600"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2 mb-3">
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Description..."
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            rows={2}
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-700">
          Instances ({instances.length}):
        </div>
        {instances.map(instance => (
          <div
            key={instance.id}
            className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1"
          >
            <span className="truncate">{instance.name}</span>
            <button
              onClick={() => onRemoveInstance(instance.id)}
              className="text-gray-400 hover:text-red-600 ml-1"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}