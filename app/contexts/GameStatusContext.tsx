'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface WinnerInfo {
  name: string;
  score: number;
  loserScore: number;
  declaredAt: number;
}

interface GameStatusContextType {
  isPaused: boolean;
  winner: WinnerInfo | null;
  isLoading: boolean;
  refreshGameStatus: () => Promise<void>;
}

const GameStatusContext = createContext<GameStatusContextType | undefined>(undefined);

export function GameStatusProvider({ children }: { children: ReactNode }) {
  const [isPaused, setIsPaused] = useState(false);
  const [winner, setWinner] = useState<WinnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGameStatus = async () => {
    try {
      const response = await fetch('/api/game-status');
      if (response.ok) {
        const data = await response.json();
        setIsPaused(data.isPaused);
        setWinner(data.winner || null);
      }
    } catch (error) {
      console.error('Error fetching game status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshGameStatus = async () => {
    await fetchGameStatus();
  };

  useEffect(() => {
    // Initial fetch
    fetchGameStatus();

    // Poll every 5 seconds for updates
    const interval = setInterval(fetchGameStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <GameStatusContext.Provider value={{ isPaused, winner, isLoading, refreshGameStatus }}>
      {children}
    </GameStatusContext.Provider>
  );
}

export function useGameStatus() {
  const context = useContext(GameStatusContext);
  if (context === undefined) {
    throw new Error('useGameStatus must be used within a GameStatusProvider');
  }
  return context;
}
