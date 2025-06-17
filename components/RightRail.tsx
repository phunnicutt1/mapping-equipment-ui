'use client';

import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { useGroupingStore } from '../lib/store';
import { CubeIcon, BeakerIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export function RightRail() {
  const { stats, equipmentInstances, suggestedTemplates } = useGroupingStore();

  const getInsights = () => {
    const highConfidence = equipmentInstances.filter(eq => eq.confidence >= 0.8).length;
    const mediumConfidence = equipmentInstances.filter(eq => eq.confidence >= 0.6 && eq.confidence < 0.8).length;
    const lowConfidence = equipmentInstances.filter(eq => eq.confidence < 0.6).length;
    const needsReview = equipmentInstances.filter(eq => eq.status === 'needs-review').length;
    const confirmed = equipmentInstances.filter(eq => eq.status === 'confirmed').length;
    const mlSuggested = equipmentInstances.filter(eq => eq.status === 'suggested').length;
    
    const completionRate = stats.totalPoints > 0 
      ? Math.round((stats.assignedPoints / stats.totalPoints) * 100) 
      : 0;

    // Cluster analysis
    const clusters = Array.from(new Set(equipmentInstances.map(eq => eq.cluster).filter(Boolean)));
    const avgClusterSize = clusters.length > 0 
      ? Math.round(equipmentInstances.filter(eq => eq.cluster).length / clusters.length)
      : 0;

    // Template analysis
    const mlTemplatesUsed = equipmentInstances.filter(eq => eq.templateId).length;
    const templateEfficiency = equipmentInstances.length > 0 
      ? Math.round((mlTemplatesUsed / equipmentInstances.length) * 100)
      : 0;

    return {
      highConfidence,
      mediumConfidence,
      lowConfidence,
      needsReview,
      confirmed,
      mlSuggested,
      completionRate,
      clusters: clusters.length,
      avgClusterSize,
      mlTemplatesUsed,
      templateEfficiency
    };
  };

  const insights = getInsights();

  const getClusterQuality = () => {
    if (insights.clusters === 0) return { label: 'No clusters', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    
    const avgConfidence = equipmentInstances.reduce((sum, eq) => sum + eq.confidence, 0) / equipmentInstances.length;
    
    if (avgConfidence >= 0.8) return { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (avgConfidence >= 0.6) return { label: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { label: 'Needs Review', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const clusterQuality = getClusterQuality();

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

      {/* ML Pipeline Insights */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center space-x-2">
            <BeakerIcon className="w-5 h-5 text-purple-600" />
            <span>ML Pipeline Insights</span>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-3">
            {/* Cluster Quality */}
            <div className={`${clusterQuality.bgColor} border border-gray-200 rounded-lg p-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CubeIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Cluster Quality</span>
                </div>
                <Badge variant="outline" className={`${clusterQuality.color} border-0`}>
                  {clusterQuality.label}
                </Badge>
              </div>
              <p className="text-xs text-gray-700 mt-1">
                {insights.clusters} clusters detected, avg {insights.avgClusterSize} items per cluster
              </p>
            </div>

            {/* ML Template Efficiency */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BeakerIcon className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-800">Template Efficiency</span>
                </div>
                <Badge variant="outline" className="text-indigo-600 border-indigo-300">
                  {insights.templateEfficiency}%
                </Badge>
              </div>
              <p className="text-xs text-indigo-700 mt-1">
                {insights.mlTemplatesUsed} equipment using ML-generated templates
              </p>
            </div>

            {/* ML Suggestions Status */}
            {insights.mlSuggested > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ChartBarIcon className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">ML Suggestions</span>
                  </div>
                  <Badge variant="warning" size="sm">
                    {insights.mlSuggested}
                  </Badge>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Equipment awaiting user confirmation
                </p>
              </div>
            )}
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
                Equipment with ≥80% confidence scores 🎯
              </p>
            </div>

            {/* Medium Confidence */}
            {insights.mediumConfidence > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-800">Medium Confidence</span>
                  </div>
                  <Badge variant="warning" size="sm">
                    {insights.mediumConfidence}
                  </Badge>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Equipment with 60-79% confidence scores
                </p>
              </div>
            )}

            {/* Low Confidence */}
            {insights.lowConfidence > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-red-800">Low Confidence</span>
                  </div>
                  <Badge variant="danger" size="sm">
                    {insights.lowConfidence}
                  </Badge>
                </div>
                <p className="text-xs text-red-700 mt-1">
                  Equipment with &lt;60% confidence scores ⚠️
                </p>
              </div>
            )}

            {/* Review Needed */}
            {insights.needsReview > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium text-orange-800">Review Needed</span>
                  </div>
                  <Badge variant="warning" size="sm">
                    {insights.needsReview}
                  </Badge>
                </div>
                <p className="text-xs text-orange-700 mt-1">
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
          </div>
        </Card.Content>
      </Card>

      {/* ML Templates */}
      {suggestedTemplates && suggestedTemplates.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center space-x-2">
              <BeakerIcon className="w-5 h-5 text-indigo-600" />
              <span>ML-Generated Templates</span>
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {suggestedTemplates.slice(0, 3).map((template, index) => (
                <div key={template.id} className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-indigo-900 truncate">
                        {template.name}
                      </div>
                      <div className="text-xs text-indigo-700 mt-1">
                        {template.equipmentTypeId && `Type: ${template.equipmentTypeId}`}
                        {template.confidence && ` • ${Math.round(template.confidence * 100)}% confidence`}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-indigo-600 border-indigo-300 text-xs">
                      ML
                    </Badge>
                  </div>
                </div>
              ))}
              
              {suggestedTemplates.length > 3 && (
                <div className="text-center">
                  <span className="text-xs text-gray-500">
                    +{suggestedTemplates.length - 3} more templates
                  </span>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Equipment Distribution */}
      <Card>
        <Card.Header>
          <Card.Title>Confidence Distribution</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-3">
            {stats.confidenceDistribution.high > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">High (≥80%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {stats.confidenceDistribution.high}
                  </span>
                  <span className="text-xs text-green-600">🎯</span>
                </div>
              </div>
            )}
            
            {stats.confidenceDistribution.medium > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Medium (60-79%)</span>
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
                  <span className="text-sm text-gray-700">Low (&lt;60%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {stats.confidenceDistribution.low}
                  </span>
                  <span className="text-xs text-red-600">⚠️</span>
                </div>
              </div>
            )}

            {stats.equipmentGroups === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No equipment detected yet. Upload files to start ML clustering.
              </div>
            )}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}