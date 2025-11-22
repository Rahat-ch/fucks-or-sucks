import { NextRequest, NextResponse } from 'next/server';
import { declareWinner, clearWinner, getVoteCache, WinnerInfo } from '@/app/lib/db';

// POST: Declare winner based on vote counts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminPassword } = body;

    // Verify admin password
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current vote counts from cache
    const votes = getVoteCache();

    // Calculate scores (fucks - sucks)
    const shayanScore = votes.shayan_fucks - votes.shayan_sucks;
    const dhaiScore = votes.dhai_fucks - votes.dhai_sucks;

    // Determine winner
    let winnerInfo: WinnerInfo;
    if (shayanScore > dhaiScore) {
      winnerInfo = {
        name: 'Shayan',
        score: shayanScore,
        loserScore: dhaiScore,
        declaredAt: Date.now(),
      };
    } else if (dhaiScore > shayanScore) {
      winnerInfo = {
        name: 'Dhai.eth',
        score: dhaiScore,
        loserScore: shayanScore,
        declaredAt: Date.now(),
      };
    } else {
      // It's a tie
      return NextResponse.json(
        { error: 'Cannot declare winner - scores are tied!', shayanScore, dhaiScore },
        { status: 400 }
      );
    }

    // Store winner and auto-pause game
    declareWinner(winnerInfo);

    return NextResponse.json({
      success: true,
      winner: winnerInfo,
      votes: {
        shayan: { fucks: votes.shayan_fucks, sucks: votes.shayan_sucks, score: shayanScore },
        dhai: { fucks: votes.dhai_fucks, sucks: votes.dhai_sucks, score: dhaiScore },
      },
    });
  } catch (error) {
    console.error('Error declaring winner:', error);
    return NextResponse.json(
      { error: 'Failed to declare winner', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Clear winner and continue game
export async function DELETE(request: NextRequest) {
  try {
    // Get admin password from header
    const adminPassword = request.headers.get('x-admin-password');

    // Verify admin password
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear winner and unpause game
    clearWinner();

    return NextResponse.json({
      success: true,
      message: 'Winner cleared and game resumed',
    });
  } catch (error) {
    console.error('Error clearing winner:', error);
    return NextResponse.json(
      { error: 'Failed to clear winner', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
