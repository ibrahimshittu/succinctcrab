import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import './Game.css';

const generateSP1Proof = (score, level) => {
  return {
    proof: 'sp1_proof_data',
    public_inputs: [Math.floor(score), Math.floor(level)],
  };
};

const Game = ({ gameState, username, setGameState, onBack, fetchLeaderboard, setLeaderboard }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState('');
  const [missedObjects, setMissedObjects] = useState(0);
  const [levelUpTime, setLevelUpTime] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [canClearBombs, setCanClearBombs] = useState(true);
  const objects = useRef([]).current;
  const [maxObjects, setMaxObjects] = useState(5);
  const [startTime, setStartTime] = useState(null);
  const [fallSpeedMultiplier, setFallSpeedMultiplier] = useState(0.5);
  const [bombSpawnChance, setBombSpawnChance] = useState(0.2);
  const lastSpawnTime = useRef(0);

  useEffect(() => {
    console.log('Game component mounted with username:', username);
  }, [username]);

  const colors = useMemo(() => ['pink', 'purple', 'orange', 'blue', 'green'], []);

  const spawnObject = useCallback(() => {
    const now = Date.now();
    if (
      objects.length < maxObjects &&
      Math.random() < 0.03 &&
      now - lastSpawnTime.current > 200
    ) {
      const isBomb = Math.random() < bombSpawnChance;
      const isPowerUp = Math.random() < 0.05;
      let type;
      if (isPowerUp) {
        type = Math.random() < 0.5 ? 'slow' : 'clear';
      } else if (isBomb) {
        type = Math.random() < 0.5 ? 'small_bomb' : 'big_bomb';
      } else {
        type = colors[Math.floor(Math.random() * colors.length)];
      }
      const size = type === 'big_bomb' ? 48 : type === 'small_bomb' ? 24 : type.includes('power') ? 30 : 36;
      objects.push({
        x: Math.random() * (600 - size),
        y: 0,
        type,
        speed: 2 + Math.random() * 4,
      });
      lastSpawnTime.current = now;
    }
  }, [colors, objects, maxObjects, bombSpawnChance]);

  const handleTouch = useCallback(
    (e) => {
      if (e.type === 'touchstart') e.preventDefault();
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const touch = e.type === 'touchstart' ? e.touches[0] : e;
      const touchX = (touch.clientX - rect.left) * scaleX;
      const touchY = (touch.clientY - rect.top) * scaleY;
      console.log(`Touch at: (${touchX}, ${touchY})`);

      if (gameState === 'howToPlay') {
        if (touchX >= 225 && touchX <= 375 && touchY >= 352.5 && touchY <= 397.5) {
          console.log('Back button clicked');
          onBack();
        }
      } else if (gameState === 'playing' && !gameOver && !isPaused) {
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i];
          const size = obj.type === 'big_bomb' ? 48 : obj.type === 'small_bomb' ? 24 : obj.type.includes('power') ? 30 : 36;
          const buffer = 10;
          if (
            touchX >= obj.x - buffer &&
            touchX <= obj.x + size + buffer &&
            touchY >= obj.y - buffer &&
            touchY <= obj.y + size + buffer
          ) {
            if (obj.type === 'big_bomb') {
              setGameOver(true);
              setGameOverReason('Game Over: Hit Big Bomb!');
            } else if (obj.type === 'small_bomb') {
              setScore((prev) => Math.max(0, prev - 4));
            } else if (obj.type === 'slow') {
              setFallSpeedMultiplier((prev) => Math.max(0.5, prev - 0.3));
              setTimeout(() => setFallSpeedMultiplier((prev) => prev + 0.3), 5000);
            } else if (obj.type === 'clear') {
              objects.splice(0, objects.length, ...objects.filter((o) => !o.type.includes('bomb')));
            } else {
              setScore((prev) => prev + 2);
            }
            objects.splice(i, 1);
            break;
          }
        }
      } else if (gameState === 'playing' && gameOver) {
        setGameState('start');
        setScore(0);
        setLevel(1);
        setGameOver(false);
        setGameOverReason('');
        setSubmissionStatus('');
        setMissedObjects(0);
        setMaxObjects(5);
        setFallSpeedMultiplier(0.5);
        setBombSpawnChance(0.2);
        setStartTime(null);
        setLevelUpTime(null);
        setIsPaused(false);
        setCanClearBombs(true);
        objects.length = 0;
      }
    },
    [gameState, gameOver, isPaused, objects, setGameState, onBack]
  );

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const clearBombs = useCallback(() => {
    if (canClearBombs) {
      objects.splice(0, objects.length, ...objects.filter((o) => !o.type.includes('bomb')));
      setCanClearBombs(false);
    }
  }, [canClearBombs, objects]);

  const submitScore = useCallback(
    async (finalScore, finalLevel) => {
      try {
        setSubmissionStatus('Generating SP1 proof...');
        const finalScoreInt = Math.floor(finalScore);
        const finalLevelInt = Math.floor(finalLevel);

        console.log('Preparing submission:', { username, score: finalScoreInt, level: finalLevelInt });

        if (!username || typeof username !== 'string' || username.trim() === '') {
          console.error('Client validation failed: Invalid or missing username');
          throw new Error('Username is required');
        }
        if (!Number.isInteger(finalScoreInt) || finalScoreInt < 0) {
          console.error('Client validation failed: Invalid score:', finalScoreInt);
          throw new Error('Score must be a non-negative integer');
        }
        if (!Number.isInteger(finalLevelInt) || finalLevelInt < 1) {
          console.error('Client validation failed: Invalid level:', finalLevelInt);
          throw new Error('Level must be a positive integer');
        }

        const { proof, public_inputs } = generateSP1Proof(finalScoreInt, finalLevelInt);
        console.log('SP1 proof generated:', { proof, public_inputs });

        if (!proof || typeof proof !== 'string') {
          console.error('Client validation failed: Invalid proof:', proof);
          throw new Error('Proof is required');
        }
        if (!public_inputs || !Array.isArray(public_inputs) || public_inputs.length !== 2 || !public_inputs.every(num => Number.isInteger(num))) {
          console.error('Client validation failed: Invalid public_inputs:', public_inputs);
          throw new Error('Public inputs must be an array of two integers');
        }

        const payload = { username, score: finalScoreInt, level: finalLevelInt, proof, public_inputs };
        console.log('Submitting score payload:', JSON.stringify(payload));

        setSubmissionStatus('Submitting score...');
        const response = await fetch('/api/submit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
          console.error('Server error response:', result);
          throw new Error(result.error || `HTTP ${response.status}`);
        }
        setSubmissionStatus(result.message);
        fetchLeaderboard();
      } catch (error) {
        console.error('Submit score error:', error);
        setSubmissionStatus(`Error: ${error.message}`);
      }
    },
    [username, fetchLeaderboard]
  );

  useEffect(() => {
    if (gameOver && gameState === 'playing') {
      submitScore(score, level);
    }
  }, [gameOver, score, level, submitScore, gameState]);

  useEffect(() => {
    if (gameState === 'playing' && !gameOver && !startTime) {
      setStartTime(Date.now());
      setLevel(1);
      setMissedObjects(0);
      setMaxObjects(5);
      setFallSpeedMultiplier(0.5);
      setBombSpawnChance(0.2);
      setCanClearBombs(true);
      objects.length = 0;
    }
  }, [gameState, gameOver, startTime, objects]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    const images = {};
    const imageStatus = {};

    ['pink', 'purple', 'orange', 'blue', 'green', 'small_bomb', 'big_bomb', 'slow', 'clear', 'background'].forEach(
      (type) => {
        images[type] = new Image();
        images[type].src = `/${type}.png`;
        imageStatus[type] = false;
        images[type].onload = () => {
          imageStatus[type] = true;
        };
        images[type].onerror = () => {
          console.error(`Failed to load image: ${type}.png`);
          imageStatus[type] = false;
        };
      }
    );

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (imageStatus['background']) {
        ctx.drawImage(images['background'], 0, 0, 600, 450);
      } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 600, 450);
      }

      if (gameState === 'howToPlay') {
        ctx.font = '22.5px Arial';
        ctx.fillStyle = '#6A0DAD';
        ctx.textAlign = 'center';
        ctx.fillText('How to Play', 300, 60);
        ctx.font = '15px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Tap crabs (colored objects) to earn +2 points.', 300, 120);
        ctx.fillText('Don’t miss 50 crabs or the game ends!', 300, 150);
        ctx.fillText('Tap small bombs to lose -4 points.', 300, 180);
        ctx.fillText('Tap big bomb and you lose!', 300, 210);
        ctx.fillText('Click pause to pause game.', 300, 240);
        ctx.fillText('Clear power-up removes bombs.', 300, 270);
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(225, 352.5, 150, 45);
        ctx.fillStyle = 'white';
        ctx.font = '18px Arial';
        ctx.fillText('Back', 300, 375);
      } else if (gameState === 'playing') {
        objects.forEach((obj) => {
          const size = obj.type === 'big_bomb' ? 48 : obj.type === 'small_bomb' ? 24 : obj.type.includes('power') ? 30 : 36;
          if (imageStatus[obj.type]) {
            ctx.drawImage(images[obj.type], obj.x, obj.y, size, size);
          } else {
            ctx.fillStyle = obj.type.includes('bomb') ? 'red' : obj.type.includes('power') ? 'gold' : obj.type;
            ctx.fillRect(obj.x, obj.y, size, size);
          }
        });

        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${score}`, 10, 20);
        ctx.fillText(`Level: ${level}`, 10, 40);
        ctx.fillText(`Missed: ${missedObjects}/50`, 10, 60);

        if (levelUpTime && Date.now() - levelUpTime < 2000) {
          ctx.font = '24px Arial';
          ctx.fillStyle = 'yellow';
          ctx.textAlign = 'center';
          ctx.fillText(`Level ${level}!`, 300, 225);
        }

        if (gameOver) {
          ctx.font = '24px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(gameOverReason, 300, 225);
          ctx.font = '16px Arial';
          ctx.fillText('Tap to Restart', 300, 255);
          if (submissionStatus) {
            ctx.fillStyle = submissionStatus.includes('Error') ? 'red' : 'green';
            ctx.fillText(submissionStatus, 300, 285);
          }
        } else if (isPaused) {
          ctx.font = '24px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText('Paused', 300, 225);
        }
      }
    };

    const gameLoop = () => {
      if (gameState === 'playing' && !gameOver && !isPaused) {
        spawnObject();
        objects.forEach((obj) => {
          obj.y += obj.speed * fallSpeedMultiplier;
        });
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i].y > 450) {
            if (!objects[i].type.includes('bomb') && !objects[i].type.includes('power')) {
              setMissedObjects((prev) => {
                const newMissed = prev + 1;
                console.log(`Missed object, total: ${newMissed}`);
                if (newMissed >= 50) {
                  setGameOver(true);
                  setGameOverReason('Game Over: Too Many Missed Crabs!');
                }
                return newMissed;
              });
            }
            objects.splice(i, 1);
          }
        }

        if (startTime) {
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed >= 30) {
            setLevel((prev) => {
              const newLevel = prev + 1;
              console.log(`Level up to: ${newLevel}`);
              setFallSpeedMultiplier(0.5 * (newLevel + 1));
              setBombSpawnChance(Math.min(0.4, bombSpawnChance + 0.05));
              if (newLevel % 3 === 0) {
                setMaxObjects((prev) => prev + 1);
              }
              setLevelUpTime(Date.now());
              setStartTime(Date.now());
              setCanClearBombs(true);
              return newLevel;
            });
          }
        }
      }
      draw();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    canvas.addEventListener('click', handleTouch);
    canvas.addEventListener('touchstart', handleTouch);
    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('click', handleTouch);
      canvas.removeEventListener('touchstart', handleTouch);
    };
  }, [
    gameState,
    gameOver,
    score,
    level,
    missedObjects,
    fallSpeedMultiplier,
    bombSpawnChance,
    maxObjects,
    handleTouch,
    spawnObject,
    startTime,
    levelUpTime,
    isPaused,
    submissionStatus,
    gameOverReason,
    objects
  ]);

  return (
    <div className="game-container">
      <canvas ref={canvasRef} width={600} height={450} className="game-canvas" />
      {gameState === 'playing' && !gameOver && (
        <div className="game-controls">
          <button onClick={togglePause} className="pause-button" aria-label={isPaused ? 'Resume game' : 'Pause game'}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={clearBombs} className="clear-bombs-button" disabled={!canClearBombs} aria-label="Clear bombs">
            Clear Bombs
          </button>
          <button
            onClick={() => {
              setGameOver(true);
              setGameOverReason('Game Over: Score Submitted!');
              submitScore(score, level);
            }}
            className="submit-button"
            aria-label="Submit score"
          >
            Submit
          </button>
        </div>
      )}
      {submissionStatus && gameOver && (
        <p className={`submission-status ${submissionStatus.includes('Error') ? 'error' : 'success'}`}>
          {submissionStatus}
        </p>
      )}
    </div>
  );
};

export default Game;