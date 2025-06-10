'use client';

import { Card } from './ui/Card';
import { useGroupingStore } from '../lib/store';

export function LeftRail() {
  const { 
    selectedGroupingMethod, 
    setGroupingMethod, 
    stats, 
    consoleMessages,
    equipmentTypes 
  } = useGroupingStore();

  // Get confirmed equipment for display
  const confirmedEquipment = useGroupingStore(state => 
    state.equipmentInstances.filter(eq => eq.status === 'confirmed')
  );

  return (
    <div className="space-y-6">
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
          </div>
        </Card.Content>
      </Card>

      {/* Grouping Method */}
      <Card>
        <Card.Header>
          <Card.Title>Grouping Method</Card.Title>
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
                <option value="smart">Smart Grouping</option>
              </select>
            </div>
            
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

      {/* Data Statistics - Hidden for this concept, retained for future use */}
      {false && (
        <Card>
          <Card.Header>
            <Card.Title>Data Statistics</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalPoints}
                  </div>
                  <div className="text-xs text-gray-600">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.assignedPoints}
                  </div>
                  <div className="text-xs text-gray-600">Assigned</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.equipmentGroups}
                </div>
                <div className="text-xs text-gray-600">Equipment</div>
              </div>

              {/* Equipment Distribution */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Equipment Types</div>
                {equipmentTypes.map(type => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{type.name}</span>
                  </div>
                ))}
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