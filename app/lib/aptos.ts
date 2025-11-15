import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

// Initialize Aptos SDK with Movement testnet
export const aptos = new Aptos(
  new AptosConfig({
    network: Network.CUSTOM,
    fullnode: 'https://testnet.movementnetwork.xyz/v1',
  })
);

// Contract address
export const CONTRACT_ADDRESS = '0x1d5b9af2cd921ab84053a9e5dc31425d61796e3976246a719eb174a925e531e7';

// Utility to convert Uint8Array to hex string
export const toHex = (buffer: Uint8Array): string => {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Movement testnet explorer URL
export const getExplorerUrl = (txHash: string): string => {
  // Ensure txHash starts with 0x
  const formattedHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
  return `https://explorer.movementnetwork.xyz/txn/${formattedHash}?network=bardock+testnet`;
};
