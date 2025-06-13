'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  ChartBarIcon, 
  CpuChipIcon, 
  UserGroupIcon, 
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

interface AnalyticsData {
  tagGeneration: {
    totalPointsProcessed: number;
    averageTagsPerPoint: number;
    tagQualityDistribution: { [range: string]: number };
    processingTimeMs: number;
    tagValidationResults: {
      valid: number;
      invalid: number;
      warnings: number;
    };
  };
  pythonService: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageExecutionTime: number;
    successRate: number;
    isHealthy: boolean;
    isRecentlyHealthy: boolean;
  };
  userInteractions: {
    confirmationRate: number;
    rejectionRate: number;
    averageConfidenceBeforeUserAction: number;
    mostCommonUserActions: { [action: string]: number };
  };
  clusteringQuality: {
    silhouetteScores: number[];
    averageSilhouetteScore: number;
    clusterSeparation: number;
    actualClusterCount: number;
    optimalClusterCount: number;
  };
  summary: {
    overallHealthScore: number;
    recommendations: string[];
    performanceGrade: string;
    keyMetrics: { [key: string]: number | string };
  };
}

// API utility functions
const fetchAnalytics = async (): Promise<AnalyticsData> => {
  const response = await fetch('/api/performance-analytics');
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch analytics');
  }
  return result.data;
};

const fetchAlerts = async (): Promise<string[]> => {
  const response = await fetch('/api/quality-alerts');
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch alerts');
  }
  return result.data;
};

const exportAnalytics = async (): Promise<string> => {
  const response = await fetch('/api/export-analytics');
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to export analytics');
  }
  return result.data;
};

const resetAnalytics = async (): Promise<void> => {
  const response = await fetch('/api/reset-analytics', { method: 'POST' });
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to reset analytics');
  }
};

export default function PerformanceDashboard({ isVisible, onClose }: PerformanceDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsData, alertsData] = await Promise.all([
        fetchAnalytics(),
        fetchAlerts()
      ]);
      setAnalytics(analyticsData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadAnalytics();
      const interval = setInterval(loadAnalytics, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    loadAnalytics();
  };

  const handleExport = async () => {
    try {
      const data = await exportAnalytics();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ml-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export analytics:', error);
      alert('Failed to export analytics data');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all performance analytics? This action cannot be undone.')) {
      try {
        await resetAnalytics();
        await loadAnalytics();
      } catch (error) {
        console.error('Failed to reset analytics:', error);
        alert('Failed to reset analytics data');
      }
    }
  };

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  if (!isVisible) return null;

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-red-600">Error Loading Dashboard</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading performance dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">ML Pipeline Performance Dashboard</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh Data"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Export Analytics"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-800 transition-colors"
              title="Reset Analytics"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close Dashboard"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Alerts Section */}
          {alerts.length > 0 && (
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center space-x-2 text-red-600">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span>System Alerts ({alerts.length})</span>
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2">
                  {alerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-sm ${
                        alert.startsWith('CRITICAL') 
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : alert.startsWith('WARNING')
                          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {alert}
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <Card.Header>
                <Card.Title>Overall Health</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getHealthColor(analytics.summary.overallHealthScore)}`}>
                    {Math.round(analytics.summary.overallHealthScore)}%
                  </div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getGradeColor(analytics.summary.performanceGrade)}`}>
                    Grade {analytics.summary.performanceGrade}
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center space-x-2">
                  <CpuChipIcon className="h-5 w-5" />
                  <span>Python Service</span>
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <div className="flex items-center space-x-1">
                      {analytics.pythonService.isHealthy ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm ${analytics.pythonService.isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.pythonService.isHealthy ? 'Healthy' : 'Unhealthy'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-medium">
                      {Math.round(analytics.pythonService.successRate * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Execution</span>
                    <span className="text-sm font-medium">
                      {Math.round(analytics.pythonService.averageExecutionTime)}ms
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center space-x-2">
                  <UserGroupIcon className="h-5 w-5" />
                  <span>User Interactions</span>
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Confirmation Rate</span>
                    <span className="text-sm font-medium">
                      {Math.round(analytics.userInteractions.confirmationRate * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Confidence</span>
                    <span className="text-sm font-medium">
                      {Math.round(analytics.userInteractions.averageConfidenceBeforeUserAction)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Actions</span>
                    <span className="text-sm font-medium">
                      {Object.values(analytics.userInteractions.mostCommonUserActions).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tag Generation Metrics */}
            <Card>
              <Card.Header>
                <Card.Title>Tag Generation Performance</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Points Processed</span>
                    <span className="text-sm font-medium">{analytics.tagGeneration.totalPointsProcessed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Processing Time</span>
                    <span className="text-sm font-medium">{Math.round(analytics.tagGeneration.processingTimeMs)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Valid Tags</span>
                    <span className="text-sm font-medium text-green-600">
                      {analytics.tagGeneration.tagValidationResults.valid}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Invalid Tags</span>
                    <span className="text-sm font-medium text-red-600">
                      {analytics.tagGeneration.tagValidationResults.invalid}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Warnings</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {analytics.tagGeneration.tagValidationResults.warnings}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>

            {/* Clustering Quality */}
            <Card>
              <Card.Header>
                <Card.Title>Clustering Quality Metrics</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Silhouette Score</span>
                    <span className={`text-sm font-medium ${
                      analytics.clusteringQuality.averageSilhouetteScore > 0.5 ? 'text-green-600' : 
                      analytics.clusteringQuality.averageSilhouetteScore > 0.3 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {analytics.clusteringQuality.averageSilhouetteScore.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cluster Separation</span>
                    <span className="text-sm font-medium">
                      {analytics.clusteringQuality.clusterSeparation.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Actual Clusters</span>
                    <span className="text-sm font-medium">{analytics.clusteringQuality.actualClusterCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Optimal Clusters</span>
                    <span className="text-sm font-medium">{analytics.clusteringQuality.optimalClusterCount || 'N/A'}</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-2">Quality Distribution</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          analytics.clusteringQuality.averageSilhouetteScore > 0.5 ? 'bg-green-600' : 
                          analytics.clusteringQuality.averageSilhouetteScore > 0.3 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.max(analytics.clusteringQuality.averageSilhouetteScore * 100, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Key Metrics Summary */}
          <Card>
            <Card.Header>
              <Card.Title>Key Performance Indicators</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.summary.keyMetrics).map(([key, value]) => (
                  <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900">{value}</div>
                    <div className="text-sm text-gray-600">{key}</div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Recommendations */}
          {analytics.summary.recommendations.length > 0 && (
            <Card>
              <Card.Header>
                <Card.Title>Performance Recommendations</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2">
                  {analytics.summary.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <span className="text-sm text-blue-800">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {/* User Action Distribution */}
          {Object.keys(analytics.userInteractions.mostCommonUserActions).length > 0 && (
            <Card>
              <Card.Header>
                <Card.Title>User Action Distribution</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2">
                  {Object.entries(analytics.userInteractions.mostCommonUserActions)
                    .sort(([,a], [,b]) => b - a)
                    .map(([action, count]) => (
                      <div key={action} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{action}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ 
                                width: `${(count / Math.max(...Object.values(analytics.userInteractions.mostCommonUserActions))) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 