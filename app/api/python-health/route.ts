import { NextRequest, NextResponse } from 'next/server';
import { forcePythonHealthCheck, getPythonServiceMetrics } from '../../../lib/bacnet-processor';

export async function GET() {
  try {
    const metrics = getPythonServiceMetrics();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Failed to get Python service metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve Python service metrics' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const isHealthy = await forcePythonHealthCheck();
    return NextResponse.json({ success: true, data: { isHealthy } });
  } catch (error) {
    console.error('Failed to check Python service health:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform health check' },
      { status: 500 }
    );
  }
} 