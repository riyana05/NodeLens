
//  main.cpp — Graph Engine Entry Point
//
//  Usage:
//    ./graph-engine '<json_payload>' <command>
//
//  Commands:
//    trust-path        F13  args: sourceId, targetId
//    recommend         F8   args: sourceId, topK
//    backbone          F7   (no extra args)
//    pagerank          F6   (no extra args)
//    communities       F3   (no extra args)
//    echo-chambers     F12  (no extra args)
//    stability         F1   (no extra args)
//    conflicts         F9   (no extra args)
//    simulate-spread   F5   args: seedId, maxRounds
//    simulate-removal  F10  args: removeId
//    friendship-risk   F2   (temporal weights in payload)
//    full-analytics    All metrics in one pass
//
//  JSON payload format:
//  {
//    "nodes": [{"id":"abc","label":"Alice"}, ...],
//    "edges": [{"src":"abc","dst":"xyz","weight":0.85}, ...],
//    "args":  { ... command-specific arguments ... },
//    "temporal": {                                   // optional, for F2
//      "abc:xyz": [0.9, 0.8, 0.72, 0.6, 0.4],
//      ...
//    }
//  }
//
//  Output: single JSON string to stdout.
//          Error messages go to stderr.

#include "../include/Graph.h"
#include "../include/Algorithms.h"

// Minimal JSON parser/builder — uses nlohmann/json if available,
// otherwise falls back to a tiny hand-rolled subset.
// We use the popular single-header nlohmann/json library.
// If not available, compile with -DUSE_SIMPLE_JSON
#ifndef USE_SIMPLE_JSON
  // Check if json.hpp is available (bundled in include/)
  #if __has_include("../include/json.hpp")
    #include "../include/json.hpp"
    #include <iostream>
    #include <string>
    using json = nlohmann::json;
    #define HAS_NLOHMANN 1
  #else
    #define USE_SIMPLE_JSON 1
  #endif
#endif

#ifdef USE_SIMPLE_JSON
// ----------------------------------------------------------------
//  Tiny JSON builder (output only — not a full parser).
//  For real use, bundle nlohmann/json.hpp (single header, MIT).
// ----------------------------------------------------------------
#include <sstream>
#include <stdexcept>
#include <iostream>
#include <string>
#include <vector>
#include <map>

// Very small JSON value type for output
struct JVal {
    enum Type { Null, Bool, Int, Double, String, Array, Object };
    Type type = Null;
    bool   bval = false;
    long   ival = 0;
    double dval = 0.0;
    std::string sval;
    std::vector<JVal> arr;
    std::map<std::string, JVal> obj;

    static JVal fromBool(bool b)   { JVal v; v.type=Bool;   v.bval=b;  return v; }
    static JVal fromInt(long i)    { JVal v; v.type=Int;    v.ival=i;  return v; }
    static JVal fromDouble(double d){ JVal v; v.type=Double; v.dval=d; return v; }
    static JVal fromStr(const std::string& s){ JVal v; v.type=String; v.sval=s; return v; }
    static JVal makeArray()  { JVal v; v.type=Array;  return v; }
    static JVal makeObject() { JVal v; v.type=Object; return v; }

    std::string dump() const {
        std::ostringstream os;
        switch(type) {
            case Null:   os << "null"; break;
            case Bool:   os << (bval ? "true" : "false"); break;
            case Int:    os << ival; break;
            case Double: os << dval; break;
            case String: {
                os << '"';
                for(char c : sval) {
                    if(c=='"') os << "\\\"";
                    else if(c=='\\') os << "\\\\";
                    else os << c;
                }
                os << '"';
                break;
            }
            case Array: {
                os << '[';
                for(int i=0;i<(int)arr.size();++i){
                    if(i) os << ',';
                    os << arr[i].dump();
                }
                os << ']';
                break;
            }
            case Object: {
                os << '{';
                bool first=true;
                for(auto&[k,v]:obj){
                    if(!first) os << ',';
                    os << '"' << k << '"' << ':' << v.dump();
                    first=false;
                }
                os << '}';
                break;
            }
        }
        return os.str();
    }
};
#endif  // USE_SIMPLE_JSON

//  Graph builder from payload

#ifdef HAS_NLOHMANN

