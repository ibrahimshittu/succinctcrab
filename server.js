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

// ✅ Home route (fixes "Cannot GET /")
app.get('/', (req, res) => {
  res.send('✅ Falling Crabs backend is running!');
});

// 🛠 Initialize leaderboard.json if not exists
async function initializeLeaderboard() {
  try {
    await fs.access(leaderboardFile);
  } catch {
    await fs.writeFile(leaderboardFile, JSON.stringify([]));
  }
}

// 🧪 Mock SP1 verification (replace with real if needed)
function verifySP1Proof(proof, public_inputs, score, level) {
  return proof === 'sp1_proof_data' && JSON.stringify(public_inputs) === JSON.stringify([score, level]);
}

// ✅ Submit score route
app.post('/api/submit-score', async (req, res) => {
  const { username, score, level, proof, public_inputs } = req.body;

  const cleanUsername = username?.replace(/^@/, ''); // ✅ Strip @

  console.log('Received /submit-score:', JSON.stringify(req.body));

  if (!cleanUsername || typeof cleanUsername !== 'string' || cleanUsername.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid username' });
  }
  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Invalid score' });
  }
  if (typeof level !== 'number' || level < 1) {
    return res.status(400).json({ error: 'Invalid level' });
  }
  if (!verifySP1Proof(proof, public_inputs, score, level)) {
    return res.status(400).json({ error: 'Invalid SP1 proof or public inputs' });
  }

  let release;
  try {
    release = await lockfile.lock(leaderboardFile, { retries: 5 });
    await initializeLeaderboard();
    const data = await fs.readFile(leaderboardFile, 'utf8');
    let leaderboard = JSON.parse(data);

    const existing = leaderboard.find((e) => e.username === cleanUsername);
    if (existing) {
      if (score > existing.score) {
        existing.score = score;
        existing.level = level;
        existing.timestamp = Date.now();
      }
    } else {
      leaderboard.push({
        username: cleanUsername,
        score,
        level,
        timestamp: Date.now(),
      });
    }

    await fs.writeFile(leaderboardFile, JSON.stringify(leaderboard, null, 2));
    res.json({ message: 'Your Score is proved' });
  } catch (err) {
    console.error('Error submitting score:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (release) await release();
  }
});

// ✅ Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
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

// (Optional) Clear leaderboard
app.post('/api/clear-leaderboard', async (req, res) => {
  let release;
  try {
    release = await lockfile.lock(leaderboardFile, { retries: 5 });
    await fs.writeFile(leaderboardFile, JSON.stringify([]));
    res.json({ message: 'Leaderboard cleared successfully' });
  } catch (err) {
    console.error('Error clearing leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (release) await release();
  }
});

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Backend running at http://localhost:${port}`);
});
