import React, { useState, useMemo } from 'react';
import { EquipmentInstance, BACnetPoint } from '../lib/types';

interface EquipmentVisualizationProps {
  equipment: EquipmentInstance[];
  points: BACnetPoint[];
  width?: number;
  height?: number;
  onEquipmentClick?: (equipment: EquipmentInstance) => void;
  onPointClick?: (point: BACnetPoint) => void;
}

interface EquipmentNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  points: BACnetPoint[];
  confidence: number;
}

interface PointNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  value?: string;
  unit?: string;
  equipmentId: string;
}

// Equipment type to symbol mapping
const getEquipmentSymbol = (type: string) => {
  const normalizedType = type.toLowerCase();
  
  if (normalizedType.includes('rtu') || normalizedType.includes('rooftop')) {
    return 'RTU';
  } else if (normalizedType.includes('vav') || normalizedType.includes('variable')) {
    return 'VAV';
  } else if (normalizedType.includes('vvr') || normalizedType.includes('reheat')) {
    return 'VVR';
  } else if (normalizedType.includes('ahu') || normalizedType.includes('air handling')) {
    return 'AHU';
  } else if (normalizedType.includes('lighting') || normalizedType.includes('light')) {
    return 'LIGHT';
  } else if (normalizedType.includes('misc') || normalizedType.includes('miscellaneous')) {
    return 'MISC';
  }
  return 'GENERIC';
};

// Point type to color mapping
const getPointColor = (pointName: string) => {
  const name = pointName.toLowerCase();
  
  if (name.includes('temp') || name.includes('temperature')) {
    return '#ff6b6b'; // Red for temperature
  } else if (name.includes('pressure') || name.includes('press')) {
    return '#4ecdc4'; // Teal for pressure
  } else if (name.includes('flow') || name.includes('cfm') || name.includes('gpm')) {
    return '#45b7d1'; // Blue for flow
  } else if (name.includes('status') || name.includes('state') || name.includes('enable')) {
    return '#96ceb4'; // Green for status
  } else if (name.includes('setpoint') || name.includes('set')) {
    return '#feca57'; // Yellow for setpoints
  } else if (name.includes('command') || name.includes('cmd')) {
    return '#ff9ff3'; // Pink for commands
  } else if (name.includes('alarm') || name.includes('alert')) {
    return '#ff6348'; // Orange-red for alarms
  }
  return '#a8a8a8'; // Gray for unknown
};

