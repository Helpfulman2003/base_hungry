import { useState, useEffect, useRef, useCallback } from 'react';

const GRID_SIZE    = 20;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT= 600;
const COLS         = CANVAS_WIDTH  / GRID_SIZE;
const ROWS         = CANVAS_HEIGHT / GRID_SIZE;
const BASE_SPEED   = 100; // ms per tick

export function useGameEngine(canvasRef, svgScreenRef) {
  const [gameState, setGameState] = useState('idle');
  const [score,     setScore]     = useState(0);

  const gameRef = useRef({
    state:  'idle',
    snake:  { body: [{x:20,y:15},{x:20,y:16},{x:20,y:17}], dir:{x:0,y:-1}, nextDir:{x:0,y:-1}, isDead:false },
    apple:  { x:0, y:0 },
    lastLogicTime: 0,
    dragon: { elems: [] },
  });

  // ── Canvas drawing ───────────────────────────────────────────────
  const drawGridAndApple = (ctx, state) => {
    ctx.fillStyle = '#060d1f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(15, 35, 80, 0.9)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i*GRID_SIZE,0); ctx.lineTo(i*GRID_SIZE,CANVAS_HEIGHT); ctx.stroke();
    }
    for (let i = 0; i < ROWS; i++) {
      ctx.beginPath(); ctx.moveTo(0,i*GRID_SIZE); ctx.lineTo(CANVAS_WIDTH,i*GRID_SIZE); ctx.stroke();
    }

    // Apple – glowing blue orb
    const ax = state.apple.x * GRID_SIZE + GRID_SIZE / 2;
    const ay = state.apple.y * GRID_SIZE + GRID_SIZE / 2;
    const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, GRID_SIZE / 2 - 2);
    grad.addColorStop(0, '#93c5fd');
    grad.addColorStop(1, '#2563eb');
    ctx.fillStyle   = grad;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    ctx.arc(ax, ay, GRID_SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  // ── Collision ────────────────────────────────────────────────────
  const checkCollision = (head, body) => {
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return true;
    return body.some(s => s.x === head.x && s.y === head.y);
  };

  const generateApple = (snakeBody) => {
    let a;
    do { a = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) }; }
    while (snakeBody.some(s => s.x === a.x && s.y === a.y));
    return a;
  };

  // ── Dragon SVG ───────────────────────────────────────────────────
  const initDragon = useCallback(() => {
    const screen = svgScreenRef.current;
    if (!screen) return;
    while (screen.firstChild) screen.removeChild(screen.firstChild);
    const state = gameRef.current;
    state.dragon.elems = [];
    for (let i = state.snake.body.length - 1; i >= 0; i--) {
      const name = i === 0 ? 'Cabeza' : i === 1 ? 'Aletas' : 'Espina';
      const el   = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + name);
      screen.appendChild(el);
      state.dragon.elems[i] = el;
    }
  }, [svgScreenRef]);

  const growDragon = useCallback(() => {
    const screen = svgScreenRef.current;
    const state  = gameRef.current;
    if (!screen) return;
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#Espina');
    screen.prepend(el);
    state.dragon.elems.push(el);
  }, [svgScreenRef]);

  const updateDragonGrid = useCallback(() => {
    const state = gameRef.current;
    const body  = state.snake.body;
    const elems = state.dragon.elems;
    for (let i = 0; i < body.length; i++) {
      const seg  = body[i];
      const elem = elems[i];
      if (!elem) continue;
      let a = i === 0
        ? Math.atan2(state.snake.dir.y, state.snake.dir.x)
        : Math.atan2(body[i-1].y - seg.y, body[i-1].x - seg.x);
      a += Math.PI;
      const px = seg.x * GRID_SIZE + GRID_SIZE / 2;
      const py = seg.y * GRID_SIZE + GRID_SIZE / 2;
      const expected = i === 0 ? 'Cabeza' : (i === 1 || (i === 6 && body.length >= 9)) ? 'Aletas' : 'Espina';
      if (elem.getAttributeNS('http://www.w3.org/1999/xlink', 'href') !== '#' + expected) {
        elem.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + expected);
      }
      const s = Math.max((162 + 4 * (1 - i)) / 120, 0.4);
      elem.setAttributeNS(null, 'transform', `translate(${px},${py}) rotate(${(180/Math.PI)*a}) scale(${s},${s})`);
      elem.classList.remove('dragon-head','dragon-fins','dragon-stretched','dragon-collapsed');
      if (i === 0) elem.classList.add('dragon-head');
      else if (expected === 'Aletas') elem.classList.add('dragon-fins');
      else elem.classList.add('dragon-collapsed');
    }
  }, []);

  // ── Direction control (shared for keyboard + touch) ──────────────
  const setDirection = useCallback((dx, dy) => {
    const state = gameRef.current;
    if (state.state !== 'playing') return;
    if (dx ===  1 && state.snake.dir.x === -1) return;
    if (dx === -1 && state.snake.dir.x ===  1) return;
    if (dy ===  1 && state.snake.dir.y === -1) return;
    if (dy === -1 && state.snake.dir.y ===  1) return;
    state.snake.nextDir = { x: dx, y: dy };
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp')    setDirection(0, -1);
      if (e.key === 'ArrowDown')  setDirection(0,  1);
      if (e.key === 'ArrowLeft')  setDirection(-1, 0);
      if (e.key === 'ArrowRight') setDirection( 1, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDirection]);

  // ── Swipe (touch) ─────────────────────────────────────────────────
  useEffect(() => {
    let sx, sy;
    const onTouchStart = (e) => { 
      sx = e.touches[0].clientX; 
      sy = e.touches[0].clientY; 
    };
    const onTouchMove = (e) => {
      e.preventDefault(); // Strongly prevent scroll
    };
    const onTouchEnd   = (e) => {
      if (!sx || !sy) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      const THRESHOLD = 20;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx >  THRESHOLD) setDirection( 1, 0);
        if (dx < -THRESHOLD) setDirection(-1, 0);
      } else {
        if (dy >  THRESHOLD) setDirection(0,  1);
        if (dy < -THRESHOLD) setDirection(0, -1);
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: false });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [setDirection]);

  // ── Game loop ────────────────────────────────────────────────────
  const update = useCallback((time) => {
    const state = gameRef.current;
    if (state.state !== 'playing') return;

    if (time - state.lastLogicTime > BASE_SPEED) {
      state.lastLogicTime = time;
      if (!state.snake.isDead) {
        state.snake.dir = { ...state.snake.nextDir };
        const head = {
          x: state.snake.body[0].x + state.snake.dir.x,
          y: state.snake.body[0].y + state.snake.dir.y,
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
          updateDragonGrid();
        }
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        drawGridAndApple(ctx, state);
      }
    }

    if (state.state === 'playing') requestAnimationFrame(update);
  }, [canvasRef, updateDragonGrid, growDragon]);

  // ── Public API ───────────────────────────────────────────────────
  const startGame = useCallback(() => {
    setScore(0);
    setGameState('playing');
    gameRef.current = {
      state: 'playing',
      snake: { body:[{x:20,y:15},{x:20,y:16},{x:20,y:17}], dir:{x:0,y:-1}, nextDir:{x:0,y:-1}, isDead:false },
      apple: {x:0,y:0},
      lastLogicTime: performance.now(),
      dragon: { elems:[] },
    };
    gameRef.current.apple = generateApple(gameRef.current.snake.body);
    initDragon();
    updateDragonGrid();
    requestAnimationFrame(update);
  }, [update, initDragon, updateDragonGrid]);

  const pauseGame  = useCallback(() => { gameRef.current.state = 'idle'; }, []);
  const resumeGame = useCallback(() => {
    gameRef.current.state = 'playing';
    gameRef.current.lastLogicTime = performance.now();
    requestAnimationFrame(update);
  }, [update]);
  const resetGame  = useCallback(() => startGame(), [startGame]);

  return { gameState, score, startGame, pauseGame, resumeGame, resetGame, setDirection };
}
