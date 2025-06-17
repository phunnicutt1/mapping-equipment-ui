'use client';

import React from 'react';
import { useGroupingStore } from '@/lib/store';
import { Button } from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';

export function InspectTemplateModal() {
  const { templateToInspect, inspectTemplatePoints } = useGroupingStore();

  const handleClose = () => {
    inspectTemplatePoints(null);
  };

  if (!templateToInspect) {
    return null;
  }

  return (
    <Dialog open={!!templateToInspect} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inspect Template: {templateToInspect.name}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 max-h-96 overflow-y-auto">
          <p className="text-sm text-gray-500 mb-4">
            This template is defined by the following {templateToInspect.pointSignature.length} points:
          </p>
          <ul className="divide-y divide-gray-200">
            {templateToInspect.pointSignature.map((point, index) => (
              <li key={index} className="py-2 flex justify-between items-center">
                <span className="font-mono text-sm text-gray-700">{point.navName}</span>
                <span className="text-xs text-gray-500">{point.kind}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
