const { runGraphEngine }                           = require('../utils/cppRunner');
const { buildGraphPayload, attachTemporalWeights } = require('../utils/graphBuilder');
const User                                         = require('../models/User');

// ── resolve username OR mongoId → mongoId ─────────────────────
// Accepts either a plain username ("arjun") or a full mongoId.
// Returns the mongoId string, or throws if not found.
const resolveToMongoId = async (input) => {
  if (!input) throw new Error('User identifier required');
  // If it looks like a 24-char hex ObjectId, use it directly
  if (/^[a-f\d]{24}$/i.test(input.trim())) return input.trim();
  // Otherwise treat as username
  const user = await User.findOne({ username: input.trim().toLowerCase() }).select('_id');
  if (!user) throw new Error(`User "${input}" not found`);
  return user._id.toString();
};

// ── core helper ───────────────────────────────────────────────
// Runs C++ command and returns { result (original shape), nameMap }
// IMPORTANT: keeps result in its original shape (array or object)
const withGraph = async (command, extraArgs = {}, options = {}) => {
  const payload = await buildGraphPayload(options);
  payload.args  = extraArgs;
  const result  = await runGraphEngine(payload, command);
  // Build mongoId → username lookup from the nodes we fetched
  const nameMap = {};
  (payload.nodes || []).forEach(n => { if (n.id && n.label) nameMap[n.id] = n.label; });
  return { result, nameMap };
};

