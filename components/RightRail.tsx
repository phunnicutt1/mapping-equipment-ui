'use client';

import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { useGroupingStore } from '../lib/store';

export function RightRail() {
  const { stats, equipmentInstances } = useGroupingStore();

  const getInsights = () => {
    const highConfidence = equipmentInstances.filter(eq => eq.confidence >= 0.8).length;
    const needsReview = equipmentInstances.filter(eq => eq.status === 'needs-review').length;
    const confirmed = equipmentInstances.filter(eq => eq.status === 'confirmed').length;
    
    const completionRate = stats.totalPoints > 0 
      ? Math.round((stats.assignedPoints / stats.totalPoints) * 100) 
      : 0;

    return {
      highConfidence,
      needsReview,
      confirmed,
      completionRate
    };
  };

  const insights = getInsights();

  return (
    <div className="space-y-6">
      {/* Data Statistics (duplicate for mobile) */}
      <Card className="lg:hidden">
        <Card.Header>
          <Card.Title>Data Statistics</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalPoints}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {stats.assignedPoints}
              </div>
              <div className="text-xs text-gray-600">Assigned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.equipmentGroups}
              </div>
              <div className="text-xs text-gray-600">Equipment</div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Equipment Insights */}
      <Card>
        <Card.Header>
          <Card.Title>Equipment Insights</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-3">
            {/* High Confidence */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">High Confidence</span>
                </div>
                <Badge variant="success" size="sm">
                  {insights.highConfidence}
                </Badge>
              </div>
              <p className="text-xs text-green-700 mt-1">
                Equipment with &gt;80% confidence scores
              </p>
            </div>

            {/* Review Needed */}
            {insights.needsReview > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-800">Review Needed</span>
                  </div>
                  <Badge variant="warning" size="sm">
                    {insights.needsReview}
                  </Badge>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Equipment flagged for manual review
                </p>
              </div>
            )}

            {/* Progress */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-800">Progress</span>
                </div>
                <Badge variant="primary" size="sm">
                  {insights.completionRate}%
                </Badge>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Points successfully assigned
              </p>
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${insights.completionRate}%` }}
                ></div>
              </div>
            </div>

            {/* Smart Grouping Efficiency */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm font-medium text-indigo-800">Smart Grouping</span>
                </div>
                <Badge variant="primary" size="sm">
                  {stats.equipmentGroups > 0 ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs text-indigo-700 mt-1">
                Auto-detection efficiency: {stats.equipmentGroups} equipment detected
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Equipment Distribution */}
      <Card>
        <Card.Header>
          <Card.Title>Equipment Distribution</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-3">
            {stats.confidenceDistribution.high > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">High Confidence</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stats.confidenceDistribution.high}
                </span>
              </div>
            )}
            
            {stats.confidenceDistribution.medium > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Medium Confidence</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stats.confidenceDistribution.medium}
                </span>
              </div>
            )}
            
            {stats.confidenceDistribution.low > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Low Confidence</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stats.confidenceDistribution.low}
                </span>
              </div>
            )}

            {stats.equipmentGroups === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No equipment detected yet. Try selecting "Smart Grouping" method.
              </div>
            )}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}