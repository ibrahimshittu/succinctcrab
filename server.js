const express = require('express');
const fs = require('fs').promises;
const cors = require('cors');
const path = require('path');
const lockfile = require('proper-lockfile');

const app = express();
const port = process.env.PORT || 3001;
const leaderboardFile = path.join(__dirname, 'leaderboard.json');

app.use(cors());
app.use(express.json());

// Initialize leaderboard
async function initializeLeaderboard() {
  try {
    await fs.access(leaderboardFile);
  } catch {
    await fs.writeFile(leaderboardFile, JSON.stringify([]));
  }
}

// Mock SP1 proof verification (replace with actual SP1 verification)
function verifySP1Proof(proof, public_inputs, score, level) {
  return proof === 'sp1_proof_data' && JSON.stringify(public_inputs) === JSON.stringify([score, level]);
}

app.post('/submit-score', async (req, res) => {
  const { username, score, level, proof, public_inputs } = req.body;

  // Log request body
  console.log('Received /submit-score:', JSON.stringify(req.body));

  // Validate request
  if (!username || typeof username !== 'string' || username.trim() === '') {
    console.error('Validation failed: Missing or invalid username');
    return res.status(400).json({ error: 'Missing or invalid field: username (must be a non-empty string)' });
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) {
    console.error(`Validation failed: Invalid score: ${score}`);
    return res.status(400).json({ error: 'Missing or invalid field: score (must be a non-negative integer)' });
  }
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1) {
    console.error(`Validation failed: Invalid level: ${level}`);
    return res.status(400).json({ error: 'Missing or invalid field: level (must be a positive integer)' });
  }
  if (!proof || typeof proof !== 'string') {
    console.error(`Validation failed: Missing or invalid proof: ${proof}`);
    return res.status(400).json({ error: 'Missing or invalid field: proof (must be a string)' });
  }
  if (!public_inputs || !Array.isArray(public_inputs) || public_inputs.length !== 2 || !public_inputs.every(num => Number.isInteger(num))) {
    console.error(`Validation failed: Invalid public_inputs: ${JSON.stringify(public_inputs)}`);
    return res.status(400).json({ error: 'Missing or invalid field: public_inputs (must be an array of two integers)' });
  }
  if (username.length > 20) {
    console.error(`Validation failed: Username exceeds 20 characters: ${username}`);
    return res.status(400).json({ error: 'Invalid field: username (exceeds 20 characters)' });
  }

  let release;
  try {
    // Acquire file lock
    release = await lockfile.lock(leaderboardFile, { retries: 5 });
    console.log(`Acquired lock for ${username}`);

    // Verify SP1 proof
    if (!verifySP1Proof(proof, public_inputs, score, level)) {
      console.error('SP1 proof verification failed:', { proof, public_inputs, score, level });
      return res.status(400).json({ error: 'Invalid SP1 proof or public inputs' });
    }

    // Read leaderboard
    await initializeLeaderboard();
    const data = await fs.readFile(leaderboardFile, 'utf8');
    let leaderboard = JSON.parse(data);

    // Update or add player
    const existingEntry = leaderboard.find((entry) => entry.username === username);
    if (existingEntry) {
      if (score > existingEntry.score) {
        existingEntry.score = score;
        existingEntry.level = level;
        existingEntry.timestamp = Date.now();
      }
    } else {
      leaderboard.push({
        username,
        score,
        level,
        timestamp: Date.now(),
      });
    }

    // Save updated leaderboard
    await fs.writeFile(leaderboardFile, JSON.stringify(leaderboard, null, 2));
    res.json({ message: 'Your Score is proved' });
  } catch (err) {
    console.error('Error Proving score:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  } finally {
    if (release) {
      try {
        await release();
        console.log(`Released lock for ${username}`);
      } catch (err) {
        console.error('Error releasing lock:', err);
      }
    }
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    await initializeLeaderboard();
    const data = await fs.readFile(leaderboardFile, 'utf8');
    const leaderboard = JSON.parse(data);
    res.json(leaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/clear-leaderboard', async (req, res) => {
  let release;
  try {
    release = await lockfile.lock(leaderboardFile, { retries: 5 });
    await fs.writeFile(leaderboardFile, JSON.stringify([]));
    console.log('Leaderboard cleared');
    res.json({ message: 'Leaderboard cleared successfully' });
  } catch (err) {
    console.error('Error clearing leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (release) {
      try {
        await release();
      } catch (err) {
        console.error('Error releasing lock:', err);
      }
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});