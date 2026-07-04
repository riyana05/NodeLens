# NodeLens Analytics Platform

Full-stack social network analytics platform with C++ graph engine, Node.js backend, and React frontend.

## Project Structure

```
nodelens/
├── graph-engine/      ← C++ algorithms (Dijkstra, PageRank, Louvain, etc.)
├── backend/           ← Node.js + Express API
└── frontend/          ← React + Vite dashboard
```

## Quick Start

### 1. Build the C++ Engine
```bash
cd graph-engine
make           
# Binary at: graph-engine/graph-engine
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env    
npm install
npm run dev             
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev             
```

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `NEO4J_URI` | Neo4j AuraDB bolt URI |
| `NEO4J_USER` | Neo4j username |
| `NEO4J_PASSWORD` | Neo4j password |
| `REDIS_URL` | Upstash Redis URL |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `CPP_ENGINE_PATH` | Path to compiled C++ binary |

## API Endpoints

All analytics routes require `Authorization: Bearer <token>` header.

| Method | Route | Feature | Description |
|---|---|---|---|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login, receive JWT |
| GET | /api/analytics/summary | — | Node/edge counts |
| GET | /api/analytics/pagerank | F6 | Influence scores |
| GET | /api/analytics/backbone | F7 | MST trust backbone |
| GET | /api/analytics/trust-path | F13 | Highest-trust path |
| GET | /api/analytics/recommend | F8 | Friend recommendations |
| GET | /api/analytics/communities | F3 | Community clusters |
| GET | /api/analytics/echo-chambers | F12 | Echo chamber detection |
| GET | /api/analytics/stability | F1 | Structural stability |
| GET | /api/analytics/conflicts | F9 | Conflict triads |
| GET | /api/analytics/simulate-spread | F5 | Viral spread sim |
| GET | /api/analytics/simulate-removal | F10 | Node removal what-if |
| GET | /api/analytics/friendship-risk | F2 | Risk prediction |
| GET | /api/analytics/full | All | Full dashboard data |
