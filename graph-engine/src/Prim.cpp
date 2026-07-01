
//  Prim.cpp
//  F7: Relationship Backbone — Minimum Spanning Tree
//
//  Goal: reduce the dense social graph to its V-1 most
//  structurally important edges while keeping the graph
//  fully connected.
//
//  Trick: we want MAXIMUM trust edges in the backbone.
//  Prim's computes a MINIMUM spanning tree, so we invert
//  weights:  cost(e) = 1 - trust(e).
//  The MST of these costs = the tree maximising total trust.
//
//  For a directed graph we treat each directed edge pair as
//  undirected (take the maximum weight between u↔v if both
//  directions exist) so Prim's has a well-defined MST.

#include "../include/Graph.h"
#include "../include/Algorithms.h"

#include <vector>
#include <queue>
#include <limits>
#include <algorithm>
#include <unordered_map>

static constexpr double INF = std::numeric_limits<double>::infinity();

//  Build an undirected weighted adjacency map from the directed graph.
//  If both u→v and v→u exist, use the higher trust weight.
struct UEdge {
    int    dst;
    double weight;
};

static std::vector<std::vector<UEdge>> toUndirected(const Graph& g) {
    int n = g.nodeCount();
    std::vector<std::vector<UEdge>> undirected(n);

    // Track maximum undirected weight between each pair
    // Use a map keyed by (min, max) to handle both directions
    std::unordered_map<long long, double> bestWeight;

    for (int u = 0; u < n; ++u) {
        for (const Edge& e : g.edgesFrom(u)) {
            int v = e.to;
            long long key = (long long)std::min(u, v) * 100000 + std::max(u, v);
            auto it = bestWeight.find(key);
            if (it == bestWeight.end() || e.weight > it->second)
                bestWeight[key] = e.weight;
        }
    }

    // Build undirected adjacency from the best weights
    for (auto& [key, w] : bestWeight) {
        int u = (int)(key / 100000);
        int v = (int)(key % 100000);
        undirected[u].push_back({v, w});
        undirected[v].push_back({u, w});
    }
    return undirected;
}

//  F7: computeMST
//  Prim's algorithm on the undirected projection of the graph.
//  Returns the V-1 backbone edges (or fewer if graph is disconnected).
std::vector<MSTEdge> computeMST(const Graph& g) {
    int n = g.nodeCount();
    if (n == 0) return {};

    auto undirected = toUndirected(g);

    // Prim's with a min-heap on cost = (1 - trust)
    std::vector<double> key(n, INF);    // best (1-trust) to reach node
    std::vector<int>    parent(n, -1);  // MST predecessor
    std::vector<bool>   inMST(n, false);

    // Min-heap: (cost, node)
    using PD = std::pair<double, int>;
    std::priority_queue<PD, std::vector<PD>, std::greater<PD>> pq;

    key[0] = 0.0;
    pq.push({0.0, 0});

    std::vector<MSTEdge> mstEdges;
    mstEdges.reserve(n - 1);

    while (!pq.empty()) {
        auto [cost, u] = pq.top(); pq.pop();

        if (inMST[u]) continue;
        inMST[u] = true;

        // Add edge to MST (skip root which has no parent)
        if (parent[u] != -1) {
            double trustWeight = 1.0 - cost;   // convert back to trust
            mstEdges.push_back({parent[u], u, trustWeight});
        }

        for (const UEdge& e : undirected[u]) {
            double edgeCost = 1.0 - e.weight;  // invert for min-spanning
            if (!inMST[e.dst] && edgeCost < key[e.dst]) {
                key[e.dst]    = edgeCost;
                parent[e.dst] = u;
                pq.push({edgeCost, e.dst});
            }
        }
    }

    return mstEdges;
}
