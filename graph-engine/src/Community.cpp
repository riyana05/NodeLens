
//  Community.cpp
//  F3: Hidden Community Discovery
//  F12: Echo Chamber Detection
//
//  Two-phase approach:
//
//  Phase 1 — Community Detection (Louvain-style greedy modularity)
//    Repeatedly merges nodes into communities that maximise the
//    modularity gain ΔQ.  For large graphs this runs in near-
//    linear time.  For very small/sparse graphs we fall back to
//    Union-Find connected components.
//
//  Phase 2 — Echo Chamber Scoring
//    For each community compute:
//      internalDensity  = (internal edges) / (k*(k-1)/2)  [undirected]
//      externalRatio    = (external edges) / (total edges of community)
//    A community is flagged as an echo chamber if:
//      internalDensity > threshold  AND  externalRatio < (1 - threshold)

#include "../include/Graph.h"
#include "../include/Algorithms.h"

#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <numeric>
#include <cmath>
#include <queue>

//  UNION-FIND (Disjoint Set Union) with path compression + rank
struct DSU {
    std::vector<int> parent, rank_;

    explicit DSU(int n) : parent(n), rank_(n, 0) {
        std::iota(parent.begin(), parent.end(), 0);
    }

    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);  // path compression
        return parent[x];
    }

    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (rank_[a] < rank_[b]) std::swap(a, b);
        parent[b] = a;
        if (rank_[a] == rank_[b]) ++rank_[a];
    }

    bool connected(int a, int b) { return find(a) == find(b); }
};


//  LOUVAIN — greedy modularity optimisation (Phase 1 only)
//  Returns a membership vector.
// Total weight of all edges (directed sum)
static double totalEdgeWeight(const Graph& g) {
    double total = 0.0;
    int n = g.nodeCount();
    for (int u = 0; u < n; ++u)
        for (const Edge& e : g.edgesFrom(u))
            total += e.weight;
    return total;
}

// Strength (weighted degree) for each node
static std::vector<double> nodeStrengths(const Graph& g) {
    int n = g.nodeCount();
    std::vector<double> strength(n, 0.0);
    for (int u = 0; u < n; ++u)
        for (const Edge& e : g.edgesFrom(u)) {
            strength[u]    += e.weight;
            strength[e.to] += e.weight;   // treat as undirected contribution
        }
    return strength;
}

static std::vector<int> louvainPhase1(const Graph& g) {
    int n = g.nodeCount();
    if (n == 0) return {};

    // Each node starts in its own community
    std::vector<int> community(n);
    std::iota(community.begin(), community.end(), 0);

    double m2 = 2.0 * totalEdgeWeight(g);
    if (m2 < 1e-12) return community;   // no edges — trivial

    std::vector<double> strength = nodeStrengths(g);

    // Community total strength
    std::vector<double> communityStrength(n);
    for (int i = 0; i < n; ++i)
        communityStrength[i] = strength[i];

    bool improved = true;
    int  passes   = 0;
    const int MAX_PASSES = 20;

    while (improved && passes < MAX_PASSES) {
        improved = false;
        ++passes;

        for (int u = 0; u < n; ++u) {
            int    bestComm  = community[u];
            double bestGain  = 0.0;

            // Collect neighbouring communities and weight to each
            std::unordered_map<int, double> neighCommWeight;
            for (const Edge& e : g.edgesFrom(u))
                neighCommWeight[community[e.to]] += e.weight;
            // Also reverse edges (treat graph as undirected for modularity)
            for (int v = 0; v < n; ++v)
                for (const Edge& e : g.edgesFrom(v))
                    if (e.to == u) neighCommWeight[community[v]] += e.weight;

            // Remove u from its current community temporarily
            int    currComm  = community[u];
            double currWeight = neighCommWeight.count(currComm)
                                    ? neighCommWeight[currComm] : 0.0;
            communityStrength[currComm] -= strength[u];

            // Evaluate modularity gain for each neighbour community
            for (auto& [comm, wToComm] : neighCommWeight) {
                if (comm == currComm) continue;

                // ΔQ = [w_in_comm / m  -  (strength[u] * communityStrength[comm]) / m²]
                double gain = wToComm / (m2 / 2.0)
                            - (strength[u] * communityStrength[comm]) / (m2 * m2 / 4.0);

                if (gain > bestGain) {
                    bestGain = gain;
                    bestComm = comm;
                }
            }

            // Re-add to best community
            communityStrength[bestComm] += strength[u];
            if (bestComm != currComm) {
                community[u] = bestComm;
                improved = true;
            }
        }
    }

    // Re-label communities as 0..K-1
    std::unordered_map<int, int> relabel;
    int nextId = 0;
    for (int u = 0; u < n; ++u) {
        auto [it, inserted] = relabel.emplace(community[u], nextId);
        if (inserted) ++nextId;
        community[u] = it->second;
    }
    return community;
}

