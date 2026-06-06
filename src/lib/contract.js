import { ethers } from 'ethers';

// ── ABI ─────────────────────────────────────────────────────────────
export const SNAKE_FEES_ABI = [
  // Read
  'function owner() external view returns (address)',
  'function gameStartFee() external view returns (uint256)',
  'function gameEndFee() external view returns (uint256)',
  'function totalStartPaid() external view returns (uint256)',
  'function totalEndPaid() external view returns (uint256)',
  'function totalPlayers() external view returns (uint256)',
  'function contractBalance() external view returns (uint256)',
  // Write (player)
  'function payGameStart() external payable',
  'function payGameEnd() external payable',
  // Write (owner)
  'function setFees(uint256 _startFee, uint256 _endFee) external',
  'function withdraw() external',
  'function transferOwnership(address newOwner) external',
  // Events
  'event GameStartPaid(address indexed player, uint256 amount)',
  'event GameEndPaid(address indexed player, uint256 amount)',
  'event FeesUpdated(uint256 newStartFee, uint256 newEndFee)',
  'event Withdrawn(address indexed to, uint256 amount)',
];

// ── Contract Address ────────────────────────────────────────────────
// Paste your deployed address in .env as VITE_CONTRACT_ADDRESS=0x...
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

export const BASE_CHAIN_ID     = 8453;
export const BASE_CHAIN_HEX    = '0x2105';
export const BASE_RPC          = 'https://mainnet.base.org';

// ── Provider ────────────────────────────────────────────────────────
export function getReadProvider() {
  return new ethers.JsonRpcProvider(BASE_RPC);
}

export function getContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESS, SNAKE_FEES_ABI, signerOrProvider);
}

// ── Wallet ───────────────────────────────────────────────────────────
export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask not found. Please install it.');

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);

  // Switch / add Base Mainnet
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_CHAIN_HEX }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: BASE_CHAIN_HEX,
          chainName: 'Base',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: [BASE_RPC],
          blockExplorerUrls: ['https://basescan.org'],
        }],
      });
    } else {
      throw err;
    }
  }

  const signer  = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

// ── Fee Actions ──────────────────────────────────────────────────────
export async function payStartFee(signer) {
  const contract = getContract(signer);
  const fee      = await contract.gameStartFee();
  const tx       = await contract.payGameStart({ value: fee });
  await tx.wait();
  return tx.hash;
}

export async function payEndFee(signer) {
  const contract = getContract(signer);
  const fee      = await contract.gameEndFee();
  const tx       = await contract.payGameEnd({ value: fee });
  await tx.wait();
  return tx.hash;
}
