import React, { useState } from 'react';
import Menu from './components/Menu.jsx';
import SnakeGame from './components/SnakeGame.jsx';
import SpaceDust from './components/SpaceDust.jsx';

function App() {
  const [screen, setScreen]   = useState('menu'); // 'menu' | 'playing'
  const [wallet, setWallet]   = useState(null);   // { provider, signer, address }

  const handleDisconnect = () => setWallet(null);

  return (
    <div className="app-container">
      <div className="bg-logo" />
      <SpaceDust />

      {screen === 'menu' && (
        <Menu
          wallet={wallet}
          onConnect={setWallet}
          onDisconnect={handleDisconnect}
          onStartGame={() => setScreen('playing')}
        />
      )}

      {screen === 'playing' && (
        <SnakeGame
          wallet={wallet}
          onBack={() => setScreen('menu')}
        />
      )}
    </div>
  );
}

export default App;
