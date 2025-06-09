/**
 * SkySpark Query Execution API Route
 * POST /api/skyspark/eval
 * Executes Axon queries and returns results in Zinc format
 */

import { NextRequest } from 'next/server';
import { SkysparkAPI } from '@/lib/skyspark-api';

export async function POST(request: NextRequest) {
  try {
    const { expr } = await request.json();
    
    if (!expr || typeof expr !== 'string') {
      return Response.json({ 
        success: false, 
        error: 'Missing or invalid Axon expression' 
      }, { status: 400 });
    }

    const skyspark = new SkysparkAPI();
    const result = await skyspark.eval(expr);
    
    return Response.json(result);
  } catch (error) {
    console.error('SkySpark eval error:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Query execution failed' 
    }, { status: 500 });
  }
}

// GET method for simple queries via URL params
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const expr = searchParams.get('q') || searchParams.get('expr');
    
    if (!expr) {
      return Response.json({ 
        success: false, 
        error: 'Missing query parameter: ?q=<axon_expression>' 
      }, { status: 400 });
    }

    const skyspark = new SkysparkAPI();
    const result = await skyspark.eval(expr);
    
    return Response.json(result);
  } catch (error) {
    console.error('SkySpark eval error:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Query execution failed' 
    }, { status: 500 });
  }
}
