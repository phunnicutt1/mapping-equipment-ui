'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useGroupingStore } from '../lib/store';
import { getEquipmentDisplayName } from '../lib/utils';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import PointPropertiesTags from './PointPropertiesTags';

export function MainPanel() {
  const { 
    points, 
    equipmentInstances, 
    equipmentTypes, 
    confirmEquipment, 
    flagEquipment,
    confirmPoint,
    flagPoint,
    confirmAllEquipmentPoints,
    toggleUnassignedDrawer,
    assignPoints
  } = useGroupingStore();

  const [expandedEquipmentTypes, setExpandedEquipmentTypes] = useState<Set<string>>(new Set());
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

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
    return equipmentInstances.filter(equipment => equipment.typeId === typeId);
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
    if (confidence >= 1.0) return 'text-green-700 bg-green-100 font-semibold'; // Extra emphasis for 100%
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatConfidence = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    return confidence >= 1.0 ? `${percentage}% ✓` : `${percentage}%`;
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

  // Group equipment instances by type
  const equipmentByType = equipmentTypes.reduce((acc, type) => {
    const equipmentForType = getEquipmentForType(type.id);
    if (equipmentForType.length > 0) {
      acc[type.id] = {
        type,
        equipment: equipmentForType
      };
    }
    return acc;
  }, {} as Record<string, { type: any; equipment: any[] }>);

  return (
    <div className="space-y-6">
      {/* Unassigned Points Button */}
      <div className="flex justify-end">
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
          <Card.Title className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-white">Equipment</span>
          </Card.Title>
        </Card.Header>
        <Card.Content className="p-4">
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
                              return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Pending</Badge>;
                            case 'needs-review':
                              return <Badge className="bg-red-600 text-white hover:bg-red-700">Needs Review</Badge>;
                            default:
                              return <Badge className="bg-gray-500 text-white hover:bg-gray-600">Unknown</Badge>;
                          }
                        };
                        
                        return (
                          <div key={equipmentInstance.id} className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
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
                                    <Badge 
                                      variant="outline" 
                                      className={`${getConfidenceColor(equipmentInstance.confidence)} border-0 text-xs font-medium`}
                                    >
                                      {formatConfidence(equipmentInstance.confidence)} confidence
                                    </Badge>
                                  </button>
                                  
                                  {/* Equipment Label - Manufacturer/Model or User Created */}
                                  {getEquipmentLabel(equipmentInstance) && (
                                    <div className="mt-1 ml-7">
                                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                        {getEquipmentLabel(equipmentInstance)}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Device Location - Show bacnetDeviceName if available */}
                                  {(() => {
                                    const deviceName = equipmentPoints.find(p => p.bacnetDeviceName)?.bacnetDeviceName;
                                    return deviceName && (
                                      <div className="mt-1 ml-7">
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                          📍 {deviceName}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Right side - Actions and status */}
                                <div className="flex items-center space-x-3">
                                  {equipmentInstance.status !== 'confirmed' && (
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
                                  )}
                                  {getStatusBadge(equipmentInstance.status)}
                                </div>
                              </div>
                            </div>

                            {/* Equipment Points - Third Level */}
                            {isEquipmentExpanded && (
                              <div className="px-4 pb-4 space-y-4">
                                {(searchTerm ? filteredPoints : equipmentPoints).map((point, idx) => {
                                  // Dynamic strategies for fields
                                  const getDescription = (point: any) => {
                                    return point.bacnetDesc || point.bacnetDis || point.dis || point.bacnetCur;
                                  };
                                  
                                  const getDisplayName = (point: any) => {
                                    return point.navName || point.bacnetDis || point.bacnetCur;
                                  };
                                  
                                  const getProperties = (point: any) => {
                                    const markers = point.markers || [];
                                    return markers.length > 0 ? markers.join(', ') : 'Point';
                                  };
                                  
                                  const getSource = (point: any) => {
                                    return point.source || 'read(point)';
                                  };

                                  return (
                                    <div key={point.id} className="bg-white border rounded-lg p-6 relative">
                                      {/* Point Header */}
                                      <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                          <h3 className="text-xl font-bold mb-1 font-detail" style={{ color: '#2c3e50' }}>
                                            {getDisplayName(point)}
                                          </h3>
                                          <div className="flex items-center space-x-2">
                                                                                         {equipmentInstance.equipTypeName && (
                                               <span className="text-base text-gray-600 font-medium">
                                                 {equipmentInstance.equipTypeName} → {getEquipmentDisplayName(equipmentInstance.name)}
                                               </span>
                                             )}
                                          </div>
                                        </div>
                                        {point.status === 'confirmed' ? (
                                          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded">
                                            Confirmed
                                          </span>
                                        ) : point.status === 'flagged' ? (
                                          <span className="text-sm text-white bg-orange-500 px-3 py-2 rounded">
                                            Flagged
                                          </span>
                                        ) : (
                                          <div className="flex space-x-2">
                                            <Button
                                              size="sm"
                                              className="bg-green-600 text-white hover:bg-green-700"
                                              onClick={() => confirmPoint(point.id)}
                                            >
                                              Confirm Equipment
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="bg-orange-500 text-white hover:bg-orange-600"
                                              onClick={() => flagPoint(point.id)}
                                            >
                                              Flag for Review
                                            </Button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Point Details Grid */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-detail">
                                        <div>
                                          <dt className="text-xs font-medium mb-0.5" style={{ color: '#7f8c8d' }}>BACnet ID</dt>
                                          <dd className="font-medium" style={{ color: '#2c3e50' }}>{point.bacnetCur}</dd>
                                        </div>
                                        
                                        <div>
                                          <dt className="text-xs font-medium mb-0.5" style={{ color: '#7f8c8d' }}>Description</dt>
                                          <dd className="font-medium" style={{ color: '#2c3e50' }}>{getDescription(point)}</dd>
                                        </div>
                                        
                                        <div>
                                          <dt className="text-xs font-medium mb-0.5" style={{ color: '#7f8c8d' }}>Device Location</dt>
                                          <dd className="font-medium text-blue-600">
                                            {point.bacnetDeviceName ? `📍 ${point.bacnetDeviceName}` : '-'}
                                          </dd>
                                        </div>
                                        
                                        <div>
                                          <dt className="text-xs font-medium mb-0.5" style={{ color: '#7f8c8d' }}>Unit</dt>
                                          <dd className="font-medium" style={{ color: '#2c3e50' }}>{point.unit || '-'}</dd>
                                        </div>
                                        
                                        <div></div>
                                        
                                        {/* Show Vendor and Model when available (typically from bacnetConn) */}
                                        {point.vendor && (
                                          <div>
                                            <dt className="text-xs font-medium mb-0.5" style={{ color: '#7f8c8d' }}>Vendor</dt>
                                            <dd className="font-medium" style={{ color: '#2c3e50' }}>{point.vendor}</dd>
                                          </div>
                                        )}
                                        
                                        {point.model && (
                                          <div>
                                            <dt className="text-xs font-medium mb-0.5" style={{ color: '#7f8c8d' }}>Model</dt>
                                            <dd className="font-medium" style={{ color: '#2c3e50' }}>{point.model}</dd>
                                          </div>
                                        )}
                                        

                                      </div>

                                      {/* Bottom Line - Properties on left, Source File and Data Type on right */}
                                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                                        {/* Properties - Left Side */}
                                        <div>
                                          <div className="text-xs font-medium mb-1" style={{ color: '#7f8c8d' }}>Properties</div>
                                          <PointPropertiesTags point={point} />
                                        </div>

                                        {/* Source File and Data Type - Right Side */}
                                        <div className="flex items-end space-x-3">
                                          <div className="text-right">
                                            <span className="text-xs font-medium" style={{ color: '#7f8c8d' }}>Source File: </span>
                                            <span className="font-medium text-xs" style={{ color: '#2c3e50' }}>{getSource(point)}</span>
                                          </div>
                                          <Badge className="bg-blue-100 text-blue-800 text-sm font-medium">
                                            {point.kind}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
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
        </Card.Content>
      </Card>
    </div>
  );
}