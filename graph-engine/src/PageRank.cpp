
//  PageRank.cpp
//  F6: Influence Index
//
//  Implements the power-iteration PageRank algorithm.
//
//  Standard formula (per iteration):
//    PR(u) = (1-d)/N  +  d * Σ [ PR(v) * w(v→u) / OutStrength(v) ]
//
//  where:
//    d               = damping factor (typically 0.85)
//    N               = total number of nodes
//    w(v→u)          = trust weight on edge v→u
//    OutStrength(v)  = Σ weights of all outgoing edges from v
//
//  Trust-weighted variant: instead of dividing by out-degree,
//  we divide by total outgoing trust strength so high-trust
//  connections transfer more PageRank.
//
//  Converges when the L1 norm of the change vector < epsilon.

#include "../include/Graph.h"
#include "../include/Algorithms.h"

#include <vector>
#include <cmath>
#include <numeric>
#include <algorithm>

//  F6: computePageRank
PageRankResult computePageRank(const Graph& g,
                                double       damping,
                                int          maxIter,
                                double       epsilon) {
    PageRankResult result;
    int n = g.nodeCount();

    if (n == 0) return result;

    // ---- Precompute out-strength for each node ----
    // out-strength[u] = sum of trust weights of all edges leaving u
    std::vector<double> outStrength(n, 0.0);
    for (int u = 0; u < n; ++u)
        for (const Edge& e : g.edgesFrom(u))
            outStrength[u] += e.weight;

    // ---- Initialise PageRank uniformly ----
    double initVal = 1.0 / n;
    std::vector<double> pr(n, initVal);
    std::vector<double> newPR(n, 0.0);

    double baseScore = (1.0 - damping) / n;

    // ---- Power iteration ----
    for (int iter = 0; iter < maxIter; ++iter) {
        std::fill(newPR.begin(), newPR.end(), baseScore);

        // Distribute rank along outgoing edges
        for (int u = 0; u < n; ++u) {
            if (outStrength[u] < 1e-12) {
                // Dangling node: distribute its rank equally to all nodes
                double share = damping * pr[u] / n;
                for (int v = 0; v < n; ++v)
                    newPR[v] += share;
                continue;
            }
            for (const Edge& e : g.edgesFrom(u)) {
                // Weighted contribution: proportional to trust
                double contribution = damping * pr[u] * (e.weight / outStrength[u]);
                newPR[e.to] += contribution;
            }
        }

        // Check convergence (L1 norm of difference)
        double diff = 0.0;
        for (int v = 0; v < n; ++v)
            diff += std::fabs(newPR[v] - pr[v]);

        std::swap(pr, newPR);

        if (diff < epsilon) break;
    }

    // ---- Normalise so scores sum to 1 ----
    double total = std::accumulate(pr.begin(), pr.end(), 0.0);
    if (total > 1e-12)
        for (double& val : pr) val /= total;

    result.scores = std::move(pr);
    return result;
}
