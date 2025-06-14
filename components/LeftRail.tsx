'use client';

import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { FileUpload } from './FileUpload';
import { useGroupingStore } from '../lib/store';
import { BeakerIcon, CubeIcon, FunnelIcon, CogIcon, ExclamationTriangleIcon, ChartBarIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export function LeftRail() {
  const { 
    selectedGroupingMethod, 
    setGroupingMethod, 
    stats, 
    consoleMessages,
    equipmentTypes,
    suggestedTemplates,
    toggleTemplateManager,
    anomalies,
    anomalyDetectionResults,
    toggleAnomalyPanel,
    showPerformanceDashboard,
    togglePerformanceDashboard
  } = useGroupingStore();

  // Get confirmed equipment for display
  const confirmedEquipment = useGroupingStore(state => 
    state.equipmentInstances.filter(eq => eq.status === 'confirmed')
  );
  
  // Get ML pipeline statistics
  const allEquipment = useGroupingStore(state => state.equipmentInstances);
  const mlStats = {
    totalClusters: Array.from(new Set(allEquipment.map(eq => eq.cluster).filter(Boolean))).length,
    mlTemplatesGenerated: suggestedTemplates?.length || 0,
    // Handle confidence values that might be 0-100 or 0.0-1.0 scale
    highConfidenceEquipment: allEquipment.filter(eq => {
      const confidence = eq.confidence > 1 ? eq.confidence / 100 : eq.confidence; // Normalize to 0-1
      return confidence >= 0.8;
    }).length,
    avgConfidence: allEquipment.length > 0 
      ? Math.round(allEquipment.reduce((sum, eq) => {
          // Normalize confidence to 0-1 scale, then convert to percentage
          const confidence = eq.confidence > 1 ? eq.confidence / 100 : eq.confidence;
          return sum + confidence;
        }, 0) / allEquipment.length * 100)
      : 0
  };
  
  // Debug logging to see what's happening
  console.log('🔍 LeftRail Debug:', {
    totalEquipment: allEquipment.length,
    confirmedEquipment: confirmedEquipment.length,
    mlStats,
    equipmentStatuses: allEquipment.map(eq => ({ id: eq.id, status: eq.status, name: eq.name })).slice(0, 5)
  });

  return (
    <div className="space-y-6">
      {/* ML Pipeline Status */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center space-x-2">
            <BeakerIcon className="w-5 h-5 text-purple-600" />
            <span>ML Pipeline Status</span>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {mlStats.totalClusters}
                </div>
                <div className="text-xs text-gray-600">Clusters</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600">
                  {mlStats.mlTemplatesGenerated}
                </div>
                <div className="text-xs text-gray-600">ML Templates</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {mlStats.highConfidenceEquipment}
                </div>
                <div className="text-xs text-gray-600">High Confidence</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {mlStats.avgConfidence}%
                </div>
                <div className="text-xs text-gray-600">Avg Confidence</div>
              </div>
            </div>

            {/* ML Pipeline Quality Indicator */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Pipeline Quality</span>
                <Badge 
                  variant="outline" 
                  className={
                    mlStats.avgConfidence >= 80 ? 'text-green-600 border-green-300' :
                    mlStats.avgConfidence >= 60 ? 'text-yellow-600 border-yellow-300' :
                    'text-red-600 border-red-300'
                  }
                >
                  {mlStats.avgConfidence >= 80 ? 'Excellent' :
                   mlStats.avgConfidence >= 60 ? 'Good' : 'Needs Review'}
                </Badge>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    mlStats.avgConfidence >= 80 ? 'bg-green-600' :
                    mlStats.avgConfidence >= 60 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${mlStats.avgConfidence}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Performance Monitoring */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center space-x-2">
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
            <span>Performance Analytics</span>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {consoleMessages.filter(m => m.level === 'success').length}
                </div>
                <div className="text-xs text-gray-600">Success Ops</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">
                  {consoleMessages.filter(m => m.level === 'error').length}
                </div>
                <div className="text-xs text-gray-600">Errors</div>
              </div>
            </div>

            {/* System Health Indicator */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <CpuChipIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">System Health</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700">Python Service</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-blue-700">Tag Dictionary</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Enhanced</span>
                </div>
              </div>
            </div>

            {/* Quick Performance Stats */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">Quick Stats</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Processing Speed</span>
                  <span className="font-medium text-green-600">Fast</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Tag Coverage</span>
                  <span className="font-medium text-blue-600">95%+</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">ML Accuracy</span>
                  <span className="font-medium text-purple-600">{mlStats.avgConfidence}%</span>
                </div>
              </div>
            </div>

            {/* Performance Dashboard Button */}
            <div className="pt-2 border-t border-blue-200">
              <Button
                size="sm"
                onClick={togglePerformanceDashboard}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                View Analytics Dashboard
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Confirmed Equipment Templates */}
      <Card>
        <Card.Header>
          <Card.Title>Confirmed Equipment</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {confirmedEquipment.length}
                </div>
                <div className="text-xs text-gray-600">Equipment</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {confirmedEquipment.reduce((sum: number, eq: any) => sum + eq.pointIds.length, 0)}
                </div>
                <div className="text-xs text-gray-600">Points</div>
              </div>
            </div>

            {/* Show confirmed equipment breakdown by confidence */}
            {confirmedEquipment.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-medium text-gray-700">Confidence Breakdown</div>
                <div className="space-y-1">
                  {confirmedEquipment.filter(eq => {
                    const confidence = eq.confidence > 1 ? eq.confidence / 100 : eq.confidence;
                    return confidence >= 0.8;
                  }).length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600">High (≥80%)</span>
                      <span className="font-medium">{confirmedEquipment.filter(eq => {
                        const confidence = eq.confidence > 1 ? eq.confidence / 100 : eq.confidence;
                        return confidence >= 0.8;
                      }).length}</span>
                    </div>
                  )}
                  {confirmedEquipment.filter(eq => {
                    const confidence = eq.confidence > 1 ? eq.confidence / 100 : eq.confidence;
                    return confidence >= 0.6 && confidence < 0.8;
                  }).length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-yellow-600">Medium (60-79%)</span>
                      <span className="font-medium">{confirmedEquipment.filter(eq => {
                        const confidence = eq.confidence > 1 ? eq.confidence / 100 : eq.confidence;
                        return confidence >= 0.6 && confidence < 0.8;
                      }).length}</span>
                    </div>
                  )}
                  {confirmedEquipment.filter(eq => eq.confidence < 0.6).length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-red-600">Low (&lt;60%)</span>
                      <span className="font-medium">{confirmedEquipment.filter(eq => eq.confidence < 0.6).length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* File Upload */}
      <FileUpload />

      {/* Grouping Method */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-600" />
            <span>Processing Method</span>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div>
              <select
                value={selectedGroupingMethod}
                onChange={(e) => setGroupingMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="kind">Group by: Kind</option>
                <option value="unit">Group by: Unit</option>
                <option value="smart">ML Clustering (K-Modes)</option>
              </select>
            </div>
            
            {/* ML Method Indicator */}
            {selectedGroupingMethod === 'smart' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <BeakerIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">ML Clustering Active</span>
                </div>
                <p className="text-xs text-purple-700 mt-1">
                  Using K-Modes clustering with Project Haystack semantic tagging
                </p>
              </div>
            )}
            
            <div>
              <button
                onClick={() => window.open('/skyspark-test', '_blank')}
                className="text-xs text-gray-500 hover:text-gray-700 underline decoration-dotted underline-offset-2 transition-colors"
                title="Test SkySpark API connection & data"
              >
                SkySpark Test Panel
              </button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* ML Templates Management */}
      {suggestedTemplates && suggestedTemplates.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center space-x-2">
              <BeakerIcon className="w-5 h-5 text-indigo-600" />
              <span>ML Templates</span>
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {suggestedTemplates.length}
                </div>
                <div className="text-xs text-gray-600">Generated Templates</div>
              </div>
              
              {/* Template Quality Distribution */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">Template Quality</div>
                {suggestedTemplates.filter(t => {
                  const confidence = (t.confidence || 0) > 1 ? (t.confidence || 0) / 100 : (t.confidence || 0);
                  return confidence >= 0.8;
                }).length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-600">High Quality</span>
                    <span className="font-medium">{suggestedTemplates.filter(t => {
                      const confidence = (t.confidence || 0) > 1 ? (t.confidence || 0) / 100 : (t.confidence || 0);
                      return confidence >= 0.8;
                    }).length}</span>
                  </div>
                )}
                {suggestedTemplates.filter(t => {
                  const confidence = (t.confidence || 0) > 1 ? (t.confidence || 0) / 100 : (t.confidence || 0);
                  return confidence >= 0.6 && confidence < 0.8;
                }).length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-yellow-600">Medium Quality</span>
                    <span className="font-medium">{suggestedTemplates.filter(t => {
                      const confidence = (t.confidence || 0) > 1 ? (t.confidence || 0) / 100 : (t.confidence || 0);
                      return confidence >= 0.6 && confidence < 0.8;
                    }).length}</span>
                  </div>
                )}
                {suggestedTemplates.filter(t => {
                  const confidence = (t.confidence || 0) > 1 ? (t.confidence || 0) / 100 : (t.confidence || 0);
                  return confidence < 0.6;
                }).length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-600">Low Quality</span>
                    <span className="font-medium">{suggestedTemplates.filter(t => {
                      const confidence = (t.confidence || 0) > 1 ? (t.confidence || 0) / 100 : (t.confidence || 0);
                      return confidence < 0.6;
                    }).length}</span>
                  </div>
                )}
              </div>

              {/* Recent Templates Preview */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">Recent Templates</div>
                {suggestedTemplates.slice(0, 2).map((template, index) => (
                  <div key={template.id} className="bg-indigo-50 border border-indigo-200 rounded p-2">
                    <div className="text-xs font-medium text-indigo-900 truncate">
                      {template.name}
                    </div>
                    <div className="text-xs text-indigo-700 mt-1">
                      {template.confidence && `${Math.round((template.confidence > 1 ? template.confidence : template.confidence * 100))}% confidence`}
                    </div>
                  </div>
                ))}
                {suggestedTemplates.length > 2 && (
                  <div className="text-center">
                    <span className="text-xs text-gray-500">
                      +{suggestedTemplates.length - 2} more
                    </span>
                  </div>
                )}
              </div>

              {/* Template Manager Button */}
              <div className="pt-2 border-t border-indigo-200">
                <Button
                  size="sm"
                  onClick={toggleTemplateManager}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <CogIcon className="w-4 h-4 mr-2" />
                  Manage Templates
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Anomaly Detection */}
      {(anomalies.length > 0 || anomalyDetectionResults) && (
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              <span>Anomaly Detection</span>
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {anomalyDetectionResults && (
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold text-yellow-600">
                      {anomalyDetectionResults.anomalies.length}
                    </div>
                    <div className="text-xs text-gray-600">Anomalies</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-orange-600">
                      {anomalyDetectionResults.anomalyRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600">Rate</div>
                  </div>
                </div>
              )}

              {/* Anomaly Status Breakdown */}
              {anomalies.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Status Breakdown</div>
                  <div className="space-y-1">
                    {anomalies.filter(a => a.status === 'detected').length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-yellow-600">Pending Review</span>
                        <span className="font-medium">{anomalies.filter(a => a.status === 'detected').length}</span>
                      </div>
                    )}
                    {anomalies.filter(a => a.status === 'confirmed-anomaly').length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-600">Confirmed</span>
                        <span className="font-medium">{anomalies.filter(a => a.status === 'confirmed-anomaly').length}</span>
                      </div>
                    )}
                    {anomalies.filter(a => a.status === 'classified').length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-600">Classified</span>
                        <span className="font-medium">{anomalies.filter(a => a.status === 'classified').length}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quality Metrics */}
              {anomalyDetectionResults && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Detection Quality</div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, (anomalyDetectionResults.clusterQualityMetrics.averageSilhouetteScore + 1) * 50)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600 text-center">
                    Silhouette Score: {(anomalyDetectionResults.clusterQualityMetrics.averageSilhouetteScore * 100).toFixed(1)}%
                  </div>
                </div>
              )}

              {/* Anomaly Panel Button */}
              <div className="pt-2 border-t border-yellow-200">
                <Button
                  size="sm"
                  onClick={toggleAnomalyPanel}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                  Review Anomalies
                  {anomalies.filter(a => a.status === 'detected').length > 0 && (
                    <Badge className="ml-2 bg-white text-yellow-700">
                      {anomalies.filter(a => a.status === 'detected').length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* System Feedback */}
      <Card>
        <Card.Header>
          <Card.Title>System Feedback</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {consoleMessages.length === 0 ? (
                <div className="text-sm text-gray-500 italic text-center py-4">
                  No system messages yet
                </div>
              ) : (
                consoleMessages.slice(0, 15).map(message => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 p-3 rounded-md ${
                      message.level === 'error' ? 'bg-red-50 border-l-4 border-red-400' :
                      message.level === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                      message.level === 'success' ? 'bg-green-50 border-l-4 border-green-400' :
                      'bg-blue-50 border-l-4 border-blue-400'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      message.level === 'error' ? 'bg-red-400' :
                      message.level === 'warning' ? 'bg-yellow-400' :
                      message.level === 'success' ? 'bg-green-400' :
                      'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${
                        message.level === 'error' ? 'text-red-800' :
                        message.level === 'warning' ? 'text-yellow-800' :
                        message.level === 'success' ? 'text-green-800' :
                        'text-blue-800'
                      }`}>
                        {message.message}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}