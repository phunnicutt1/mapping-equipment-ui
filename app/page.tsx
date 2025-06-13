'use client';

import { useEffect, useState } from 'react';
import { useGroupingStore } from '../lib/store';
import { LeftRail } from '../components/LeftRail';
import { MainPanel } from '../components/MainPanel';
import { RightRail } from '../components/RightRail';
import { UnassignedPointsDrawer } from '../components/UnassignedPointsDrawer';
import { TopStatsPanel } from '../components/TopStatsPanel';
import { ConfirmedEquipmentDrawer } from '../components/ConfirmedEquipmentDrawer';
import { SuccessCelebration } from '../components/SuccessCelebration';
import { TemplateManager } from '../components/TemplateManager';
import { AnomalyPanel } from '../components/AnomalyPanel';
import PerformanceDashboard from '../components/PerformanceDashboard';
import { mockBACnetPoints } from '../lib/mock-data';

export default function HomePage() {
  const { 
    loadProcessedData, // Use ML pipeline data loading method
    showUnassignedDrawer, 
    showConfirmedDrawer,
    showCelebration,
    showTemplateManager,
    toggleTemplateManager,
    showPerformanceDashboard,
    togglePerformanceDashboard,
    isProcessing,
    saveDraft,
    dismissCelebration,
    checkCompletion,
    triggerCelebration,
    points,
    equipmentInstances,
    templates,
    addConsoleMessage
  } = useGroupingStore();

  const [mlProcessingStatus, setMlProcessingStatus] = useState<'idle' | 'loading' | 'processing' | 'complete' | 'error'>('idle');
  const [processingError, setProcessingError] = useState<string | null>(null);

  useEffect(() => {
    // Load data using ML pipeline on mount
    loadDataFromMLPipeline();
  }, []);

  const loadDataFromMLPipeline = async () => {
    try {
      setMlProcessingStatus('loading');
      setProcessingError(null);
      
      addConsoleMessage({
        level: 'info',
        message: 'Initializing ML pipeline data loading...'
      });

      // First, try to get data from the SkySpark API
      const pointsResponse = await fetch('/api/points');
      const pointsResult = await pointsResponse.json();
      
      if (!pointsResult.success) {
        throw new Error(pointsResult.error || 'Failed to fetch points data');
      }

      const sourceMessage = pointsResult.source === 'skyspark' 
        ? `Connected to SkySpark API - loaded ${pointsResult.data.length} points`
        : pointsResult.source === 'mock_fallback'
        ? `SkySpark connection failed (${pointsResult.error}), using mock data`
        : `Using mock data - ${pointsResult.data.length} points loaded`;
        
      addConsoleMessage({
        level: pointsResult.source === 'skyspark' ? 'success' : 'warning',
        message: sourceMessage
      });

      // Convert the points data to a file-like structure for ML processing
      setMlProcessingStatus('processing');
      addConsoleMessage({
        level: 'info',
        message: 'Processing data through ML pipeline (K-Modes clustering + Project Haystack tagging)...'
      });

      const processedData = await processDataThroughMLPipeline(pointsResult.data);
      
      // Load the processed data into the store
      loadProcessedData(processedData);
      
      setMlProcessingStatus('complete');
      addConsoleMessage({
        level: 'success',
        message: `ML pipeline processing complete! Generated ${processedData.equipmentInstances.length} equipment clusters with ${processedData.equipmentTemplates.length} templates.`
      });
      
      // Check for completion after data loads
      setTimeout(() => {
        checkCompletion();
      }, 500);
      
    } catch (error) {
      console.error('ML pipeline loading error:', error);
      setMlProcessingStatus('error');
      setProcessingError(error instanceof Error ? error.message : 'Unknown error');
      
      addConsoleMessage({
        level: 'error',
        message: `ML pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}. Using fallback data.`
      });
      
      // Fallback to mock data with basic processing
      await loadFallbackData();
    }
  };

  const processDataThroughMLPipeline = async (pointsData: any[]) => {
    // Create a mock file structure to simulate file upload for the ML pipeline
    const mockTrioContent = pointsData.map(point => {
      // Convert point data back to trio format for ML processing
      const tags = [];
      if (point.unit) tags.push(`unit:${point.unit}`);
      if (point.kind) tags.push(`kind:${point.kind}`);
      if (point.equipRef) tags.push(`equipRef:${point.equipRef}`);
      if (point.point) tags.push('point');
      if (point.sensor) tags.push('sensor');
      if (point.cmd) tags.push('cmd');
      if (point.writable) tags.push('writable');
      
      return `${point.dis} ${tags.join(' ')}`;
    }).join('\n');

    const mockFile = new File([mockTrioContent], 'api-data.trio', {
      type: 'text/plain'
    });

    // Process through the upload endpoint (ML pipeline)
    const formData = new FormData();
    formData.append('file_0', mockFile);

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const uploadResult = await uploadResponse.json();
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'ML pipeline processing failed');
    }

    return uploadResult.data;
  };

  const loadFallbackData = async () => {
    try {
      addConsoleMessage({
        level: 'warning',
        message: 'Loading fallback data with basic processing...'
      });

      // Create a basic processed result structure for fallback
      const fallbackResult = {
        equipmentInstances: mockBACnetPoints
          .filter(point => point.equipRef)
          .reduce((acc, point) => {
            const existingEquip = acc.find(eq => eq.id === point.equipRef);
            if (existingEquip) {
              existingEquip.pointIds.push(point.id);
            } else {
              acc.push({
                id: point.equipRef!,
                name: point.equipRef!,
                typeId: 'fallback-type',
                confidence: 30, // Low confidence for fallback
                status: 'needs-review' as const,
                pointIds: [point.id],
                vendor: point.vendor,
                model: point.model,
                bacnetDeviceName: point.bacnetDeviceName
              });
            }
            return acc;
          }, [] as any[]),
        equipmentTemplates: [],
        allPoints: mockBACnetPoints.map(point => ({
          ...point,
          status: point.equipRef ? 'suggested' as const : 'unassigned' as const
        }))
      };

      loadProcessedData(fallbackResult);
      setMlProcessingStatus('complete');
      
      addConsoleMessage({
        level: 'warning',
        message: `Fallback data loaded: ${fallbackResult.equipmentInstances.length} equipment instances from ${fallbackResult.allPoints.length} points.`
      });
      
    } catch (fallbackError) {
      console.error('Fallback loading also failed:', fallbackError);
      setMlProcessingStatus('error');
      setProcessingError('Both ML pipeline and fallback data loading failed');
      
      addConsoleMessage({
        level: 'error',
        message: 'Critical error: Unable to load any data. Please refresh the page.'
      });
    }
  };

  const handleRefreshData = async () => {
    await loadDataFromMLPipeline();
  };

  // Auto-save drafts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [saveDraft]);

  const getProcessingStatusDisplay = () => {
    switch (mlProcessingStatus) {
      case 'loading':
        return { text: 'Loading data...', color: 'text-blue-600' };
      case 'processing':
        return { text: 'ML Pipeline Processing...', color: 'text-purple-600' };
      case 'complete':
        return { text: 'Ready', color: 'text-green-600' };
      case 'error':
        return { text: 'Error', color: 'text-red-600' };
      default:
        return { text: 'Initializing...', color: 'text-gray-600' };
    }
  };

  const statusDisplay = getProcessingStatusDisplay();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Equipment Point Grouping
              </h1>
              <div className="ml-4 flex items-center">
                {(isProcessing || mlProcessingStatus === 'loading' || mlProcessingStatus === 'processing') && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
                <span className={`ml-2 text-sm ${statusDisplay.color}`}>
                  {statusDisplay.text}
                </span>
                {processingError && (
                  <span className="ml-2 text-xs text-red-500" title={processingError}>
                    ⚠️
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefreshData}
                disabled={isProcessing || mlProcessingStatus === 'loading' || mlProcessingStatus === 'processing'}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {(isProcessing || mlProcessingStatus === 'loading' || mlProcessingStatus === 'processing') ? 'Processing...' : 'Refresh Data'}
              </button>
              <button
                onClick={() => useGroupingStore.getState().saveDraft()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Save Draft
              </button>
              <button
                onClick={checkCompletion}
                className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-md hover:bg-purple-100"
              >
                Check Complete
              </button>
              <button
                onClick={triggerCelebration}
                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-md hover:bg-green-100"
              >
                🎉 Test Celebration
              </button>
              <button
                onClick={() => useGroupingStore.getState().finalize()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Validate & Publish
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Top Stats Panel */}
      <TopStatsPanel />

      {/* Main Layout - Full Width */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* Left Rail */}
          <div className="lg:col-span-2">
            <LeftRail />
          </div>

          {/* Main Panel - Takes up 2/3 of the space */}
          <div className="lg:col-span-8">
            <MainPanel />
          </div>

          {/* Right Rail - Smaller */}
          <div className="lg:col-span-2">
            <RightRail />
          </div>
        </div>
      </div>

      {/* Unassigned Points Drawer */}
      {showUnassignedDrawer && <UnassignedPointsDrawer />}
      
      {/* Confirmed Equipment Drawer */}
      {showConfirmedDrawer && <ConfirmedEquipmentDrawer />}
      
      {/* Success Celebration */}
      <SuccessCelebration
        isVisible={showCelebration}
        onComplete={dismissCelebration}
        stats={{
          totalPoints: points.length,
          equipmentCount: equipmentInstances.filter(eq => eq.status === 'confirmed').length,
          templatesUsed: templates.length
        }}
      />
      
      {/* Template Manager */}
      <TemplateManager
        isOpen={showTemplateManager}
        onClose={toggleTemplateManager}
      />
      
      {/* Anomaly Panel */}
      <AnomalyPanel />

      {/* Performance Dashboard */}
      <PerformanceDashboard
        isVisible={showPerformanceDashboard}
        onClose={togglePerformanceDashboard}
      />
    </div>
  );
}