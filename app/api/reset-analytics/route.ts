import { NextRequest, NextResponse } from 'next/server';
import { resetPerformanceAnalytics } from '../../../lib/bacnet-processor';

export async function POST() {
  try {
    resetPerformanceAnalytics();
    return NextResponse.json({ success: true, message: 'Performance analytics reset successfully' });
  } catch (error) {
    console.error('Failed to reset performance analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset performance analytics' },
      { status: 500 }
    );
  }
} 