import React from 'react';
import { XMarkIcon, CheckIcon, CubeIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useGroupingStore } from '../lib/store';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

const ConfirmedEquipmentDrawer: React.FC = () => {
  const { 
    confirmedEquipment, 
    showConfirmedDrawer, 
    toggleConfirmedDrawer 
  } = useGroupingStore();

  if (!showConfirmedDrawer) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-96 bg-white shadow-lg border-r border-gray-200 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <CubeIcon className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Confirmed Equipment Templates
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleConfirmedDrawer}
          className="h-8 w-8 p-0"
        >
          <XMarkIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-col h-full">
        {/* Stats Summary */}
        <div className="p-4 bg-green-50 border-b border-green-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {confirmedEquipment.length}
              </div>
              <div className="text-sm text-green-700">Templates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {confirmedEquipment.reduce((sum, eq) => sum + eq.pointIds.length, 0)}
              </div>
              <div className="text-sm text-green-700">Points</div>
            </div>
          </div>
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-y-auto p-4">
          {confirmedEquipment.length === 0 ? (
            <div className="text-center py-8">
              <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                No confirmed equipment templates yet.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Confirm equipment in the main panel to create templates.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {confirmedEquipment.map((equipment) => (
                <div
                  key={equipment.id}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  {/* Equipment Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {equipment.name}
                      </h3>
                      {equipment.equipTypeName && (
                        <p className="text-sm text-gray-600">
                          {equipment.equipTypeName}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      <CheckIcon className="h-3 w-3 mr-1" />
                      Template
                    </Badge>
                  </div>

                  {/* Equipment Details */}
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {(equipment.vendor || equipment.model) && (
                      <div>
                        <span className="text-gray-500">Vendor/Model: </span>
                        <span className="text-gray-900">
                          {[equipment.vendor, equipment.model].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Points: </span>
                      <span className="text-gray-900">{equipment.pointIds.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Confidence: </span>
                      <span className="text-green-600 font-medium">
                        {Math.round(equipment.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Template Status */}
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <div className="flex items-center text-xs text-green-700">
                      <UsersIcon className="h-3 w-3 mr-1" />
                      Ready for auto-mapping similar equipment
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmedEquipmentDrawer; 