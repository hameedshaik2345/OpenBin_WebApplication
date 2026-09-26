const crypto = require("crypto");
const pool = require("../config/database");
const catalogService = require("./catalogService");
const rvmService = require("./rvmService");
const rtdbService = require("./rtdbService");
const { writeAudit } = require("./auditService");

const CLAIM_TTL_MS = Number(process.env.CLAIM_TTL_MS || 15 * 60 * 1000);

function hashClaimToken(token) {
  // Architecture preserves hashed storage. Optional pepper via QR_TOKEN_SECRET later.
  const pepper = process.env.QR_TOKEN_SECRET || "";
  return crypto.createHash("sha256").update(`${pepper}${token}`).digest("hex");
}

function generateClaimToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function calculateReward(weightG, pricePerKg) {
  const kg = Number(weightG) / 1000;
  const reward = kg * Number(pricePerKg);
  return Math.round(reward * 100) / 100;
}

async function createRvmTransaction(payload, actorMeta = {}) {
  const {
    rvm_id,
    device_event_id,
    object_type,
    material,
    brand,
    product,
    weight_g,
    dimensions = {},
    ml_confidence,
    accept = true,
  } = payload;

  if (!rvm_id || !device_event_id || !material || weight_g == null) {
    throw Object.assign(
      new Error("rvm_id, device_event_id, material, and weight_g are required"),
      { status: 400 }
    );
  }

  const rvm = await rvmService.findById(rvm_id);
  if (!rvm) {
    throw Object.assign(new Error("RVM not found"), { status: 404 });
  }
  if (rvm.status !== "ACTIVE") {
    throw Object.assign(new Error("RVM is not active"), { status: 400 });
  }

  const existing = await pool.query(
    `SELECT * FROM transactions WHERE device_event_id = $1`,
    [device_event_id]
  );
  if (existing.rows.length) {
    return { transaction: existing.rows[0], idempotent: true };
  }

  const materialRow = await catalogService.findMaterialByCode(material);
  if (!materialRow) {
    throw Object.assign(new Error(`Unknown material: ${material}`), {
      status: 400,
    });
  }

  const brandRow = brand
    ? await catalogService.findBrandByName(brand)
    : null;
  const productRow = product
    ? await catalogService.findProductByName(product)
    : null;

  const price = await catalogService.getCurrentPrice(materialRow.material_id);
  if (!price && accept) {
    throw Object.assign(
      new Error(`No active price configured for material ${material}`),
      { status: 400 }
    );
  }

  const rewardValue = accept
    ? calculateReward(weight_g, price.price_per_kg)
    : 0;
  const expiresAt = new Date(Date.now() + CLAIM_TTL_MS);
  const claimToken = accept ? generateClaimToken() : null;
  const claimHash = claimToken ? hashClaimToken(claimToken) : null;

  const client = await pool.connect();
  let released = false;
  try {
    await client.query("BEGIN");

    const txResult = await client.query(
      `INSERT INTO transactions (
        device_event_id, rvm_id, product_id, material_id, brand_id,
        object_type, estimated_weight_g, length_cm, width_cm, height_cm,
        ml_confidence, reward_value, reward_unit,
        transaction_status, claim_status, expires_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'POINTS',$13,$14,$15
      ) RETURNING *`,
      [
        device_event_id,
        rvm.rvm_id,
        productRow?.product_id || null,
        materialRow.material_id,
        brandRow?.brand_id || null,
        object_type || null,
        weight_g,
        dimensions.length ?? null,
        dimensions.width ?? null,
        dimensions.height ?? null,
        ml_confidence ?? null,
        rewardValue,
        accept ? "ACCEPTED" : "REJECTED",
        accept ? "UNCLAIMED" : "NOT_APPLICABLE",
        accept ? expiresAt : null,
      ]
    );

    const transaction = txResult.rows[0];

    if (accept) {
      await client.query(
        `INSERT INTO transaction_claims
          (transaction_id, qr_token_hash, status, expires_at)
         VALUES ($1,$2,'PENDING',$3)`,
        [transaction.transaction_id, claimHash, expiresAt]
      );

      const weightKg = Number(weight_g) / 1000;
      await rvmService.addCapacity(rvm.rvm_id, weightKg, client);
    }

    // last_seen_at already updated by addCapacity; do not touch via another
    // connection while this transaction still holds the rvms row lock.

    await writeAudit({
      actorUserId: actorMeta.user_id || null,
      actorType: actorMeta.actorType || "RVM",
      action: accept ? "RVM_TRANSACTION_ACCEPTED" : "RVM_TRANSACTION_REJECTED",
      entityType: "transactions",
      entityId: transaction.transaction_id,
      afterData: {
        device_event_id,
        reward_value: rewardValue,
        material: materialRow.material_code,
      },
      client,
    });

    await client.query("COMMIT");
    client.release();
    released = true;

    const updatedRvm = await rvmService.findById(rvm.rvm_id);

    // Live state is best-effort; PostgreSQL remains authoritative
    Promise.resolve()
      .then(async () => {
        await rtdbService.setRvmStatus(rvm.rvm_code, {
          status: "ONLINE",
          current_state: accept ? "WAITING_FOR_SCAN" : "IDLE",
          current_transaction_id: accept ? transaction.transaction_id : null,
          firmware_version: rvm.is_simulated ? "SIMULATOR-1.0" : "1.0.0",
          capacity: {
            total: Number(updatedRvm.total_capacity),
            current: Number(updatedRvm.current_capacity),
            unit: updatedRvm.capacity_unit,
          },
        });
        if (accept) {
          await rtdbService.setProcessingStatus(rvm.rvm_code, {
            state: "WAITING_FOR_SCAN",
            transaction_id: transaction.transaction_id,
            progress: 1,
          });
        } else {
          await rtdbService.clearProcessingStatus(rvm.rvm_code);
        }
      })
      .catch((err) => console.warn("[RTDB] post-commit update:", err.message));

    const qrPayload = accept
      ? {
          rvm: {
            rvm_id: rvm.rvm_id,
            rvm_code: rvm.rvm_code,
            location: rvm.location_name,
          },
          item: {
            type: object_type || null,
            material: materialRow.material_code,
            brand: brand || null,
            product: product || null,
            weight_g: Number(weight_g),
            dimensions: {
              length: dimensions.length ?? null,
              width: dimensions.width ?? null,
              height: dimensions.height ?? null,
            },
          },
          transaction: {
            transaction_id: transaction.transaction_id,
            device_event_id: transaction.device_event_id,
            reward_value: Number(transaction.reward_value),
            currency: "INR",
            claim_token: claimToken,
            expires_at: expiresAt.toISOString(),
          },
        }
      : null;

    return {
      transaction,
      qrPayload,
      rvm: updatedRvm,
      idempotent: false,
    };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    throw err;
  } finally {
    if (!released) client.release();
  }
}

