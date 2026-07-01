const neo4j = require('neo4j-driver');

let driver;

const connectNeo4j = async () => {
  try {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
      { maxConnectionPoolSize: 50 }
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected');
  } catch (err) {
    console.error('❌ Neo4j connection failed:', err.message);
    // Non-fatal — analytics will return empty until Neo4j is available
  }
};

const getDriver = () => {
  if (!driver) throw new Error('Neo4j driver not initialized');
  return driver;
};

const getSession = () => getDriver().session();

// Helper: run a Cypher query and return records
const runQuery = async (cypher, params = {}) => {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
};

module.exports = { connectNeo4j, getDriver, getSession, runQuery };
