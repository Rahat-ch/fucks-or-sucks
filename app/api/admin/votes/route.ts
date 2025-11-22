import { NextRequest, NextResponse } from 'next/server';
import { fetchVoteCounts } from '@/app/lib/transactions';
import { getVoteCache, updateVoteCache } from '@/app/lib/db';

// GET - Fetch latest votes from blockchain and update cache
export async function GET(request: NextRequest) {
  try {
    // Verify admin password
    const adminPassword = request.headers.get('x-admin-password');
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 });
    }

    if (adminPassword !== correctPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch latest votes from blockchain
    const votes = await fetchVoteCounts();

    if (!votes) {
      return NextResponse.json(
        { error: 'Failed to fetch votes from blockchain' },
        { status: 500 }
      );
    }

    // Update cache in database
    updateVoteCache(votes);

    // Get updated cache with timestamp
    const cache = getVoteCache();

    return NextResponse.json({
      success: true,
      votes: {
        shayan_fucks: cache.shayan_fucks,
        shayan_sucks: cache.shayan_sucks,
        dhai_fucks: cache.dhai_fucks,
        dhai_sucks: cache.dhai_sucks,
      },
      updatedAt: cache.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch votes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Get cached votes without fetching from blockchain
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminPassword } = body;

    // Verify admin password
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 });
    }

    if (adminPassword !== correctPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cached votes from database
    const cache = getVoteCache();

    return NextResponse.json({
      success: true,
      votes: {
        shayan_fucks: cache.shayan_fucks,
        shayan_sucks: cache.shayan_sucks,
        dhai_fucks: cache.dhai_fucks,
        dhai_sucks: cache.dhai_sucks,
      },
      updatedAt: cache.updatedAt,
    });
  } catch (error) {
    console.error('Error getting cached votes:', error);
    return NextResponse.json(
      { error: 'Failed to get cached votes' },
      { status: 500 }
    );
  }
}
