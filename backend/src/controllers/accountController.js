const accountService = require("../services/accountService");

async function myAccount(req, res) {
  try {
    const account = await accountService.getUserAccount(req.dbUser.user_id);
    if (!account) return res.status(404).json({ error: "Account not found" });
    const ledger = await accountService.getLedger(account.account_id);
    return res.json({ account, ledger });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function listAccounts(req, res) {
  try {
    const accounts = await accountService.listAccounts();
    return res.json({ accounts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getLedger(req, res) {
  try {
    const ledger = await accountService.getLedger(req.params.accountId);
    return res.json({ ledger });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function withdraw(req, res) {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    const result = await accountService.withdraw(
      {
        amount,
        method: req.body.method,
        destinationReference: req.body.destination_reference,
      },
      req.dbUser
    );
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function donate(req, res) {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    const result = await accountService.donate({ amount }, req.dbUser);
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function listWithdrawals(req, res) {
  try {
    return res.json({ withdrawals: await accountService.listWithdrawals() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function listDonations(req, res) {
  try {
    return res.json({ donations: await accountService.listDonations() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function charity(req, res) {
  try {
    const account = await accountService.getCharityAccount();
    const ledger = await accountService.getLedger(account.account_id);
    return res.json({ account, ledger });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  myAccount,
  listAccounts,
  getLedger,
  withdraw,
  donate,
  listWithdrawals,
  listDonations,
  charity,
};
