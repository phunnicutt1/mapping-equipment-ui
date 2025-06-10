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

      {/* Equipment Insights */}
      <Card>
        <Card.Header className="bg-slate-600 text-white">
          <Card.Title className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-white">Equipment Insights</span>
          </Card.Title>
        </Card.Header>
        <Card.Content className="p-4">
          <div className="space-y-4">
            {/* High Confidence Card */}
            <div className="bg-green-100 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-green-800 mb-1">
                    High Confidence: AHU groups have 95% point consistency
                  </h3>
                </div>
              </div>
            </div>

            {/* Review Needed Card */}
            <div className="bg-yellow-100 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-yellow-800 mb-1">
                    Review Needed: Terminal Units have inconsistent point sets
                  </h3>
                </div>
              </div>
            </div>

            {/* Point Mapping Card */}
            <div className="bg-blue-100 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-blue-800 mb-1">
                    78% of points have been mapped to equipment
                  </h3>
                </div>
              </div>
            </div>

            {/* Smart Grouping Card */}
            <div className="bg-purple-100 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-purple-800 mb-1">
                    Smart grouping reduced manual mapping by 62%
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}