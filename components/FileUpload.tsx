'use client';

import { useState, useRef } from 'react';
import { Card } from './ui/Card';
import { useGroupingStore } from '../lib/store';

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { loadProcessedData, addConsoleMessage, stats } = useGroupingStore(); // Updated to use loadProcessedData

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      addConsoleMessage({
        level: 'warning',
        message: 'Please select files to upload'
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      Array.from(selectedFiles).forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      addConsoleMessage({
        level: 'info',
        message: `Uploading ${selectedFiles.length} files for processing...`
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        addConsoleMessage({ level: 'success', message: 'File uploaded and processed successfully!' });
        loadProcessedData(result.data.equipmentInstances, result.data.allPoints);
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setSelectedFiles(null);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
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
    if (!selectedFiles || selectedFiles.length === 0) return 'Choose Files';
    return `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`;
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Upload Building Automation Files</Card.Title>
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
                accept=".txt,.trio,.csv"
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
            Upload a connector file (.csv/.txt) and one or more point files (.trio).
          </div>
          
          {/* Current Data Status */}
          {stats.totalPoints > 0 && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
              <div className="font-medium">Current Dataset:</div>
              <div>{stats.equipmentGroups} equipment instances, {stats.totalPoints} points loaded</div>
              <div className="text-gray-500">Upload new files to replace current data</div>
            </div>
          )}

          {/* Upload Button */}
          {selectedFiles && selectedFiles.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isUploading ? 'Processing...' : 'Upload & Process Files'}
            </button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
