'use client';

import React from 'react';
import { MappingWorkflow } from '@/components/mapping/MappingWorkflow';

export default function MappingPage() {
  const handleWorkflowComplete = (results: {
    confirmedInstances: any[];
    equipmentTypes: any[];
    totalMappings: number;
    duration: number;
  }) => {
    console.log('🎉 Workflow completed successfully!', results);
    
    // Here you could:
    // - Save results to database
    // - Export configuration files
    // - Navigate to results page
    // - Show success notification
  };

  return (
    <div className="min-h-screen">
      <MappingWorkflow
        projectName="Demo Project - Equipment Mapping"
        onComplete={handleWorkflowComplete}
      />
    </div>
  );
} 