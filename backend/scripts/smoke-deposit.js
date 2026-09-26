require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const pool = require("../src/config/database");

async function main() {
  console.log("1. connected");
  // Clear stuck sessions from prior aborted tests
  await pool.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND state = 'idle in transaction'
      AND query_start < now() - interval '30 seconds'
  `);
  console.log("2. cleared idle transactions");

  const transactionService = require("../src/services/transactionService");
  const rvm = (
    await pool.query(`SELECT * FROM rvms WHERE rvm_code = 'RVM-001'`)
  ).rows[0];
  console.log("3. rvm", rvm.rvm_id);

  const result = await transactionService.createRvmTransaction(
    {
      rvm_id: rvm.rvm_id,
      device_event_id: `smoke-${Date.now()}`,
      object_type: "Bottle",
      material: "PET",
      weight_g: 500,
      dimensions: { length: 8, width: 8, height: 22 },
      accept: true,
    },
    { actorType: "RVM" }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        transaction_id: result.transaction.transaction_id,
        reward: result.transaction.reward_value,
        claim_status: result.transaction.claim_status,
        hasQr: !!result.qrPayload,
      },
      null,
      2
    )
  );
  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("FAIL:", err);
  try {
    await pool.end();
  } catch (_) {}
  process.exit(1);
});
