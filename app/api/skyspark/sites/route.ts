/**
 * SkySpark Sites API Route
 * GET /api/skyspark/sites
 * Returns all sites from the SkySpark project
 */

import { NextRequest } from 'next/server';
import { SkysparkAPI } from '@/lib/skyspark-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    
    const skyspark = new SkysparkAPI();
    const result = await skyspark.getSites();
    
    if (result.success) {
      return Response.json({
        success: true,
        data: result.data,
        format: result.format,
        query: 'read(site)',
        timestamp: new Date().toISOString()
      });
    } else {
      return Response.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('SkySpark sites error:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch sites' 
    }, { status: 500 });
  }
}
