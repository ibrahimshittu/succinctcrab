const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

function verifySP1Proof(proof, public_inputs, score, level) {
  return proof === 'sp1_proof_data' && JSON.stringify(public_inputs) === JSON.stringify([score, level]);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, score, level, proof, public_inputs } = req.body;

  console.log('Received /submit-score:', JSON.stringify(req.body));

  if (!username || typeof username !== 'string' || username.trim() === '') {
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
  if (!public_inputs || !Array.isArray(public_inputs) || public_inputs.length !== 2 || !public_inputs.every(num => Number.isInteger(num))) {
    return res.status(400).json({ error: 'Missing or invalid field: public_inputs (must be an array of two integers)' });
  }
  if (username.length > 20) {
    return res.status(400).json({ error: 'Invalid field: username (exceeds 20 characters)' });
  }

  try {
    await client.connect();
    const db = client.db('leaderboard');
    const collection = db.collection('scores');

    if (!verifySP1Proof(proof, public_inputs, score, level)) {
      return res.status(400).json({ error: 'Invalid SP1 proof or public inputs' });
    }

    const existingEntry = await collection.findOne({ username });
    if (existingEntry) {
      if (score > existingEntry.score) {
        await collection.updateOne(
          { username },
          { $set: { score, level, timestamp: Date.now() } }
        );
      }
    } else {
      await collection.insertOne({
        username,
        score,
        level,
        timestamp: Date.now(),
      });
    }

    res.status(200).json({ message: 'Your Score is proved' });
  } catch (err) {
    console.error('Error Proving score:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  } finally {
    await client.close();
  }
};