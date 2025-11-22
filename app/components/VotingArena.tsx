'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import DebateCard from './DebateCard';
import { truncateAddress } from '../utils/address';
import { submitBatchVoteTransactions, fetchVoteCounts, VoteTransaction } from '../lib/transactions';
import { getExplorerUrl } from '../lib/aptos';
import { useGameStatus } from '../contexts/GameStatusContext';

interface VotingArenaProps {
  username: string;
}

interface Debater {
  id: number;
  name: string;
  side: string;
  image?: string;
}

interface PendingVotes {
  shayan_fucks: number;
  shayan_sucks: number;
  dhai_fucks: number;
  dhai_sucks: number;
}

// The two debaters - always both visible
const shayan: Debater = { id: 1, name: 'Shayan', side: 'MOVE', image: '/shayan.jpg' };
const dhai: Debater = { id: 2, name: 'Dhai.eth', side: 'EVM', image: '/dhai.jpg' };

export default function VotingArena({ username }: VotingArenaProps) {
  const { logout, user } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const { isPaused, winner } = useGameStatus();

  // Display votes (local state for instant feedback)
  const [shayanVotes, setShayanVotes] = useState({ fucks: 0, sucks: 0 });
  const [dhaiVotes, setDhaiVotes] = useState({ fucks: 0, sucks: 0 });

  // Cached vote counts (for winner display)
  const [cachedVotes, setCachedVotes] = useState<{
    shayan_fucks: number;
    shayan_sucks: number;
    dhai_fucks: number;
    dhai_sucks: number;
  } | null>(null);

  // Pending votes (not yet synced to blockchain)
  const [pendingVotes, setPendingVotes] = useState<PendingVotes>({
    shayan_fucks: 0,
    shayan_sucks: 0,
    dhai_fucks: 0,
    dhai_sucks: 0,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; links?: string[] } | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingVotesRef = useRef<PendingVotes>(pendingVotes);

  // Get Movement wallet info
  const moveWallet = user?.linkedAccounts?.find(
    (account: any) => account.chainType === 'aptos'
  ) as any;
  const walletAddress = moveWallet?.address as string;
  const publicKeyHex = moveWallet?.publicKey as string;

  // Debug logging
  useEffect(() => {
    if (moveWallet) {
      console.log('Movement Wallet:', {
        address: walletAddress,
        publicKey: publicKeyHex,
        publicKeyLength: publicKeyHex?.length,
      });
    }
  }, [moveWallet, walletAddress, publicKeyHex]);

  // Fetch cached vote counts when winner is declared
  useEffect(() => {
    if (winner) {
      const fetchCachedVotes = async () => {
        try {
          const counts = await fetchVoteCounts();
          if (counts) {
            setCachedVotes(counts);
          }
        } catch (error) {
          console.error('Error fetching cached votes for winner display:', error);
        }
      };
      fetchCachedVotes();
    }
  }, [winner]);

  const handleVote = (debater: Debater, vote: 'fucks' | 'sucks') => {
    const voteKey = `${debater.id === 1 ? 'shayan' : 'dhai'}_${vote}` as keyof PendingVotes;

    // Update display votes immediately
    if (debater.id === shayan.id) {
      setShayanVotes((prev) => ({
        ...prev,
        [vote]: prev[vote] + 1,
      }));
    } else {
      setDhaiVotes((prev) => ({
        ...prev,
        [vote]: prev[vote] + 1,
      }));
    }

    // Update pending votes and trigger sync
    setPendingVotes((prev) => {
      const newPending = {
        ...prev,
        [voteKey]: prev[voteKey] + 1,
      };

      // Update ref with latest pending votes
      pendingVotesRef.current = newPending;

      // Clear existing debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new debounce timer (1.5 seconds)
      debounceTimer.current = setTimeout(() => {
        syncVotesToBlockchain();
      }, 1500);

      return newPending;
    });

    // Reset the card after animation
    setTimeout(() => {
      setCardKey((prev) => prev + 1);
    }, 300);
  };

  const syncVotesToBlockchain = async () => {
    // Use ref to get the latest pending votes
    const currentPending = pendingVotesRef.current;

    // Check if we have pending votes to sync
    const hasPending = Object.values(currentPending).some((count) => count > 0);
    if (!hasPending || !walletAddress || !publicKeyHex) {
      return;
    }

    setIsSyncing(true);

    try {
      // Build array of transactions to submit
      const transactions: VoteTransaction[] = [];

      if (currentPending.shayan_fucks > 0) {
        transactions.push({ voteType: 'shayan_fucks', amount: currentPending.shayan_fucks });
      }
      if (currentPending.shayan_sucks > 0) {
        transactions.push({ voteType: 'shayan_sucks', amount: currentPending.shayan_sucks });
      }
      if (currentPending.dhai_fucks > 0) {
        transactions.push({ voteType: 'dhai_fucks', amount: currentPending.dhai_fucks });
      }
      if (currentPending.dhai_sucks > 0) {
        transactions.push({ voteType: 'dhai_sucks', amount: currentPending.dhai_sucks });
      }

      // Submit batch transactions
      const { successful, failed } = await submitBatchVoteTransactions(
        transactions,
        walletAddress,
        publicKeyHex,
        signRawHash
      );

      if (successful.length > 0) {
        // Clear pending votes for successful transactions
        const newPending = { ...pendingVotes };
        transactions.forEach((tx, index) => {
          if (index < successful.length) {
            newPending[tx.voteType] = 0;
          }
        });
        setPendingVotes(newPending);

        // Fetch updated counts from blockchain
        const counts = await fetchVoteCounts();
        if (counts) {
          setShayanVotes({ fucks: counts.shayan_fucks, sucks: counts.shayan_sucks });
          setDhaiVotes({ fucks: counts.dhai_fucks, sucks: counts.dhai_sucks });
        }

        // Show success toast with transaction links
        setToast({
          message: `Votes synced! View transaction${successful.length > 1 ? 's' : ''}`,
          type: 'success',
          links: successful,
        });
      }

      if (failed.length > 0) {
        // Show error toast
        setToast({
          message: 'Some votes failed to sync - try voting again!',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error syncing votes:', error);
      setToast({
        message: 'Failed to sync votes - try again!',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const totalPending = Object.values(pendingVotes).reduce((sum, count) => sum + count, 0);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#e8f4f8' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg animate-slide-in-right"
          style={{
            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
            border: '3px solid black',
            maxWidth: '400px',
          }}
        >
          <p className="text-white font-bold mb-2">{toast.message}</p>
          {toast.links && toast.links.length > 0 && (
            <div className="flex flex-col gap-1">
              {toast.links.map((txHash, index) => (
                <a
                  key={txHash}
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white text-sm underline hover:opacity-80"
                >
                  Transaction {index + 1} →
                </a>
              ))}
            </div>
          )}
          <button
            onClick={() => setToast(null)}
            className="absolute top-2 right-2 text-white hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Container - Centered */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-6 py-6">
        <div className="w-full max-w-[85%] md:max-w-[500px] flex flex-col items-center gap-6 md:gap-8">
          {/* Header */}
          <div className="text-center w-full relative">
            <h1 className="text-2xl md:text-3xl font-black mb-1" style={{
              color: '#0099ff',
              letterSpacing: '0.05em',
              textShadow: '3px 3px 0px rgba(0,0,0,0.1)'
            }}>
              ⚡ DEBATE ARENA ⚡
            </h1>
            <p className="text-sm md:text-base text-gray-700 px-2 mb-2">
              Welcome, <span className="font-bold">{username ? truncateAddress(username) : 'Guest'}</span>! Swipe or click to vote!
            </p>

            {/* Pending Votes / Syncing Indicator */}
            {(totalPending > 0 || isSyncing) && (
              <div className="mb-2">
                {isSyncing ? (
                  <span className="text-xs md:text-sm text-blue-600 font-bold">
                    ⏳ Syncing votes...
                  </span>
                ) : (
                  <span className="text-xs md:text-sm text-orange-600 font-bold">
                    📝 {totalPending} vote{totalPending > 1 ? 's' : ''} pending
                  </span>
                )}
              </div>
            )}

            <button
              onClick={logout}
              className="font-bold text-white text-sm sm:text-base md:text-lg transition-opacity hover:opacity-90 rounded-lg"
              style={{
                backgroundColor: '#ff3333',
                border: '3px solid black',
                boxShadow: '3px 3px 0px black',
                padding: '8px 20px',
                marginTop: '10px',
              }}
            >
              LOGOUT
            </button>
          </div>

          {/* Card Stack - Always showing both Shayan and Dhai */}
          <div className="w-full flex flex-col items-center gap-4 md:gap-6">
            {/* Shayan Card (top) */}
            <div className="w-full">
              <DebateCard
                key={`shayan-${cardKey}`}
                debater={shayan}
                onVote={(vote) => handleVote(shayan, vote)}
                isTop={true}
                isPaused={isPaused}
                showResults={!!winner}
                voteStats={
                  cachedVotes
                    ? {
                        fucks: cachedVotes.shayan_fucks,
                        sucks: cachedVotes.shayan_sucks,
                        weightedScore: cachedVotes.shayan_fucks - cachedVotes.shayan_sucks,
                      }
                    : undefined
                }
              />
            </div>

            {/* Dhai.eth Card (bottom) */}
            <div className="w-full">
              <DebateCard
                key={`dhai-${cardKey}`}
                debater={dhai}
                onVote={(vote) => handleVote(dhai, vote)}
                isTop={true}
                isPaused={isPaused}
                showResults={!!winner}
                voteStats={
                  cachedVotes
                    ? {
                        fucks: cachedVotes.dhai_fucks,
                        sucks: cachedVotes.dhai_sucks,
                        weightedScore: cachedVotes.dhai_fucks - cachedVotes.dhai_sucks,
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Winner Display or Regular Message */}
      {winner ? (
        <div
          className="py-3 md:py-4 text-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            borderTop: '5px solid black',
          }}
        >
          <div className="px-4">
            <p className="text-sm md:text-base font-black text-black mb-1">🏆 WINNER DECLARED! 🏆</p>
            <h2 className="text-3xl md:text-5xl font-black text-black" style={{ letterSpacing: '0.05em' }}>
              {winner.name.toUpperCase()}
            </h2>
          </div>
        </div>
      ) : (
        <div
          className="py-2 md:py-3 text-center flex-shrink-0"
          style={{
            backgroundColor: 'white',
            borderTop: '5px solid black',
          }}
        >
          <p className="text-base md:text-lg font-bold text-gray-700 px-2">
            Total votes will be revealed at the end! 🔥
          </p>
        </div>
      )}
    </div>
  );
}
