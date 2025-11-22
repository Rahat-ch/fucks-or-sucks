'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { fetchVoteCounts, submitVoteTransaction, VoteType } from '../lib/transactions';
import { WinnerInfo } from '../contexts/GameStatusContext';

export default function AdminPage() {
  const { user } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [winner, setWinner] = useState<WinnerInfo | null>(null);
  const [votes, setVotes] = useState<{
    shayan_fucks: number;
    shayan_sucks: number;
    dhai_fucks: number;
    dhai_sucks: number;
  } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [adjustedVotes, setAdjustedVotes] = useState({
    shayan_fucks: 0,
    shayan_sucks: 0,
    dhai_fucks: 0,
    dhai_sucks: 0,
  });
  const [adjustSuccess, setAdjustSuccess] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchGameStatus();
      fetchCachedVotes();
    }
  }, [isAuthenticated]);

  // Update adjusted votes when votes are fetched
  useEffect(() => {
    if (votes) {
      setAdjustedVotes({
        shayan_fucks: votes.shayan_fucks,
        shayan_sucks: votes.shayan_sucks,
        dhai_fucks: votes.dhai_fucks,
        dhai_sucks: votes.dhai_sucks,
      });
    }
  }, [votes]);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setAdminPassword(password);
        setError('');
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Authentication failed');
    }
  };

  const fetchGameStatus = async () => {
    try {
      const response = await fetch('/api/game-status');
      if (response.ok) {
        const data = await response.json();
        setIsPaused(data.isPaused);
        setWinner(data.winner || null);
      }
    } catch (err) {
      console.error('Error fetching game status:', err);
    }
  };

  const togglePause = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/game-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPaused: !isPaused,
          adminPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsPaused(data.isPaused);
      } else {
        setError('Failed to toggle pause state');
      }
    } catch (err) {
      setError('Error toggling pause state');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCachedVotes = async () => {
    try {
      const response = await fetch('/api/admin/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        setVotes(data.votes);
        setLastUpdated(new Date(data.updatedAt).toLocaleString());
      }
    } catch (err) {
      console.error('Error fetching cached votes:', err);
    }
  };

  const fetchLatestVotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/votes', {
        method: 'GET',
        headers: {
          'x-admin-password': adminPassword,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVotes(data.votes);
        setLastUpdated(new Date(data.updatedAt).toLocaleString());
        setError('');
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch votes: ${errorData.details || errorData.error}`);
      }
    } catch (err) {
      setError('Error fetching votes from blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclareWinner = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/declare-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        setWinner(data.winner);
        setIsPaused(true);
        await fetchGameStatus();
        setError('');
      } else {
        const errorData = await response.json();
        setError(`Failed to declare winner: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error declaring winner:', err);
      setError('Error declaring winner');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueGame = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/declare-winner', {
        method: 'DELETE',
        headers: {
          'x-admin-password': adminPassword,
        },
      });

      if (response.ok) {
        setWinner(null);
        setIsPaused(false);
        await fetchGameStatus();
        setError('');
      } else {
        const errorData = await response.json();
        setError(`Failed to continue game: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error continuing game:', err);
      setError('Error continuing game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustVotes = async () => {
    setIsLoading(true);
    setAdjustSuccess('');
    setError('');

    try {
      // Get Movement wallet info
      const moveWallet = user?.linkedAccounts?.find(
        (account: any) => account.chainType === 'aptos'
      ) as any;
      const walletAddress = moveWallet?.address as string;
      const publicKeyHex = moveWallet?.publicKey as string;

      if (!walletAddress || !publicKeyHex) {
        setError('Please connect your Movement wallet first');
        setIsLoading(false);
        return;
      }

      // Fetch current on-chain vote counts
      const currentVotes = await fetchVoteCounts();
      if (!currentVotes) {
        setError('Failed to fetch current vote counts from blockchain');
        setIsLoading(false);
        return;
      }

      // Calculate differences
      const differences: { voteType: VoteType; amount: number }[] = [];
      const voteTypes: VoteType[] = ['shayan_fucks', 'shayan_sucks', 'dhai_fucks', 'dhai_sucks'];

      for (const voteType of voteTypes) {
        const targetAmount = adjustedVotes[voteType];
        const currentAmount = currentVotes[voteType];
        const diff = targetAmount - currentAmount;

        if (diff < 0) {
          setError(
            `Cannot decrease votes. ${voteType}: current=${currentAmount}, target=${targetAmount}. You can only increase votes.`
          );
          setIsLoading(false);
          return;
        }

        if (diff > 0) {
          differences.push({ voteType, amount: diff });
        }
      }

      // If no differences, nothing to do
      if (differences.length === 0) {
        setAdjustSuccess('No changes needed - votes already match target!');
        setTimeout(() => setAdjustSuccess(''), 3000);
        setIsLoading(false);
        return;
      }

      // Submit transactions for each difference
      const results: { voteType: VoteType; success: boolean; txHash?: string; error?: string }[] = [];

      for (const diff of differences) {
        try {
          const txHash = await submitVoteTransaction(
            diff.voteType,
            diff.amount,
            walletAddress,
            publicKeyHex,
            signRawHash
          );

          results.push({ voteType: diff.voteType, success: true, txHash });
        } catch (error) {
          console.error(`Failed to submit ${diff.voteType}:`, error);
          results.push({
            voteType: diff.voteType,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Fetch updated counts from blockchain
      const updatedVotes = await fetchVoteCounts();
      if (updatedVotes) {
        setVotes(updatedVotes);
        setLastUpdated(new Date().toLocaleString());
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        setAdjustSuccess(`Successfully adjusted ${successCount} vote type(s)!`);
        setTimeout(() => setAdjustSuccess(''), 5000);
      } else {
        setError(`${successCount} succeeded, ${failCount} failed. Check console for details.`);
      }
    } catch (err) {
      console.error('Error adjusting votes:', err);
      setError('Error adjusting votes: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: '#e8f4f8' }}
      >
        <div
          className="bg-white rounded-2xl text-center p-8"
          style={{
            border: '5px solid black',
            boxShadow: '6px 6px 0px black',
            maxWidth: '500px',
            width: '100%',
          }}
        >
          <h1 className="text-4xl font-black mb-8">ADMIN LOGIN</h1>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Enter admin password"
            className="w-full px-4 py-3 mb-4 text-lg font-bold rounded-lg"
            style={{
              border: '3px solid black',
              outline: 'none',
            }}
          />

          {error && <p className="text-red-600 mb-4 font-bold">{error}</p>}

          <button
            onClick={handleLogin}
            className="w-full font-bold text-white text-xl transition-opacity hover:opacity-90 rounded-lg"
            style={{
              backgroundColor: '#0099ff',
              border: '4px solid black',
              boxShadow: '4px 4px 0px black',
              padding: '12px 30px',
            }}
          >
            LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ backgroundColor: '#e8f4f8' }}
    >
      <div className="max-w-6xl mx-auto">
        <div
          className="bg-white rounded-2xl p-6 md:p-8 mb-6"
          style={{
            border: '5px solid black',
            boxShadow: '6px 6px 0px black',
          }}
        >
          <h1 className="text-3xl md:text-5xl font-black mb-2">ADMIN PANEL</h1>
          <p className="text-gray-600 mb-6">Control the voting game</p>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border-2 border-red-600 rounded-lg">
              <p className="text-red-600 font-bold">{error}</p>
            </div>
          )}

          {adjustSuccess && (
            <div className="mb-4 p-4 bg-green-100 border-2 border-green-600 rounded-lg">
              <p className="text-green-600 font-bold">{adjustSuccess}</p>
            </div>
          )}

          {/* Game Controls */}
          <div className="mb-6">
            <h2 className="text-2xl font-black mb-4">GAME STATUS</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-bold">Current Status:</span>
                <span
                  className="px-4 py-2 font-black rounded-lg"
                  style={{
                    backgroundColor: isPaused ? '#ff3333' : '#00d66a',
                    color: 'white',
                    border: '3px solid black',
                  }}
                >
                  {isPaused ? 'PAUSED' : 'ACTIVE'}
                </span>
              </div>

              <button
                onClick={togglePause}
                disabled={isLoading}
                className="font-bold text-white text-lg transition-opacity hover:opacity-90 disabled:opacity-50 rounded-lg"
                style={{
                  backgroundColor: isPaused ? '#00d66a' : '#ff3333',
                  border: '3px solid black',
                  boxShadow: '3px 3px 0px black',
                  padding: '10px 25px',
                }}
              >
                {isLoading ? 'UPDATING...' : isPaused ? 'RESUME GAME' : 'PAUSE GAME'}
              </button>
            </div>
          </div>

          {/* Winner Controls */}
          <div className="mb-6">
            <h2 className="text-2xl font-black mb-4">WINNER CONTROLS</h2>

            {/* Winner Status */}
            <div className="flex items-center gap-2 mb-4">
              <span className="font-bold">Winner Status:</span>
              <span
                className="px-4 py-2 font-black rounded-lg"
                style={{
                  backgroundColor: winner ? '#ffd700' : '#gray-300',
                  color: winner ? 'black' : 'white',
                  border: '3px solid black',
                }}
              >
                {winner ? `${winner.name} WINS!` : 'NOT DECLARED'}
              </span>
            </div>

            {/* Score Preview (only show if votes are loaded) */}
            {votes && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border-3 border-gray-300">
                <p className="font-bold mb-2">Current Scores (Fucks - Sucks):</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex justify-between">
                    <span className="font-bold">Shayan:</span>
                    <span className="font-mono">
                      {votes.shayan_fucks} - {votes.shayan_sucks} = {votes.shayan_fucks - votes.shayan_sucks}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Dhai.eth:</span>
                    <span className="font-mono">
                      {votes.dhai_fucks} - {votes.dhai_sucks} = {votes.dhai_fucks - votes.dhai_sucks}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleDeclareWinner}
                disabled={isLoading || !!winner || !votes}
                className="font-bold text-white text-lg transition-opacity hover:opacity-90 disabled:opacity-50 rounded-lg"
                style={{
                  backgroundColor: '#ffd700',
                  color: 'black',
                  border: '3px solid black',
                  boxShadow: '3px 3px 0px black',
                  padding: '10px 25px',
                }}
              >
                {isLoading ? 'UPDATING...' : 'DECLARE WINNER'}
              </button>

              {winner && (
                <button
                  onClick={handleContinueGame}
                  disabled={isLoading}
                  className="font-bold text-white text-lg transition-opacity hover:opacity-90 disabled:opacity-50 rounded-lg"
                  style={{
                    backgroundColor: '#10b981',
                    border: '3px solid black',
                    boxShadow: '3px 3px 0px black',
                    padding: '10px 25px',
                  }}
                >
                  {isLoading ? 'UPDATING...' : 'CONTINUE GAME'}
                </button>
              )}
            </div>

            {winner && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-3 border-yellow-300">
                <p className="font-bold text-yellow-800">
                  Winner: {winner.name} with score {winner.score} (opponent: {winner.loserScore})
                </p>
                <p className="text-sm text-yellow-700">
                  Declared: {new Date(winner.declaredAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Vote Fetching */}
          <div>
            <h2 className="text-2xl font-black mb-4">VOTE COUNTS</h2>
            <button
              onClick={fetchLatestVotes}
              disabled={isLoading}
              className="font-bold text-white text-lg transition-opacity hover:opacity-90 disabled:opacity-50 rounded-lg mb-4"
              style={{
                backgroundColor: '#0099ff',
                border: '3px solid black',
                boxShadow: '3px 3px 0px black',
                padding: '10px 25px',
              }}
            >
              {isLoading ? 'FETCHING...' : 'FETCH LATEST VOTES'}
            </button>

            {votes && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-4">
                  Last updated: {lastUpdated}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shayan */}
                  <div
                    className="p-6 rounded-xl"
                    style={{
                      border: '4px solid black',
                      backgroundColor: '#f0f9ff',
                    }}
                  >
                    <h3 className="text-2xl font-black mb-4">SHAYAN</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">FUCKS:</span>
                        <span
                          className="px-4 py-2 font-black text-xl rounded-lg"
                          style={{
                            backgroundColor: '#00d66a',
                            color: 'white',
                            border: '2px solid black',
                          }}
                        >
                          {votes.shayan_fucks.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">SUCKS:</span>
                        <span
                          className="px-4 py-2 font-black text-xl rounded-lg"
                          style={{
                            backgroundColor: '#ff3333',
                            color: 'white',
                            border: '2px solid black',
                          }}
                        >
                          {votes.shayan_sucks.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dhai */}
                  <div
                    className="p-6 rounded-xl"
                    style={{
                      border: '4px solid black',
                      backgroundColor: '#fff7ed',
                    }}
                  >
                    <h3 className="text-2xl font-black mb-4">DHAI.ETH</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">FUCKS:</span>
                        <span
                          className="px-4 py-2 font-black text-xl rounded-lg"
                          style={{
                            backgroundColor: '#00d66a',
                            color: 'white',
                            border: '2px solid black',
                          }}
                        >
                          {votes.dhai_fucks.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">SUCKS:</span>
                        <span
                          className="px-4 py-2 font-black text-xl rounded-lg"
                          style={{
                            backgroundColor: '#ff3333',
                            color: 'white',
                            border: '2px solid black',
                          }}
                        >
                          {votes.dhai_sucks.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual Vote Adjustment */}
          <div className="mt-8">
            <h2 className="text-2xl font-black mb-4">MANUAL VOTE ADJUSTMENT</h2>
            <p className="text-gray-600 mb-2">Adjust votes manually for fairness or to correct suspected cheating</p>
            <p className="text-sm text-orange-600 font-bold mb-4">
              ⚠️ Note: You can only INCREASE votes, not decrease them. Transactions are submitted on-chain and gas-sponsored.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Shayan Adjustments */}
              <div
                className="p-6 rounded-xl"
                style={{
                  border: '4px solid black',
                  backgroundColor: '#f0f9ff',
                }}
              >
                <h3 className="text-xl font-black mb-4">SHAYAN</h3>
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-sm mb-1 block">FUCKS</label>
                    <input
                      type="number"
                      min="0"
                      value={adjustedVotes.shayan_fucks}
                      onChange={(e) =>
                        setAdjustedVotes({
                          ...adjustedVotes,
                          shayan_fucks: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 text-lg font-bold rounded-lg"
                      style={{
                        border: '3px solid black',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-sm mb-1 block">SUCKS</label>
                    <input
                      type="number"
                      min="0"
                      value={adjustedVotes.shayan_sucks}
                      onChange={(e) =>
                        setAdjustedVotes({
                          ...adjustedVotes,
                          shayan_sucks: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 text-lg font-bold rounded-lg"
                      style={{
                        border: '3px solid black',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Dhai Adjustments */}
              <div
                className="p-6 rounded-xl"
                style={{
                  border: '4px solid black',
                  backgroundColor: '#fff7ed',
                }}
              >
                <h3 className="text-xl font-black mb-4">DHAI.ETH</h3>
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-sm mb-1 block">FUCKS</label>
                    <input
                      type="number"
                      min="0"
                      value={adjustedVotes.dhai_fucks}
                      onChange={(e) =>
                        setAdjustedVotes({
                          ...adjustedVotes,
                          dhai_fucks: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 text-lg font-bold rounded-lg"
                      style={{
                        border: '3px solid black',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-sm mb-1 block">SUCKS</label>
                    <input
                      type="number"
                      min="0"
                      value={adjustedVotes.dhai_sucks}
                      onChange={(e) =>
                        setAdjustedVotes({
                          ...adjustedVotes,
                          dhai_sucks: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 text-lg font-bold rounded-lg"
                      style={{
                        border: '3px solid black',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleAdjustVotes}
              disabled={isLoading || !votes}
              className="font-bold text-white text-lg transition-opacity hover:opacity-90 disabled:opacity-50 rounded-lg"
              style={{
                backgroundColor: '#ff9500',
                border: '3px solid black',
                boxShadow: '3px 3px 0px black',
                padding: '10px 25px',
              }}
            >
              {isLoading ? 'UPDATING...' : 'UPDATE VOTES'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
