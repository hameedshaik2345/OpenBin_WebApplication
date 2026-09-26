const pool = require("../config/database");

async function writeAudit({
  actorUserId = null,
  actorType,
  action,
  entityType,
  entityId = null,
  beforeData = null,
  afterData = null,
  requestId = null,
  ipAddress = null,
  client = pool,
}) {
  await client.query(
    `INSERT INTO audit_logs
      (actor_user_id, actor_type, action, entity_type, entity_id, before_data, after_data, request_id, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      actorUserId,
      actorType,
      action,
      entityType,
      entityId,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      requestId,
      ipAddress,
    ]
  );
}

async function listAuditLogs({ limit = 100, entityType, entityId } = {}) {
  const params = [];
  const clauses = [];
  if (entityType) {
    params.push(entityType);
    clauses.push(`entity_type = $${params.length}`);
  }
  if (entityId) {
    params.push(entityId);
    clauses.push(`entity_id = $${params.length}`);
  }
  params.push(Math.min(Number(limit) || 100, 500));
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

module.exports = { writeAudit, listAuditLogs };
