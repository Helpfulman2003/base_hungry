import React, { useState } from 'react';
import { Wallet, LogOut, ExternalLink, Loader } from 'lucide-react';
import { connectWallet } from '../lib/contract.js';

const WalletConnect = ({ wallet, onConnect, onDisconnect }) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleConnect = async () => {
    setError('');
    setLoading(true);
    try {
      const w = await connectWallet();
      onConnect(w);
    } catch (err) {
      setError(err.message?.slice(0, 80) || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const short = (addr) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  if (wallet) {
    return (
      <div className="wallet-connected">
        <a
          href={`https://basescan.org/address/${wallet.address}`}
          target="_blank"
          rel="noreferrer"
          className="wallet-address"
        >
          <div className="wallet-dot" />
          {short(wallet.address)}
          <ExternalLink size={11} />
        </a>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onDisconnect}
          title="Disconnect"
        >
          <LogOut size={15} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <button className="btn" onClick={handleConnect} disabled={loading}>
        {loading ? <Loader size={17} className="spinning" /> : <Wallet size={17} />}
        {loading ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
};

export default WalletConnect;
