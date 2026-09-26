const transactionService = require("../services/transactionService");

async function list(req, res) {
  try {
    const role = req.dbUser.role;
    if (role === "ADMIN" || role === "EPR") {
      const transactions = await transactionService.listTransactions({
        userId: req.query.user_id,
        rvmId: req.query.rvm_id,
        limit: req.query.limit,
      });
      return res.json({ transactions });
    }

    const transactions = await transactionService.listTransactions({
      userId: req.dbUser.user_id,
      limit: req.query.limit,
    });
    return res.json({ transactions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const tx = await transactionService.getTransaction(req.params.transactionId);
    if (!tx) return res.status(404).json({ error: "Not found" });
    if (
      req.dbUser.role === "USER" &&
      tx.user_id &&
      tx.user_id !== req.dbUser.user_id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json({ transaction: tx });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function claim(req, res) {
  try {
    const result = await transactionService.claimTransaction(
      {
        transactionId: req.body.transaction_id,
        claimToken: req.body.claim_token,
      },
      req.dbUser
    );
    return res.json(result);
  } catch (err) {
    console.error("claim error:", err);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { list, getOne, claim };
