'use client';

import { useGroupingStore } from '../lib/store';

export function TopStatsPanel() {
  const { points, equipmentInstances, equipmentTypes, templates, stats } = useGroupingStore();

  // Calculate equipment type distribution
  const equipmentTypeDistribution = equipmentTypes.map(type => {
    const instancesOfType = equipmentInstances.filter(eq => eq.typeId === type.id);
    return {
      id: type.id,
      name: type.name,
      count: instancesOfType.length,
      points: instancesOfType.reduce((sum, eq) => sum + eq.pointIds.length, 0)
    };
  }).filter(type => type.count > 0);

  const totalEquipmentInstances = equipmentInstances.length;
  const totalPoints = points.length;
  const assignedPoints = points.filter(p => p.equipRef).length;
  const completionPercentage = totalPoints > 0 ? Math.round((assignedPoints / totalPoints) * 100) : 0;
  const templatedEquipment = equipmentInstances.filter(eq => eq.templateId).length;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {/* Total Points */}
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {totalPoints}
            </div>
            <div className="text-sm font-medium text-gray-600 mt-1">
              Total Points
            </div>
          </div>

          {/* Assigned Points */}
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {assignedPoints}
            </div>
            <div className="text-sm font-medium text-gray-600 mt-1">
              Assigned
            </div>
          </div>

          {/* Completion Percentage */}
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {completionPercentage}%
            </div>
            <div className="text-sm font-medium text-gray-600 mt-1">
              Complete
            </div>
          </div>

          {/* Equipment Instances */}
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {totalEquipmentInstances}
            </div>
            <div className="text-sm font-medium text-gray-600 mt-1">
              Equipment
            </div>
          </div>

          {/* Template Usage */}
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600">
              {templatedEquipment}
            </div>
            <div className="text-sm font-medium text-gray-600 mt-1">
              Templated
            </div>
          </div>
        </div>

        {/* Template Summary */}
        {templates.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Templates Created: {templates.length} | Auto-Applied: {templates.reduce((sum, t) => sum + t.appliedCount, 0)} times
            </div>
          </div>
        )}

        {/* Equipment Type Distribution */}
        {equipmentTypeDistribution.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-3">
              Equipment Types Detected
            </div>
            <div className="flex flex-wrap gap-3">
              {equipmentTypeDistribution.map(type => (
                <div
                  key={type.id}
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getEquipmentTypeColor(type.id)}`}></div>
                    <span className="text-sm font-medium text-gray-900">
                      {type.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({type.count} {type.count === 1 ? 'instance' : 'instances'}, {type.points} points)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getEquipmentTypeColor(typeId: string): string {
  const colors = {
    'ahu': 'bg-blue-500',
    'vav': 'bg-purple-500',
    'terminal-unit': 'bg-green-500',
    'control-valve': 'bg-orange-500',
    'fan-unit': 'bg-red-500',
    'pump-unit': 'bg-indigo-500',
  };
  return colors[typeId as keyof typeof colors] || 'bg-gray-500';
}