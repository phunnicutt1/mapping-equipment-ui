'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useGroupingStore } from '../lib/store';
import { XMarkIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import PointPropertiesTags from './PointPropertiesTags';

export function ConfirmedEquipmentDrawer() {
  const { 
    points, 
    equipmentInstances,
    equipmentTypes,
    toggleConfirmedDrawer
  } = useGroupingStore();

  const [searchTerm, setSearchTerm] = useState('');

  // Get confirmed equipment
  const confirmedEquipment = equipmentInstances.filter(eq => eq.status === 'confirmed');

  // Filter equipment based on search term
  const filteredEquipment = confirmedEquipment.filter(equipment =>
    equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    equipmentTypes.find(type => type.id === equipment.typeId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.confirmed-drawer')) {
        // Optional: add auto-close functionality if desired
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getEquipmentPoints = (equipmentId: string) => {
    return points.filter(point => point.equipRef === equipmentId);
  };

  const getEquipmentType = (typeId: string) => {
    return equipmentTypes.find(type => type.id === typeId);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={toggleConfirmedDrawer}
      />
      
      {/* Drawer - Opening from LEFT side */}
      <div className="confirmed-drawer absolute left-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-medium text-green-900">Confirmed Equipment</h2>
              <p className="text-sm text-green-700">
                {confirmedEquipment.length} equipment instances confirmed • Review and manage confirmed equipment
              </p>
            </div>
            <button
              onClick={toggleConfirmedDrawer}
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
                  placeholder="Search confirmed equipment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button variant="outline" size="sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600">
                  Showing {filteredEquipment.length} of {confirmedEquipment.length} confirmed
                </div>
              </div>
            </div>
          </div>

          {/* Equipment List */}
          <div className="flex-1 overflow-y-auto">
            {filteredEquipment.length > 0 ? (
              <div className="space-y-2 p-4">
                {filteredEquipment.map(equipment => {
                  const equipmentType = getEquipmentType(equipment.typeId);
                  const equipmentPoints = getEquipmentPoints(equipment.id);
                  
                  return (
                    <div
                      key={equipment.id}
                      className="border rounded-lg p-5 hover:bg-green-50 border-green-200 bg-green-25"
                    >
                      {/* Equipment Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-green-900">
                              {equipment.name}
                            </h3>
                            <Badge className="bg-green-600 text-white">
                              Confirmed
                            </Badge>
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              {Math.round(equipment.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm font-medium text-gray-600">
                              Type: {equipmentType?.name || 'Unknown'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {equipmentPoints.length} points
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Equipment Points */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
                          Confirmed Points ({equipmentPoints.length})
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {equipmentPoints.map(point => (
                            <div
                              key={point.id}
                              className="bg-white border border-gray-200 rounded-md p-3"
                            >
                              <div className="flex items-start justify-between">
                                {/* Point Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                      {point.navName || point.dis || point.bacnetDis || 'Unnamed Point'}
                                    </span>
                                    <Badge variant="secondary" size="sm">
                                      {point.bacnetCur}
                                    </Badge>
                                    {point.unit && (
                                      <Badge variant="outline" size="sm">
                                        {point.unit}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Point Description */}
                                  {(point.bacnetDesc || point.bacnetDis) && (
                                    <div className="text-xs text-gray-600 mb-2">
                                      {point.bacnetDesc || point.bacnetDis}
                                    </div>
                                  )}

                                  {/* Point Properties */}
                                  <div className="flex items-center justify-between">
                                    <PointPropertiesTags point={point} />
                                    <div className="text-xs text-gray-500">
                                      File: {point.fileName || 'Unknown'}
                                    </div>
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div className="ml-3">
                                  <Badge className="bg-green-600 text-white" size="sm">
                                    Confirmed
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : confirmedEquipment.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Confirmed Equipment</h3>
                <p className="text-gray-500 max-w-sm">
                  Equipment will appear here once you confirm them from the main panel.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-500 max-w-sm">
                  No confirmed equipment matches your search. Try adjusting your search terms.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 