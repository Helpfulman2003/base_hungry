import React from 'react';
import { Gamepad2 } from 'lucide-react';

const Menu = ({ onStartGame }) => {
  return (
    <div className="glass-panel">
      <div className="menu-container">
        <div>
          <h1 className="menu-title">Raiku Hungry</h1>
        </div>
        
        <button 
          className="btn" 
          onClick={onStartGame}
        >
          <Gamepad2 size={24} />
          Play Game
        </button>
      </div>
    </div>
  );
};

export default Menu;
