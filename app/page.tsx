'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/extended-chains';
import { useEffect, useState } from 'react';
import LoginPage from './components/LoginPage';
import VotingArena from './components/VotingArena';

export default function Home() {
  const { ready, authenticated, user } = usePrivy();
  const { createWallet } = useCreateWallet();
  const [movementAddress, setMovementAddress] = useState<string>('');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  useEffect(() => {
    const setupMovementWallet = async () => {
      if (!authenticated || !user || isCreatingWallet) return;

      // Check if user already has an Aptos/Movement wallet
      const moveWallet = user.linkedAccounts?.find(
        (account: any) => account.chainType === 'aptos'
      ) as any;

      if (moveWallet) {
        const address = moveWallet.address as string;
        setMovementAddress(address);
        console.log('Movement Wallet Address:', address);
      } else {
        // Create a new Aptos/Movement wallet
        console.log('No Movement wallet found. Creating one now...');
        setIsCreatingWallet(true);
        try {
          const wallet = await createWallet({ chainType: 'aptos' });
          const address = (wallet as any).address;
          setMovementAddress(address);
          console.log('Created Movement Wallet Address:', address);
        } catch (error) {
          console.error('Error creating Movement wallet:', error);
        } finally {
          setIsCreatingWallet(false);
        }
      }
    };

    setupMovementWallet();
  }, [authenticated, user, createWallet, isCreatingWallet]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e8f4f8' }}>
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {!authenticated ? (
        <LoginPage />
      ) : (
        <VotingArena username={movementAddress} />
      )}
    </>
  );
}
