const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || '';
const client = new MongoClient(uri);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!uri) {
      console.error('MONGODB_URI environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error: Missing MONGODB_URI' });
    }

    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('leaderboard');
    const collection = db.collection('scores');
    const leaderboard = await collection.find({}).toArray();
    console.log(`Fetched ${leaderboard.length} leaderboard entries`);

    return res.status(200).json(leaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard:', err.message, err.stack);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  } finally {
    try {
      await client.close();
      console.log('MongoDB connection closed');
    } catch (err) {
      console.error('Error closing MongoDB connection:', err.message);
    }
  }
};