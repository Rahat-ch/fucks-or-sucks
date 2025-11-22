import { NextRequest, NextResponse } from 'next/server';
import { getGameState, setGamePaused } from '@/app/lib/db';

// GET - Fetch current game status (pause + winner info)
export async function GET() {
  try {
    const gameState = getGameState();

    return NextResponse.json({
      isPaused: gameState.isPaused,
      winner: gameState.winner,
      updatedAt: gameState.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching game status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game status' },
      { status: 500 }
    );
  }
}

// POST - Toggle pause status (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isPaused, adminPassword } = body;

    // Verify admin password
    const correctPassword = process.env.ADMIN_PASSWORD;
    if (!correctPassword) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 });
    }

    if (adminPassword !== correctPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (typeof isPaused !== 'boolean') {
      return NextResponse.json({ error: 'isPaused must be a boolean' }, { status: 400 });
    }

    // Update pause state
    setGamePaused(isPaused);

    const newState = getGameState();

    return NextResponse.json({
      success: true,
      isPaused: newState.isPaused,
      updatedAt: newState.updatedAt,
    });
  } catch (error) {
    console.error('Error updating game status:', error);
    return NextResponse.json(
      { error: 'Failed to update game status' },
      { status: 500 }
    );
  }
}
