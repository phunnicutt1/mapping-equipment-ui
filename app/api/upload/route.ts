import { NextRequest, NextResponse } from 'next/server';
import { processUploadedFiles } from '../../../lib/bacnet-processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    
    // Extract all uploaded files from the FormData
    const entries = Array.from(formData.entries());
    for (const [key, value] of entries) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded' }, { status: 400 });
    }

    console.log(`📁 Received ${files.length} files for processing.`);

    // Call the centralized processing pipeline
    const result = await processUploadedFiles(files);

    console.log(`🎯 Successfully processed data. Found ${result.equipmentInstances.length} equipment instances and ${result.equipmentTemplates.length} suggested templates.`);
    
    // Debug: Log raw data structure for inspection
    console.log('🔍 API DEBUG - Equipment Sample:');
    result.equipmentInstances.slice(0, 2).forEach((eq, i) => {
      console.log(`Equipment ${i + 1}:`, {
        id: eq.id,
        name: eq.name,
        status: eq.status,
        confidence: eq.confidence,
        cluster: eq.cluster,
        pointIds: eq.pointIds.slice(0, 3) // First 3 point IDs
      });
    });
    
    console.log('🔍 API DEBUG - Points Mapping:');
    const pointsWithEquipRef = result.allPoints.filter(p => p.equipRef);
    console.log(`Points mapped to equipment: ${pointsWithEquipRef.length}/${result.allPoints.length} (${Math.round(pointsWithEquipRef.length / result.allPoints.length * 100)}%)`);

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('❌ Upload processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during file processing.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
