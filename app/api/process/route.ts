import { NextRequest, NextResponse } from 'next/server';
import { processAndClassify } from '../../../lib/bacnet-processor';
import { BACnetPoint, EquipmentInstance } from '../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const { equipment, points }: { equipment: EquipmentInstance[], points: BACnetPoint[] } = await req.json();

    if (!equipment || !points) {
      return NextResponse.json({ success: false, error: 'Missing equipment or points data' }, { status: 400 });
    }

    const result = await processAndClassify(equipment, points);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 