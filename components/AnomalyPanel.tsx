'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { useGroupingStore } from '../lib/store';
import { 
  ExclamationTriangleIcon, 
  EyeIcon, 
  CheckIcon, 
  XMarkIcon,
  PlusIcon,
  ArrowRightIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { AnomalyInstance, NewEquipmentTypeCandidate } from '../lib/types';

export function AnomalyPanel() {
  const { 
    anomalies,
    newEquipmentTypeCandidates,
    anomalyDetectionResults,
    equipmentTypes,
    showAnomalyPanel,
    toggleAnomalyPanel,
    reviewAnomaly,
    assignAnomalyToEquipmentType,
    createEquipmentTypeFromAnomalies,
    groupSimilarAnomalies,
    approveNewEquipmentType,
    rejectNewEquipmentType
  } = useGroupingStore();

  const [selectedAnomalies, setSelectedAnomalies] = useState<Set<string>>(new Set());
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [showCreateTypeForm, setShowCreateTypeForm] = useState(false);

  if (!showAnomalyPanel) {
    return null;
  }

  const handleToggleAnomalySelection = (anomalyId: string) => {
    const newSelection = new Set(selectedAnomalies);
    if (newSelection.has(anomalyId)) {
      newSelection.delete(anomalyId);
    } else {
      newSelection.add(anomalyId);
    }
    setSelectedAnomalies(newSelection);
  };

  const handleCreateNewType = async () => {
    if (!newTypeName.trim() || selectedAnomalies.size === 0) {
      return;
    }

    const result = await createEquipmentTypeFromAnomalies(
      Array.from(selectedAnomalies),
      newTypeName.trim(),
      newTypeDescription.trim()
    );

    if (result.success) {
      setSelectedAnomalies(new Set());
      setNewTypeName('');
      setNewTypeDescription('');
      setShowCreateTypeForm(false);
    }
  };

  const handleGroupSimilar = async () => {
    if (selectedAnomalies.size < 2) {
      return;
    }

    const result = await groupSimilarAnomalies(Array.from(selectedAnomalies));
    if (result.success) {
      setSelectedAnomalies(new Set());
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'detected': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed-anomaly': return 'bg-red-100 text-red-800 border-red-200';
      case 'classified': return 'bg-green-100 text-green-800 border-green-200';
      case 'dismissed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCandidateStatusColor = (status: string) => {
    switch (status) {
      case 'candidate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const pendingAnomalies = anomalies.filter(a => 
    ['detected', 'reviewing'].includes(a.status)
  );

  const processedAnomalies = anomalies.filter(a => 
    ['confirmed-anomaly', 'classified', 'dismissed'].includes(a.status)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-semibold">Anomaly Detection & New Equipment Discovery</h2>
          </div>
          <Button variant="ghost" onClick={toggleAnomalyPanel}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Summary Section */}
          {anomalyDetectionResults && (
            <Card className="mb-6">
              <Card.Header>
                <Card.Title>Detection Summary</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {anomalyDetectionResults.anomalies.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Anomalies</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {anomalyDetectionResults.anomalyRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Anomaly Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(anomalyDetectionResults.clusterQualityMetrics.averageSilhouetteScore * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Quality Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {newEquipmentTypeCandidates.length}
                    </div>
                    <div className="text-sm text-gray-600">Type Candidates</div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Pending Anomalies */}
          <Card className="mb-6">
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Pending Review ({pendingAnomalies.length})</Card.Title>
                <div className="flex space-x-2">
                  {selectedAnomalies.size > 0 && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setShowCreateTypeForm(true)}
                        disabled={selectedAnomalies.size === 0}
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Create Type ({selectedAnomalies.size})
                      </Button>
                      {selectedAnomalies.size >= 2 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleGroupSimilar}
                        >
                          <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
                          Group Similar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              {pendingAnomalies.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No pending anomalies to review
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAnomalies.map(anomaly => (
                    <div key={anomaly.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedAnomalies.has(anomaly.id)}
                            onChange={() => handleToggleAnomalySelection(anomaly.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{anomaly.name}</h4>
                              <Badge className={getStatusColor(anomaly.status)}>
                                {anomaly.status}
                              </Badge>
                              {anomaly.newEquipmentTypeCandidate && (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                  New Type Candidate
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              <div>Dissimilarity Score: {anomaly.dissimilarityScore.toFixed(2)}</div>
                              <div>Confidence: {anomaly.confidence}%</div>
                              <div>Points: {anomaly.pointIds.length}</div>
                              <div>Method: {anomaly.detectionMethod}</div>
                            </div>
                            {anomaly.similarAnomalies.length > 0 && (
                              <div className="text-sm text-blue-600">
                                Similar anomalies: {anomaly.similarAnomalies.length}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => reviewAnomaly(anomaly.id, 'dismiss')}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => reviewAnomaly(anomaly.id, 'classify')}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => reviewAnomaly(anomaly.id, 'confirm')}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Suggested Actions */}
                      {anomaly.suggestedActions.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</div>
                          <div className="space-y-1">
                            {anomaly.suggestedActions.map((action, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{action.description}</span>
                                <Badge className="bg-gray-100 text-gray-700">
                                  {action.confidence}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Create New Equipment Type Form */}
          {showCreateTypeForm && (
            <Card className="mb-6">
              <Card.Header>
                <Card.Title>Create New Equipment Type</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type Name
                    </label>
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter equipment type name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newTypeDescription}
                      onChange={(e) => setNewTypeDescription(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      placeholder="Describe this equipment type"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleCreateNewType}
                      disabled={!newTypeName.trim() || selectedAnomalies.size === 0}
                    >
                      Create Type
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={() => setShowCreateTypeForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Equipment Type Candidates */}
          {newEquipmentTypeCandidates.length > 0 && (
            <Card className="mb-6">
              <Card.Header>
                <Card.Title>Equipment Type Candidates ({newEquipmentTypeCandidates.length})</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  {newEquipmentTypeCandidates.map(candidate => (
                    <div key={candidate.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{candidate.name}</h4>
                            <Badge className={getCandidateStatusColor(candidate.status)}>
                              {candidate.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <div>{candidate.description}</div>
                            <div>Confidence: {(candidate.confidence * 100).toFixed(1)}%</div>
                            <div>Based on {candidate.anomalyIds.length} anomalies</div>
                            <div>Created: {candidate.createdAt.toLocaleDateString()}</div>
                          </div>
                        </div>
                        {candidate.status === 'candidate' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => rejectNewEquipmentType(candidate.id, 'Manual rejection')}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => approveNewEquipmentType(candidate.id)}
                            >
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Processed Anomalies */}
          {processedAnomalies.length > 0 && (
            <Card>
              <Card.Header>
                <Card.Title>Processed Anomalies ({processedAnomalies.length})</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2">
                  {processedAnomalies.map(anomaly => (
                    <div key={anomaly.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">{anomaly.name}</span>
                        <Badge className={getStatusColor(anomaly.status)}>
                          {anomaly.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {anomaly.reviewedAt?.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 