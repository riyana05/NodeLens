#pragma once
#ifndef GRAPH_H
#define GRAPH_H

#include <string>
#include <vector>
#include <unordered_map>
#include <stdexcept>

//  Edge: a directed, weighted connection between two nodes.
//  weight W ∈ (0, 1] represents trust / probability.
struct Edge {
    int     to;       // destination vertex index (0-based)
    double  weight;   // trust weight in (0,1]

    Edge(int t, double w) : to(t), weight(w) {}
};

//  Vertex: metadata stored per node in the graph.
struct Vertex {
    std::string mongoId;   // original MongoDB ObjectId string
    std::string label;     // human-readable display name (optional)

    Vertex() = default;
    Vertex(const std::string& id, const std::string& lbl = "")
        : mongoId(id), label(lbl) {}
};

//  Graph: adjacency-list graph with bidirectional ID mapping.
//  Nodes are stored as contiguous 0-indexed integers internally
//  for cache-friendly iteration. MongoDB string IDs are mapped
//  in both directions via hash-maps.
class Graph {
public:
    // --- Construction ----------------------------------------

    Graph() = default;
    explicit Graph(int reserveSize) {
        vertices.reserve(reserveSize);
        adjList.reserve(reserveSize);
    }

    // Add a node by its MongoDB string ID. Returns its index.
    // If already present, returns existing index (idempotent).
    int addNode(const std::string& mongoId, const std::string& label = "") {
        auto it = idToIndex.find(mongoId);
        if (it != idToIndex.end()) return it->second;

        int idx = static_cast<int>(vertices.size());
        vertices.emplace_back(mongoId, label);
        adjList.emplace_back();          // empty edge list for new node
        idToIndex[mongoId] = idx;
        indexToId[idx]     = mongoId;
        return idx;
    }

    // Add a directed edge src→dst with given trust weight.
    // Nodes are auto-created if missing.
    void addEdge(const std::string& srcId,
                 const std::string& dstId,
                 double weight) {
        if (weight <= 0.0 || weight > 1.0)
            throw std::invalid_argument("Edge weight must be in (0, 1]");

        int s = addNode(srcId);
        int d = addNode(dstId);
        adjList[s].emplace_back(d, weight);
    }

    // Add an undirected (bidirectional) edge.
    void addUndirectedEdge(const std::string& srcId,
                           const std::string& dstId,
                           double weight) {
        addEdge(srcId, dstId, weight);
        addEdge(dstId, srcId, weight);
    }

    // --- Accessors -------------------------------------------

    int nodeCount() const { return static_cast<int>(vertices.size()); }

    int edgeCount() const {
        int total = 0;
        for (auto& el : adjList) total += static_cast<int>(el.size());
        return total;
    }

    // Translate MongoDB ID → internal index (-1 if not found)
    int indexOf(const std::string& mongoId) const {
        auto it = idToIndex.find(mongoId);
        return (it != idToIndex.end()) ? it->second : -1;
    }

    // Translate internal index → MongoDB ID
    const std::string& idOf(int idx) const {
        auto it = indexToId.find(idx);
        if (it == indexToId.end())
            throw std::out_of_range("Index out of range: " + std::to_string(idx));
        return it->second;
    }

    const Vertex& vertexAt(int idx) const { return vertices.at(idx); }

    const std::vector<Edge>& edgesFrom(int idx) const { return adjList.at(idx); }

    // Full adjacency list (read-only)
    const std::vector<std::vector<Edge>>& adjacency() const { return adjList; }

    // All vertices (read-only)
    const std::vector<Vertex>& allVertices() const { return vertices; }

    // Check if an edge exists between two indices
    bool hasEdge(int src, int dst) const {
        for (auto& e : adjList[src])
            if (e.to == dst) return true;
        return false;
    }

    // Get weight of edge src→dst (returns -1.0 if not found)
    double getWeight(int src, int dst) const {
        for (auto& e : adjList[src])
            if (e.to == dst) return e.weight;
        return -1.0;
    }

private:
    std::vector<Vertex>              vertices;    // vertex metadata, index = internal ID
    std::vector<std::vector<Edge>>   adjList;     // adjacency lists

    std::unordered_map<std::string, int> idToIndex;  // mongoId  → internal idx
    std::unordered_map<int, std::string> indexToId;  // internal idx → mongoId
};

#endif // GRAPH_H
