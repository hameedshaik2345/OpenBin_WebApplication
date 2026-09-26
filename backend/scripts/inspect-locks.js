require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { Pool } = require("pg");

async function main() {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const activity = await p.query(`
    SELECT pid, state, wait_event_type, wait_event, left(query, 120) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
    ORDER BY query_start NULLS LAST
  `);
  console.log("activity", JSON.stringify(activity.rows, null, 2));
  const locks = await p.query(`
    SELECT l.pid, l.locktype, l.mode, l.granted, c.relname
    FROM pg_locks l
    LEFT JOIN pg_class c ON c.oid = l.relation
    WHERE l.pid IN (SELECT pid FROM pg_stat_activity WHERE datname = current_database())
    ORDER BY l.pid
  `);
  console.log("locks", JSON.stringify(locks.rows, null, 2));
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
