require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose          = require('mongoose');
const { connectNeo4j, runQuery } = require('../config/neo4j');
const User              = require('../models/User');
const Activity          = require('../models/Activity');
const data              = require('./sampleSeedData');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await connectNeo4j();
    console.log('✅ Connected to MongoDB and Neo4j\n');

    // 1. Create / find users in MongoDB
    console.log('── Creating users in MongoDB…');
    const created = [];
    for (const u of data.users) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          username:    u.username,
          email:       u.email,
          password:    u.password,
          displayName: u.displayName,
        });
        console.log(`  created  ${u.displayName} (${u.community})`);
      } else {
        console.log(`  exists   ${u.displayName}`);
      }
      created.push(user);
    }

    // 2. Mirror as Neo4j nodes — store BOTH mongoId and username
    console.log('\n── Creating Neo4j user nodes…');
    for (let i = 0; i < created.length; i++) {
      const user = created[i];
      await runQuery(
        `MERGE (u:User {mongoId:$id})
         SET u.username  = $username,
             u.community = $community,
             u.displayName = $displayName`,
        {
          id:          user._id.toString(),
          username:    user.username,
          community:   data.users[i].community,
          displayName: data.users[i].displayName,
        }
      );
    }
    console.log(`  ${created.length} nodes synced`);

    // 3. Create edges in Neo4j — deduplicate
    console.log('\n── Creating Neo4j relationships…');
    const edgeMap = new Map();
    for (const [a, b, w] of data.relationships) {
      edgeMap.set(`${Math.min(a,b)}:${Math.max(a,b)}`, [a, b, w]);
    }
    let edgeCount = 0;
    for (const [, [a, b, w]] of edgeMap) {
      const idA = created[a]._id.toString();
      const idB = created[b]._id.toString();
      await runQuery(
        `MATCH (x:User {mongoId:$idA}),(y:User {mongoId:$idB})
         MERGE (x)-[r1:KNOWS]->(y) SET r1.weight=$w
         MERGE (y)-[r2:KNOWS]->(x) SET r2.weight=$w`,
        { idA, idB, w }
      );
      edgeCount++;
    }
    console.log(`  ${edgeCount} unique edges (${edgeCount*2} directed)`);

    // 4. Write Activity records for F2 temporal weights
    console.log('\n── Writing Activity records…');
    const MONTH = 30 * 24 * 60 * 60 * 1000;
    const now   = Date.now();
    let actCount = 0;

    for (const [edgeKey, weights] of Object.entries(data.temporalWeights)) {
      const [aStr, bStr] = edgeKey.split(':');
      const a = parseInt(aStr), b = parseInt(bStr);
      if (a >= created.length || b >= created.length) continue;

      for (let mo = 0; mo < weights.length; mo++) {
        const w    = weights[mo];
        const ts   = new Date(now - (weights.length - 1 - mo) * MONTH);
        const type = w >= 0.75 ? 'message' : w >= 0.50 ? 'comment' : 'like';
        const num  = Math.max(3, Math.round(w * 5));

        for (let k = 0; k < num; k++) {
          const jitter = Math.random() * MONTH * 0.8;
          await Activity.create({
            fromUser: created[a]._id, toUser: created[b]._id,
            type, weight: w,
            createdAt: new Date(ts.getTime() + jitter),
          });
          await Activity.create({
            fromUser: created[b]._id, toUser: created[a]._id,
            type, weight: w,
            createdAt: new Date(ts.getTime() + jitter + 3600000),
          });
          actCount += 2;
        }
      }
    }
    console.log(`  ${actCount} Activity records written`);

    // 5. Verification
    console.log('\n── Verification…');
    const [nR, eR] = await Promise.all([
      runQuery('MATCH (u:User) RETURN count(u) AS cnt'),
      runQuery('MATCH ()-[r:KNOWS]->() RETURN count(r) AS cnt'),
    ]);
    console.log(`  MongoDB  users:      ${await User.countDocuments()}`);
    console.log(`  MongoDB  activities: ${await Activity.countDocuments()}`);
    console.log(`  Neo4j    nodes:      ${nR[0]?.get('cnt')?.toNumber?.()}`);
    console.log(`  Neo4j    edges:      ${eR[0]?.get('cnt')?.toNumber?.()}`);

    // Verify a sample edge weight
    const sample = await runQuery(
      `MATCH (a:User {username:'arjun'})-[r:KNOWS]->(b:User {username:'priya'})
       RETURN r.weight AS w`
    );
    if (sample.length > 0) {
      const w = sample[0].get('w');
      console.log(`  Sample edge arjun→priya weight: ${typeof w?.toNumber === 'function' ? w.toNumber() : w}`);
    } else {
      console.warn('  ⚠ Could not verify arjun→priya edge — check if seed ran correctly');
    }

    console.log('\n✅ Seed complete!');
    console.log('\nLogin credentials:');
    console.log('  arjun@demo.com    / demo1234');
    console.log('  ananya@demo.com   / demo1234');
    console.log('\nFeature test usernames:');
    console.log('  Trust Path:   source=arjun  target=zara');
    console.log('  Spread:       seedId=ananya  (bridge node, high reach)');
    console.log('  Node Removal: removeId=arjun (bridge node, fragments network)');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
