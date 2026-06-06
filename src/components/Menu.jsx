import React from 'react';
import { Gamepad2 } from 'lucide-react';
import WalletConnect from './WalletConnect.jsx';

const Menu = ({ wallet, onConnect, onDisconnect, onStartGame }) => {
  return (
    <div className="glass-panel">
      <div className="menu-container">
        {/* Title */}
        <div>
          <h1 className="menu-title">Base Hungry</h1>
          <p className="menu-subtitle">Snake game · Base Mainnet</p>
        </div>

        <div className="menu-divider" />

        {/* Wallet */}
        <WalletConnect
          wallet={wallet}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />

        {/* Play */}
        <button
          id="btn-play"
          className="btn"
          onClick={onStartGame}
          disabled={!wallet}
          title={!wallet ? 'Connect wallet first' : 'Play!'}
        >
          <Gamepad2 size={20} />
          Play Game
        </button>

        {!wallet && (
          <p className="info-text">Connect your wallet to play &amp; pay fees on Base</p>
        )}
      </div>
    </div>
  );
};

export default Menu;
