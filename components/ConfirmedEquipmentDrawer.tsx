'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useGroupingStore } from '../lib/store';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getEquipmentDisplayName } from '../lib/utils';

export function ConfirmedEquipmentDrawer() {
  const { 
    points, 
    equipmentInstances,
    equipmentTypes,
    toggleConfirmedDrawer
  } = useGroupingStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(new Set());
  
  const drawerRef = useRef<HTMLDivElement>(null);

  // Get confirmed equipment
  const confirmedEquipment = equipmentInstances.filter(eq => eq.status === 'confirmed');

  // Filter equipment based on search
  const filteredEquipment = confirmedEquipment.filter(equipment => 
    equipment.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPointsForEquipment = (equipmentId: string) => {
    return points.filter(point => point.equipRef === equipmentId);
  };

  const getEquipmentType = (typeId: string) => {
    return equipmentTypes.find(type => type.id === typeId);
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

  const getDescription = (point: any) => {
    return point.bacnetDesc || point.description || '-';
  };

  const getDisplayName = (point: any) => {
    return point.bacnetDis || point.navName || point.dis || '-';
  };

  const getProperties = (point: any) => {
    const props = [];
    if (point.point) props.push('Point');
    if (point.writable) props.push('Writable');
    if (point.cmd) props.push('Command');
    if (point.sensor) props.push('Sensor');
    if (point.his) props.push('Historic');
    return props.length > 0 ? props.join(', ') : '-';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 1.0) return 'text-green-700 bg-green-100 font-semibold';
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatConfidence = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    return confidence >= 1.0 ? `${percentage}% ✓` : `${percentage}%`;
  };

  const getEquipmentLabel = (equipment: any) => {
    if (equipment.vendor === 'User Created' || equipment.status === 'user-created') {
      return 'User Created Manual Assignment';
    }
    
    if (equipment.vendor && equipment.model) {
      return `${equipment.vendor} ${equipment.model}`;
    }
    
    if (equipment.vendor) {
      return equipment.vendor;
    }
    
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

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        toggleConfirmedDrawer();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [toggleConfirmedDrawer]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        
        <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <div 
            ref={drawerRef}
            className="relative w-screen max-w-2xl"
          >
            <div className="h-full flex flex-col bg-white shadow-xl">
              {/* Header */}
              <div className="px-4 sm:px-6 py-6 bg-green-50 border-b border-green-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-green-900">Confirmed Equipment</h2>
                    <p className="mt-1 text-sm text-green-700">
                      {confirmedEquipment.length} equipment instances confirmed
                    </p>
                  </div>
                  <div className="ml-3 h-7 flex items-center">
                    <button
                      onClick={toggleConfirmedDrawer}
                      className="bg-green-50 rounded-md text-green-400 hover:text-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <span className="sr-only">Close panel</span>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    placeholder="Search confirmed equipment..."
                  />
                </div>
              </div>

              {/* Equipment List */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <div className="space-y-4">
                  {filteredEquipment.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-500">
                        {confirmedEquipment.length === 0 
                          ? 'No equipment has been confirmed yet.'
                          : 'No equipment matches your search.'
                        }
                      </div>
                    </div>
                  ) : (
                    filteredEquipment.map((equipment) => {
                      const equipmentPoints = getPointsForEquipment(equipment.id);
                      const equipmentType = getEquipmentType(equipment.typeId);
                      const isExpanded = expandedEquipment.has(equipment.id);

                      return (
                        <Card key={equipment.id} className="border-green-200">
                          <Card.Content className="p-0">
                            {/* Equipment Header */}
                            <div className="px-4 py-3 border-b border-green-100">
                              <button
                                onClick={() => toggleEquipment(equipment.id)}
                                className="w-full text-left flex items-center justify-between hover:bg-green-50 -mx-4 px-4 py-2 rounded"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <span className="font-medium text-gray-900">
                                      {getEquipmentDisplayName(equipment.name)}
                                    </span>
                                    <Badge variant="secondary" className="bg-green-600 text-white">
                                      {equipmentPoints.length} points
                                    </Badge>
                                    <Badge 
                                      variant="outline" 
                                      className={`${getConfidenceColor(equipment.confidence)} border-0 text-xs font-medium`}
                                    >
                                      {formatConfidence(equipment.confidence)} confidence
                                    </Badge>
                                  </div>
                                  
                                  {/* Equipment Type */}
                                  {equipmentType && (
                                    <div className="mt-1">
                                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                        {equipmentType.name}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Equipment Label */}
                                  {getEquipmentLabel(equipment) && (
                                    <div className="mt-1">
                                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                        {getEquipmentLabel(equipment)}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Device Location */}
                                  {(() => {
                                    const deviceName = equipmentPoints.find(p => p.bacnetDeviceName)?.bacnetDeviceName;
                                    return deviceName && (
                                      <div className="mt-1">
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                          📍 {deviceName}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    Confirmed
                                  </Badge>
                                  <div className="text-gray-400">
                                    {isExpanded ? '▲' : '▼'}
                                  </div>
                                </div>
                              </button>
                            </div>

                            {/* Equipment Points */}
                            {isExpanded && (
                              <div className="px-4 py-3 space-y-3">
                                {equipmentPoints.map((point, idx) => (
                                  <div key={point.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{point.dis}</div>
                                        <div className="text-sm text-gray-500 mt-1">{point.navName || '-'}</div>
                                      </div>
                                      <span className="text-sm text-white bg-green-500 px-3 py-1 rounded">
                                        Confirmed
                                      </span>
                                    </div>

                                    {/* Point Details Grid */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <dt className="font-medium text-gray-500">BACnet ID</dt>
                                        <dd className="text-gray-900">{point.bacnetCur}</dd>
                                      </div>
                                      
                                      <div>
                                        <dt className="font-medium text-gray-500">Description</dt>
                                        <dd className="text-gray-900">{getDescription(point)}</dd>
                                      </div>
                                      
                                      <div>
                                        <dt className="font-medium text-gray-500">Display Name</dt>
                                        <dd className="text-gray-900">{getDisplayName(point)}</dd>
                                      </div>
                                      
                                      <div>
                                        <dt className="font-medium text-gray-500">Unit</dt>
                                        <dd className="text-gray-900">{point.unit || '-'}</dd>
                                      </div>
                                      
                                      <div className="col-span-2">
                                        <dt className="font-medium text-gray-500">Properties</dt>
                                        <dd className="text-gray-900">{getProperties(point)}</dd>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Card.Content>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 