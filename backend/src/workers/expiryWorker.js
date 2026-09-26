const transactionService = require("../services/transactionService");

const INTERVAL_MS = Number(process.env.EXPIRY_WORKER_INTERVAL_MS || 60_000);

function startExpiryWorker() {
  async function tick() {
    try {
      const count = await transactionService.expireUnclaimedTransactions();
      if (count > 0) {
        console.log(`Expiry worker: transferred ${count} unclaimed reward(s) to CHARITY-001`);
      }
    } catch (err) {
      console.error("Expiry worker error:", err.message);
    }
  }

  tick();
  return setInterval(tick, INTERVAL_MS);
}

module.exports = { startExpiryWorker };
