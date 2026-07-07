//  Stability.cpp
//  F1:  Social Stability Score
//  F9:  Community Conflict Predictor
//  F11: Network Evolution Timeline
//
//  Based on Structural Balance Theory (Heider, 1946):
//
//  A triangle (a, b, c) is BALANCED if the product of its
//  three edge signs is positive.  We use trust weights:
//
//    balanceScore(a,b,c) = P(a,b) * P(b,c) * P(c,a)
//
//  where P(x,y) = weight(x→y) mapped to signed value:
//    high trust (> 0.5)  →  positive  (+weight)
//    low trust  (≤ 0.5)  →  negative  (-(1-weight))
//
//  A triangle with a large negative product is a conflict zone.
//
//  Global stability = mean balance score over all triangles.
//  If no triangles exist, we use the local clustering coefficient.

#include "../include/Graph.h"
#include "../include/Algorithms.h"

#include <vector>
#include <tuple>
#include <cmath>
#include <algorithm>
#include <numeric>
#include <unordered_set>

//  Signed weight mapping for structural balance
static double signedWeight(double w) {
    // High trust = positive link; low trust = negative link
    return (w > 0.5) ? w : -(1.0 - w);
}

//  Compute balance score for triangle (a, b, c)
//  Returns the product of signed edge weights.
//  We use the maximum directed weight between each pair as the
//  representative undirected weight.
static double triangleBalance(const Graph& g, int a, int b, int c) {
    auto bestWeight = [&](int u, int v) -> double {
        double w = g.getWeight(u, v);
        double wR = g.getWeight(v, u);
        if (w < 0 && wR < 0) return 0.5;   // no edge either way → neutral
        return std::max(w, wR);
    };

    double wAB = bestWeight(a, b);
    double wBC = bestWeight(b, c);
    double wCA = bestWeight(c, a);

    return signedWeight(wAB) * signedWeight(wBC) * signedWeight(wCA);
}

//  Enumerate all triangles in the (undirected projection of the) graph.
//  Returns vector of (a, b, c) tuples with a < b < c.
//  O(N * max_degree^2) — fast enough for social graph sizes.
static std::vector<std::tuple<int,int,int>> enumerateTriangles(const Graph& g) {
    int n = g.nodeCount();
    std::vector<std::tuple<int,int,int>> triangles;

    // Build an undirected neighbour-set for efficient intersection
    std::vector<std::unordered_set<int>> neighbours(n);
    for (int u = 0; u < n; ++u) {
        for (const Edge& e : g.edgesFrom(u)) {
            if (u < e.to) {
                neighbours[u].insert(e.to);
                neighbours[e.to].insert(u);
            }
        }
    }

    for (int a = 0; a < n; ++a) {
        for (int b : neighbours[a]) {
            if (b <= a) continue;
            for (int c : neighbours[b]) {
                if (c <= b) continue;
                if (neighbours[a].count(c)) {
                    triangles.emplace_back(a, b, c);
                }
            }
        }
    }
    return triangles;
}

//  Local Clustering Coefficient (fallback when no triangles)
//  CC(u) = (actual triangles through u) / (possible pairs of neighbours)
static double globalClusteringCoefficient(const Graph& g) {
    int n = g.nodeCount();
    if (n == 0) return 0.0;

    double sumCC = 0.0;
    int    validNodes = 0;

    for (int u = 0; u < n; ++u) {
        std::unordered_set<int> nbrs;
        for (const Edge& e : g.edgesFrom(u)) nbrs.insert(e.to);
        // Also add in-neighbours for undirected clustering
        for (int v = 0; v < n; ++v)
            for (const Edge& e : g.edgesFrom(v))
                if (e.to == u) nbrs.insert(v);
        nbrs.erase(u);

        int k = (int)nbrs.size();
        if (k < 2) continue;

        int links = 0;
        std::vector<int> nbrVec(nbrs.begin(), nbrs.end());
        for (int i = 0; i < (int)nbrVec.size(); ++i)
            for (int j = i + 1; j < (int)nbrVec.size(); ++j) {
                int x = nbrVec[i], y = nbrVec[j];
                if (g.getWeight(x, y) > 0 || g.getWeight(y, x) > 0)
                    ++links;
            }

        sumCC += (double)(2 * links) / (double)(k * (k - 1));
        ++validNodes;
    }

    return (validNodes > 0) ? sumCC / validNodes : 0.0;
}

//  F1: computeStability
StabilityResult computeStability(const Graph& g) {
    StabilityResult result;
    int n = g.nodeCount();
    int e = g.edgeCount();

    // --- Network density ---
    double maxEdges = (double)n * (n - 1);
    result.density = (maxEdges > 0) ? (double)e / maxEdges : 0.0;

    // --- Clustering coefficient ---
    result.clusteringCoeff = globalClusteringCoefficient(g);

    // --- Triangle-based stability ---
    auto triangles = enumerateTriangles(g);

    if (triangles.empty()) {
        // No triangles — use clustering coefficient as proxy
        result.globalScore = result.clusteringCoeff;
        return result;
    }

    double sumBalance = 0.0;
    const double CONFLICT_THRESHOLD = -0.1;  // negative product ⟹ conflict

    for (auto& [a, b, c] : triangles) {
        double bal = triangleBalance(g, a, b, c);
        sumBalance += bal;

        if (bal < CONFLICT_THRESHOLD)
            result.conflictTriads.emplace_back(a, b, c);
    }

    // Normalise: map mean balance [-1, 1] → [0, 1]
    double meanBalance = sumBalance / (double)triangles.size();
    result.globalScore = (meanBalance + 1.0) / 2.0;

    return result;
}

//  F9: findConflictTriads — returns only the unstable triangles
std::vector<std::tuple<int,int,int>> findConflictTriads(const Graph& g) {
    auto triangles = enumerateTriangles(g);
    std::vector<std::tuple<int,int,int>> conflicts;

    const double CONFLICT_THRESHOLD = -0.1;
    for (auto& [a, b, c] : triangles) {
        if (triangleBalance(g, a, b, c) < CONFLICT_THRESHOLD)
            conflicts.emplace_back(a, b, c);
    }
    return conflicts;
}

//  F11: evolutionTimeline — snapshot-by-snapshot metrics
std::vector<SnapshotMetric> evolutionTimeline(
    const std::vector<Graph>& snapshots)
{
    std::vector<SnapshotMetric> timeline;
    timeline.reserve(snapshots.size());

    for (const Graph& snap : snapshots) {
        StabilityResult sr = computeStability(snap);
        SnapshotMetric  sm;
        sm.density         = sr.density;
        sm.clusteringCoeff = sr.clusteringCoeff;
        sm.stabilityScore  = sr.globalScore;
        timeline.push_back(sm);
    }
    return timeline;
}
