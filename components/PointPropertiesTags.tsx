import React from 'react';

interface PointPropertiesTagsProps {
  point: any;
}

const PointPropertiesTags: React.FC<PointPropertiesTagsProps> = ({ point }) => {
  // Define the 6 allowed BACnet markers according to Project Haystack standards
  const allowedMarkers = ['bacnetPoint', 'cmd', 'cur', 'his', 'point', 'writable'];
  
  // Define marker descriptions for tooltips
  const markerDescriptions: Record<string, string> = {
    bacnetPoint: 'BACnet point reference',
    cmd: 'Command point (writable)',
    cur: 'Current value available',
    his: 'Historical data available',
    point: 'Data point marker',
    writable: 'Point supports writing'
  };

  // Define colors for each marker type
  const markerColors: Record<string, string> = {
    bacnetPoint: 'bg-blue-100 text-blue-800 border-blue-200',
    cmd: 'bg-purple-100 text-purple-800 border-purple-200', 
    cur: 'bg-green-100 text-green-800 border-green-200',
    his: 'bg-orange-100 text-orange-800 border-orange-200',
    point: 'bg-gray-100 text-gray-800 border-gray-200',
    writable: 'bg-red-100 text-red-800 border-red-200'
  };

  // Extract valid markers from the point
  const extractMarkers = (point: any): string[] => {
    const markers: string[] = [];
    
    // Check for each allowed marker in the point properties
    allowedMarkers.forEach(marker => {
      // Handle both boolean properties and SkySpark 'M' marker format
      const value = point[marker];
      if (value === true || value === 'M' || value === 'm') {
        markers.push(marker);
      }
    });
    
    return markers;
  };

  const validMarkers = extractMarkers(point);

  if (validMarkers.length === 0) {
    return (
      <span className="text-xs text-gray-500 italic">
        No BACnet markers
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {validMarkers.map((marker) => (
        <span
          key={marker}
          title={markerDescriptions[marker]}
          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${markerColors[marker]} cursor-help`}
        >
          {marker}
        </span>
      ))}
    </div>
  );
};

export default PointPropertiesTags; 