// ── F6: PageRank ──────────────────────────────────────────────
exports.getPageRank = async (req, res) => {
  try {
    const { result, nameMap } = await withGraph('pagerank', { damping: 0.85 });
    // C++ returns an array of { id, score }
    const arr = Array.isArray(result) ? result : [];
    res.json(arr.map(r => ({
      id:       r.id,
      score:    r.score,
      username: nameMap[r.id] || r.id,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F7: Backbone (MST) ────────────────────────────────────────
exports.getBackbone = async (req, res) => {
  try {
    const { result, nameMap } = await withGraph('backbone');
    // C++ returns an array of { src, dst, weight }
    const arr = Array.isArray(result) ? result : [];
    res.json(arr.map(e => ({
      src:     e.src,
      dst:     e.dst,
      weight:  e.weight,
      srcName: nameMap[e.src] || e.src,
      dstName: nameMap[e.dst] || e.dst,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F13: Trust Path ───────────────────────────────────────────
exports.getTrustPath = async (req, res) => {
  try {
    const { sourceId: rawSrc, targetId: rawDst } = req.query;
    if (!rawSrc || !rawDst) return res.status(400).json({ error: 'sourceId and targetId required' });

    // Resolve username → mongoId so users can type either
    const [sourceId, targetId] = await Promise.all([
      resolveToMongoId(rawSrc),
      resolveToMongoId(rawDst),
    ]);

    const { result, nameMap } = await withGraph('trust-path', { sourceId, targetId });
    // result = { found, score, path: [mongoId, ...] }
    res.json({
      found:     result.found,
      score:     result.score,
      path:      result.path || [],
      pathNames: (result.path || []).map(id => nameMap[id] || id),
      nameMap,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F8: Recommendations ───────────────────────────────────────
exports.getRecommendations = async (req, res) => {
  try {
    const { sourceId: rawSrc, topK = 5 } = req.query;
    if (!rawSrc) return res.status(400).json({ error: 'sourceId required' });

    const sourceId = await resolveToMongoId(rawSrc);
    const { result, nameMap } = await withGraph('recommend', { sourceId, topK: parseInt(topK) });
    // result = array of { found, score, path: [mongoId,...] }
    const arr = Array.isArray(result) ? result : [];
    res.json(arr.map(rec => ({
      score:      rec.score,
      found:      rec.found,
      path:       rec.path || [],
      pathNames:  (rec.path || []).map(id => nameMap[id] || id),
      targetName: nameMap[rec.path?.[rec.path.length - 1]] || rec.path?.[rec.path.length - 1] || '',
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F3: Communities ───────────────────────────────────────────
exports.getCommunities = async (req, res) => {
  try {
    const { result, nameMap } = await withGraph('communities');
    // result = { numCommunities, members: [{id, communityId}], densities }
    const members = (result.members || []).map(m => ({
      id:          m.id,
      communityId: m.communityId,
      username:    nameMap[m.id] || m.id,
    }));
    res.json({ ...result, members, nameMap });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F12: Echo Chambers ────────────────────────────────────────
exports.getEchoChambers = async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.7;
    const { result } = await withGraph('echo-chambers', { threshold });
    res.json(Array.isArray(result) ? result : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F1: Stability ─────────────────────────────────────────────
exports.getStability = async (req, res) => {
  try {
    const { result, nameMap } = await withGraph('stability');
    // result = { globalScore, clusteringCoeff, density, conflictTriads: [{a,b,c}] }
    const triads = (result.conflictTriads || []).map(t => ({
      a: t.a, b: t.b, c: t.c,
      aName: nameMap[t.a] || t.a,
      bName: nameMap[t.b] || t.b,
      cName: nameMap[t.c] || t.c,
    }));
    res.json({ ...result, conflictTriads: triads, nameMap });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F9: Conflict Triads ───────────────────────────────────────
exports.getConflicts = async (req, res) => {
  try {
    const { result, nameMap } = await withGraph('conflicts');
    const arr = Array.isArray(result) ? result : [];
    res.json(arr.map(t => ({
      a: t.a, b: t.b, c: t.c,
      aName: nameMap[t.a] || t.a,
      bName: nameMap[t.b] || t.b,
      cName: nameMap[t.c] || t.c,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F5: Viral Spread ──────────────────────────────────────────
exports.simulateSpread = async (req, res) => {
  try {
    const { seedId: rawSeed, maxRounds = 20 } = req.query;
    if (!rawSeed) return res.status(400).json({ error: 'seedId required' });

    const seedId = await resolveToMongoId(rawSeed);
    const { result, nameMap } = await withGraph('simulate-spread', {
      seedId, maxRounds: parseInt(maxRounds),
    });
    const steps = (result.steps || []).map(s => ({
      round:               s.round,
      newlyInfected:       s.newlyInfected || [],
      newlyInfectedNames:  (s.newlyInfected || []).map(id => nameMap[id] || id),
    }));
    res.json({ ...result, steps, nameMap });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F10: Node Removal ─────────────────────────────────────────
exports.simulateRemoval = async (req, res) => {
  try {
    const { removeId: rawRemove } = req.query;
    if (!rawRemove) return res.status(400).json({ error: 'removeId required' });

    const removeId = await resolveToMongoId(rawRemove);
    const { result, nameMap } = await withGraph('simulate-removal', { removeId });
    res.json({
      ...result,
      articulationPointNames: (result.articulationPoints || []).map(id => nameMap[id] || id),
      nameMap,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── F2: Friendship Risk ───────────────────────────────────────
exports.getFriendshipRisk = async (req, res) => {
  try {
    let payload  = await buildGraphPayload();
    payload      = await attachTemporalWeights(payload);
    payload.args = { windowSize: 3 };
    const result = await runGraphEngine(payload, 'friendship-risk');
    const nameMap = {};
    (payload.nodes || []).forEach(n => { if (n.id && n.label) nameMap[n.id] = n.label; });
    const arr = Array.isArray(result) ? result : [];
    res.json(arr.map(r => ({
      ...r,
      nodeAName: nameMap[r.nodeA] || r.nodeA,
      nodeBName: nameMap[r.nodeB] || r.nodeB,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Full Analytics ────────────────────────────────────────────
exports.getFullAnalytics = async (req, res) => {
  try {
    const payload = await buildGraphPayload();
    payload.args  = {};
    const result  = await runGraphEngine(payload, 'full-analytics');
    const nameMap = {};
    (payload.nodes || []).forEach(n => { if (n.id && n.label) nameMap[n.id] = n.label; });

    // Enrich each sub-result
    if (Array.isArray(result.pagerank))
      result.pagerank = result.pagerank.map(r => ({ ...r, username: nameMap[r.id] || r.id }));

    if (result.communities?.members)
      result.communities.members = result.communities.members.map(m => ({
        ...m, username: nameMap[m.id] || m.id,
      }));

    if (result.stability?.conflictTriads)
      result.stability.conflictTriads = result.stability.conflictTriads.map(t => ({
        ...t,
        aName: nameMap[t.a] || t.a,
        bName: nameMap[t.b] || t.b,
        cName: nameMap[t.c] || t.c,
      }));

    if (Array.isArray(result.backbone))
      result.backbone = result.backbone.map(e => ({
        ...e,
        srcName: nameMap[e.src] || e.src,
        dstName: nameMap[e.dst] || e.dst,
      }));

    if (Array.isArray(result.echoChambers))
      result.echoChambers = result.echoChambers;

    res.json({ ...result, nameMap });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Graph Summary ─────────────────────────────────────────────
exports.getGraphSummary = async (req, res) => {
  try {
    const { runQuery } = require('../config/neo4j');
    const [nRes, eRes] = await Promise.all([
      runQuery('MATCH (u:User) RETURN count(u) AS cnt'),
      runQuery('MATCH ()-[r:KNOWS]->() RETURN count(r) AS cnt'),
    ]);
    res.json({
      nodeCount: nRes[0]?.get('cnt')?.toNumber?.() ?? 0,
      edgeCount: eRes[0]?.get('cnt')?.toNumber?.() ?? 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
