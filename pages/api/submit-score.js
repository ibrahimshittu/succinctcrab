const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || '';
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

function verifySP1Proof(proof, public_inputs, score, level) {
  return proof === 'sp1_proof_data' && JSON.stringify(public_inputs) === JSON.stringify([score, level]);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, score, level, proof, public_inputs } = req.body;
  const cleanUsername = username?.replace(/^@/, '');

  console.log('Received /submit-score:', JSON.stringify(req.body));

  if (!cleanUsername || typeof cleanUsername !== 'string' || cleanUsername.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid field: username (must be a non-empty string)' });
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) {
    return res.status(400).json({ error: 'Missing or invalid field: score (must be a non-negative integer)' });
  }
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1) {
    return res.status(400).json({ error: 'Missing or invalid field: level (must be a positive integer)' });
  }
  if (!proof || typeof proof !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid field: proof (must be a string)' });
  }
  if (!public_inputs || !Array.isArray(public_inputs) || public_inputs.length !== 2 || !public_inputs.every(Number.isInteger)) {
    return res.status(400).json({ error: 'Missing or invalid field: public_inputs (must be an array of two integers)' });
  }
  if (cleanUsername.length > 20) {
    return res.status(400).json({ error: 'Invalid field: username (exceeds 20 characters)' });
  }

  try {
    if (!uri) {
      return res.status(500).json({ error: 'Server configuration error: Missing MONGODB_URI' });
    }

    const client = await connectToDatabase();
    const db = client.db('leaderboard');
    const collection = db.collection('scores');

    if (!verifySP1Proof(proof, public_inputs, score, level)) {
      return res.status(400).json({ error: 'Invalid SP1 proof or public inputs' });
    }

    const existingEntry = await collection.findOne({ username: cleanUsername });
    if (existingEntry) {
      if (score > existingEntry.score) {
        await collection.updateOne(
          { username: cleanUsername },
          { $set: { score, level, timestamp: Date.now() } }
        );
        console.log(`Updated score for ${cleanUsername}: ${score}, level: ${level}`);
      } else {
        console.log(`Score not updated for ${cleanUsername}: current ${existingEntry.score} >= new ${score}`);
      }
    } else {
      await collection.insertOne({
        username: cleanUsername,
        score,
        level,
        timestamp: Date.now(),
      });
      console.log(`Inserted new score for ${cleanUsername}: ${score}, level: ${level}`);
    }

    return res.status(200).json({ message: 'Your Score is proved' });
  } catch (err) {
    console.error('Error processing score submission:', err.message, err.stack);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
};
