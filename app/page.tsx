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
    setProcessedData, // Direct data setter to avoid duplicate processing
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
    stats,
    addConsoleMessage
  } = useGroupingStore();

  const [mlProcessingStatus, setMlProcessingStatus] = useState<'idle' | 'loading' | 'processing' | 'complete' | 'error'>('idle');
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Removed automatic data loading - interface now waits for user file uploads
  // useEffect(() => {
  //   loadDataFromMLPipeline();
  // }, []);

  // Removed automatic data loading functions - interface now waits for user file uploads

  // All data loading functions removed - interface waits for user file uploads

  // Auto-save drafts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [saveDraft]);

  const getProcessingStatusDisplay = () => {
    // Show "Awaiting trio files upload" when no data is loaded
    if (points.length === 0 && equipmentInstances.length === 0) {
      return {
        text: 'Awaiting trio files upload',
        color: 'text-gray-500'
      };
    }

    switch (mlProcessingStatus) {
      case 'loading':
        return { text: 'Loading data...', color: 'text-blue-600' };
      case 'processing':
        return { text: 'Processing through ML pipeline...', color: 'text-purple-600' };
      case 'complete':
        return { text: 'Ready for mapping', color: 'text-green-600' };
      case 'error':
        return { text: 'Error occurred', color: 'text-red-600' };
      default:
        return { text: 'Ready for file upload', color: 'text-gray-600' };
    }
  };

  const statusDisplay = getProcessingStatusDisplay();

  // Test dataset loading removed - interface waits for user file uploads

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
              {/* Removed data source toggles and refresh button - interface waits for file uploads */}
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