async function claimTransaction({ transactionId, claimToken }, dbUser) {
  if (!transactionId || !claimToken) {
    throw Object.assign(
      new Error("transaction_id and claim_token are required"),
      { status: 400 }
    );
  }

  const tokenHash = hashClaimToken(claimToken);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const txResult = await client.query(
      `SELECT * FROM transactions WHERE transaction_id = $1 FOR UPDATE`,
      [transactionId]
    );
    const tx = txResult.rows[0];
    if (!tx) {
      throw Object.assign(new Error("Transaction not found"), { status: 404 });
    }

    if (tx.transaction_status !== "ACCEPTED") {
      throw Object.assign(new Error("Transaction is not claimable"), {
        status: 400,
      });
    }
    if (tx.claim_status === "CLAIMED") {
      throw Object.assign(new Error("Transaction already claimed"), {
        status: 409,
      });
    }
    if (tx.claim_status === "EXPIRED") {
      throw Object.assign(new Error("Claim has expired"), { status: 410 });
    }
    if (tx.expires_at && new Date(tx.expires_at) < new Date()) {
      throw Object.assign(new Error("Claim has expired"), { status: 410 });
    }

    const claimResult = await client.query(
      `SELECT * FROM transaction_claims WHERE transaction_id = $1 FOR UPDATE`,
      [transactionId]
    );
    const claim = claimResult.rows[0];
    if (!claim || claim.qr_token_hash !== tokenHash) {
      throw Object.assign(new Error("Invalid claim token"), { status: 403 });
    }

    const accountResult = await client.query(
      `SELECT * FROM accounts WHERE user_id = $1 AND account_type = 'USER' FOR UPDATE`,
      [dbUser.user_id]
    );
    let account = accountResult.rows[0];
    if (!account) {
      const code = `USER-${dbUser.user_id.toString().slice(0, 8).toUpperCase()}`;
      const created = await client.query(
        `INSERT INTO accounts (account_type, user_id, account_code)
         VALUES ('USER', $1, $2) RETURNING *`,
        [dbUser.user_id, code]
      );
      account = created.rows[0];
    }

    const updatedTx = await client.query(
      `UPDATE transactions SET
        user_id = $1,
        claim_status = 'CLAIMED',
        claimed_at = now()
       WHERE transaction_id = $2 AND claim_status = 'UNCLAIMED'
       RETURNING *`,
      [dbUser.user_id, transactionId]
    );

    if (!updatedTx.rows.length) {
      throw Object.assign(new Error("Transaction already claimed"), {
        status: 409,
      });
    }

    await client.query(
      `UPDATE transaction_claims SET
        user_id = $1, status = 'CLAIMED', claimed_at = now()
       WHERE claim_id = $2`,
      [dbUser.user_id, claim.claim_id]
    );

    const ledger = await client.query(
      `INSERT INTO account_transactions
        (account_id, source_type, source_id, direction, amount, description)
       VALUES ($1, 'RVM_REWARD', $2, 'CREDIT', $3, $4)
       RETURNING *`,
      [
        account.account_id,
        transactionId,
        tx.reward_value,
        "RVM reward claim",
      ]
    );

    const bal = await client.query(
      `UPDATE accounts SET balance = balance + $1, updated_at = now()
       WHERE account_id = $2 RETURNING *`,
      [tx.reward_value, account.account_id]
    );

    await writeAudit({
      actorUserId: dbUser.user_id,
      actorType: "USER",
      action: "TRANSACTION_CLAIMED",
      entityType: "transactions",
      entityId: transactionId,
      afterData: { reward_value: tx.reward_value, user_id: dbUser.user_id },
      client,
    });

    await client.query("COMMIT");

    const rvm = await rvmService.findById(tx.rvm_id);
    Promise.resolve()
      .then(async () => {
        await rtdbService.setRvmStatus(rvm.rvm_code, {
          status: "ONLINE",
          current_state: "IDLE",
          current_transaction_id: null,
          firmware_version: rvm.is_simulated ? "SIMULATOR-1.0" : "1.0.0",
          capacity: {
            total: Number(rvm.total_capacity),
            current: Number(rvm.current_capacity),
            unit: rvm.capacity_unit,
          },
        });
        await rtdbService.clearProcessingStatus(rvm.rvm_code);
      })
      .catch((err) => console.warn("[RTDB] post-claim update:", err.message));

    return {
      transaction: updatedTx.rows[0],
      account: bal.rows[0],
      ledgerEntry: ledger.rows[0],
      user: {
        user_id: dbUser.user_id,
        firebase_uid: dbUser.firebase_uid,
        name: dbUser.full_name,
        email: dbUser.email,
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listTransactions({ userId, rvmId, limit = 100 } = {}) {
  const params = [];
  const clauses = [];
  if (userId) {
    params.push(userId);
    clauses.push(`t.user_id = $${params.length}`);
  }
  if (rvmId) {
    params.push(rvmId);
    clauses.push(`t.rvm_id = $${params.length}`);
  }
  params.push(Math.min(Number(limit) || 100, 500));
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT t.*,
      r.rvm_code, r.location_name,
      m.material_code, m.material_name,
      u.full_name AS user_name, u.email AS user_email
     FROM transactions t
     JOIN rvms r ON r.rvm_id = t.rvm_id
     JOIN materials m ON m.material_id = t.material_id
     LEFT JOIN users u ON u.user_id = t.user_id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

async function getTransaction(transactionId) {
  const result = await pool.query(
    `SELECT t.*,
      r.rvm_code, r.location_name,
      m.material_code, m.material_name,
      u.full_name AS user_name, u.email AS user_email
     FROM transactions t
     JOIN rvms r ON r.rvm_id = t.rvm_id
     JOIN materials m ON m.material_id = t.material_id
     LEFT JOIN users u ON u.user_id = t.user_id
     WHERE t.transaction_id = $1`,
    [transactionId]
  );
  return result.rows[0] || null;
}

async function expireUnclaimedTransactions() {
  const client = await pool.connect();
  let expiredCount = 0;
  try {
    const due = await client.query(
      `SELECT transaction_id FROM transactions
       WHERE transaction_status = 'ACCEPTED'
         AND claim_status = 'UNCLAIMED'
         AND expires_at IS NOT NULL
         AND expires_at < now()`
    );

    for (const row of due.rows) {
      await client.query("BEGIN");
      try {
        const locked = await client.query(
          `SELECT * FROM transactions WHERE transaction_id = $1 FOR UPDATE`,
          [row.transaction_id]
        );
        const tx = locked.rows[0];
        if (
          !tx ||
          tx.claim_status !== "UNCLAIMED" ||
          tx.transaction_status !== "ACCEPTED"
        ) {
          await client.query("ROLLBACK");
          continue;
        }

        const updated = await client.query(
          `UPDATE transactions SET claim_status = 'EXPIRED'
           WHERE transaction_id = $1 AND claim_status = 'UNCLAIMED'
           RETURNING *`,
          [tx.transaction_id]
        );
        if (!updated.rows.length) {
          await client.query("ROLLBACK");
          continue;
        }

        await client.query(
          `UPDATE transaction_claims SET status = 'EXPIRED'
           WHERE transaction_id = $1`,
          [tx.transaction_id]
        );

        const charity = await client.query(
          `SELECT * FROM accounts WHERE account_code = 'CHARITY-001' FOR UPDATE`
        );
        const charityAccount = charity.rows[0];

        const already = await client.query(
          `SELECT 1 FROM account_transactions
           WHERE account_id = $1 AND source_type = 'UNCLAIMED_REWARD' AND source_id = $2`,
          [charityAccount.account_id, tx.transaction_id]
        );

        if (!already.rows.length && Number(tx.reward_value) > 0) {
          await client.query(
            `INSERT INTO account_transactions
              (account_id, source_type, source_id, direction, amount, description)
             VALUES ($1, 'UNCLAIMED_REWARD', $2, 'CREDIT', $3, 'Unclaimed reward after QR expiry')`,
            [charityAccount.account_id, tx.transaction_id, tx.reward_value]
          );
          await client.query(
            `UPDATE accounts SET balance = balance + $1, updated_at = now()
             WHERE account_id = $2`,
            [tx.reward_value, charityAccount.account_id]
          );
        }

        await writeAudit({
          actorType: "SYSTEM",
          action: "TRANSACTION_EXPIRED_TO_CHARITY",
          entityType: "transactions",
          entityId: tx.transaction_id,
          afterData: { reward_value: tx.reward_value },
          client,
        });

        await client.query("COMMIT");
        expiredCount += 1;

        const rvm = await rvmService.findById(tx.rvm_id);
        if (rvm) {
          await rtdbService.setRvmStatus(rvm.rvm_code, {
            status: "ONLINE",
            current_state: "IDLE",
            current_transaction_id: null,
            firmware_version: rvm.is_simulated ? "SIMULATOR-1.0" : "1.0.0",
          });
          await rtdbService.clearProcessingStatus(rvm.rvm_code);
        }
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Expiry failed for", row.transaction_id, err.message);
      }
    }
  } finally {
    client.release();
  }
  return expiredCount;
}

module.exports = {
  createRvmTransaction,
  claimTransaction,
  listTransactions,
  getTransaction,
  expireUnclaimedTransactions,
  calculateReward,
  hashClaimToken,
};
