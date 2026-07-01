const User     = require('../models/User');
const Activity = require('../models/Activity');
const { runQuery } = require('../config/neo4j');

// GET /api/users/search?q=
exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const users = await User.find({
      $or: [
        { username:    { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
      ]
    }).select('-password').limit(20);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/:id/follow
exports.followUser = async (req, res) => {
  try {
    const fromId = req.user._id.toString();
    const toId   = req.params.id;
    if (fromId === toId) return res.status(400).json({ error: 'Cannot follow yourself' });

    // Log activity
    await Activity.create({ fromUser: fromId, toUser: toId, type: 'follow', weight: 0.6 });

    // Create / strengthen Neo4j edge
    await runQuery(
      `MATCH (a:User {mongoId:$from}), (b:User {mongoId:$to})
       MERGE (a)-[r:KNOWS]->(b)
       ON CREATE SET r.weight = 0.5, r.since = $ts
       ON MATCH  SET r.weight = min(r.weight + 0.05, 1.0), r.updatedAt = $ts`,
      { from: fromId, to: toId, ts: Date.now() }
    );

    res.json({ message: 'Followed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/:id/unfollow
exports.unfollowUser = async (req, res) => {
  try {
    const fromId = req.user._id.toString();
    const toId   = req.params.id;

    await Activity.create({ fromUser: fromId, toUser: toId, type: 'unfollow', weight: 0 });

    await runQuery(
      `MATCH (a:User {mongoId:$from})-[r:KNOWS]->(b:User {mongoId:$to}) DELETE r`,
      { from: fromId, to: toId }
    );

    res.json({ message: 'Unfollowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/:id/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