// Equipment SVG symbols
const EquipmentSymbol: React.FC<{ 
  type: string; 
  x: number; 
  y: number; 
  size: number; 
  confidence: number;
  onClick?: () => void;
}> = ({ type, x, y, size, confidence, onClick }) => {
  const symbol = getEquipmentSymbol(type);
  const confidenceColor = confidence >= 80 ? '#22c55e' : confidence >= 60 ? '#f59e0b' : '#ef4444';
  
  const symbolElements = {
    RTU: (
      <g>
        {/* RTU Base */}
        <rect x={-size/2} y={-size/3} width={size} height={size*2/3} 
              fill="#e5e7eb" stroke="#374151" strokeWidth="2" rx="4"/>
        {/* Fan */}
        <circle cx={0} cy={0} r={size/4} fill="#6b7280" stroke="#374151" strokeWidth="1"/>
        <circle cx={0} cy={0} r={size/6} fill="#9ca3af"/>
        {/* Coils */}
        <rect x={-size/3} y={size/6} width={size/6} height={size/4} 
              fill="#dc2626" stroke="#991b1b" strokeWidth="1" rx="2"/>
        <rect x={size/6} y={size/6} width={size/6} height={size/4} 
              fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" rx="2"/>
        {/* Label */}
        <text x={0} y={size/2 + 15} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">
          RTU
        </text>
      </g>
    ),
    VAV: (
      <g>
        {/* VAV Box */}
        <rect x={-size/2} y={-size/4} width={size} height={size/2} 
              fill="#f3f4f6" stroke="#374151" strokeWidth="2" rx="3"/>
        {/* Damper */}
        <line x1={-size/3} y1={-size/6} x2={size/3} y2={size/6} 
              stroke="#6b7280" strokeWidth="3" strokeLinecap="round"/>
        {/* Actuator */}
        <circle cx={size/3} cy={-size/6} r={size/8} fill="#f59e0b" stroke="#d97706" strokeWidth="1"/>
        {/* Label */}
        <text x={0} y={size/2 + 15} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">
          VAV
        </text>
      </g>
    ),
    VVR: (
      <g>
        {/* VVR Box */}
        <rect x={-size/2} y={-size/4} width={size} height={size/2} 
              fill="#fef3c7" stroke="#374151" strokeWidth="2" rx="3"/>
        {/* Reheat Coil */}
        <rect x={-size/4} y={-size/8} width={size/2} height={size/4} 
              fill="#dc2626" stroke="#991b1b" strokeWidth="1" rx="2"/>
        {/* Damper */}
        <line x1={-size/3} y1={-size/6} x2={-size/6} y2={size/6} 
              stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
        {/* Label */}
        <text x={0} y={size/2 + 15} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">
          VVR
        </text>
      </g>
    ),
    AHU: (
      <g>
        {/* AHU Main Body */}
        <rect x={-size/2} y={-size/3} width={size} height={size*2/3} 
              fill="#ddd6fe" stroke="#374151" strokeWidth="2" rx="4"/>
        {/* Fan Section */}
        <circle cx={-size/4} cy={0} r={size/5} fill="#6b7280" stroke="#374151" strokeWidth="1"/>
        <circle cx={-size/4} cy={0} r={size/8} fill="#9ca3af"/>
        {/* Coil Section */}
        <rect x={0} y={-size/6} width={size/3} height={size/3} 
              fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" rx="2"/>
        {/* Filter */}
        <rect x={size/4} y={-size/8} width={size/8} height={size/4} 
              fill="#f59e0b" stroke="#d97706" strokeWidth="1"/>
        {/* Label */}
        <text x={0} y={size/2 + 15} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">
          AHU
        </text>
      </g>
    ),
    LIGHT: (
      <g>
        {/* Light Fixture */}
        <rect x={-size/2} y={-size/6} width={size} height={size/3} 
              fill="#fef9c3" stroke="#374151" strokeWidth="2" rx="8"/>
        {/* Light Rays */}
        <line x1={0} y1={-size/3} x2={0} y2={-size/2} stroke="#fbbf24" strokeWidth="2"/>
        <line x1={-size/4} y1={-size/4} x2={-size/3} y2={-size/3} stroke="#fbbf24" strokeWidth="2"/>
        <line x1={size/4} y1={-size/4} x2={size/3} y2={-size/3} stroke="#fbbf24" strokeWidth="2"/>
        {/* Label */}
        <text x={0} y={size/2 + 15} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">
          LIGHT
        </text>
      </g>
    ),
    MISC: (
      <g>
        {/* Generic Equipment */}
        <rect x={-size/2} y={-size/4} width={size} height={size/2} 
              fill="#f1f5f9" stroke="#374151" strokeWidth="2" rx="4"/>
        {/* Generic Symbol */}
        <circle cx={0} cy={0} r={size/6} fill="#64748b" stroke="#475569" strokeWidth="1"/>
        <text x={0} y={4} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">?</text>
        {/* Label */}
        <text x={0} y={size/2 + 15} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">
          MISC
        </text>
      </g>
    ),
    GENERIC: (
      <g>
        {/* Generic Equipment */}
        <rect x={-size/2} y={-size/4} width={size} height={size/2} 
              fill="#f8fafc" stroke="#374151" strokeWidth="2" rx="4"/>
        {/* Generic Symbol */}
        <rect x={-size/6} y={-size/8} width={size/3} height={size/4} 
              fill="#94a3b8" stroke="#64748b" strokeWidth="1" rx="2"/>
        {/* Label */}
        <text x={0} y={size/2 + 15} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">
          EQUIP
        </text>
      </g>
    )
  };

  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Confidence Ring */}
      <circle cx={0} cy={0} r={size/2 + 8} fill="none" 
              stroke={confidenceColor} strokeWidth="3" strokeDasharray="5,3" opacity="0.7"/>
      
      {/* Equipment Symbol */}
      {symbolElements[symbol as keyof typeof symbolElements] || symbolElements.GENERIC}
      
      {/* Confidence Badge */}
      <circle cx={size/2 - 5} cy={-size/2 + 5} r="12" fill={confidenceColor}/>
      <text x={size/2 - 5} y={-size/2 + 9} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
        {Math.round(confidence)}
      </text>
    </g>
  );
};

