'use client';

import { useState, useEffect } from 'react';
import { useGroupingStore } from '../lib/store';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { 
  BeakerIcon, 
  CogIcon, 
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  StarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { EquipmentTemplate, TemplateSimilarityMatch } from '../lib/types';
import { RichTemplateCard } from './mapping/RichTemplateCard';

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateManager({ isOpen, onClose }: TemplateManagerProps) {
  const {
    templates,
    suggestedTemplates,
    templateAnalytics,
    templateSimilarityMatches,
    toggleTemplateManager,
    refineTemplate,
    findSimilarEquipment,
    applyTemplateMatch,
    addTemplateFeedback,
    updateTemplateEffectiveness,
    deactivateTemplate,
    activateTemplate,
    exportTemplate,
    importTemplate,
    calculateTemplateAnalytics,
    mergeTemplates,
    inspectTemplatePoints,
    deleteTemplate,
  } = useGroupingStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'analytics' | 'matches'>('overview');
  const [selectedTemplate, setSelectedTemplate] = useState<EquipmentTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive' | 'ml' | 'user'>('all');
  const [showRefinementModal, setShowRefinementModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | 'suggestion'>('positive');

  // Combine all templates (user-created and ML-generated)
  const allTemplates = [...templates, ...suggestedTemplates];

  // Filter templates based on search and filter criteria
  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' ||
                         (filterType === 'active' && template.isActive) ||
                         (filterType === 'inactive' && !template.isActive) ||
                         (filterType === 'ml' && template.isMLGenerated) ||
                         (filterType === 'user' && !template.isMLGenerated);
    
    return matchesSearch && matchesFilter;
  });

  // Calculate template analytics on component mount
  useEffect(() => {
    calculateTemplateAnalytics();
  }, [calculateTemplateAnalytics]);

  const handleFindSimilar = async (templateId: string) => {
    const matches = await findSimilarEquipment(templateId, 0.7);
    if (matches.length > 0) {
      setActiveTab('matches');
    }
  };

  const handleExportTemplate = async (templateId: string) => {
    await exportTemplate(templateId);
  };

  const handleImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const text = await file.text();
      await importTemplate(text);
    }
  };

  const handleAddFeedback = async () => {
    if (selectedTemplate && feedbackText.trim()) {
      await addTemplateFeedback(selectedTemplate.id, {
        rating: 5, // Default to a positive rating for now
        comment: feedbackText,
      });
      setFeedbackText('');
      setShowFeedbackModal(false);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template? This will release any assigned equipment.')) {
      deleteTemplate(templateId);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CogIcon className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Template Manager</h2>
            <Badge variant="outline" className="text-indigo-600 border-indigo-300">
              {allTemplates.length} Templates
            </Badge>
          </div>
          <Button variant="outline" onClick={onClose}>
            <XMarkIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'templates', label: 'Templates', icon: BeakerIcon },
            { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
            { id: 'matches', label: 'Similarity Matches', icon: MagnifyingGlassIcon, badge: templateSimilarityMatches.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <Badge variant="primary" size="sm">{tab.badge}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              {/* Analytics Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <Card.Content className="p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">{templateAnalytics.totalTemplates}</div>
                    <div className="text-sm text-gray-600">Total Templates</div>
                  </Card.Content>
                </Card>
                <Card>
                  <Card.Content className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{templateAnalytics.activeTemplates}</div>
                    <div className="text-sm text-gray-600">Active Templates</div>
                  </Card.Content>
                </Card>
                <Card>
                  <Card.Content className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{templateAnalytics.mlGeneratedTemplates}</div>
                    <div className="text-sm text-gray-600">ML Generated</div>
                  </Card.Content>
                </Card>
                <Card>
                  <Card.Content className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{Math.round(templateAnalytics.averageSuccessRate * 100)}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </Card.Content>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <Card.Header>
                  <Card.Title className="flex items-center space-x-2">
                    <ClockIcon className="w-5 h-5" />
                    <span>Recent Activity</span>
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {templateAnalytics.recentActivity.slice(0, 10).map(activity => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {activity.templateName}
                          </div>
                          <div className="text-xs text-gray-600">
                            {activity.action} • {activity.details}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card>

              {/* Quick Actions */}
              <Card>
                <Card.Header>
                  <Card.Title>Quick Actions</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setActiveTab('templates')} className="flex items-center space-x-2">
                      <BeakerIcon className="w-4 h-4" />
                      <span>Manage Templates</span>
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('matches')} className="flex items-center space-x-2">
                      <MagnifyingGlassIcon className="w-4 h-4" />
                      <span>Review Matches</span>
                    </Button>
                    <label className="cursor-pointer">
                      <Button variant="outline" className="flex items-center space-x-2">
                        <DocumentArrowUpIcon className="w-4 h-4" />
                        <span>Import Template</span>
                      </Button>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportTemplate}
                        className="hidden"
                      />
                    </label>
                  </div>
                </Card.Content>
              </Card>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="p-6 space-y-4 overflow-y-auto h-full">
              {/* Search and Filter */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Templates</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="ml">ML Generated</option>
                  <option value="user">User Created</option>
                </select>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredTemplates.map(template => (
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
          )}

          {activeTab === 'analytics' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <Card>
                <Card.Header>
                  <Card.Title>Template Performance Analytics</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{templateAnalytics.totalApplications}</div>
                        <div className="text-sm text-gray-600">Total Applications</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{templateAnalytics.successfulApplications}</div>
                        <div className="text-sm text-gray-600">Successful</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{templateAnalytics.totalApplications - templateAnalytics.successfulApplications}</div>
                        <div className="text-sm text-gray-600">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{Math.round(templateAnalytics.averageSuccessRate * 100)}%</div>
                        <div className="text-sm text-gray-600">Avg Success Rate</div>
                      </div>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              {/* Top Performing Templates */}
              <Card>
                <Card.Header>
                  <Card.Title>Top Performing Templates</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-3">
                    {allTemplates
                      .filter(t => t.appliedCount > 0)
                      .sort((a, b) => (b.effectiveness?.successRate ?? 0) - (a.effectiveness?.successRate ?? 0))
                      .slice(0, 5)
                      .map(template => (
                        <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{template.name}</div>
                            <div className="text-xs text-gray-600">
                              {template.appliedCount} applications • {template.isMLGenerated ? 'ML Generated' : 'User Created'}
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getEffectivenessColor(template.effectiveness?.successRate || 0)}`}>
                            {Math.round((template.effectiveness?.successRate || 0) * 100)}%
                          </div>
                        </div>
                      ))}
                  </div>
                </Card.Content>
              </Card>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="p-6 space-y-4 overflow-y-auto h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Similarity Matches</h3>
                <Badge variant="outline">{templateSimilarityMatches.length} Pending</Badge>
              </div>

              {templateSimilarityMatches.length === 0 ? (
                <Card>
                  <Card.Content className="p-8 text-center">
                    <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-gray-600">No similarity matches found</div>
                    <div className="text-sm text-gray-500 mt-2">
                      Use "Find Similar" on templates to discover potential matches
                    </div>
                  </Card.Content>
                </Card>
              ) : (
                <div className="space-y-4">
                  {templateSimilarityMatches.map(match => {
                    const template = allTemplates.find(t => t.id === match.templateId);
                    const matchId = `${match.templateId}-${match.equipmentInstanceId}`;
                    
                    return (
                      <Card key={matchId}>
                        <Card.Content className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{template?.name}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                Equipment: {match.equipmentInstanceId}
                              </div>
                              <div className="flex items-center space-x-4 mt-2 text-xs">
                                <span>Similarity: <span className="font-medium">{Math.round(match.similarityScore * 100)}%</span></span>
                                <span>Confidence: <span className="font-medium">{Math.round(match.confidence * 100)}%</span></span>
                                <span>Matching Points: <span className="font-medium">{match.matchingPoints.length}</span></span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                onClick={() => applyTemplateMatch(matchId, true)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckIcon className="w-4 h-4" />
                                Apply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => applyTemplateMatch(matchId, false)}
                              >
                                <XMarkIcon className="w-4 h-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </Card.Content>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Modal */}
        {showFeedbackModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Add Template Feedback</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback Type
                    </label>
                    <select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="suggestion">Suggestion</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter your feedback..."
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-3 mt-6">
                  <Button onClick={handleAddFeedback} disabled={!feedbackText.trim()}>
                    Add Feedback
                  </Button>
                  <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
