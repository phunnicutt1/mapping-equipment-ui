import { NextRequest, NextResponse } from 'next/server';
import { exportAnalyticsData } from '../../../lib/bacnet-processor';

export async function GET() {
  try {
    const analyticsData = exportAnalyticsData();
    return NextResponse.json({ success: true, data: analyticsData });
  } catch (error) {
    console.error('Failed to export analytics data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
} 