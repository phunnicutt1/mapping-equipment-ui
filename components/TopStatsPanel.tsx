'use client';

import { useGroupingStore } from '../lib/store';

export function TopStatsPanel() {
  const { points, equipmentInstances, equipmentTypes, templates, stats } = useGroupingStore();

  // Calculate equipment type distribution (initial auto-detected types)
  const equipmentTypeDistribution = equipmentTypes.map(type => {
    const instancesOfType = equipmentInstances.filter(eq => eq.typeId === type.id && !eq.templateId);
    return {
      id: type.id,
      name: type.name,
      count: instancesOfType.length,
      points: instancesOfType.reduce((sum, eq) => sum + eq.pointIds.length, 0),
      color: type.color || 'bg-gray-500'
    };
  }).filter(type => type.count > 0);

  // Calculate template distribution (templates are also equipment types)
  const templateDistribution = templates.map(template => {
    const instancesWithTemplate = equipmentInstances.filter(eq => eq.templateId === template.id);
    return {
      id: template.id,
      name: template.name,
      count: instancesWithTemplate.length,
      points: instancesWithTemplate.reduce((sum, eq) => sum + eq.pointIds.length, 0),
      color: template.color
    };
  }).filter(template => template.count > 0);

  // Combine both initial types and templates
  const allEquipmentTypes = [...equipmentTypeDistribution, ...templateDistribution];

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
             Auto Assigned Using Template
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
        {allEquipmentTypes.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-3">
              Equipment Types Detected
            </div>
            <div className="flex flex-wrap gap-2">
              {allEquipmentTypes.map(type => (
                <div
                  key={type.id}
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${type.color}`}></div>
                    <span className="text-sm font-medium text-gray-900">
                      {type.name}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                      {type.count}
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