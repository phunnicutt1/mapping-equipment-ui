/**
 * SkySpark Connection Test API Route
 * GET /api/skyspark/test
 * Tests connection and returns project information
 */

import { NextRequest } from 'next/server';
import { SkysparkAPI } from '@/lib/skyspark-api';

export async function GET(request: NextRequest) {
  try {
    const skyspark = new SkysparkAPI();
    const result = await skyspark.testConnection();
    
    if (result.connected) {
      return Response.json({ 
        success: true, 
        data: result.projectInfo,
        diagnostics: result.diagnostics
      });
    } else {
      return Response.json({ 
        success: false, 
        message: result.error || 'Connection failed',
        diagnostics: result.diagnostics
      }, { status: 401 });
    }
  } catch (error) {
    console.error('SkySpark test error:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
