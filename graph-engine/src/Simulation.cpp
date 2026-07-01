
//  Simulation.cpp
//  F5:  Viral Reach Estimator (Independent Cascade Model)
//  F10: Social Game Mode / What-If Analytics (Node Removal)
//
//  ---- F5: Independent Cascade Model ----
//  Starting from a seed node, each newly infected node u
//  attempts to infect each uninfected neighbour v with
//  probability = trust weight w(u→v).
//  The process runs BFS-style in discrete rounds until no
//  new infections occur or maxRounds is reached.
//
//  We run MONTE_CARLO_RUNS independent simulations and
//  average the results to reduce randomness variance.
//
//  ---- F10: Node Removal / Articulation Points ----
//  Removes a target node from the graph, then runs Tarjan's
//  bridge-finding algorithm on the remaining graph to detect
//  articulation points (nodes whose removal disconnects the
//  graph).  Reports how many components the graph fragments into.

#include "../include/Graph.h"
#include "../include/Algorithms.h"

#include <vector>
#include <queue>
#include <random>
#include <algorithm>
#include <numeric>
#include <stack>
#include <functional>

static constexpr int MONTE_CARLO_RUNS = 50;   // simulations to average

// ------------------------------------------------------------------
//  Random number generator (thread-local for reproducibility)
// ------------------------------------------------------------------
static std::mt19937& getRng() {
    static thread_local std::mt19937 rng(std::random_device{}());
    return rng;
}

//  Single Independent Cascade run.
//  Returns a vector of SimulationSteps (one per BFS round).
static SimulationResult singleCascade(const Graph& g,
                                       int           seed,
                                       int           maxRounds) {
    int n = g.nodeCount();
    SimulationResult result;

    std::vector<bool> infected(n, false);
    infected[seed] = true;

    std::vector<int> current = {seed};
    result.totalReached = 1;

    std::uniform_real_distribution<double> dist(0.0, 1.0);
    auto& rng = getRng();

    for (int round = 0; round < maxRounds && !current.empty(); ++round) {
        SimulationStep step;
        step.round = round + 1;

        std::vector<int> nextWave;
        for (int u : current) {
            for (const Edge& e : g.edgesFrom(u)) {
                if (!infected[e.to]) {
                    // Infect with probability = trust weight
                    if (dist(rng) < e.weight) {
                        infected[e.to] = true;
                        nextWave.push_back(e.to);
                        step.newlyInfected.push_back(e.to);
                    }
                }
            }
        }

        if (!step.newlyInfected.empty())
            result.steps.push_back(std::move(step));

        result.totalReached += (int)nextWave.size();
        current = std::move(nextWave);
    }

    result.spreadRatio = (n > 0) ? (double)result.totalReached / n : 0.0;
    return result;
}

//  F5: simulateViralSpread
//  Runs MONTE_CARLO_RUNS simulations and averages the results.
//  Returns the representative run closest to the average reach.
SimulationResult simulateViralSpread(const Graph& g,
                                      int          seedIdx,
                                      int          maxRounds) {
    if (seedIdx < 0 || seedIdx >= g.nodeCount()) {
        return SimulationResult{};
    }

    int totalReachedSum = 0;
    std::vector<SimulationResult> runs;
    runs.reserve(MONTE_CARLO_RUNS);

    for (int i = 0; i < MONTE_CARLO_RUNS; ++i) {
        runs.push_back(singleCascade(g, seedIdx, maxRounds));
        totalReachedSum += runs.back().totalReached;
    }

    double avgReach = (double)totalReachedSum / MONTE_CARLO_RUNS;

    // Return the run whose totalReached is closest to the average
    int bestIdx = 0;
    double bestDiff = std::fabs(runs[0].totalReached - avgReach);
    for (int i = 1; i < (int)runs.size(); ++i) {
        double diff = std::fabs(runs[i].totalReached - avgReach);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    }

    // Update spreadRatio to the averaged value
    runs[bestIdx].spreadRatio = avgReach / g.nodeCount();
    runs[bestIdx].totalReached = (int)std::round(avgReach);
    return runs[bestIdx];
}

//  Tarjan's algorithm for Articulation Points on an undirected graph.
//  Fills artPoints with indices of nodes that are articulation points.
static void tarjanAP(const std::vector<std::vector<int>>& adj,
                     int                                   u,
                     int                                   parent,
                     std::vector<int>&                     disc,
                     std::vector<int>&                     low,
                     std::vector<bool>&                    visited,
                     std::vector<bool>&                    isAP,
                     int&                                  timer) {
    visited[u] = true;
    disc[u] = low[u] = ++timer;
    int children = 0;

    for (int v : adj[u]) {
        if (!visited[v]) {
            ++children;
            tarjanAP(adj, v, u, disc, low, visited, isAP, timer);
            low[u] = std::min(low[u], low[v]);

            // u is an articulation point if:
            // (a) u is root and has 2+ children, OR
            // (b) u is not root and low[v] >= disc[u]
            if (parent == -1 && children > 1) isAP[u] = true;
            if (parent != -1 && low[v] >= disc[u]) isAP[u] = true;
        } else if (v != parent) {
            low[u] = std::min(low[u], disc[v]);
        }
    }
}

//  Count connected components (BFS) ignoring a removed node.
static int countComponents(const std::vector<std::vector<int>>& adj,
                             int                                   n,
                             int                                   removedNode) {
    std::vector<bool> visited(n, false);
    if (removedNode >= 0) visited[removedNode] = true;

    int components = 0;
    for (int start = 0; start < n; ++start) {
        if (visited[start]) continue;
        ++components;
        std::queue<int> q;
        q.push(start);
        visited[start] = true;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : adj[u]) {
                if (!visited[v]) {
                    visited[v] = true;
                    q.push(v);
                }
            }
        }
    }
    return components;
}

//  F10: simulateNodeRemoval
ArticulationResult simulateNodeRemoval(const Graph& g, int removeIdx) {
    ArticulationResult result;
    int n = g.nodeCount();

    if (removeIdx < 0 || removeIdx >= n) {
        result.componentsAfterRemoval = 1;
        return result;
    }

    // Build undirected adjacency (excluding the removed node)
    std::vector<std::vector<int>> adj(n);
    for (int u = 0; u < n; ++u) {
        if (u == removeIdx) continue;
        for (const Edge& e : g.edgesFrom(u)) {
            if (e.to == removeIdx) continue;
            adj[u].push_back(e.to);
            adj[e.to].push_back(u);   // undirected
        }
    }

    // --- Find articulation points via Tarjan ---
    std::vector<int>  disc(n, 0), low(n, 0);
    std::vector<bool> visited(n, false), isAP(n, false);
    visited[removeIdx] = true;  // skip removed node
    int timer = 0;

    for (int s = 0; s < n; ++s) {
        if (!visited[s])
            tarjanAP(adj, s, -1, disc, low, visited, isAP, timer);
    }

    for (int u = 0; u < n; ++u)
        if (isAP[u]) result.articulationPoints.push_back(u);

    // --- Count components after removal ---
    result.componentsAfterRemoval = countComponents(adj, n, removeIdx);

    return result;
}
