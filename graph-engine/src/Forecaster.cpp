
//  Forecaster.cpp
//  F2: Friendship Risk Prediction
//
//  For each edge (u, v) with a temporal weight history, we:
//
//  1. Apply a sliding-window moving average to smooth noise.
//  2. Compute the overall velocity (linear regression slope)
//     over the smoothed series.
//  3. Apply an exponential recency bias: recent drops count
//     more than old drops.
//  4. Normalise velocity into a risk score ∈ [0, 1].
//
//  High risk → the friendship trust is declining and likely
//  to break in the near future.

#include "../include/Graph.h"
#include "../include/Algorithms.h"

#include <vector>
#include <cmath>
#include <algorithm>
#include <numeric>

//  Moving average smoothing over a window of size W.
static std::vector<double> movingAverage(const std::vector<double>& series,
                                          int                         window) {
    int n = (int)series.size();
    if (n == 0 || window <= 1) return series;

    std::vector<double> smoothed;
    smoothed.reserve(n);

    for (int i = 0; i < n; ++i) {
        int   start = std::max(0, i - window + 1);
        int   count = i - start + 1;
        double sum  = 0.0;
        for (int j = start; j <= i; ++j) sum += series[j];
        smoothed.push_back(sum / count);
    }
    return smoothed;
}

//  Compute linear regression slope for a series.
//  Positive slope = trust increasing; negative = declining.
static double regressionSlope(const std::vector<double>& y) {
    int n = (int)y.size();
    if (n < 2) return 0.0;

    double sumX  = 0, sumY  = 0, sumXY = 0, sumX2 = 0;
    for (int i = 0; i < n; ++i) {
        sumX  += i;
        sumY  += y[i];
        sumXY += i * y[i];
        sumX2 += (double)i * i;
    }
    double denom = n * sumX2 - sumX * sumX;
    if (std::fabs(denom) < 1e-12) return 0.0;
    return (n * sumXY - sumX * sumY) / denom;
}

//  Recency-weighted velocity: recent changes have higher impact.
//  weight[t] = exp(-decay * (T - t))  where T = last time index.
static double recencyWeightedVelocity(const std::vector<double>& smoothed,
                                       double                      decay = 0.3) {
    int n = (int)smoothed.size();
    if (n < 2) return 0.0;

    double weightedDelta = 0.0, totalWeight = 0.0;
    for (int t = 1; t < n; ++t) {
        double w     = std::exp(-decay * (n - 1 - t));
        double delta = smoothed[t] - smoothed[t - 1];
        weightedDelta += w * delta;
        totalWeight   += w;
    }
    return (totalWeight > 1e-12) ? weightedDelta / totalWeight : 0.0;
}

//  Map a velocity value to a risk score ∈ [0, 1].
//  velocity < 0 → risk increases.  velocity ≥ 0 → low risk.
//  Uses sigmoid-like mapping: risk = sigmoid(-velocity * scale).
static double velocityToRisk(double velocity) {
    // Scale negative velocity into a positive risk score
    // A velocity of -0.05 per period (5% monthly drop) → ~high risk
    const double scale = 20.0;
    return 1.0 / (1.0 + std::exp(velocity * scale));
}


//  F2: predictFriendshipRisk
std::vector<FriendshipRisk> predictFriendshipRisk(
    const Graph& g,
    const std::unordered_map<EdgeKey, std::vector<double>, PairHash>& temporalWeights,
    int windowSize)
{
    std::vector<FriendshipRisk> risks;

    for (auto& [edgeKey, rawSeries] : temporalWeights) {
        auto [srcIdx, dstIdx] = edgeKey;

        // Skip if edge no longer exists in the current graph
        if (g.getWeight(srcIdx, dstIdx) < 0) continue;

        // Need at least 2 data points to detect a trend
        if (rawSeries.size() < 2) continue;

        // Step 1: smooth with moving average
        std::vector<double> smoothed = movingAverage(rawSeries, windowSize);

        // Step 2: compute recency-weighted velocity
        double velocity = recencyWeightedVelocity(smoothed);

        // Step 3: fallback to regression slope if series is short
        if ((int)rawSeries.size() <= windowSize)
            velocity = regressionSlope(smoothed);

        // Step 4: convert to risk score
        double risk = velocityToRisk(velocity);

        FriendshipRisk fr;
        fr.nodeA     = srcIdx;
        fr.nodeB     = dstIdx;
        fr.velocity  = velocity;
        fr.riskScore = risk;
        risks.push_back(fr);
    }

    // Sort by descending risk so highest-risk friendships come first
    std::sort(risks.begin(), risks.end(),
              [](const FriendshipRisk& a, const FriendshipRisk& b) {
                  return a.riskScore > b.riskScore;
              });

    return risks;
}
