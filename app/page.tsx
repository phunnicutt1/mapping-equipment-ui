'use client';

import { useEffect } from 'react';
import { useGroupingStore } from '../lib/store';
import { LeftRail } from '../components/LeftRail';
import { MainPanel } from '../components/MainPanel';
import { RightRail } from '../components/RightRail';
import { UnassignedPointsDrawer } from '../components/UnassignedPointsDrawer';
import { TopStatsPanel } from '../components/TopStatsPanel';
import { ConfirmedEquipmentDrawer } from '../components/ConfirmedEquipmentDrawer';
import { SuccessCelebration } from '../components/SuccessCelebration';
import { mockBACnetPoints } from '../lib/mock-data';

export default function HomePage() {
  const { 
    loadPoints, 
    showUnassignedDrawer, 
    showConfirmedDrawer,
    showCelebration,
    isProcessing,
    saveDraft,
    dismissCelebration,
    checkCompletion,
    triggerCelebration,
    points,
    equipmentInstances,
    templates
  } = useGroupingStore();

  useEffect(() => {
    // Load data from API on mount
    loadDataFromAPI();
  }, [loadPoints]);

  const loadDataFromAPI = async () => {
    try {
      const response = await fetch('/api/points');
      const result = await response.json();
      
      if (result.success) {
        console.log('Data loaded from:', result.source);
        
        // Add console message about data source
        const sourceMessage = result.source === 'skyspark' 
          ? `Connected to SkySpark API - loaded ${result.data.length} points`
          : result.source === 'mock_fallback'
          ? `SkySpark connection failed (${result.error}), using mock data`
          : `Using mock data - ${result.data.length} points loaded`;
          
        setTimeout(() => {
          useGroupingStore.getState().addConsoleMessage({
            level: result.source === 'skyspark' ? 'success' : 'warning',
            message: sourceMessage
          });
        }, 100);
        
        if (result.error) {
          console.warn('API warning:', result.error);
        }
        loadPoints(result.data);
        
        // Check for completion after data loads
        setTimeout(() => {
          useGroupingStore.getState().checkCompletion();
        }, 500);
      } else {
        console.error('Failed to load data, using fallback');
        loadPoints(mockBACnetPoints);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      loadPoints(mockBACnetPoints);
    }
  };

  // Auto-save drafts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [saveDraft]);



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
              {isProcessing && (
                <div className="ml-4 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Processing...</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadDataFromAPI}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {isProcessing ? 'Loading...' : 'Refresh Data'}
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
    </div>
  );
}