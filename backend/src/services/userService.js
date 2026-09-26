const pool = require("../config/database");
const { writeAudit } = require("./auditService");

const BOOTSTRAP_ADMIN_EMAIL = (process.env.BOOTSTRAP_ADMIN_EMAIL || "")
  .toLowerCase()
  .trim();

async function upsertUser({ firebaseUid, email, fullName, phone = null }) {
  if (!email) {
    throw Object.assign(new Error("Email is required"), { status: 400 });
  }

  const existing = await findUserByFirebaseUid(firebaseUid);
  let role = existing?.role || "USER";

  if (
    !existing &&
    BOOTSTRAP_ADMIN_EMAIL &&
    email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
  ) {
    role = "ADMIN";
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO users (firebase_uid, full_name, email, phone, role, status)
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
      ON CONFLICT (firebase_uid) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, users.phone),
        updated_at = now()
      RETURNING *;
      `,
      [
        firebaseUid,
        fullName || email.split("@")[0],
        email,
        phone,
        role,
      ]
    );

    const user = result.rows[0];

    const account = await client.query(
      `SELECT account_id FROM accounts WHERE user_id = $1`,
      [user.user_id]
    );

    if (account.rows.length === 0) {
      const code = `USER-${user.user_id.toString().slice(0, 8).toUpperCase()}`;
      await client.query(
        `INSERT INTO accounts (account_type, user_id, account_code, balance, currency, status)
         VALUES ('USER', $1, $2, 0, 'INR', 'ACTIVE')`,
        [user.user_id, code]
      );
    }

    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function findUserByFirebaseUid(firebaseUid) {
  const result = await pool.query(
    `SELECT * FROM users WHERE firebase_uid = $1`,
    [firebaseUid]
  );
  return result.rows[0] || null;
}

async function findUserById(userId) {
  const result = await pool.query(`SELECT * FROM users WHERE user_id = $1`, [
    userId,
  ]);
  return result.rows[0] || null;
}

async function listUsers({ q, role, status, limit = 100 } = {}) {
  const params = [];
  const clauses = [];
  if (q) {
    params.push(`%${q}%`);
    clauses.push(
      `(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`
    );
  }
  if (role) {
    params.push(role);
    clauses.push(`role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  params.push(Math.min(Number(limit) || 100, 500));
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT user_id, firebase_uid, full_name, email, phone, role, status, created_at, updated_at
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

async function updateUserStatus(userId, status, actor) {
  const before = await findUserById(userId);
  if (!before) throw Object.assign(new Error("User not found"), { status: 404 });

  const result = await pool.query(
    `UPDATE users SET status = $1, updated_at = now() WHERE user_id = $2 RETURNING *`,
    [status, userId]
  );
  const after = result.rows[0];
  await writeAudit({
    actorUserId: actor.user_id,
    actorType: actor.role,
    action: "USER_STATUS_UPDATE",
    entityType: "users",
    entityId: userId,
    beforeData: { status: before.status },
    afterData: { status: after.status },
  });
  return after;
}

async function updateUserRole(userId, role, actor) {
  const before = await findUserById(userId);
  if (!before) throw Object.assign(new Error("User not found"), { status: 404 });

  const result = await pool.query(
    `UPDATE users SET role = $1, updated_at = now() WHERE user_id = $2 RETURNING *`,
    [role, userId]
  );
  const after = result.rows[0];
  await writeAudit({
    actorUserId: actor.user_id,
    actorType: actor.role,
    action: "USER_ROLE_UPDATE",
    entityType: "users",
    entityId: userId,
    beforeData: { role: before.role },
    afterData: { role: after.role },
  });
  return after;
}

module.exports = {
  upsertUser,
  findUserByFirebaseUid,
  findUserById,
  listUsers,
  updateUserStatus,
  updateUserRole,
};
