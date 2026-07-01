#pragma once
#ifndef ALGORITHMS_H
#define ALGORITHMS_H

#include "Graph.h"
#include <vector>
#include <string>
#include <unordered_map>

struct PathResult {
    std::vector<int> nodeIndices;   // ordered path (internal indices)
    double           score;         // composite trust score [0,1]
    bool             found;         // false if no path exists
};

struct MSTEdge {
    int    src;
    int    dst;
    double weight;
};

struct CommunityResult {
    std::vector<int>         membership;        // membership[i] = community id for node i
    int                      numCommunities;
    std::vector<double>      densities;         // intra-community edge densities
    std::vector<bool>        isEchoChamber;     // true if community is isolated
};

struct StabilityResult {
    double                              globalScore;        // [0,1]
    double                              clusteringCoeff;
    double                              density;
    std::vector<std::tuple<int,int,int>> conflictTriads;   // (a,b,c) unstable triangles
};

struct SimulationStep {
    int                 round;
    std::vector<int>    newlyInfected;
};

struct SimulationResult {
    std::vector<SimulationStep> steps;
    int                         totalReached;
    double                      spreadRatio;   // totalReached / N
};

struct ArticulationResult {
    std::vector<int>    articulationPoints;
    int                 componentsAfterRemoval;
};

struct FriendshipRisk {
    int    nodeA;
    int    nodeB;
    double riskScore;   // [0,1] probability of breakage
    double velocity;    // weight trend (negative = declining)
};

struct PageRankResult {
    std::vector<double> scores;   // scores[i] = PageRank for node i
};

struct EchoChamberInfo {
    int    communityId;
    double internalDensity;
    double externalRatio;
    bool   flagged;
};

// ------------------------------------------------------------
//  F13 & F8 — Trust Routing / Explainable Friend Recommendation
//  File: src/Dijkstra.cpp
// ------------------------------------------------------------

// F13: Find the highest-trust path between two nodes.
// Uses -ln(w) transformation so Dijkstra minimises the sum
// and finds the path with maximum multiplicative trust.
PathResult findTrustPath(const Graph& g, int sourceIdx, int targetIdx);

// F8: Return top-K recommended friends for a user, explaining
// the trust path that makes each recommendation meaningful.
std::vector<PathResult> recommendFriends(const Graph& g,
                                          int          sourceIdx,
                                          int          topK = 5);

// ------------------------------------------------------------
//  F7 — Relationship Backbone (MST)
//  File: src/Prim.cpp
// ------------------------------------------------------------

// F7: Compute the Minimum Spanning Tree using Prim's algorithm.
// Edge costs are (1 - trust) so the MST maximises total trust.
std::vector<MSTEdge> computeMST(const Graph& g);

// ------------------------------------------------------------
//  F6 — Influence Index (PageRank)
//  File: src/PageRank.cpp
// ------------------------------------------------------------

// F6: Run PageRank power iteration.
// damping: typically 0.85. maxIter: convergence limit.
PageRankResult computePageRank(const Graph& g,
                                double       damping  = 0.85,
                                int          maxIter  = 100,
                                double       epsilon  = 1e-6);

// ------------------------------------------------------------
//  F3 & F12 — Community Discovery & Echo Chamber Detection
//  File: src/Community.cpp
// ------------------------------------------------------------

// F3: Discover communities using Union-Find or Louvain.
CommunityResult detectCommunities(const Graph& g);

// F12: Analyse communities for echo-chamber characteristics.
std::vector<EchoChamberInfo> detectEchoChambers(const Graph&          g,
                                                  const CommunityResult& comm,
                                                  double                 threshold = 0.7);

// ------------------------------------------------------------
//  F1, F9, F11 — Stability, Conflict, & Evolution Timeline
//  File: src/Stability.cpp
// ------------------------------------------------------------

// F1: Compute global social stability score + conflict triads.
StabilityResult computeStability(const Graph& g);

// F9: Return only conflict-zone triads (unstable triangles).
std::vector<std::tuple<int,int,int>> findConflictTriads(const Graph& g);

// F11: Compute snapshot metrics (density, clustering, stability)
//      for a sequence of historical graphs.
struct SnapshotMetric {
    double density;
    double clusteringCoeff;
    double stabilityScore;
};
std::vector<SnapshotMetric> evolutionTimeline(
    const std::vector<Graph>& snapshots);

// ------------------------------------------------------------
//  F5 & F10 — Viral Simulation & What-If Analytics
//  File: src/Simulation.cpp
// ------------------------------------------------------------

// F5: Run Independent Cascade Model from a seed node.
// Each edge (u→v, w) is sampled: message spreads with prob w.
SimulationResult simulateViralSpread(const Graph& g,
                                      int          seedIdx,
                                      int          maxRounds = 20);

// F10: Remove a node and report articulation points + fragments.
ArticulationResult simulateNodeRemoval(const Graph& g, int removeIdx);

// ------------------------------------------------------------
//  F2 — Friendship Risk Prediction
//  File: src/Forecaster.cpp
// ------------------------------------------------------------

// F2: Analyse temporal weight vectors and flag declining edges.
// temporalWeights: map of (srcIdx, dstIdx) → time-series weights.
using EdgeKey = std::pair<int,int>;
struct PairHash {
    size_t operator()(const EdgeKey& k) const {
        return std::hash<int>()(k.first) ^ (std::hash<int>()(k.second) << 16);
    }
};

std::vector<FriendshipRisk> predictFriendshipRisk(
    const Graph& g,
    const std::unordered_map<EdgeKey, std::vector<double>, PairHash>& temporalWeights,
    int windowSize = 3);

#endif // ALGORITHMS_H