//  F3: detectCommunities
CommunityResult detectCommunities(const Graph& g) {
    CommunityResult result;
    int n = g.nodeCount();
    if (n == 0) return result;

    // Choose algorithm based on graph density
    double density = (double)g.edgeCount() / (double)(n * std::max(n - 1, 1));
    std::vector<int> membership;

    if (n <= 3 || density < 0.01) {
        // Very sparse/small: use Union-Find connected components
        DSU dsu(n);
        for (int u = 0; u < n; ++u)
            for (const Edge& e : g.edgesFrom(u))
                dsu.unite(u, e.to);

        membership.resize(n);
        std::unordered_map<int, int> rootToComm;
        int nextId = 0;
        for (int u = 0; u < n; ++u) {
            int root = dsu.find(u);
            auto [it, inserted] = rootToComm.emplace(root, nextId);
            if (inserted) ++nextId;
            membership[u] = it->second;
        }
    } else {
        membership = louvainPhase1(g);
    }

    // Count communities
    int numComm = *std::max_element(membership.begin(), membership.end()) + 1;
    result.membership     = membership;
    result.numCommunities = numComm;

    // Compute intra-community edge densities
    std::vector<int> commSize(numComm, 0);
    std::vector<int> intraEdges(numComm, 0);
    for (int i = 0; i < n; ++i) ++commSize[membership[i]];

    for (int u = 0; u < n; ++u)
        for (const Edge& e : g.edgesFrom(u))
            if (membership[u] == membership[e.to])
                ++intraEdges[membership[u]];

    result.densities.resize(numComm);
    for (int c = 0; c < numComm; ++c) {
        int k = commSize[c];
        double maxEdges = (double)k * (k - 1);    // directed
        result.densities[c] = (maxEdges > 0)
                            ? (double)intraEdges[c] / maxEdges
                            : 0.0;
    }

    result.isEchoChamber.assign(numComm, false);  // filled by detectEchoChambers
    return result;
}

//  F12: detectEchoChambers
std::vector<EchoChamberInfo> detectEchoChambers(const Graph&          g,
                                                  const CommunityResult& comm,
                                                  double                 threshold) {
    int n  = g.nodeCount();
    int nc = comm.numCommunities;
    std::vector<EchoChamberInfo> info(nc);

    // Count intra and total directed edges per community
    std::vector<int> intraCount(nc, 0);
    std::vector<int> totalCount(nc, 0);

    for (int u = 0; u < n; ++u) {
        int cu = comm.membership[u];
        for (const Edge& e : g.edgesFrom(u)) {
            ++totalCount[cu];
            if (comm.membership[e.to] == cu) ++intraCount[cu];
        }
    }

    for (int c = 0; c < nc; ++c) {
        info[c].communityId      = c;
        info[c].internalDensity  = comm.densities[c];

        // External ratio: fraction of edges that leave the community
        int ext = totalCount[c] - intraCount[c];
        info[c].externalRatio = (totalCount[c] > 0)
                                ? (double)ext / totalCount[c]
                                : 0.0;

        // Echo chamber: high internal density + few external links
        info[c].flagged = (info[c].internalDensity  >= threshold) &&
                          (info[c].externalRatio     < (1.0 - threshold));
    }
    return info;
}
