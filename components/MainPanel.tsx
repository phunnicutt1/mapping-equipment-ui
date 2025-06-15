'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useGroupingStore } from '../lib/store';
import { getEquipmentDisplayName, getEquipmentTypeBorderColor } from '../lib/utils';
import { ChevronDownIcon, ChevronRightIcon, CubeIcon, BeakerIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';
import PointPropertiesTags from './PointPropertiesTags';
import { EquipmentVisualization } from './EquipmentVisualization';
import { PointCard } from './PointCard';

export function MainPanel() {
  const { 
    points, 
    equipmentInstances, 
    equipmentTypes,
    templates,
    suggestedTemplates, // ML-generated templates
    confirmEquipment, 
    flagEquipment,
    confirmPoint,
    flagPoint,
    unassignPoint,
    confirmAllEquipmentPoints,
    toggleUnassignedDrawer,
    toggleConfirmedDrawer,
    createTemplate,
    assignPoints,
    checkCompletion,
    triggerCelebration
  } = useGroupingStore();

  const [expandedEquipmentTypes, setExpandedEquipmentTypes] = useState<Set<string>>(new Set());
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showClusterInfo, setShowClusterInfo] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'visualization'>('list');

  const toggleEquipmentType = (typeId: string) => {
    const newExpanded = new Set(expandedEquipmentTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedEquipmentTypes(newExpanded);
  };

  const toggleEquipment = (equipmentId: string) => {
    const newExpanded = new Set(expandedEquipment);
    if (newExpanded.has(equipmentId)) {
      newExpanded.delete(equipmentId);
    } else {
      newExpanded.add(equipmentId);
    }
    setExpandedEquipment(newExpanded);
  };

  const getPointsForEquipment = (equipmentId: string) => {
    return points.filter(point => point.equipRef === equipmentId);
  };

  const getEquipmentForType = (typeId: string) => {
    // Show only unconfirmed equipment in the main panel for user review
    // Confirmed equipment is shown in the confirmed drawer
    return equipmentInstances.filter(equipment => 
      equipment.typeId === typeId && equipment.status !== 'confirmed'
    );
  };

  const getConfirmedPointsForEquipment = (equipmentId: string) => {
    return points.filter(point => 
      point.equipRef === equipmentId && point.status === 'confirmed'
    );
  };

  const handleCreateTemplate = async (equipmentId: string, equipmentName: string) => {
    const confirmedPoints = getConfirmedPointsForEquipment(equipmentId);
    
    if (confirmedPoints.length === 0) {
      alert('Please confirm at least one point before creating a template.');
      return;
    }

    const templateName = prompt(`Enter template name for ${equipmentName}:`, `${equipmentName} Template`);
    if (!templateName) return;

    try {
      const result = await createTemplate(equipmentId, templateName);
      
      if (result.success && result.appliedCount !== undefined && result.appliedCount > 0) {
        alert(`Template created successfully!\n\nAutomatically applied to ${result.appliedCount} similar equipment instances.`);
      } else if (result.success) {
        alert('Template created successfully!\n\nNo similar equipment found to auto-apply.');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'suggested': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'needs-review': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 1.0) return 'text-green-700 bg-green-100 font-semibold border-green-300'; // Extra emphasis for 100%
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const formatConfidence = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    return confidence >= 1.0 ? `${percentage}% ✓` : `${percentage}%`;
  };

  const getClusterInfo = (equipment: any) => {
    if (!equipment.cluster) return null;
    
    return {
      id: equipment.cluster,
      size: equipmentInstances.filter(eq => eq.cluster === equipment.cluster).length,
      avgConfidence: equipmentInstances
        .filter(eq => eq.cluster === equipment.cluster)
        .reduce((sum, eq) => sum + eq.confidence, 0) / 
        equipmentInstances.filter(eq => eq.cluster === equipment.cluster).length
    };
  };

  const getMLTemplateInfo = (equipment: any) => {
    if (!equipment.templateId) return null;
    
    const template = suggestedTemplates.find(t => t.id === equipment.templateId);
    return template ? {
      name: template.name,
      confidence: template.confidence || 0,
      isMLGenerated: true
    } : null;
  };

  const getEquipmentLabel = (equipment: any) => {
    // Check if it's user created
    if (equipment.vendor === 'User Created' || equipment.status === 'user-created') {
      return 'User Created Manual Assignment';
    }
    
    // Use vendor and model if available
    if (equipment.vendor && equipment.model) {
      return `${equipment.vendor} ${equipment.model}`;
    }
    
    // Use just vendor if model not available
    if (equipment.vendor) {
      return equipment.vendor;
    }
    
    // Check points for vendor/model info (from connector data)
    const equipmentPoints = getPointsForEquipment(equipment.id);
    if (equipmentPoints.length > 0) {
      const firstPoint = equipmentPoints[0];
      if (firstPoint.vendor && firstPoint.model) {
        return `${firstPoint.vendor} ${firstPoint.model}`;
      }
      if (firstPoint.vendor) {
        return firstPoint.vendor;
      }
    }
    
    return null;
  };

  const unassignedCount = points.filter(p => !p.equipRef).length;
  const confirmedCount = equipmentInstances.filter(eq => eq.status === 'confirmed').length;

  // Group equipment instances by type (excluding confirmed equipment)
  const equipmentByType = (equipmentTypes || []).reduce((acc, type) => {
    const equipmentForType = getEquipmentForType(type.id);
    if (equipmentForType.length > 0) {
      acc[type.id] = {
        type,
        equipment: equipmentForType
      };
    }
    return acc;
  }, {} as Record<string, { type: any; equipment: any[] }>);

  // Detect when equipment panel becomes empty (perfect trigger for celebration!)
  const hasUnconfirmedEquipment = Object.keys(equipmentByType).length > 0;
  const totalEquipment = equipmentInstances.length;
  
  // Better celebration logic: trigger when all equipment are confirmed AND all points are assigned
  const allEquipmentConfirmed = equipmentInstances.length > 0 && equipmentInstances.every(eq => eq.status === 'confirmed');
  const allPointsAssigned = points.length > 0 && points.every(p => p.equipRef);
  const shouldCelebrate = allEquipmentConfirmed && allPointsAssigned;
  
  useEffect(() => {
    console.log('🔍 MainPanel Debug:', {
      totalEquipment,
      hasUnconfirmedEquipment,
      allEquipmentConfirmed,
      allPointsAssigned,
      shouldCelebrate,
      statusBreakdown: equipmentInstances.reduce((acc, eq) => {
        acc[eq.status] = (acc[eq.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      equipmentByTypeKeys: Object.keys(equipmentByType),
      equipmentTypes: equipmentTypes?.map(et => ({ id: et.id, name: et.name })),
      // CRITICAL: Check suggested equipment specifically
      suggestedEquipment: equipmentInstances.filter(eq => eq.status === 'suggested').map(eq => ({
        id: eq.id,
        name: eq.name,
        typeId: eq.typeId,
        status: eq.status
      })),
      // CRITICAL: Check if equipment types exist for suggested equipment
      suggestedEquipmentTypeCheck: equipmentInstances
        .filter(eq => eq.status === 'suggested')
        .map(eq => ({
          equipmentId: eq.id,
          typeId: eq.typeId,
          typeExists: equipmentTypes?.some(et => et.id === eq.typeId) || false,
          getEquipmentForTypeResult: getEquipmentForType(eq.typeId).length
        })),
      equipmentByTypeDetailed: Object.fromEntries(
        Object.entries(equipmentByType).map(([typeId, data]) => [
          typeId, 
          { 
            typeName: data.type.name, 
            equipmentCount: data.equipment.length,
            equipmentStatuses: data.equipment.map(eq => ({ id: eq.id, status: eq.status }))
          }
        ])
      ),
      // NEW: Additional debug info
      allEquipmentInstances: equipmentInstances.map(eq => ({
        id: eq.id,
        name: eq.name,
        typeId: eq.typeId,
        status: eq.status
      })),
      equipmentTypesAvailable: equipmentTypes?.map(et => et.id) || [],
      getEquipmentForTypeDebug: equipmentTypes?.map(et => ({
        typeId: et.id,
        equipmentCount: getEquipmentForType(et.id).length,
        equipmentList: getEquipmentForType(et.id).map(eq => ({ id: eq.id, status: eq.status }))
      })) || []
    });
    
    // Trigger completion check when all equipment are confirmed and all points are assigned
    if (shouldCelebrate) {
      console.log('🏆 All equipment confirmed and all points assigned! Calling checkCompletion...');
      
      // Slight delay to ensure state is stable, then check completion
      setTimeout(() => {
        checkCompletion();
      }, 100);
    }
  }, [shouldCelebrate, checkCompletion, equipmentInstances, equipmentTypes, points]);

  return (
    <div className="space-y-6">

      
      {/* Confirmed and Unassigned Points Buttons */}
      <div className="flex justify-between">
        <Button 
          onClick={toggleConfirmedDrawer}
          variant="outline"
          className="text-green-600 border-green-300 hover:bg-green-50"
        >
          Confirmed ({confirmedCount})
        </Button>
        
        <Button 
          onClick={toggleUnassignedDrawer}
          variant="outline"
        >
          Unassigned ({unassignedCount})
        </Button>
      </div>

      {/* Equipment List - Now Hierarchical */}
      <Card>
        <Card.Header className="bg-slate-600 text-white">
          <Card.Title className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-white">Equipment</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-700 rounded-md p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                    viewMode === 'list' ? 'bg-white text-slate-600' : 'text-white hover:bg-slate-600'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>List</span>
                </button>
                <button
                  onClick={() => setViewMode('visualization')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                    viewMode === 'visualization' ? 'bg-white text-slate-600' : 'text-white hover:bg-slate-600'
                  }`}
                >
                  <RectangleGroupIcon className="w-3 h-3" />
                  <span>Visual</span>
                </button>
              </div>
              {/* ML Pipeline Indicator */}
              <div className="flex items-center space-x-1 text-xs bg-purple-600 px-2 py-1 rounded">
                <BeakerIcon className="w-3 h-3" />
                <span>ML Clustered</span>
              </div>
              {/* Cluster Info Toggle */}
              {viewMode === 'list' && (
                <button
                  onClick={() => setShowClusterInfo(!showClusterInfo)}
                  className="flex items-center space-x-1 text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
                >
                  <CubeIcon className="w-3 h-3" />
                  <span>{showClusterInfo ? 'Hide' : 'Show'} Clusters</span>
                </button>
              )}
            </div>
          </Card.Title>
        </Card.Header>
        <Card.Content className="p-4">
          {viewMode === 'visualization' ? (
            /* Equipment Visualization View */
            <EquipmentVisualization
              equipment={equipmentInstances}
              points={points}
              onEquipmentClick={(equipment) => {
                console.log('Equipment clicked:', equipment);
                // Auto-expand this equipment in list view
                setExpandedEquipment(prev => new Set([...Array.from(prev), equipment.id]));
                // Switch to list view to show details
                setViewMode('list');
              }}
              onPointClick={(point) => {
                console.log('Point clicked:', point);
              }}
            />
          ) : (
            /* List View */
            <>
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search points by name, description, BACnet ID, or device location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

          {/* Equipment Types - Top Level */}
          <div className="space-y-3">
            
            {Object.entries(equipmentByType).map(([typeId, { type, equipment }]) => {
              const isTypeExpanded = expandedEquipmentTypes.has(typeId);
              const totalPoints = equipment.reduce((sum, eq) => sum + getPointsForEquipment(eq.id).length, 0);
              
              return (
                <div key={typeId} className="bg-blue-50 border border-blue-200 rounded-lg">
                  {/* Equipment Type Header */}
                  <div className="px-4 py-3">
                    <button
                      onClick={() => toggleEquipmentType(typeId)}
                      className="flex items-center justify-between w-full text-left hover:text-blue-700"
                    >
                      <div className="flex items-center space-x-3">
                        {isTypeExpanded ? (
                          <ChevronDownIcon className="h-5 w-5 text-blue-600" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-blue-600" />
                        )}
                        <div className="flex flex-col">
                          <span className="text-lg font-semibold text-blue-900">{type.name}</span>
                          <span className="text-sm text-blue-700">{type.description}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-600 text-white">
                          {equipment.length} units, {totalPoints} points
                        </Badge>
                      </div>
                    </button>
                  </div>

                  {/* Equipment Instances - Second Level */}
                  {isTypeExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {equipment.map(equipmentInstance => {
                        const equipmentPoints = getPointsForEquipment(equipmentInstance.id);
                        const isEquipmentExpanded = expandedEquipment.has(equipmentInstance.id);
                        const clusterInfo = getClusterInfo(equipmentInstance);
                        const mlTemplateInfo = getMLTemplateInfo(equipmentInstance);
                        
                        // Filter points based on search term
                        const filteredPoints = equipmentPoints.filter(point => 
                          !searchTerm || 
                          point.dis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          point.bacnetCur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          point.bacnetDeviceName?.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        const getStatusBadge = (status: string) => {
                          switch (status) {
                            case 'confirmed':
                              return <Badge className="bg-green-600 text-white hover:bg-green-700">Confirmed</Badge>;
                            case 'suggested':
                              return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">ML Suggested</Badge>;
                            case 'needs-review':
                              return <Badge className="bg-red-600 text-white hover:bg-red-700">Needs Review</Badge>;
                            default:
                              return <Badge className="bg-gray-500 text-white hover:bg-gray-600">Unknown</Badge>;
                          }
                        };
                        
                        // Get the border color for this equipment
                        const getBorderColor = () => {
                          if (equipmentInstance.templateId) {
                            const template = templates.find(t => t.id === equipmentInstance.templateId);
                            if (template?.color) {
                              return template.color.replace('bg-', 'border-l-');
                            }
                          }
                          
                          const equipmentType = equipmentTypes.find(t => t.id === equipmentInstance.typeId);
                          if (equipmentType?.color) {
                            return equipmentType.color.replace('bg-', 'border-l-');
                          }
                          
                          return 'border-l-gray-500';
                        };

                        const borderColorClass = getBorderColor();
                        
                        return (
                          <div key={equipmentInstance.id} className={`bg-gray-50 border border-gray-200 rounded-lg shadow-sm border-l-4 ${borderColorClass}`}>
                            {/* Equipment Instance Header */}
                            <div className="px-4 py-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                {/* Left side - Equipment info and expand button */}
                                <div className="flex-1">
                                  <button
                                    onClick={() => toggleEquipment(equipmentInstance.id)}
                                    className="flex items-center space-x-3 text-left hover:text-blue-600"
                                  >
                                    {isEquipmentExpanded ? (
                                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className="font-medium text-gray-900">{getEquipmentDisplayName(equipmentInstance.name)}</span>
                                    <Badge variant="secondary" className="bg-gray-600 text-white">
                                      {equipmentPoints.length} points
                                    </Badge>
                                    
                                    {/* Equipment Label - Manufacturer/Model inline with better spacing */}
                                    {getEquipmentLabel(equipmentInstance) && (
                                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded ml-18">
                                        {getEquipmentLabel(equipmentInstance)}
                                      </span>
                                    )}
                                    
                                    {/* Device Location - Show bacnetDeviceName inline */}
                                    {(() => {
                                      const deviceName = equipmentPoints.find(p => p.bacnetDeviceName)?.bacnetDeviceName;
                                      return deviceName && (
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 ml-2">
                                          📍 {deviceName}
                                        </span>
                                      );
                                    })()}
                                    
                                    {/* Cluster Information */}
                                    {showClusterInfo && clusterInfo && (
                                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-200 ml-2">
                                        <CubeIcon className="w-3 h-3 inline mr-1" />
                                        Cluster {clusterInfo.id} ({clusterInfo.size} items, {Math.round(clusterInfo.avgConfidence * 100)}% avg)
                                      </span>
                                    )}
                                    
                                    {/* ML Template Information */}
                                    {mlTemplateInfo && (
                                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 ml-2">
                                        <BeakerIcon className="w-3 h-3 inline mr-1" />
                                        ML Template: {mlTemplateInfo.name}
                                      </span>
                                    )}
                                  </button>
                                </div>

                                {/* Right side - Actions and status */}
                                <div className="flex flex-col items-end space-y-2">
                                  <div className="flex items-center space-x-3">
                                    {equipmentInstance.status !== 'confirmed' && (
                                      <>
                                        <Button
                                          size="sm"
                                          className="bg-blue-600 text-white hover:bg-blue-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            confirmAllEquipmentPoints(equipmentInstance.id);
                                          }}
                                        >
                                          Confirm All Points
                                        </Button>
                                        
                                        {getConfirmedPointsForEquipment(equipmentInstance.id).length > 0 && (
                                          <Button
                                            size="sm"
                                            className="bg-purple-600 text-white hover:bg-purple-700"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCreateTemplate(equipmentInstance.id, getEquipmentDisplayName(equipmentInstance.name));
                                            }}
                                          >
                                            Save as Template
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    {getStatusBadge(equipmentInstance.status)}
                                  </div>
                                  
                                  {/* Enhanced Confidence Badge */}
                                  <Badge 
                                    variant="outline" 
                                    className={`${getConfidenceColor(equipmentInstance.confidence)} border text-xs font-medium`}
                                  >
                                    {formatConfidence(equipmentInstance.confidence)} confidence
                                    {equipmentInstance.confidence >= 0.8 && <span className="ml-1">🎯</span>}
                                    {equipmentInstance.confidence < 0.6 && <span className="ml-1">⚠️</span>}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Equipment Points - Third Level */}
                            {isEquipmentExpanded && (
                              <div className="px-4 pb-4 space-y-4">
                                {(searchTerm ? filteredPoints : equipmentPoints).map((point, idx) => (
                                  <PointCard
                                    key={`${equipmentInstance.id}-${point.id}`}
                                    point={point}
                                    equipmentName={getEquipmentDisplayName(equipmentInstance.name)}
                                    equipmentType={equipmentInstance.equipTypeName}
                                    onConfirm={confirmPoint}
                                    onUnassign={unassignPoint}
                                    onFlag={flagPoint}
                                    showActions={true}
                                    compact={false}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}