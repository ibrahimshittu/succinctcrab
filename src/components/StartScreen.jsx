import React, { useState } from 'react';
import './StartScreen.css';

const StartScreen = ({ username, setUsername, onStart, onHowToPlay }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      console.log('StartScreen submitting username:', username);
      onStart({ username });
    }
  };

  return (
    <div className="start-screen">
      <h1 className="game-title">Succinct Falling Crabs</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">X Username</label>
          <input
            id="username"
            type="text"
            placeholder="@username"
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 20))}
            maxLength={20}
            className="username-input"
            required
          />
        </div>
        <div className="button-group">
          <button type="submit" className="start-button" disabled={!username.trim()}>
            Start Game
          </button>
          <button type="button" className="how-to-play-button" onClick={onHowToPlay}>
            How to Play
          </button>
        </div>
      </form>
    </div>
  );
};

export default StartScreen;