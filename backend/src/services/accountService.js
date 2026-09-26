const pool = require("../config/database");
const { writeAudit } = require("./auditService");

async function getUserAccount(userId) {
  const result = await pool.query(
    `SELECT * FROM accounts WHERE user_id = $1 AND account_type = 'USER'`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getCharityAccount() {
  const result = await pool.query(
    `SELECT * FROM accounts WHERE account_code = 'CHARITY-001'`
  );
  return result.rows[0] || null;
}

async function listAccounts() {
  const result = await pool.query(
    `SELECT a.*, u.full_name, u.email
     FROM accounts a
     LEFT JOIN users u ON u.user_id = a.user_id
     ORDER BY a.account_type, a.account_code`
  );
  return result.rows;
}

async function getLedger(accountId, limit = 100) {
  const result = await pool.query(
    `SELECT * FROM account_transactions
     WHERE account_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [accountId, Math.min(Number(limit) || 100, 500)]
  );
  return result.rows;
}

async function withdraw({ amount, method, destinationReference }, dbUser) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const accountResult = await client.query(
      `SELECT * FROM accounts WHERE user_id = $1 AND account_type = 'USER' FOR UPDATE`,
      [dbUser.user_id]
    );
    const account = accountResult.rows[0];
    if (!account) {
      throw Object.assign(new Error("Account not found"), { status: 404 });
    }
    if (Number(account.balance) < Number(amount)) {
      throw Object.assign(new Error("Insufficient balance"), { status: 400 });
    }

    const withdrawal = await client.query(
      `INSERT INTO withdrawals (account_id, amount, method, destination_reference, status)
       VALUES ($1,$2,$3,$4,'COMPLETED') RETURNING *`,
      [account.account_id, amount, method || "MANUAL", destinationReference || null]
    );

    const ledger = await client.query(
      `INSERT INTO account_transactions
        (account_id, source_type, source_id, direction, amount, description)
       VALUES ($1, 'WITHDRAWAL', $2, 'DEBIT', $3, $4) RETURNING *`,
      [
        account.account_id,
        withdrawal.rows[0].withdrawal_id,
        amount,
        `Withdrawal via ${method || "MANUAL"}`,
      ]
    );

    await client.query(
      `UPDATE withdrawals SET account_transaction_id = $1, processed_at = now()
       WHERE withdrawal_id = $2`,
      [ledger.rows[0].account_transaction_id, withdrawal.rows[0].withdrawal_id]
    );

    const updated = await client.query(
      `UPDATE accounts SET balance = balance - $1, updated_at = now()
       WHERE account_id = $2 RETURNING *`,
      [amount, account.account_id]
    );

    await writeAudit({
      actorUserId: dbUser.user_id,
      actorType: dbUser.role,
      action: "WITHDRAWAL",
      entityType: "withdrawals",
      entityId: withdrawal.rows[0].withdrawal_id,
      afterData: { amount },
      client,
    });

    await client.query("COMMIT");
    return {
      withdrawal: withdrawal.rows[0],
      account: updated.rows[0],
      ledgerEntry: ledger.rows[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function donate({ amount }, dbUser) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const accountResult = await client.query(
      `SELECT * FROM accounts WHERE user_id = $1 AND account_type = 'USER' FOR UPDATE`,
      [dbUser.user_id]
    );
    const account = accountResult.rows[0];
    if (!account) {
      throw Object.assign(new Error("Account not found"), { status: 404 });
    }
    if (Number(account.balance) < Number(amount)) {
      throw Object.assign(new Error("Insufficient balance"), { status: 400 });
    }

    const charityResult = await client.query(
      `SELECT * FROM accounts WHERE account_code = 'CHARITY-001' FOR UPDATE`
    );
    const charity = charityResult.rows[0];

    const donation = await client.query(
      `INSERT INTO donations (donor_account_id, charity_account_id, amount, status)
       VALUES ($1,$2,$3,'COMPLETED') RETURNING *`,
      [account.account_id, charity.account_id, amount]
    );

    const debit = await client.query(
      `INSERT INTO account_transactions
        (account_id, source_type, source_id, direction, amount, description)
       VALUES ($1, 'USER_DONATION', $2, 'DEBIT', $3, 'Donation to CHARITY-001')
       RETURNING *`,
      [account.account_id, donation.rows[0].donation_id, amount]
    );

    await client.query(
      `INSERT INTO account_transactions
        (account_id, source_type, source_id, direction, amount, description)
       VALUES ($1, 'USER_DONATION', $2, 'CREDIT', $3, 'User donation')`,
      [charity.account_id, donation.rows[0].donation_id, amount]
    );

    await client.query(
      `UPDATE donations SET account_transaction_id = $1 WHERE donation_id = $2`,
      [debit.rows[0].account_transaction_id, donation.rows[0].donation_id]
    );

    const updatedUser = await client.query(
      `UPDATE accounts SET balance = balance - $1, updated_at = now()
       WHERE account_id = $2 RETURNING *`,
      [amount, account.account_id]
    );
    await client.query(
      `UPDATE accounts SET balance = balance + $1, updated_at = now()
       WHERE account_id = $2`,
      [amount, charity.account_id]
    );

    await writeAudit({
      actorUserId: dbUser.user_id,
      actorType: dbUser.role,
      action: "DONATION",
      entityType: "donations",
      entityId: donation.rows[0].donation_id,
      afterData: { amount },
      client,
    });

    await client.query("COMMIT");
    return {
      donation: donation.rows[0],
      account: updatedUser.rows[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listWithdrawals() {
  const result = await pool.query(
    `SELECT w.*, a.account_code, u.full_name, u.email
     FROM withdrawals w
     JOIN accounts a ON a.account_id = w.account_id
     LEFT JOIN users u ON u.user_id = a.user_id
     ORDER BY w.requested_at DESC`
  );
  return result.rows;
}

async function listDonations() {
  const result = await pool.query(
    `SELECT d.*, da.account_code AS donor_code, u.full_name, u.email
     FROM donations d
     JOIN accounts da ON da.account_id = d.donor_account_id
     LEFT JOIN users u ON u.user_id = da.user_id
     ORDER BY d.created_at DESC`
  );
  return result.rows;
}

module.exports = {
  getUserAccount,
  getCharityAccount,
  listAccounts,
  getLedger,
  withdraw,
  donate,
  listWithdrawals,
  listDonations,
};
