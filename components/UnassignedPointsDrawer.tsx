'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useGroupingStore } from '../lib/store';
import { XMarkIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

export function UnassignedPointsDrawer() {
  const { 
    points, 
    equipmentInstances,
    equipmentTypes,
    toggleUnassignedDrawer, 
    assignPoints,
    assignSinglePoint,
    createEquipment,
    selectedPoints,
    togglePointSelection,
    clearSelection
  } = useGroupingStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [showAssignDropdown, setShowAssignDropdown] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<string | null>(null);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentType, setNewEquipmentType] = useState('');

  const unassignedPoints = points.filter(p => !p.equipRef);
  const filteredPoints = unassignedPoints.filter(point => {
    const displayName = point.navName || point.bacnetDis || point.dis || '';
    const description = point.bacnetDesc || point.bacnetDis || point.dis || '';
    const properties = point.markers?.join(' ') || '';
    const vendor = point.vendor || '';
    const model = point.model || '';
    const source = point.source || '';
    const searchLower = searchTerm.toLowerCase();
    
    return displayName.toLowerCase().includes(searchLower) ||
           description.toLowerCase().includes(searchLower) ||
           point.bacnetCur.toLowerCase().includes(searchLower) ||
           properties.toLowerCase().includes(searchLower) ||
           vendor.toLowerCase().includes(searchLower) ||
           model.toLowerCase().includes(searchLower) ||
           source.toLowerCase().includes(searchLower) ||
           (point.unit && point.unit.toLowerCase().includes(searchLower));
  });

  const handleAssignSelected = () => {
    if (selectedEquipment && selectedPoints.size > 0) {
      assignPoints(Array.from(selectedPoints), selectedEquipment);
      clearSelection();
      setSelectedEquipment('');
    }
  };

  const handleAssignSingle = (pointId: string, equipmentId: string) => {
    assignSinglePoint(pointId, equipmentId);
    setShowAssignDropdown(null);
  };

  const handleCreateAndAssign = (pointId: string) => {
    if (newEquipmentName.trim() && newEquipmentType) {
      // Create the equipment first
      createEquipment(newEquipmentName.trim(), newEquipmentType);
      
      // Find the newly created equipment (it should be the last one created)
      // For now, we'll use a timeout to allow the store to update
      setTimeout(() => {
        const updatedInstances = useGroupingStore.getState().equipmentInstances;
        const newEquipment = updatedInstances.find(eq => 
          eq.name === newEquipmentName.trim() && eq.typeId === newEquipmentType
        );
        
        if (newEquipment) {
          assignSinglePoint(pointId, newEquipment.id);
        }
      }, 50);
      
      // Reset form
      setNewEquipmentName('');
      setNewEquipmentType('');
      setShowCreateForm(null);
      setShowAssignDropdown(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAssignDropdown && !(event.target as Element).closest('.assign-dropdown')) {
        setShowAssignDropdown(null);
        setShowCreateForm(null);
        setNewEquipmentName('');
        setNewEquipmentType('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignDropdown]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={toggleUnassignedDrawer}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Unassigned Points</h2>
              <p className="text-sm text-gray-500">
                {unassignedPoints.length} points need assignment • Complete point details for informed assignment
              </p>
            </div>
            <button
              onClick={toggleUnassignedDrawer}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Search and Actions */}
          <div className="p-6 border-b border-gray-200">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search points by name, description, or BACnet ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filters and Bulk Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button variant="outline" size="sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>

                {selectedPoints.size > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {selectedPoints.size} selected
                    </span>
                    <select
                      value={selectedEquipment}
                      onChange={(e) => setSelectedEquipment(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select equipment...</option>
                      {equipmentInstances.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={handleAssignSelected}
                      disabled={!selectedEquipment}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Assign Selected
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Points List */}
          <div className="flex-1 overflow-y-auto">
            {filteredPoints.length > 0 ? (
              <div className="space-y-2 p-4">
                {filteredPoints.map(point => (
                  <div
                    key={point.id}
                    className={`border rounded-lg p-5 hover:bg-gray-50 ${
                      selectedPoints.has(point.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Checkbox and Point Info */}
                      <div className="flex items-center space-x-4 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedPoints.has(point.id)}
                          onChange={() => togglePointSelection(point.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        
                        <div className="flex-1 min-w-0">
                          {/* Point Header */}
                          <div className="flex items-center space-x-3 mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {(() => {
                                // Debug: Log ALL unassigned point data to understand the structure
                                console.log('Unassigned Point Debug:', {
                                  id: point.id,
                                  navName: point.navName,
                                  bacnetDis: point.bacnetDis,
                                  dis: point.dis,
                                  bacnetCur: point.bacnetCur,
                                  kind: point.kind,
                                  equipRef: point.equipRef,
                                  status: point.status,
                                  allFields: Object.keys(point),
                                  fullPoint: point
                                });
                                
                                // Priority-based display name selection with safety checks
                                const navName = point.navName && typeof point.navName === 'string' ? point.navName : null;
                                const bacnetDis = point.bacnetDis && typeof point.bacnetDis === 'string' ? point.bacnetDis : null;
                                const dis = point.dis && typeof point.dis === 'string' ? point.dis : null;
                                const bacnetCur = point.bacnetCur && typeof point.bacnetCur === 'string' ? point.bacnetCur : null;
                                
                                const displayName = navName || bacnetDis || dis || bacnetCur;
                                
                                // Safety check: never show the kind (data type) as display name
                                if (displayName && displayName.toLowerCase() !== point.kind?.toLowerCase()) {
                                  return displayName;
                                }
                                
                                return `Unassigned Point ${point.id}`;
                              })()}
                            </h4>
                            <Badge 
                              variant="outline" 
                              size="sm"
                              className={
                                point.kind === 'Number' ? 'text-blue-600 border-blue-300 bg-blue-50' :
                                point.kind === 'Bool' ? 'text-green-600 border-green-300 bg-green-50' :
                                'text-gray-600 border-gray-300 bg-gray-50'
                              }
                            >
                              {point.kind}
                            </Badge>
                          </div>
                          
                          {/* Comprehensive Point Details Grid */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <dt className="font-medium text-gray-500">BACnet ID</dt>
                              <dd className="text-gray-900">{point.bacnetCur}</dd>
                            </div>
                            
                            <div>
                              <dt className="font-medium text-gray-500">Description</dt>
                              <dd className="text-gray-900 truncate">
                                {(() => {
                                  // Create a dynamic description from available data
                                  const bacnetDesc = point.bacnetDesc && typeof point.bacnetDesc === 'string' ? point.bacnetDesc : null;
                                  const bacnetDis = point.bacnetDis && typeof point.bacnetDis === 'string' ? point.bacnetDis : null;
                                  const navName = point.navName && typeof point.navName === 'string' ? point.navName : null;
                                  const unit = point.unit && typeof point.unit === 'string' ? point.unit : null;
                                  const vendor = point.vendor && typeof point.vendor === 'string' ? point.vendor : null;
                                  const model = point.model && typeof point.model === 'string' ? point.model : null;
                                  
                                  // Priority 1: Use bacnetDesc if it's meaningful (not just "Point X")
                                  if (bacnetDesc && !bacnetDesc.match(/^Point \d+$/i)) {
                                    return bacnetDesc;
                                  }
                                  
                                  // Priority 2: Use bacnetDis if it's meaningful
                                  if (bacnetDis && !bacnetDis.match(/^Point \d+$/i)) {
                                    return bacnetDis;
                                  }
                                  
                                  // Priority 3: Create description from navName and additional context
                                  if (navName && !navName.match(/^Point \d+$/i) && navName.toLowerCase() !== point.kind?.toLowerCase()) {
                                    let description = navName;
                                    if (unit && unit !== 'New_York') { // Filter out timezone units
                                      description += ` (${unit})`;
                                    }
                                    if (vendor && vendor !== 'Unknown') {
                                      description += ` - ${vendor}`;
                                      if (model) {
                                        description += ` ${model}`;
                                      }
                                    }
                                    return description;
                                  }
                                  
                                  // Priority 4: Fallback description using BACnet ID and type
                                  let fallback = `${point.kind || 'Point'} ${point.bacnetCur}`;
                                  if (unit && unit !== 'New_York') {
                                    fallback += ` (${unit})`;
                                  }
                                  if (vendor && vendor !== 'Unknown') {
                                    fallback += ` - ${vendor}`;
                                  }
                                  return fallback;
                                })()}
                              </dd>
                            </div>
                            
                            <div>
                              <dt className="font-medium text-gray-500">Unit</dt>
                              <dd className="text-gray-900">{point.unit || 'No unit'}</dd>
                            </div>
                            
                            <div>
                              <dt className="font-medium text-gray-500">Properties</dt>
                              <dd className="text-gray-900 truncate">
                                {point.markers?.length ? point.markers.join(', ') : 'Point'}
                              </dd>
                            </div>
                            
                            <div>
                              <dt className="font-medium text-gray-500">Source</dt>
                              <dd className="text-gray-900 truncate">
                                {point.source || 'read(point)'}
                              </dd>
                            </div>
                            
                            <div>
                              <dt className="font-medium text-gray-500">Display Name</dt>
                              <dd className="text-gray-900 truncate">
                                {(() => {
                                  const navName = point.navName && typeof point.navName === 'string' ? point.navName : null;
                                  const bacnetDis = point.bacnetDis && typeof point.bacnetDis === 'string' ? point.bacnetDis : null;
                                  const dis = point.dis && typeof point.dis === 'string' ? point.dis : null;
                                  const bacnetCur = point.bacnetCur && typeof point.bacnetCur === 'string' ? point.bacnetCur : null;
                                  
                                  const displayName = navName || bacnetDis || dis || bacnetCur;
                                  
                                  // Safety check: never show the kind (data type) as display name
                                  if (displayName && displayName.toLowerCase() !== point.kind?.toLowerCase()) {
                                    return displayName;
                                  }
                                  
                                  return 'No display name available';
                                })()}
                              </dd>
                            </div>
                            
                            {/* Show Vendor and Model when available */}
                            {point.vendor && (
                              <div>
                                <dt className="font-medium text-gray-500">Vendor</dt>
                                <dd className="text-gray-900">{point.vendor}</dd>
                              </div>
                            )}
                            
                            {point.model && (
                              <div>
                                <dt className="font-medium text-gray-500">Model</dt>
                                <dd className="text-gray-900">{point.model}</dd>
                              </div>
                            )}
                            
                            {/* Additional rich SkySpark data when available */}
                            {point.bacnetDesc && point.bacnetDesc !== point.dis && (
                              <div>
                                <dt className="font-medium text-gray-500">BACnet Desc</dt>
                                <dd className="text-gray-900 truncate">{point.bacnetDesc}</dd>
                              </div>
                            )}
                            
                            {/* Show current value/status if available from SkySpark */}
                            {(point as any).curVal !== undefined && (
                              <div>
                                <dt className="font-medium text-gray-500">Current Value</dt>
                                <dd className="text-gray-900">
                                  {(point as any).curVal} {point.unit && `${point.unit}`}
                                </dd>
                              </div>
                            )}
                            
                            {(point as any).curStatus && (
                              <div>
                                <dt className="font-medium text-gray-500">Status</dt>
                                <dd className={`text-sm font-medium ${
                                  (point as any).curStatus === 'ok' ? 'text-green-600' :
                                  (point as any).curStatus === 'fault' ? 'text-red-600' :
                                  'text-yellow-600'
                                }`}>
                                  {(point as any).curStatus}
                                </dd>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Assign Button */}
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAssignDropdown(
                            showAssignDropdown === point.id ? null : point.id
                          )}
                          className="text-green-600 border-green-300 hover:bg-green-50"
                        >
                          Assign
                        </Button>
                        
                        {showAssignDropdown === point.id && (
                          <div className="assign-dropdown absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="p-3">
                              <div className="text-sm font-medium text-gray-900 mb-2">
                                Assign to Equipment:
                              </div>
                              
                              {/* Existing Equipment Options */}
                              <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
                                {equipmentInstances.map(eq => (
                                  <button
                                    key={eq.id}
                                    onClick={() => handleAssignSingle(point.id, eq.id)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                                  >
                                    <div className="font-medium">{eq.name}</div>
                                    <div className="text-gray-500 text-xs">{eq.typeId}</div>
                                  </button>
                                ))}
                              </div>

                              {/* Divider */}
                              <div className="border-t border-gray-200 my-3"></div>

                              {/* Create New Equipment */}
                              {showCreateForm === point.id ? (
                                <div className="space-y-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    Create New Equipment:
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Equipment name..."
                                    value={newEquipmentName}
                                    onChange={(e) => setNewEquipmentName(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <select
                                    value={newEquipmentType}
                                    onChange={(e) => setNewEquipmentType(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Select equipment type...</option>
                                    {equipmentTypes.map(type => (
                                      <option key={type.id} value={type.id}>
                                        {type.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleCreateAndAssign(point.id)}
                                      disabled={!newEquipmentName.trim() || !newEquipmentType}
                                      className="flex-1 bg-green-600 text-white hover:bg-green-700"
                                    >
                                      Create & Assign
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setShowCreateForm(null);
                                        setNewEquipmentName('');
                                        setNewEquipmentType('');
                                      }}
                                      className="flex-1"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowCreateForm(point.id)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded border-2 border-dashed border-blue-300 text-blue-600"
                                >
                                  <div className="font-medium">+ Create New Equipment</div>
                                  <div className="text-xs text-blue-500">Add a new equipment instance</div>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchTerm ? 'No points match your search' : 'No unassigned points'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {filteredPoints.length} of {unassignedPoints.length} unassigned points
              </span>
              <Button variant="outline" onClick={toggleUnassignedDrawer}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}