'use client';

import { useEffect, useState } from 'react';

interface Debater {
  id: number;
  name: string;
  side: string;
  image?: string;
}

interface VoteStats {
  fucks: number;
  sucks: number;
  weightedScore: number;
}

interface DebateCardProps {
  debater: Debater;
  onVote: (vote: 'fucks' | 'sucks') => void;
  isTop: boolean;
  isPaused?: boolean;
  showResults?: boolean;
  voteStats?: VoteStats;
}

export default function DebateCard({ debater, onVote, isTop, isPaused = false, showResults = false, voteStats }: DebateCardProps) {
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    if (!isTop || isPaused) return;
    setIsDragging(true);
    setStartPos({ x: clientX, y: clientY });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !isTop || isPaused) return;

    const deltaX = clientX - startPos.x;
    const deltaY = clientY - startPos.y;
    setPosition({ x: deltaX, y: deltaY });

    // Show overlay based on swipe direction
    if (Math.abs(deltaX) > 50) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleEnd = () => {
    if (!isDragging || !isTop || isPaused) return;
    setIsDragging(false);

    // If swiped far enough, trigger vote
    if (Math.abs(position.x) > 100) {
      const vote = position.x > 0 ? 'fucks' : 'sucks';
      animateOut(vote);
    } else {
      // Reset position
      setPosition({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  };

  const animateOut = (vote: 'fucks' | 'sucks') => {
    const direction = vote === 'fucks' ? 1 : -1;
    setPosition({ x: direction * 1000, y: 0 });
    setTimeout(() => {
      onVote(vote);
    }, 300);
  };

  const handleButtonClick = (vote: 'fucks' | 'sucks') => {
    if (!isTop) return;
    setSwipeDirection(vote === 'fucks' ? 'right' : 'left');
    animateOut(vote);
  };

  const rotation = position.x * 0.05;
  const opacity = swipeDirection ? 0.8 : 0;

  return (
    <div
      className="w-full"
      style={{
        transform: `translateX(${position.x}px) translateY(${position.y}px) rotate(${rotation}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        cursor: isTop ? 'grab' : 'default',
        touchAction: 'none',
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchMove={(e) => {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchEnd={() => {
        handleEnd();
      }}
    >
      <div
        className="bg-white relative overflow-hidden p-2.5 md:p-5"
        style={{
          border: '5px solid black',
        }}
      >
        {/* Swipe Overlays */}
        {swipeDirection === 'right' && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(0, 214, 106, 0.85)',
              opacity,
              transition: 'opacity 0.2s',
            }}
          >
            <div
              className="text-xl md:text-3xl font-black rotate-12"
              style={{
                color: 'white',
                border: '4px solid white',
                padding: '8px 20px md:padding-[10px 25px]',
                letterSpacing: '0.1em',
              }}
            >
              FUCKS
            </div>
          </div>
        )}

        {swipeDirection === 'left' && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(255, 59, 59, 0.85)',
              opacity,
              transition: 'opacity 0.2s',
            }}
          >
            <div
              className="text-xl md:text-3xl font-black -rotate-12"
              style={{
                color: 'white',
                border: '4px solid white',
                padding: '8px 20px',
                letterSpacing: '0.1em',
              }}
            >
              SUCKS
            </div>
          </div>
        )}

        {/* Card Content */}
        <div className="flex flex-col items-center text-center relative z-10 py-6 md:py-8">
          {/* Profile Picture Placeholder */}
          <div
            className="rounded-full bg-gray-200 overflow-hidden w-[50px] h-[50px] md:w-[80px] md:h-[80px]"
            style={{
              border: '3px solid black',
              marginTop: '25px',
              marginBottom: '5px',
            }}
          >
            {debater.image ? (
              <img src={debater.image} alt={debater.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl md:text-4xl">
                👤
              </div>
            )}
          </div>

          {/* Name */}
          <h2 className="text-base md:text-xl font-black mb-2 md:mb-3" style={{ letterSpacing: '0.02em' }}>
            {debater.name}
          </h2>

          {/* Side */}
          <div
            className="font-bold text-white text-[10px] md:text-xs mb-3 md:mb-5"
            style={{
              backgroundColor: debater.side === 'MOVE' ? '#6366f1' : '#f59e0b',
              border: '2px solid black',
              padding: '5px',
            }}
          >
            {debater.side}
          </div>

          {/* Buttons or Results */}
          {showResults && voteStats ? (
            <div className="w-full px-8 md:px-12" style={{ marginTop: '5px', marginBottom: '25px' }}>
              <div className="space-y-2">
                <div className="flex justify-around items-center">
                  <span className="font-bold text-sm md:text-base">FUCKS:</span>
                  <span
                    className="font-black text-lg md:text-xl px-3 py-1 rounded"
                    style={{
                      backgroundColor: '#00d66a',
                      color: 'white',
                      border: '2px solid black',
                    }}
                  >
                    {voteStats.fucks}
                  </span>
                </div>
                <div className="flex justify-around items-center">
                  <span className="font-bold text-sm md:text-base">SUCKS:</span>
                  <span
                    className="font-black text-lg md:text-xl px-3 py-1 rounded"
                    style={{
                      backgroundColor: '#ff3b3b',
                      color: 'white',
                      border: '2px solid black',
                    }}
                  >
                    {voteStats.sucks}
                  </span>
                </div>
                <div
                  className="flex justify-around items-center pt-2"
                  style={{ borderTop: '2px solid #ccc' }}
                >
                  <span className="font-black text-sm md:text-base">WEIGHTED SCORE:</span>
                  <span
                    className="font-black text-xl md:text-2xl px-3 py-1 rounded"
                    style={{
                      backgroundColor: voteStats.weightedScore > 0 ? '#ffd700' : '#gray-300',
                      color: 'black',
                      border: '3px solid black',
                    }}
                  >
                    {voteStats.weightedScore}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2.5 md:gap-3" style={{ marginTop: '5px', marginBottom: '25px' }}>
              <button
                onClick={() => handleButtonClick('sucks')}
                className="font-bold text-white transition-transform hover:scale-110 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#ff3b3b',
                  border: '3px solid black',
                  borderRadius: '8px',
                  padding: '10px 20px',
                }}
                disabled={!isTop || isPaused}
              >
                SUCKS
              </button>

              <button
                onClick={() => handleButtonClick('fucks')}
                className="font-bold text-white transition-transform hover:scale-110 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#00d66a',
                  border: '3px solid black',
                  borderRadius: '8px',
                  padding: '10px 20px',
                }}
                disabled={!isTop || isPaused}
              >
                FUCKS
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
