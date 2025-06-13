import { NextRequest, NextResponse } from 'next/server';
import { checkQualityAlerts } from '../../../lib/bacnet-processor';

export async function GET() {
  try {
    const alerts = checkQualityAlerts();
    return NextResponse.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Failed to get quality alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve quality alerts' },
      { status: 500 }
    );
  }
} 