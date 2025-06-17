'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { EquipmentTemplate } from '@/lib/types';

interface RichTemplateCardProps {
  template: EquipmentTemplate;
  onFindSimilar: (templateId: string) => void;
  onExport: (templateId: string) => void;
  onInspect: (template: EquipmentTemplate) => void;
  onActivate: (templateId: string) => void;
  onDeactivate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
}

const getEffectivenessColor = (successRate: number) => {
  if (successRate >= 0.8) return 'text-green-600 bg-green-100';
  if (successRate >= 0.6) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

const getConfidenceEmoji = (confidence?: number) => {
  if (!confidence) return '❓';
  if (confidence >= 0.9) return '🎯';
  if (confidence >= 0.7) return '✅';
  if (confidence >= 0.5) return '⚠️';
  return '❌';
};

export function RichTemplateCard({
  template,
  onFindSimilar,
  onExport,
  onInspect,
  onActivate,
  onDeactivate,
  onDelete,
}: RichTemplateCardProps) {
  return (
    <Card key={template.id} className="hover:shadow-lg transition-shadow flex-shrink-0 w-80">
      <Card.Header>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Card.Title className="text-sm font-medium truncate">
              {template.name}
            </Card.Title>
            <div className="flex items-center space-x-2 mt-1">
              <Badge 
                variant={template.isMLGenerated ? "primary" : "outline"}
                size="sm"
              >
                {template.isMLGenerated ? 'ML' : 'User'}
              </Badge>
              <Badge 
                variant={template.isActive ? "success" : "secondary"}
                size="sm"
              >
                {template.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <div className="text-lg">
            {getConfidenceEmoji(template.confidence)}
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <div className="space-y-3">
          <div className="text-xs text-gray-600 h-8 overflow-hidden">
            {template.description || 'No description'}
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Points:</span>
            <span className="font-medium">{template.pointSignature.length}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Applied:</span>
            <span className="font-medium">{template.appliedCount}x</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Success Rate:</span>
            <span className={`font-medium px-2 py-1 rounded ${getEffectivenessColor(template.effectiveness?.successRate || 0)}`}>
              {Math.round((template.effectiveness?.successRate || 0) * 100)}%
            </span>
          </div>

          <div className="flex flex-wrap gap-1 h-5 overflow-hidden">
            {template.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" size="sm" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" size="sm" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFindSimilar(template.id)}
              className="flex-1"
            >
              <MagnifyingGlassIcon className="w-3 h-3 mr-1" />
              Find Similar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onInspect(template)}
            >
              <ClipboardDocumentListIcon className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExport(template.id)}
            >
              <DocumentArrowDownIcon className="w-3 h-3" />
            </Button>
            {template.isActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeactivate(template.id)}
              >
                <XMarkIcon className="w-3 h-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onActivate(template.id)}
              >
                <CheckIcon className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(template.id)}
            >
              <TrashIcon className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
