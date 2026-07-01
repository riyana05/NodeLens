const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { runQuery } = require('../config/neo4j');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'username, email and password are required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(409).json({ error: 'Username or email already taken' });

    const user = await User.create({ username, email, password, displayName: displayName || username });

    // Mirror user node in Neo4j
    try {
      await runQuery(
        `MERGE (u:User {mongoId: $id})
         SET u.username = $username, u.createdAt = $ts`,
        { id: user._id.toString(), username: user.username, ts: Date.now() }
      );
    } catch (e) {
      console.warn('Neo4j node creation skipped:', e.message);
    }

    res.status(201).json({ token: signToken(user._id), user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    user.lastActive = new Date();
    await user.save();

    res.json({ token: signToken(user._id), user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: req.user.toPublic() });
};
