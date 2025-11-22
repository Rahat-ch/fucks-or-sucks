// This API route is no longer needed as vote adjustments are handled client-side
// Kept for backwards compatibility but can be removed
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Vote adjustments are now handled client-side.' },
    { status: 410 }
  );
}
