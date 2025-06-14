import { NextRequest, NextResponse } from 'next/server';
import { processUploadedFiles } from '../../../lib/bacnet-processor';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { datasetPath } = await request.json();
    
    if (!datasetPath) {
      return NextResponse.json({ success: false, error: 'Dataset path is required' }, { status: 400 });
    }

    console.log(`📁 Loading test dataset from: ${datasetPath}`);

    // Read all files from the directory
    const files = await readdir(datasetPath);
    
    // Filter for trio and connector files
    const trioFiles = files.filter(f => f.endsWith('.trio'));
    const connectorFiles = files.filter(f => f.endsWith('.txt') || f.endsWith('.csv'));
    
    if (trioFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'No trio files found in dataset' }, { status: 400 });
    }
    
    if (connectorFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'No connector file found in dataset' }, { status: 400 });
    }

    console.log(`🔍 Found ${trioFiles.length} trio files and ${connectorFiles.length} connector files`);

    // Create File objects from the filesystem files
    const fileObjects: File[] = [];
    
    // Add connector file first
    for (const connectorFileName of connectorFiles) {
      const filePath = join(datasetPath, connectorFileName);
      const content = await readFile(filePath, 'utf-8');
      const file = new File([content], connectorFileName, { type: 'text/plain' });
      fileObjects.push(file);
      console.log(`📋 Loaded connector file: ${connectorFileName} (${content.length} chars)`);
    }
    
    // Add trio files
    for (const trioFileName of trioFiles) {
      const filePath = join(datasetPath, trioFileName);
      const content = await readFile(filePath, 'utf-8');
      const file = new File([content], trioFileName, { type: 'text/plain' });
      fileObjects.push(file);
    }
    
    console.log(`📊 Created ${fileObjects.length} file objects for processing`);

    // Process through the existing ML pipeline
    const result = await processUploadedFiles(fileObjects);

    console.log(`✅ Test dataset processing complete: ${result.equipmentInstances.length} equipment instances, ${result.allPoints.length} points`);
    
    // Add dataset metadata
    const enhancedResult = {
      ...result,
      datasetInfo: {
        source: 'intuitivedurham-test-dataset',
        path: datasetPath,
        trioFiles: trioFiles.length,
        connectorFiles: connectorFiles.length,
        totalFiles: fileObjects.length,
        loadedAt: new Date().toISOString()
      }
    };

    return NextResponse.json({ success: true, data: enhancedResult });

  } catch (error) {
    console.error('❌ Test dataset loading error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during test dataset loading.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 