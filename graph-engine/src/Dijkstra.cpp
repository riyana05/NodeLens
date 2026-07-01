
//  Dijkstra.cpp
//  F13: Trust Routing  |  F8: Explainable Friend Recommendation
//
//  Core insight: we want the path with MAXIMUM multiplicative
//  trust  T = w1 * w2 * ... * wk.
//
//  Taking -ln converts the product into a sum of positive
//  costs, and Dijkstra's min-sum algorithm naturally finds
//  the maximum-trust path.
//
//    cost(e) = -ln(weight(e))
//    total cost = -ln(w1) + ... + -ln(wk) = -ln(T)
//    minimise cost  ⟺  maximise T

#include "../include/Graph.h"
#include "../include/Algorithms.h"

#include <queue>
#include <vector>
#include <cmath>
#include <limits>
#include <algorithm>
#include <set>

static constexpr double INF = std::numeric_limits<double>::infinity();

//  Internal Dijkstra returning distances and predecessor array.
struct DijkstraResult {
    std::vector<double> dist;   // dist[v] = -ln(best trust) from source
    std::vector<int>    prev;   // prev[v] = predecessor on best path
};

static DijkstraResult runDijkstra(const Graph& g, int source) {
    int n = g.nodeCount();
    DijkstraResult res;
    res.dist.assign(n, INF);
    res.prev.assign(n, -1);
    res.dist[source] = 0.0;

    // min-heap: (cost, node)
    using PD = std::pair<double, int>;
    std::priority_queue<PD, std::vector<PD>, std::greater<PD>> pq;
    pq.push({0.0, source});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();

        if (d > res.dist[u]) continue;  // stale entry

        for (const Edge& e : g.edgesFrom(u)) {
            if (e.weight <= 0.0) continue;          // skip zero-weight edges
            double cost = -std::log(e.weight);      // -ln transform
            double newDist = res.dist[u] + cost;

            if (newDist < res.dist[e.to]) {
                res.dist[e.to] = newDist;
                res.prev[e.to] = u;
                pq.push({newDist, e.to});
            }
        }
    }
    return res;
}

//  Reconstruct the node path from predecessor array.
static std::vector<int> reconstructPath(const std::vector<int>& prev,
                                         int target) {
    std::vector<int> path;
    for (int v = target; v != -1; v = prev[v])
        path.push_back(v);
    std::reverse(path.begin(), path.end());
    return path;
}

//  F13: findTrustPath
//  Returns the highest-trust path from source to target.
PathResult findTrustPath(const Graph& g, int sourceIdx, int targetIdx) {
    PathResult result;
    result.found = false;
    result.score = 0.0;

    if (sourceIdx < 0 || sourceIdx >= g.nodeCount() ||
        targetIdx < 0 || targetIdx >= g.nodeCount()) {
        return result;
    }
    if (sourceIdx == targetIdx) {
        result.found = true;
        result.score = 1.0;
        result.nodeIndices = {sourceIdx};
        return result;
    }

    DijkstraResult dr = runDijkstra(g, sourceIdx);

    if (dr.dist[targetIdx] == INF) {
        return result;   // no path
    }

    result.found        = true;
    result.nodeIndices  = reconstructPath(dr.prev, targetIdx);
    // Convert back: total_cost = -ln(T)  →  T = exp(-total_cost)
    result.score        = std::exp(-dr.dist[targetIdx]);
    return result;
}

//  F8: recommendFriends
//  Finds topK reachable nodes (not already direct neighbours or self)
//  ranked by trust score (highest first).
std::vector<PathResult> recommendFriends(const Graph& g,
                                          int          sourceIdx,
                                          int          topK) {
    if (sourceIdx < 0 || sourceIdx >= g.nodeCount())
        return {};

    int n = g.nodeCount();
    DijkstraResult dr = runDijkstra(g, sourceIdx);

    // Collect direct neighbours to exclude them
    std::set<int> directNeighbours;
    directNeighbours.insert(sourceIdx);
    for (const Edge& e : g.edgesFrom(sourceIdx))
        directNeighbours.insert(e.to);

    // Collect all reachable non-neighbour nodes with their trust scores
    using ScoreIdx = std::pair<double, int>;
    std::vector<ScoreIdx> candidates;
    candidates.reserve(n);

    for (int v = 0; v < n; ++v) {
        if (directNeighbours.count(v)) continue;
        if (dr.dist[v] == INF)         continue;

        double trust = std::exp(-dr.dist[v]);
        candidates.emplace_back(trust, v);
    }

    // Sort descending by trust
    std::sort(candidates.begin(), candidates.end(),
              [](const ScoreIdx& a, const ScoreIdx& b) {
                  return a.first > b.first;
              });

    // Build PathResult objects for topK
    std::vector<PathResult> results;
    int limit = std::min(topK, (int)candidates.size());
    results.reserve(limit);

    for (int i = 0; i < limit; ++i) {
        auto [trust, v] = candidates[i];
        PathResult pr;
        pr.found       = true;
        pr.score       = trust;
        pr.nodeIndices = reconstructPath(dr.prev, v);
        results.push_back(std::move(pr));
    }
    return results;
}