Graph buildGraph(const json& payload) {
    Graph g;
    if (payload.contains("nodes")) {
        for (auto& n : payload["nodes"]) {
            std::string id    = n.value("id", "");
            std::string label = n.value("label", "");
            g.addNode(id, label);
        }
    }
    if (payload.contains("edges")) {
        for (auto& e : payload["edges"]) {
            std::string src = e.value("src", "");
            std::string dst = e.value("dst", "");
            double      w   = e.value("weight", 0.5);
            if (!src.empty() && !dst.empty())
                g.addEdge(src, dst, std::max(0.001, std::min(1.0, w)));
        }
    }
    return g;
}

//  Serialise results to JSON

json pathToJson(const PathResult& pr, const Graph& g) {
    json j;
    j["found"] = pr.found;
    j["score"] = pr.score;
    json path = json::array();
    for (int idx : pr.nodeIndices)
        path.push_back(g.idOf(idx));
    j["path"] = path;
    return j;
}

json mstEdgesToJson(const std::vector<MSTEdge>& edges, const Graph& g) {
    json arr = json::array();
    for (auto& e : edges) {
        json obj;
        obj["src"]    = g.idOf(e.src);
        obj["dst"]    = g.idOf(e.dst);
        obj["weight"] = e.weight;
        arr.push_back(obj);
    }
    return arr;
}

json pageRankToJson(const PageRankResult& pr, const Graph& g) {
    json arr = json::array();
    int n = g.nodeCount();
    for (int i = 0; i < n; ++i) {
        json obj;
        obj["id"]    = g.idOf(i);
        obj["score"] = pr.scores[i];
        arr.push_back(obj);
    }
    // Sort descending by score for convenience
    std::sort(arr.begin(), arr.end(), [](const json& a, const json& b){
        return a["score"].get<double>() > b["score"].get<double>();
    });
    return arr;
}

json commToJson(const CommunityResult& cr, const Graph& g) {
    json j;
    j["numCommunities"] = cr.numCommunities;
    json members = json::array();
    int n = g.nodeCount();
    for (int i = 0; i < n; ++i) {
        json obj;
        obj["id"]          = g.idOf(i);
        obj["communityId"] = cr.membership[i];
        members.push_back(obj);
    }
    j["members"] = members;
    json dens = json::array();
    for (double d : cr.densities) dens.push_back(d);
    j["densities"] = dens;
    return j;
}

json echoToJson(const std::vector<EchoChamberInfo>& info) {
    json arr = json::array();
    for (auto& ec : info) {
        json obj;
        obj["communityId"]     = ec.communityId;
        obj["internalDensity"] = ec.internalDensity;
        obj["externalRatio"]   = ec.externalRatio;
        obj["flagged"]         = ec.flagged;
        arr.push_back(obj);
    }
    return arr;
}

json stabilityToJson(const StabilityResult& sr, const Graph& g) {
    json j;
    j["globalScore"]      = sr.globalScore;
    j["clusteringCoeff"]  = sr.clusteringCoeff;
    j["density"]          = sr.density;
    json triads = json::array();
    for (auto& [a, b, c] : sr.conflictTriads) {
        json t;
        t["a"] = g.idOf(a);
        t["b"] = g.idOf(b);
        t["c"] = g.idOf(c);
        triads.push_back(t);
    }
    j["conflictTriads"] = triads;
    return j;
}

json simToJson(const SimulationResult& sr, const Graph& g) {
    json j;
    j["totalReached"] = sr.totalReached;
    j["spreadRatio"]  = sr.spreadRatio;
    json steps = json::array();
    for (auto& step : sr.steps) {
        json s;
        s["round"] = step.round;
        json infected = json::array();
        for (int idx : step.newlyInfected)
            infected.push_back(g.idOf(idx));
        s["newlyInfected"] = infected;
        steps.push_back(s);
    }
    j["steps"] = steps;
    return j;
}

json articulationToJson(const ArticulationResult& ar, const Graph& g) {
    json j;
    j["componentsAfterRemoval"] = ar.componentsAfterRemoval;
    json aps = json::array();
    for (int idx : ar.articulationPoints)
        aps.push_back(g.idOf(idx));
    j["articulationPoints"] = aps;
    return j;
}

json riskToJson(const std::vector<FriendshipRisk>& risks, const Graph& g) {
    json arr = json::array();
    for (auto& r : risks) {
        json obj;
        obj["nodeA"]     = g.idOf(r.nodeA);
        obj["nodeB"]     = g.idOf(r.nodeB);
        obj["riskScore"] = r.riskScore;
        obj["velocity"]  = r.velocity;
        arr.push_back(obj);
    }
    return arr;
}

//  Temporal weights parser

