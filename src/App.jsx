import React, { useState, useCallback, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import Game from './components/Game';
import Leaderboard from './components/Leaderboard';
import './App.css';

const App = () => {
  const [gameState, setGameState] = useState('start');
  const [username, setUsername] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: HTTP ${response.status}`);
      }
      const data = await response.json();
      setLeaderboard(data);
      setLeaderboardError(null);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setLeaderboardError('Failed to load leaderboard.');
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const intervalId = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(intervalId);
  }, [fetchLeaderboard]);

  const handleStart = useCallback(({ username }) => {
    console.log('App handleStart username:', username);
    if (username.trim()) {
      setUsername(username);
      setGameState('playing');
    }
  }, []);

  const handleHowToPlay = useCallback(() => {
    setGameState('howToPlay');
  }, []);

  const handleBack = useCallback(() => {
    setGameState('start');
  }, []);

  return (
    return (
  <div className="app-container">
    <h1 style={{ color: 'red' }}>Hello from App.jsx</h1>
    {/* ... rest of your game logic ... */}
  </div>
);

    
    <div className="app-container">
      {gameState === 'start' && (
        <div className="start-screen-container">
          <StartScreen
            username={username}
            setUsername={setUsername}
            onStart={handleStart}
            onHowToPlay={handleHowToPlay}
          />
        </div>
      )}
      {(gameState === 'howToPlay' || gameState === 'playing') && (
        <div className="game-leaderboard-container">
          <Game
            gameState={gameState}
            username={username}
            setGameState={setGameState}
            onBack={handleBack}
            fetchLeaderboard={fetchLeaderboard}
            setLeaderboard={setLeaderboard}
          />
          <Leaderboard leaderboard={leaderboard} error={leaderboardError} />
        </div>
      )}
    </div>
  );
};

export default App;
