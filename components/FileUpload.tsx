'use client';

import { useState, useRef } from 'react';
import { Card } from './ui/Card';
import { useGroupingStore } from '../lib/store';

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadFiles, addConsoleMessage, stats } = useGroupingStore(); // Use uploadFiles instead of loadProcessedData

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);
    
    // Validate that only trio files are selected
    if (files && files.length > 0) {
      const nonTrioFiles = Array.from(files).filter(file => !file.name.endsWith('.trio'));
      if (nonTrioFiles.length > 0) {
        addConsoleMessage({
          level: 'warning',
          message: `Only .trio files are supported. Found ${nonTrioFiles.length} non-trio files that will be ignored.`
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      addConsoleMessage({
        level: 'warning',
        message: 'Please select trio files to upload'
      });
      return;
    }

    // Filter for trio files only
    const trioFiles = Array.from(selectedFiles).filter(file => file.name.endsWith('.trio'));
    
    if (trioFiles.length === 0) {
      addConsoleMessage({
        level: 'error',
        message: 'No trio files found. Please upload files with .trio extension only.'
      });
      return;
    }

    setIsUploading(true);
    
    try {
      addConsoleMessage({
        level: 'info',
        message: `Uploading ${trioFiles.length} trio files for processing...`
      });

      // Use the store's uploadFiles function which handles the complete pipeline
      await uploadFiles(trioFiles);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFiles(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      addConsoleMessage({
        level: 'error',
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getFileCountText = () => {
    if (!selectedFiles || selectedFiles.length === 0) return 'Choose Trio Files';
    const trioCount = Array.from(selectedFiles).filter(file => file.name.endsWith('.trio')).length;
    return `${trioCount} trio file${trioCount > 1 ? 's' : ''}`;
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Upload Trio Files</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".trio"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getFileCountText()}
              </label>
            </div>
          </div>

          {/* File Info */}
          <div className="text-sm text-gray-600 text-center">
            Upload one or more trio files (.trio). Equipment types are automatically detected from filenames.
          </div>
          
          {/* Current Data Status */}
          {stats.totalPoints > 0 && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
              <div className="font-medium">Current Dataset:</div>
              <div>{stats.equipmentGroups} equipment instances, {stats.totalPoints} points loaded</div>
              <div className="text-gray-500">Upload new trio files to replace current data</div>
            </div>
          )}

          {/* Upload Button */}
          {selectedFiles && selectedFiles.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isUploading ? 'Processing...' : 'Upload & Process Trio Files'}
            </button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