export const EquipmentVisualization: React.FC<EquipmentVisualizationProps> = ({
  equipment,
  points,
  width = 1200,
  height = 800,
  onEquipmentClick,
  onPointClick
}) => {
  const [hoveredEquipment, setHoveredEquipment] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  // Process data into visualization nodes
  const { equipmentNodes, pointNodes, connections } = useMemo(() => {
    const equipmentNodes: EquipmentNode[] = [];
    const pointNodes: PointNode[] = [];
    const connections: Array<{ equipmentId: string; pointId: string }> = [];

    // Create equipment nodes in a grid layout
    const cols = Math.ceil(Math.sqrt(equipment.length));
    const equipmentSpacing = Math.min(width / (cols + 1), 150);
    
    equipment.forEach((eq, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = (col + 1) * equipmentSpacing + (width - cols * equipmentSpacing) / 2;
      const y = (row + 1) * 120 + 80;

      // Get points for this equipment
      const equipmentPoints = points.filter(point => 
        point.equipRef === eq.id || 
        point.equipRef === eq.name ||
        (point.navName && point.navName.includes(eq.name)) ||
        (point.dis && point.dis.includes(eq.name))
      );

      equipmentNodes.push({
        id: eq.id,
        name: eq.name,
        type: eq.typeId || 'generic',
        x,
        y,
        points: equipmentPoints,
        confidence: eq.confidence || 0
      });

      // Create point nodes around equipment
      equipmentPoints.forEach((point, pointIndex) => {
        const angle = (pointIndex / equipmentPoints.length) * 2 * Math.PI;
        const radius = 80;
        const pointX = x + Math.cos(angle) * radius;
        const pointY = y + Math.sin(angle) * radius;

        pointNodes.push({
          id: point.id,
          name: point.navName || point.dis || `Point ${pointIndex + 1}`,
          type: point.kind || 'unknown',
          x: pointX,
          y: pointY,
          value: point.curVal?.toString(),
          unit: point.unit || undefined,
          equipmentId: eq.id
        });

        connections.push({
          equipmentId: eq.id,
          pointId: point.id
        });
      });
    });

    return { equipmentNodes, pointNodes, connections };
  }, [equipment, points, width, height]);

  return (
    <div className="equipment-visualization">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Equipment Visualization</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>Temperature</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span>Flow</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
            <span>Pressure</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>Status</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <svg width={width} height={height} className="w-full h-auto">
          {/* Background */}
          <rect width={width} height={height} fill="#fafafa"/>
          
          {/* Grid Pattern */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)"/>

          {/* Connection Lines */}
          {connections.map(({ equipmentId, pointId }) => {
            const equipment = equipmentNodes.find(eq => eq.id === equipmentId);
            const point = pointNodes.find(pt => pt.id === pointId);
            
            if (!equipment || !point) return null;

            const isHighlighted = hoveredEquipment === equipmentId || hoveredPoint === pointId;
            const pointColor = getPointColor(point.name);

            return (
              <line
                key={`${equipmentId}-${pointId}`}
                x1={equipment.x}
                y1={equipment.y}
                x2={point.x}
                y2={point.y}
                stroke={pointColor}
                strokeWidth={isHighlighted ? "3" : "2"}
                strokeOpacity={isHighlighted ? "0.8" : "0.4"}
                strokeDasharray={isHighlighted ? "none" : "5,5"}
              />
            );
          })}

          {/* Equipment Nodes */}
          {equipmentNodes.map((equipment) => (
            <EquipmentSymbol
              key={equipment.id}
              type={equipment.type}
              x={equipment.x}
              y={equipment.y}
              size={60}
              confidence={equipment.confidence}
              onClick={() => {
                onEquipmentClick?.(equipment as any);
                setHoveredEquipment(equipment.id);
              }}
            />
          ))}

          {/* Point Nodes */}
          {pointNodes.map((point) => {
            const isHighlighted = hoveredPoint === point.id || hoveredEquipment === point.equipmentId;
            const pointColor = getPointColor(point.name);

            return (
              <g key={point.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHighlighted ? "8" : "6"}
                  fill={pointColor}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onPointClick?.(point as any)}
                  onMouseEnter={() => setHoveredPoint(point.id)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                
                {/* Point Label */}
                {isHighlighted && (
                  <g>
                    <rect
                      x={point.x - 40}
                      y={point.y - 25}
                      width="80"
                      height="20"
                      fill="rgba(0,0,0,0.8)"
                      rx="4"
                    />
                    <text
                      x={point.x}
                      y={point.y - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="white"
                      fontWeight="bold"
                    >
                      {point.name.length > 12 ? point.name.substring(0, 12) + '...' : point.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Equipment Labels */}
          {equipmentNodes.map((equipment) => {
            const isHighlighted = hoveredEquipment === equipment.id;
            
            return isHighlighted ? (
              <g key={`label-${equipment.id}`}>
                <rect
                  x={equipment.x - 60}
                  y={equipment.y + 50}
                  width="120"
                  height="40"
                  fill="rgba(0,0,0,0.9)"
                  rx="6"
                />
                <text
                  x={equipment.x}
                  y={equipment.y + 65}
                  textAnchor="middle"
                  fontSize="12"
                  fill="white"
                  fontWeight="bold"
                >
                  {equipment.name}
                </text>
                <text
                  x={equipment.x}
                  y={equipment.y + 80}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#d1d5db"
                >
                  {equipment.points.length} points • {Math.round(equipment.confidence)}% confidence
                </text>
              </g>
            ) : null;
          })}
        </svg>
      </div>

      {/* Statistics Panel */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-gray-500">Equipment</div>
          <div className="text-xl font-bold text-gray-800">{equipmentNodes.length}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-gray-500">Points</div>
          <div className="text-xl font-bold text-gray-800">{pointNodes.length}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-gray-500">Connections</div>
          <div className="text-xl font-bold text-gray-800">{connections.length}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-gray-500">Avg Confidence</div>
          <div className="text-xl font-bold text-gray-800">
            {equipmentNodes.length > 0 
              ? Math.round(equipmentNodes.reduce((sum, eq) => sum + eq.confidence, 0) / equipmentNodes.length)
              : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}; 