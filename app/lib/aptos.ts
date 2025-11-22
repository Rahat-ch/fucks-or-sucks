import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

// Initialize Aptos SDK with Movement Mainnet
export const aptos = new Aptos(
  new AptosConfig({
    network: Network.CUSTOM,
    fullnode: process.env.MOVEMENT_RPC_URL || 'https://mainnet.movementnetwork.xyz/v1',
  })
);

// Contract address (Mainnet)
export const CONTRACT_ADDRESS = '0x697d8a418f2f63e25a1a9e81401f16944b7c77012f5ff602d8eb7d3efb4b815a';

// Utility to convert Uint8Array to hex string
export const toHex = (buffer: Uint8Array): string => {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Movement Mainnet explorer URL
export const getExplorerUrl = (txHash: string): string => {
  // Ensure txHash starts with 0x
  const formattedHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
  return `https://explorer.movementnetwork.xyz/txn/${formattedHash}`;
};
