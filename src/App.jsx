import React, { useState } from 'react';
import Menu from './components/Menu';
import SnakeGame from './components/SnakeGame';
import SpaceDust from './components/SpaceDust';

function App() {
  const [gameState, setGameState] = useState('menu'); // menu, playing

  const handleStartGame = () => {
    setGameState('playing');
  };

  const handleBackToMenu = () => {
    setGameState('menu');
  };

  return (
    <div className="app-container">
      <div className="bg-logo" />
      <SpaceDust />
      {gameState === 'menu' && (
        <Menu onStartGame={handleStartGame} />
      )}
      
      {gameState === 'playing' && (
        <SnakeGame onBack={handleBackToMenu} />
      )}
    </div>
  );
}

export default App;
