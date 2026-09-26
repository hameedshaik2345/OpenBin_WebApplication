require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { Pool } = require("pg");

async function main() {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = await p.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND state IN ('idle in transaction', 'active')
      AND usename = current_user
  `);
  console.log("terminated", r.rowCount);
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
