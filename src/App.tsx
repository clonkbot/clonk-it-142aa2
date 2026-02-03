import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

type MoleState = 'hidden' | 'visible' | 'hit';

interface Hole {
  id: number;
  state: MoleState;
  timeoutId?: number;
}

const GAME_DURATION = 30;
const INITIAL_MOLE_DURATION = 1200;
const MIN_MOLE_DURATION = 600;
const SPAWN_INTERVAL = 800;

function App() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [holes, setHoles] = useState<Hole[]>(() =>
    Array.from({ length: 9 }, (_, i) => ({ id: i, state: 'hidden' as MoleState }))
  );
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('clonkItHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const spawnRef = useRef<number | null>(null);

  const getMoleDuration = useCallback(() => {
    const elapsed = GAME_DURATION - timeLeft;
    const progress = elapsed / GAME_DURATION;
    return Math.max(MIN_MOLE_DURATION, INITIAL_MOLE_DURATION - progress * 400);
  }, [timeLeft]);

  const showMole = useCallback(() => {
    if (gameState !== 'playing') return;

    const hiddenHoles = holes.filter(h => h.state === 'hidden');
    if (hiddenHoles.length === 0) return;

    const randomHole = hiddenHoles[Math.floor(Math.random() * hiddenHoles.length)];
    const duration = getMoleDuration();

    setHoles(prev =>
      prev.map(h =>
        h.id === randomHole.id ? { ...h, state: 'visible' as MoleState } : h
      )
    );

    setTimeout(() => {
      setHoles(prev =>
        prev.map(h =>
          h.id === randomHole.id && h.state === 'visible'
            ? { ...h, state: 'hidden' as MoleState }
            : h
        )
      );
      setCombo(0);
    }, duration);
  }, [gameState, holes, getMoleDuration]);

  const handleWhack = useCallback((id: number) => {
    if (gameState !== 'playing') return;

    setHoles(prev => {
      const hole = prev.find(h => h.id === id);
      if (hole?.state !== 'visible') return prev;

      return prev.map(h =>
        h.id === id ? { ...h, state: 'hit' as MoleState } : h
      );
    });

    const hole = holes.find(h => h.id === id);
    if (hole?.state === 'visible') {
      const newCombo = combo + 1;
      const comboBonus = Math.floor(newCombo / 3);
      const points = 10 + comboBonus * 5;
      setScore(prev => prev + points);
      setCombo(newCombo);

      if (newCombo >= 3) {
        setShowCombo(true);
        setTimeout(() => setShowCombo(false), 500);
      }

      setTimeout(() => {
        setHoles(prev =>
          prev.map(h =>
            h.id === id && h.state === 'hit'
              ? { ...h, state: 'hidden' as MoleState }
              : h
          )
        );
      }, 200);
    }
  }, [gameState, holes, combo]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    setHoles(Array.from({ length: 9 }, (_, i) => ({ id: i, state: 'hidden' as MoleState })));
  }, []);

  const endGame = useCallback(() => {
    setGameState('ended');
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('clonkItHighScore', score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState]);

  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      endGame();
    }
  }, [timeLeft, gameState, endGame]);

  useEffect(() => {
    if (gameState === 'playing') {
      spawnRef.current = window.setInterval(() => {
        showMole();
      }, SPAWN_INTERVAL);

      return () => {
        if (spawnRef.current) clearInterval(spawnRef.current);
      };
    }
  }, [gameState, showMole]);

  return (
    <div className="game-container">
      <div className="game-background">
        <div className="bg-layer bg-sky" />
        <div className="bg-layer bg-hills" />
        <div className="bg-layer bg-ground" />
      </div>

      <header className="game-header">
        <div className="logo-container">
          <h1 className="game-logo">
            <span className="logo-clonk">CLONK</span>
            <span className="logo-it">IT</span>
          </h1>
        </div>

        <div className="stats-container">
          <div className="stat-box score-box">
            <span className="stat-label">SCORE</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat-box time-box">
            <span className="stat-label">TIME</span>
            <span className={`stat-value ${timeLeft <= 10 ? 'time-warning' : ''}`}>
              {timeLeft}
            </span>
          </div>
          <div className="stat-box high-score-box">
            <span className="stat-label">BEST</span>
            <span className="stat-value">{highScore}</span>
          </div>
        </div>
      </header>

      {showCombo && (
        <div className="combo-popup">
          <span className="combo-text">COMBO x{combo}!</span>
        </div>
      )}

      <main className="game-board-container">
        {gameState === 'idle' && (
          <div className="overlay start-overlay">
            <div className="overlay-content">
              <div className="robot-mascot">
                <div className="robot-body">
                  <div className="robot-face">
                    <div className="robot-eye left" />
                    <div className="robot-eye right" />
                    <div className="robot-mouth" />
                  </div>
                </div>
                <div className="robot-hammer">
                  <div className="hammer-handle" />
                  <div className="hammer-head" />
                </div>
              </div>
              <h2 className="overlay-title">READY TO CLONK?</h2>
              <p className="overlay-subtitle">Whack the orange robots!</p>
              <button className="play-button" onClick={startGame}>
                <span className="button-text">START GAME</span>
                <span className="button-icon">⚒️</span>
              </button>
            </div>
          </div>
        )}

        {gameState === 'ended' && (
          <div className="overlay end-overlay">
            <div className="overlay-content">
              <h2 className="overlay-title">TIME'S UP!</h2>
              <div className="final-score">
                <span className="final-label">Final Score</span>
                <span className="final-value">{score}</span>
              </div>
              {score > 0 && score >= highScore && (
                <div className="new-record">🏆 NEW RECORD! 🏆</div>
              )}
              <button className="play-button" onClick={startGame}>
                <span className="button-text">PLAY AGAIN</span>
                <span className="button-icon">🔄</span>
              </button>
            </div>
          </div>
        )}

        <div className="game-board">
          {holes.map((hole) => (
            <div
              key={hole.id}
              className={`hole-container ${hole.state}`}
              onClick={() => handleWhack(hole.id)}
            >
              <div className="hole-dirt">
                <div className="dirt-highlight" />
              </div>
              <div className="mole-wrapper">
                <div className={`mole ${hole.state}`}>
                  <div className="mole-body">
                    <div className="mole-face">
                      <div className="mole-eye left" />
                      <div className="mole-eye right" />
                      <div className="mole-mouth" />
                    </div>
                  </div>
                  {hole.state === 'hit' && (
                    <div className="hit-effect">
                      <span className="hit-star">★</span>
                      <span className="hit-star">★</span>
                      <span className="hit-star">★</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="hole-front" />
            </div>
          ))}
        </div>
      </main>

      <footer className="game-footer">
        <p>Requested by <a href="https://twitter.com/depaydayNFT" target="_blank" rel="noopener noreferrer">@depaydayNFT</a> · Built by <a href="https://twitter.com/clonkbot" target="_blank" rel="noopener noreferrer">@clonkbot</a></p>
      </footer>
    </div>
  );
}

export default App;
