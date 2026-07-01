# Graph Analytics Engine — C++ Core

High-performance graph algorithm engine powering 14 social network analytics features.

## Directory Structure

```
graph-engine/
├── include/
│   ├── Graph.h          # Core graph data structure
│   ├── Algorithms.h     # All function declarations + result structs
│   └── json.hpp         # nlohmann/json (auto-downloaded on build)
├── src/
│   ├── main.cpp         # JSON parser, command dispatcher, stdout output
│   ├── Dijkstra.cpp     # F13: Trust Routing | F8: Friend Recommendation
│   ├── Prim.cpp         # F7:  Relationship Backbone (MST)
│   ├── PageRank.cpp     # F6:  Influence Index
│   ├── Community.cpp    # F3:  Community Discovery | F12: Echo Chambers
│   ├── Stability.cpp    # F1:  Stability Score | F9: Conflicts | F11: Timeline
│   ├── Simulation.cpp   # F5:  Viral Spread | F10: Node Removal What-If
│   └── Forecaster.cpp   # F2:  Friendship Risk Prediction
├── CMakeLists.txt       # CMake build (recommended)
├── Makefile             # Simple make alternative
└── README.md
```

## Build

### Option A — CMake (recommended)
```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
# Binary at: build/graph-engine
```

### Option B — Make (simpler)
```bash
make          # downloads json.hpp + builds release binary
make debug    # builds with AddressSanitizer
make test     # runs quick smoke tests
```

### Requirements
- GCC 9+ or Clang 10+  (C++17 support)
- CMake 3.16+ (Option A only)
- curl (for auto-downloading nlohmann/json)
- Internet access on first build (to fetch `json.hpp`)

## Usage

```bash
./graph-engine '<json_payload>' <command>
```

### Payload format
```json
{
  "nodes": [
    { "id": "mongoObjectId1", "label": "Alice" },
    { "id": "mongoObjectId2", "label": "Bob" }
  ],
  "edges": [
    { "src": "mongoObjectId1", "dst": "mongoObjectId2", "weight": 0.85 }
  ],
  "args": { },
  "temporal": { }
}
```

### Commands & args

| Command | Feature | Extra args in `args` |
|---------|---------|----------------------|
| `trust-path` | F13 | `sourceId`, `targetId` |
| `recommend` | F8 | `sourceId`, `topK` (default 5) |
| `backbone` | F7 | — |
| `pagerank` | F6 | `damping` (default 0.85) |
| `communities` | F3 | — |
| `echo-chambers` | F12 | `threshold` (default 0.7) |
| `stability` | F1 | — |
| `conflicts` | F9 | — |
| `simulate-spread` | F5 | `seedId`, `maxRounds` (default 20) |
| `simulate-removal` | F10 | `removeId` |
| `friendship-risk` | F2 | `windowSize` (default 3); requires `temporal` field |
| `full-analytics` | All | — |

### Example
```bash
./graph-engine '{
  "nodes": [{"id":"A"},{"id":"B"},{"id":"C"}],
  "edges": [
    {"src":"A","dst":"B","weight":0.9},
    {"src":"B","dst":"C","weight":0.8}
  ],
  "args": {"sourceId":"A","targetId":"C"}
}' trust-path
```

Output:
```json
{"found":true,"score":0.72,"path":["A","B","C"]}
```

## Algorithm Notes

### F13 Trust Path (Dijkstra)
Edge weights `w ∈ (0,1]` represent trust. To maximise the multiplicative path trust `T = w₁×w₂×…`, weights are transformed to `-ln(w)`. Dijkstra's min-sum then gives max-trust path. Result trust = `exp(-totalCost)`.

### F7 Backbone (Prim's MST)
Edges inverted to `1-trust` so Prim's minimum spanning tree selects the highest-trust backbone. Treats directed graph as undirected (max weight between each pair).

### F6 Influence Index (PageRank)
Trust-weighted PageRank: contributions are proportional to trust weight, not just degree. Dangling nodes distribute rank equally. Converges when L1 norm of change < 1e-6.

### F3/F12 Communities (Louvain + Echo Chamber)
Greedy modularity optimisation (Louvain Phase 1). Echo chambers flagged when `internalDensity ≥ threshold` AND `externalRatio < (1-threshold)`.

### F1/F9 Stability (Structural Balance Theory)
Each triangle classified by product of signed weights. Negative product = conflict triad. Global score = mean balance normalised to [0,1].

### F5 Viral Spread (Independent Cascade)
50 Monte Carlo runs averaged. Each edge sampled against its trust weight as spread probability. Returns the run closest to average reach.

### F10 Node Removal (Tarjan's AP)
Removes target node, runs Tarjan's articulation point algorithm, counts resulting connected components.

### F2 Friendship Risk (Temporal Forecasting)
Sliding-window moving average smoothing → recency-weighted velocity → sigmoid risk score. Higher risk = faster trust decline.

## Integration with Node.js

In `backend/utils/cppRunner.js`:
```javascript
const { execFile } = require('child_process');
const path = require('path');

const BINARY = path.join(__dirname, '../../graph-engine/build/graph-engine');

function runGraphEngine(payload, command) {
  return new Promise((resolve, reject) => {
    execFile(BINARY, [JSON.stringify(payload), command], 
      { maxBuffer: 50 * 1024 * 1024 },  // 50MB buffer
      (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error('Invalid JSON from engine: ' + stdout));
        }
      }
    );
  });
}

module.exports = { runGraphEngine };
```
