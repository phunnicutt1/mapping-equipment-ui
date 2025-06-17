'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useGroupingStore } from '../lib/store';
import { getEquipmentDisplayName, getEquipmentTypeBorderColor } from '../lib/utils';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  CubeIcon, 
  BeakerIcon, 
  RectangleGroupIcon, 
  StarIcon, 
  DocumentArrowDownIcon, 
  MagnifyingGlassIcon, 
  CheckIcon 
} from '@heroicons/react/24/outline';
import PointPropertiesTags from './PointPropertiesTags';
import { EquipmentVisualization } from './EquipmentVisualization';
import { PointCard } from './PointCard';
import { RichTemplateCard } from './mapping/RichTemplateCard';
import { InspectTemplateModal } from './modals/InspectTemplateModal';
import { EquipmentTemplate } from '@/lib/types';

export function MainPanel() {
  const { 
    equipmentInstances,
    points,
    equipmentTypes,
    getPointsForEquipment,
    confirmPoint,
    unassignPoint,
    flagPoint,
    templates,
    suggestedTemplates,
    confirmEquipment, 
    flagEquipment,
    confirmAllEquipmentPoints,
    toggleUnassignedDrawer,
    toggleConfirmedDrawer,
    createTemplate,
    assignPoints,
    checkCompletion,
    triggerCelebration,
    findSimilarTemplates,
    exportTemplate,
    addTemplateFeedback,
    activateTemplate,
    deactivateTemplate,
    deleteTemplate,
    inspectTemplatePoints,
  } = useGroupingStore(state => ({
    equipmentInstances: state.equipmentInstances,
    points: state.points,
    equipmentTypes: state.equipmentTypes,
    getPointsForEquipment: (equipmentId: string) => 
      state.points.filter(p => p.equipRef === equipmentId),
    confirmPoint: state.confirmPoint,
    unassignPoint: state.unassignPoint,
    flagPoint: state.flagPoint,
    templates: state.templates,
    suggestedTemplates: state.suggestedTemplates,
    confirmEquipment: state.confirmEquipment,
    flagEquipment: state.flagEquipment,
    confirmAllEquipmentPoints: state.confirmAllEquipmentPoints,
    toggleUnassignedDrawer: state.toggleUnassignedDrawer,
    toggleConfirmedDrawer: state.toggleConfirmedDrawer,
    createTemplate: state.createTemplate,
    assignPoints: state.assignPoints,
    checkCompletion: state.checkCompletion,
    triggerCelebration: state.triggerCelebration,
    findSimilarTemplates: state.findSimilarTemplates,
    exportTemplate: state.exportTemplate,
    addTemplateFeedback: state.addTemplateFeedback,
    activateTemplate: state.activateTemplate,
    deactivateTemplate: state.deactivateTemplate,
    deleteTemplate: state.deleteTemplate,
    inspectTemplatePoints: state.inspectTemplatePoints,
  }));

  const [viewMode, setViewMode] = useState<'list' | 'visualization'>('list');
  const [expandedEquipmentTypes, setExpandedEquipmentTypes] = useState<Set<string>>(new Set());
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showClusterInfo, setShowClusterInfo] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EquipmentTemplate | null>(null);

  const toggleEquipmentType = (typeId: string) => {
    const newExpanded = new Set(expandedEquipmentTypes);
    newExpanded.has(typeId) ? newExpanded.delete(typeId) : newExpanded.add(typeId);
    setExpandedEquipmentTypes(newExpanded);
  };

  const toggleEquipment = (equipmentId: string) => {
    const newExpanded = new Set(expandedEquipment);
    newExpanded.has(equipmentId) ? newExpanded.delete(equipmentId) : newExpanded.add(equipmentId);
    setExpandedEquipment(newExpanded);
  };

  const getEquipmentForType = (typeId: string) => equipmentInstances.filter(equipment => 
    equipment.typeId === typeId && equipment.status !== 'confirmed'
  );

  const getConfirmedPointsForEquipment = (equipmentId: string) => points.filter(point => 
    point.equipRef === equipmentId && point.status === 'confirmed'
  );

  const handleCreateTemplate = async (equipmentId: string, equipmentName: string) => {
    if (getConfirmedPointsForEquipment(equipmentId).length === 0) {
      alert('Please confirm at least one point before creating a template.');
      return;
    }
    const templateName = prompt(`Enter template name for ${equipmentName}:`, `${equipmentName} Template`);
    if (templateName) {
      try {
        const result = await createTemplate(equipmentId, templateName);
        if (result.success) {
          alert(`Template created successfully!${result.appliedCount ? `\n\nAutomatically applied to ${result.appliedCount} similar equipment instances.` : ''}`);
        }
      } catch (error) {
        console.error('Error creating template:', error);
        alert('Failed to create template. Please try again.');
      }
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 1.0) return 'text-green-700 bg-green-100 font-semibold border-green-300';
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const handleFindSimilar = async (templateId: string) => {
    await findSimilarTemplates(templateId);
    alert('Finding similar templates... check the Template Manager for results.');
  };

  const handleExportTemplate = async (templateId: string) => {
    await exportTemplate(templateId);
    alert('Template exported.');
  };

  const handleAddFeedback = (template: EquipmentTemplate) => {
    setSelectedTemplate(template);
    setShowFeedbackModal(true); // Placeholder for modal logic
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      deleteTemplate(templateId);
    }
  };

  const unassignedCount = points.filter(p => !p.equipRef).length;
  const confirmedCount = equipmentInstances.filter(eq => eq.status === 'confirmed').length;

  const equipmentByType = (equipmentTypes || []).reduce((acc, type) => {
    const equipmentForType = getEquipmentForType(type.id);
    if (equipmentForType.length > 0) {
      acc[type.id] = { type, equipment: equipmentForType };
    }
    return acc;
  }, {} as Record<string, { type: any; equipment: any[] }>);

  const hasUnconfirmedEquipment = Object.keys(equipmentByType).length > 0;
  const allTemplates = [...(templates || []), ...(suggestedTemplates || [])];

  return (
    <>
      <div className="space-y-6">
        {/* Horizontally Scrolling Template Cards */}
        {allTemplates.length > 0 && (
          <Card>
            <Card.Header>
              <Card.Title>Recommended Templates</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="w-full overflow-x-auto pb-2">
                <div className="flex space-x-4">
                  {allTemplates.map(template => (
                    <RichTemplateCard
                      key={template.id}
                      template={template}
                      onFindSimilar={handleFindSimilar}
                      onExport={handleExportTemplate}
                      onInspect={inspectTemplatePoints}
                      onActivate={activateTemplate}
                      onDeactivate={deactivateTemplate}
                      onDelete={handleDeleteTemplate}
                    />
                  ))}
                </div>
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Confirmed and Unassigned Points Buttons */}
        <Card>
          <Card.Content className="p-4">
            <div className="flex justify-between items-center">
              <Button onClick={toggleConfirmedDrawer} variant="outline" className="text-sm">
                Confirmed Equipment ({confirmedCount})
              </Button>
              <Button onClick={toggleUnassignedDrawer} variant="outline" className="text-sm">
                Unassigned Points ({unassignedCount})
              </Button>
            </div>
          </Card.Content>
        </Card>
        
        {/* Main content - Equipment List */}
        <Card>
          <Card.Header className="bg-slate-600 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Suggested Equipment</h2>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search equipment..."
                  className="px-2 py-1 rounded-md text-gray-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center space-x-1">
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                    <RectangleGroupIcon className="h-5 w-5" />
                  </Button>
                  <Button variant={viewMode === 'visualization' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('visualization')}>
                    <BeakerIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card.Header>
          <Card.Content className="p-0">
            {viewMode === 'list' && (
              <div className="divide-y divide-gray-200">
                {!hasUnconfirmedEquipment ? (
                  <div className="p-8 text-center text-gray-500">
                    <CubeIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    All equipment has been confirmed.
                  </div>
                ) : (
                  Object.values(equipmentByType).map(({ type, equipment }) => (
                    <div key={type.id}>
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleEquipmentType(type.id)}
                      >
                        <div className="flex items-center space-x-3">
                          {expandedEquipmentTypes.has(type.id) ? (
                            <ChevronDownIcon className="h-5 w-5" />
                          ) : (
                            <ChevronRightIcon className="h-5 w-5" />
                          )}
                          <h3 className="text-md font-semibold">{type.name}</h3>
                        </div>
                        <Badge variant="outline">{equipment.length}</Badge>
                      </div>
                      {expandedEquipmentTypes.has(type.id) && (
                        <div className="pl-8 pr-4 pb-4 space-y-4 bg-gray-50">
                          {equipment.map(equip => (
                            <Card 
                              key={equip.id} 
                              className="overflow-hidden"
                              style={{ borderLeft: `4px solid ${getEquipmentTypeBorderColor(equip.typeId || '')}` }}
                            >
                              <Card.Header className="flex justify-between items-center p-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold">{getEquipmentDisplayName(equip)}</h4>
                                  <PointPropertiesTags tags={equip.tags} />
                                </div>
                                <div className={`text-sm font-medium px-2 py-1 rounded ${getConfidenceColor(equip.confidence)}`}>
                                  {`${Math.round(equip.confidence * 100)}%`}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => toggleEquipment(equip.id)}>
                                  {expandedEquipment.has(equip.id) ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                                </Button>
                              </Card.Header>
                              {expandedEquipment.has(equip.id) && (
                                <Card.Content className="p-3 space-y-2">
                                  {getPointsForEquipment(equip.id).map(point => (
                                    <PointCard 
                                      key={point.id} 
                                      point={point} 
                                      onConfirm={confirmPoint}
                                      onUnassign={unassignPoint}
                                      onFlag={flagPoint}
                                    />
                                  ))}
                                  <div className="flex justify-end space-x-2 pt-2">
                                    <Button variant="outline" size="sm" onClick={() => flagEquipment(equip.id)}>Flag</Button>
                                    <Button size="sm" onClick={() => confirmEquipment(equip.id)}>Confirm</Button>
                                  </div>
                                </Card.Content>
                              )}
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            {viewMode === 'visualization' && (
              <div className="p-4">
                <EquipmentVisualization equipment={equipmentInstances} points={points} />
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Render the modal */}
      <InspectTemplateModal />
    </>
  );
}