std::unordered_map<EdgeKey, std::vector<double>, PairHash>
parseTemporalWeights(const json& payload, const Graph& g) {
    std::unordered_map<EdgeKey, std::vector<double>, PairHash> tw;
    if (!payload.contains("temporal")) return tw;

    for (auto& [key, arr] : payload["temporal"].items()) {
        // key format: "srcId:dstId"
        auto pos = key.find(':');
        if (pos == std::string::npos) continue;
        std::string srcId = key.substr(0, pos);
        std::string dstId = key.substr(pos + 1);
        int si = g.indexOf(srcId);
        int di = g.indexOf(dstId);
        if (si < 0 || di < 0) continue;
        std::vector<double> series;
        for (auto& v : arr) series.push_back(v.get<double>());
        tw[{si, di}] = series;
    }
    return tw;
}

//  Main dispatcher

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: graph-engine '<json>' <command> [args...]" << std::endl;
        return 1;
    }

    std::string jsonStr = argv[1];
    std::string command = argv[2];

    json payload;
    try {
        payload = json::parse(jsonStr);
    } catch (const std::exception& ex) {
        std::cerr << "JSON parse error: " << ex.what() << std::endl;
        return 1;
    }

    Graph g = buildGraph(payload);
    json args = payload.value("args", json::object());

    try {
        json result;

        if (command == "trust-path") {
            std::string srcId = args.value("sourceId", "");
            std::string dstId = args.value("targetId", "");
            int si = g.indexOf(srcId), di = g.indexOf(dstId);
            result = pathToJson(findTrustPath(g, si, di), g);

        } else if (command == "recommend") {
            std::string srcId = args.value("sourceId", "");
            int topK = args.value("topK", 5);
            int si = g.indexOf(srcId);
            auto recs = recommendFriends(g, si, topK);
            result = json::array();
            for (auto& r : recs) result.push_back(pathToJson(r, g));

        } else if (command == "backbone") {
            result = mstEdgesToJson(computeMST(g), g);

        } else if (command == "pagerank") {
            double d = args.value("damping", 0.85);
            result = pageRankToJson(computePageRank(g, d), g);

        } else if (command == "communities") {
            result = commToJson(detectCommunities(g), g);

        } else if (command == "echo-chambers") {
            double thresh = args.value("threshold", 0.7);
            auto comm = detectCommunities(g);
            result = echoToJson(detectEchoChambers(g, comm, thresh));

        } else if (command == "stability") {
            result = stabilityToJson(computeStability(g), g);

        } else if (command == "conflicts") {
            auto triads = findConflictTriads(g);
            result = json::array();
            for (auto& [a, b, c] : triads) {
                json t;
                t["a"] = g.idOf(a); t["b"] = g.idOf(b); t["c"] = g.idOf(c);
                result.push_back(t);
            }

        } else if (command == "simulate-spread") {
            std::string seedId = args.value("seedId", "");
            int maxRounds = args.value("maxRounds", 20);
            int si = g.indexOf(seedId);
            result = simToJson(simulateViralSpread(g, si, maxRounds), g);

        } else if (command == "simulate-removal") {
            std::string removeId = args.value("removeId", "");
            int ri = g.indexOf(removeId);
            result = articulationToJson(simulateNodeRemoval(g, ri), g);

        } else if (command == "friendship-risk") {
            int window = args.value("windowSize", 3);
            auto tw = parseTemporalWeights(payload, g);
            result = riskToJson(predictFriendshipRisk(g, tw, window), g);

        } else if (command == "full-analytics") {
            // Run all algorithms and bundle results
            result["pagerank"]    = pageRankToJson(computePageRank(g), g);
            auto comm = detectCommunities(g);
            result["communities"] = commToJson(comm, g);
            result["echoChambers"]= echoToJson(detectEchoChambers(g, comm));
            result["stability"]   = stabilityToJson(computeStability(g), g);
            result["backbone"]    = mstEdgesToJson(computeMST(g), g);

        } else {
            std::cerr << "Unknown command: " << command << std::endl;
            return 1;
        }

        std::cout << result.dump() << std::endl;

    } catch (const std::exception& ex) {
        std::cerr << "Runtime error: " << ex.what() << std::endl;
        return 1;
    }

    return 0;
}

#else
//  Fallback main when nlohmann/json is not available.
//  Prints a helpful error so the developer knows what to do.
#include <iostream>
int main() {
    std::cerr << "Error: nlohmann/json not found.\n"
              << "Download json.hpp from https://github.com/nlohmann/json/releases\n"
              << "and place it in graph-engine/include/json.hpp\n"
              << "Then recompile without -DUSE_SIMPLE_JSON\n";
    return 1;
}
#endif
