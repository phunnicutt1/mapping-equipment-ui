import React from 'react';

interface PointPropertiesTagsProps {
  tags?: string[];
  className?: string;
}

// Allowed BACnet marker tags according to Project Haystack
const ALLOWED_MARKERS = [
  'bacnetPoint',
  'cmd',
  'cur', 
  'his',
  'point',
  'writable'
] as const;

type AllowedMarker = typeof ALLOWED_MARKERS[number];

// Tag styling configurations
const TAG_STYLES: Record<AllowedMarker, string> = {
  'point': 'bg-blue-100 text-blue-800 border-blue-200',
  'cmd': 'bg-orange-100 text-orange-800 border-orange-200',
  'cur': 'bg-green-100 text-green-800 border-green-200',
  'his': 'bg-purple-100 text-purple-800 border-purple-200',
  'writable': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bacnetPoint': 'bg-gray-100 text-gray-800 border-gray-200'
};

// Tag display names (for better UX)
const TAG_LABELS: Record<AllowedMarker, string> = {
  'point': 'Point',
  'cmd': 'Command',
  'cur': 'Current',
  'his': 'Historized',
  'writable': 'Writable',
  'bacnetPoint': 'BACnet'
};

// Validate tags according to Project Haystack rules
function validateTags(markers: string[]): { valid: AllowedMarker[], invalid: string[] } {
  const valid: AllowedMarker[] = [];
  const invalid: string[] = [];
  
  markers.forEach(marker => {
    if (ALLOWED_MARKERS.includes(marker as AllowedMarker)) {
      valid.push(marker as AllowedMarker);
    } else {
      invalid.push(marker);
    }
  });
  
  return { valid, invalid };
}

// Extract markers from point object - ONLY the 6 allowed markers
function extractMarkers(point: any): string[] {
  const markers: string[] = [];
  
  // Handle different point data structures but ONLY extract allowed markers
  if (point.markers && Array.isArray(point.markers)) {
    // Filter the markers array to only include allowed markers
    const allowedFromArray = point.markers.filter((marker: string) => 
      ALLOWED_MARKERS.includes(marker as AllowedMarker)
    );
    markers.push(...allowedFromArray);
  } else {
    // Check individual properties but ONLY for the 6 allowed markers
    // Note: In SkySpark data, 'M' typically means the marker is present
    if (point.point === 'M' || point.point === true) markers.push('point');
    if (point.cmd === 'M' || point.cmd === true) markers.push('cmd');
    if (point.cur === 'M' || point.cur === true) markers.push('cur');
    if (point.his === 'M' || point.his === true) markers.push('his');
    if (point.writable === 'M' || point.writable === true) markers.push('writable');
    if (point.bacnetPoint === 'M' || point.bacnetPoint === true) markers.push('bacnetPoint');
  }
  
  // Ensure 'point' marker is always present (Project Haystack requirement)
  if (!markers.includes('point')) {
    markers.unshift('point');
  }
  
  return markers;
}

export function PointPropertiesTags({ tags = [], className = '' }: PointPropertiesTagsProps) {
  const { valid: validMarkers } = validateTags(tags);
  
  if (validMarkers.length === 0) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <span className="text-xs text-gray-500 italic">No valid properties</span>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {validMarkers.map(marker => (
        <span
          key={marker}
          className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
            ${TAG_STYLES[marker]}
            transition-colors duration-200 hover:opacity-80
          `}
          title={`${TAG_LABELS[marker]} marker - ${getMarkerDescription(marker)}`}
        >
          {TAG_LABELS[marker]}
        </span>
      ))}
    </div>
  );
}

// Helper function to provide descriptions for markers
function getMarkerDescription(marker: AllowedMarker): string {
  switch (marker) {
    case 'point':
      return 'Indicates this is a point entity';
    case 'cmd':
      return 'Command/output point (AO/BO)';
    case 'cur':
      return 'Has current real-time value';
    case 'his':
      return 'Historized/logged point';
    case 'writable':
      return 'Writable point with priority array';
    case 'bacnetPoint':
      return 'BACnet protocol point';
    default:
      return 'Unknown marker';
  }
}

export default PointPropertiesTags; 