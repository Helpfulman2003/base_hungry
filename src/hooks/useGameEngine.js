import { useState, useEffect, useRef, useCallback } from 'react';

const GRID_SIZE = 20;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const COLS = CANVAS_WIDTH / GRID_SIZE;
const ROWS = CANVAS_HEIGHT / GRID_SIZE;
const BASE_SPEED = 100; // ms per frame

export function useGameEngine(canvasRef, svgScreenRef) {
  const [gameState, setGameState] = useState('idle'); // idle, playing, gameover
  const [score, setScore] = useState(0);

  const gameRef = useRef({
    state: 'idle',
    snake: { 
      body: [{x: 20, y: 15}, {x: 20, y: 16}, {x: 20, y: 17}], 
      dir: {x: 0, y: -1}, 
      nextDir: {x: 0, y: -1}, 
      isDead: false 
    },
    apple: {x: 0, y: 0},
    lastLogicTime: 0,
    dragon: {
      elems: []
    }
  });

  const generateApple = (snakeBody) => {
    let newApple;
    while (true) {
      newApple = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS)
      };
      const inSnake = snakeBody.some(s => s.x === newApple.x && s.y === newApple.y);
      if (!inSnake) break;
    }
    return newApple;
  };

  const drawGridAndApple = (ctx, state) => {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#222';
    for (let i = 0; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let i = 0; i < ROWS; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(CANVAS_WIDTH, i * GRID_SIZE); ctx.stroke();
    }

    ctx.fillStyle = '#bfff00';
    ctx.shadowColor = '#bfff00';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(state.apple.x * GRID_SIZE + GRID_SIZE/2, state.apple.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  };

  const checkCollision = (head, body) => {
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return true;
    if (body.some(s => s.x === head.x && s.y === head.y)) return true;
    return false;
  };

  // Dragon Logic Setup
  const initDragon = useCallback(() => {
    const screen = svgScreenRef.current;
    if (!screen) return;
    
    // Clear existing SVG children
    while (screen.firstChild) {
      screen.removeChild(screen.firstChild);
    }
    
    const state = gameRef.current;
    state.dragon.elems = [];

    // Create an element for each snake body part
    // Append in reverse order so head is drawn last (on top)
    for (let i = state.snake.body.length - 1; i >= 0; i--) {
      let useName = "Espina";
      if (i === 0) useName = "Cabeza";
      else if (i === 1) useName = "Aletas";
      
      const elem = document.createElementNS("http://www.w3.org/2000/svg", "use");
      elem.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + useName);
      screen.appendChild(elem); 
      
      state.dragon.elems[i] = elem;
    }
  }, [svgScreenRef]);

  const growDragon = useCallback(() => {
    const screen = svgScreenRef.current;
    const state = gameRef.current;
    if (!screen) return;

    const elem = document.createElementNS("http://www.w3.org/2000/svg", "use");
    elem.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#Espina");
    screen.prepend(elem); // prepend puts it at the back
    
    state.dragon.elems.push(elem);
  }, [svgScreenRef]);

  const updateDragonGrid = useCallback(() => {
    const state = gameRef.current;
    const body = state.snake.body;
    const elems = state.dragon.elems;
    
    for (let i = 0; i < body.length; i++) {
      const seg = body[i];
      const elem = elems[i];
      if (!elem) continue;
      
      let a = 0;
      if (i === 0) {
        // Head looks in the direction of movement
        a = Math.atan2(state.snake.dir.y, state.snake.dir.x);
      } else {
        // Body segment looks towards the segment ahead of it
        const prev = body[i - 1];
        a = Math.atan2(prev.y - seg.y, prev.x - seg.x);
      }
      
      // The SVG elements are natively drawn facing Left (-X direction)
      // So we need to add 180 degrees (Math.PI radians) to correct the orientation
      a += Math.PI;
      
      const px = seg.x * GRID_SIZE + GRID_SIZE / 2;
      const py = seg.y * GRID_SIZE + GRID_SIZE / 2;
      
      let expectedUse = "Espina";
      if (i === 0) expectedUse = "Cabeza";
      else if (i === 1) expectedUse = "Aletas";
      else if (i === 6 && body.length >= 9) expectedUse = "Aletas"; // Grow second wing at score 6 (length 9)

      const currentHref = elem.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (currentHref !== "#" + expectedUse) {
        elem.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + expectedUse);
      }

      // Make it slightly smaller to fit the grid perfectly
      const s = Math.max((162 + 4 * (1 - i)) / 120, 0.4); 
      
      elem.setAttributeNS(
        null,
        "transform",
        `translate(${px},${py}) rotate(${(180 / Math.PI) * a}) scale(${s},${s})`
      );
      
      elem.classList.remove('dragon-head', 'dragon-fins', 'dragon-stretched', 'dragon-collapsed');
      if (i === 0) elem.classList.add('dragon-head');
      else if (expectedUse === "Aletas") elem.classList.add('dragon-fins');
      else elem.classList.add('dragon-collapsed');
    }
  }, []);

  const update = useCallback((time) => {
    const state = gameRef.current;
    if (state.state !== 'playing') return;

    // 1. Update Game Grid Logic (100ms ticks)
    if (time - state.lastLogicTime > BASE_SPEED) {
      state.lastLogicTime = time;

      if (!state.snake.isDead) {
        state.snake.dir = { ...state.snake.nextDir };
        const head = { 
          x: state.snake.body[0].x + state.snake.dir.x, 
          y: state.snake.body[0].y + state.snake.dir.y 
        };

        if (checkCollision(head, state.snake.body)) {
          state.snake.isDead = true;
          state.state = 'gameover';
          setGameState('gameover');
        } else {
          state.snake.body.unshift(head);
          
          if (head.x === state.apple.x && head.y === state.apple.y) {
            setScore(s => s + 1);
            state.apple = generateApple(state.snake.body);
            growDragon();
          } else {
            state.snake.body.pop();
          }
          
          // Update visual dragon perfectly snapped to the new grid positions
          updateDragonGrid();
        }
      }
      
      // 3. Render Canvas (Grid and Apples)
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        drawGridAndApple(ctx, state);
      }
    }

    if (state.state === 'playing') {
      requestAnimationFrame(update);
    }
  }, [canvasRef, updateDragonGrid, growDragon]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = gameRef.current;
      if (state.state !== 'playing') return;

      if (e.key === 'ArrowUp' && state.snake.dir.y !== 1) state.snake.nextDir = {x: 0, y: -1};
      if (e.key === 'ArrowDown' && state.snake.dir.y !== -1) state.snake.nextDir = {x: 0, y: 1};
      if (e.key === 'ArrowLeft' && state.snake.dir.x !== 1) state.snake.nextDir = {x: -1, y: 0};
      if (e.key === 'ArrowRight' && state.snake.dir.x !== -1) state.snake.nextDir = {x: 1, y: 0};
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setGameState('playing');
    
    gameRef.current = {
      state: 'playing',
      snake: { 
        body: [{x: 20, y: 15}, {x: 20, y: 16}, {x: 20, y: 17}], 
        dir: {x: 0, y: -1}, 
        nextDir: {x: 0, y: -1}, 
        isDead: false 
      },
      apple: {x: 0, y: 0},
      lastLogicTime: performance.now(),
      dragon: {
        elems: []
      }
    };

    gameRef.current.apple = generateApple(gameRef.current.snake.body);
    initDragon();
    
    // Initial draw
    updateDragonGrid();
    
    requestAnimationFrame(update);
  }, [update, initDragon, updateDragonGrid]);

  const pauseGame = useCallback(() => {
    gameRef.current.state = 'idle';
  }, []);

  const resumeGame = useCallback(() => {
    gameRef.current.state = 'playing';
    gameRef.current.lastLogicTime = performance.now();
    requestAnimationFrame(update);
  }, [update]);

  const resetGame = useCallback(() => {
    startGame();
  }, [startGame]);

  return {
    gameState,
    score,
    startGame,
    pauseGame,
    resumeGame,
    resetGame
  };
}
