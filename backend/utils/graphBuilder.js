const { runQuery } = require('../config/neo4j');

const buildGraphPayload = async (options = {}) => {
  const { userId, depth = 3, limit = 500 } = options;
  let nodesCypher, edgesCypher, params = {};

  if (userId) {
    nodesCypher = `
      MATCH (u:User)
      WHERE u.mongoId = $userId OR
            exists((shortestPath((:User {mongoId:$userId})-[*1..${depth}]-(u))))
      RETURN u.mongoId AS id, u.username AS label
      LIMIT ${limit}
    `;
    edgesCypher = `
      MATCH (a:User)-[r:KNOWS]->(b:User)
      WHERE a.mongoId = $userId OR b.mongoId = $userId
      RETURN a.mongoId AS src, b.mongoId AS dst, toFloat(r.weight) AS weight
      LIMIT ${limit * 2}
    `;
    params = { userId };
  } else {
    nodesCypher = `
      MATCH (u:User)
      RETURN u.mongoId AS id, u.username AS label
      LIMIT ${limit}
    `;
    edgesCypher = `
      MATCH (a:User)-[r:KNOWS]->(b:User)
      RETURN a.mongoId AS src, b.mongoId AS dst, toFloat(r.weight) AS weight
      LIMIT ${limit * 2}
    `;
  }

  const [nodeRecords, edgeRecords] = await Promise.all([
    runQuery(nodesCypher, params),
    runQuery(edgesCypher, params),
  ]);

  const nodes = nodeRecords.map(r => ({
    id:    r.get('id'),
    label: r.get('label') || '',
  }));

  const edges = edgeRecords.map(r => {
    const raw = r.get('weight');
    let weight = 0.5;
    if (raw !== null && raw !== undefined) {
      if (typeof raw.toNumber === 'function') weight = raw.toNumber();
      else if (typeof raw === 'number') weight = raw;
      else weight = parseFloat(raw) || 0.5;
    }
    return { src: r.get('src'), dst: r.get('dst'), weight };
  }).filter(e => e.weight > 0 && e.weight <= 1);

  return { nodes, edges };
};

const attachTemporalWeights = async (payload) => {
  const Activity = require('../models/Activity');
  const pipeline = [
    { $match: { type: { $in: ['message', 'like', 'comment'] } } },
    { $group: {
      _id: { from: '$fromUser', to: '$toUser', month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
      avgWeight: { $avg: '$weight' },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ];
  const records = await Activity.aggregate(pipeline);
  const temporal = {};
  for (const r of records) {
    const key = `${r._id.from}:${r._id.to}`;
    if (!temporal[key]) temporal[key] = [];
    temporal[key].push(r.avgWeight);
  }
  return { ...payload, temporal };
};

module.exports = { buildGraphPayload, attachTemporalWeights };
