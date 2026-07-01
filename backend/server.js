require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const connectDB  = require('./config/db');
const { connectNeo4j } = require('./config/neo4j');

const authRoutes      = require('./routes/authRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const userRoutes      = require('./routes/userRoutes');

const app = express();

// ── Security middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users',     userRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Boot ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
(async () => {
  await connectDB();
  await connectNeo4j();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})();
