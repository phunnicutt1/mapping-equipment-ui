import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceAnalytics } from '../../../lib/bacnet-processor';

export async function GET() {
  try {
    const analytics = getPerformanceAnalytics();
    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Failed to get performance analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve performance analytics' },
      { status: 500 }
    );
  }
} 