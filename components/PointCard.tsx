import React from 'react';
import { Badge } from './ui/Badge';
import { IconButton } from './ui/IconButton';
import { CheckIcon, LinkSlashIcon, FlagIcon } from '@heroicons/react/24/outline';
import { BACnetPoint } from '../lib/types';
import PointPropertiesTags from './PointPropertiesTags';

// Copied from PointPropertiesTags.tsx
const ALLOWED_MARKERS = [
  'bacnetPoint',
  'cmd',
  'cur', 
  'his',
  'point',
  'writable'
] as const;

type AllowedMarker = typeof ALLOWED_MARKERS[number];

function extractMarkers(point: any): string[] {
  const markers: string[] = [];
  
  if (point.markers && Array.isArray(point.markers)) {
    const allowedFromArray = point.markers.filter((marker: string) => 
      ALLOWED_MARKERS.includes(marker as AllowedMarker)
    );
    markers.push(...allowedFromArray);
  } else {
    if (point.point === 'M' || point.point === true) markers.push('point');
    if (point.cmd === 'M' || point.cmd === true) markers.push('cmd');
    if (point.cur === 'M' || point.cur === true) markers.push('cur');
    if (point.his === 'M' || point.his === true) markers.push('his');
    if (point.writable === 'M' || point.writable === true) markers.push('writable');
    if (point.bacnetPoint === 'M' || point.bacnetPoint === true) markers.push('bacnetPoint');
  }
  
  if (!markers.includes('point')) {
    markers.unshift('point');
  }
  
  return markers;
}

interface PointCardProps {
  point: BACnetPoint;
  equipmentName?: string;
  equipmentType?: string;
  onConfirm: (pointId: string) => void;
  onUnassign: (pointId: string) => void;
  onFlag: (pointId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function PointCard({
  point,
  equipmentName,
  equipmentType,
  onConfirm,
  onUnassign,
  onFlag,
  showActions = true,
  compact = false
}: PointCardProps) {
  const getDisplayName = (point: BACnetPoint) => {
    return point.navName || point.dis || point.bacnetDis || 'Unnamed Point';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const formatConfidence = (confidence: number) => {
    const percentage = confidence > 1 ? confidence : confidence * 100;
    return `${Math.round(percentage)}%`;
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-600 text-white" size="sm">Confirmed</Badge>;
      case 'flagged':
        return <Badge className="bg-orange-500 text-white" size="sm">Flagged</Badge>;
      case 'suggested':
        return <Badge variant="outline" size="sm">Suggested</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Unassigned</Badge>;
    }
  };

  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-md p-3">
        <div className="flex items-center justify-between">
          {/* Point Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium text-gray-900 truncate">
                {getDisplayName(point)}
              </span>
              <Badge variant="secondary" size="sm">
                {point.bacnetCur}
              </Badge>
              {point.unit && (
                <Badge variant="outline" size="sm">
                  {point.unit}
                </Badge>
              )}
            </div>
            
            {/* Point Description */}
            {(point.bacnetDesc || point.bacnetDis) && (
              <div className="text-xs text-gray-600 mb-1">
                {point.bacnetDesc || point.bacnetDis}
              </div>
            )}

            <div className="flex items-center justify-between">
              <PointPropertiesTags tags={extractMarkers(point)} />
              <div className="text-xs text-gray-500">
                File: {point.fileName || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Actions and Status */}
          <div className="ml-3 flex items-center space-x-2">
            {showActions && point.status !== 'confirmed' && (
              <>
                <IconButton
                  icon={<CheckIcon className="w-4 h-4" />}
                  onClick={() => onConfirm(point.id)}
                  tooltip="Confirm point-equipment association"
                  variant="confirm"
                />
                <IconButton
                  icon={<LinkSlashIcon className="w-4 h-4" />}
                  onClick={() => onUnassign(point.id)}
                  tooltip="Unassign point from equipment"
                  variant="unassign"
                />
                <IconButton
                  icon={<FlagIcon className="w-4 h-4" />}
                  onClick={() => onFlag(point.id)}
                  tooltip="Flag point for review"
                  variant="flag"
                />
              </>
            )}
            
            {showActions && point.status === 'confirmed' && (
              <IconButton
                icon={<LinkSlashIcon className="w-4 h-4" />}
                onClick={() => onUnassign(point.id)}
                tooltip="Unassign confirmed point"
                variant="unassign"
              />
            )}
            
            {getStatusBadge(point.status)}
          </div>
        </div>
      </div>
    );
  }

  // Full point card layout
  return (
    <div className="bg-white border rounded-lg p-6 relative">
      {/* Point Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1 font-detail" style={{ color: '#2c3e50' }}>
            {getDisplayName(point)}
          </h3>
          <div className="flex items-center space-x-2">
            {equipmentType && equipmentName && (
              <span className="text-base text-gray-600 font-medium">
                {equipmentType} → {equipmentName}
              </span>
            )}
            {/* Point Confidence Score */}
            {point.confidence && (
              <Badge 
                variant="outline" 
                className={`${getConfidenceColor(point.confidence)} border text-xs`}
              >
                {formatConfidence(point.confidence)}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Action Icons */}
        <div className="flex items-center space-x-2">
          {showActions && point.status !== 'confirmed' && (
            <>
              <IconButton
                icon={<CheckIcon className="w-5 h-5" />}
                onClick={() => onConfirm(point.id)}
                tooltip="Confirm point-equipment association"
                variant="confirm"
                size="md"
              />
              <IconButton
                icon={<LinkSlashIcon className="w-5 h-5" />}
                onClick={() => onUnassign(point.id)}
                tooltip="Unassign point from equipment"
                variant="unassign"
                size="md"
              />
              <IconButton
                icon={<FlagIcon className="w-5 h-5" />}
                onClick={() => onFlag(point.id)}
                tooltip="Flag point for review"
                variant="flag"
                size="md"
              />
            </>
          )}
          
          {showActions && point.status === 'confirmed' && (
            <IconButton
              icon={<LinkSlashIcon className="w-5 h-5" />}
              onClick={() => onUnassign(point.id)}
              tooltip="Unassign confirmed point"
              variant="unassign"
              size="md"
            />
          )}
          
          {getStatusBadge(point.status)}
        </div>
      </div>

      {/* Point Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-sm font-medium text-gray-500">BACnet ID</div>
          <div className="text-sm text-gray-900">{point.bacnetCur || 'N/A'}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Description</div>
          <div className="text-sm text-gray-900">{point.bacnetDesc || point.bacnetDis || '-'}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Device Location</div>
          <div className="text-sm text-gray-900">{point.bacnetDeviceName || '-'}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Unit</div>
          <div className="text-sm text-gray-900">{point.unit || '°F'}</div>
        </div>
      </div>

      {/* Point Properties */}
      <div className="flex items-center justify-between">
        <PointPropertiesTags tags={extractMarkers(point)} />
        <div className="text-sm text-gray-500">
          Source File: {point.fileName || 'Unknown'}
        </div>
      </div>
    </div>
  );
} 