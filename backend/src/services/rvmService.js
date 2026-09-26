const pool = require("../config/database");
const { writeAudit } = require("./auditService");
const rtdbService = require("./rtdbService");

async function listRvms() {
  const result = await pool.query(
    `SELECT *,
      CASE WHEN total_capacity > 0
        THEN ROUND((current_capacity / total_capacity) * 100, 2)
        ELSE 0 END AS capacity_percent
     FROM rvms
     ORDER BY rvm_code`
  );
  return result.rows;
}

async function findById(rvmId) {
  const result = await pool.query(
    `SELECT *,
      CASE WHEN total_capacity > 0
        THEN ROUND((current_capacity / total_capacity) * 100, 2)
        ELSE 0 END AS capacity_percent
     FROM rvms WHERE rvm_id = $1`,
    [rvmId]
  );
  return result.rows[0] || null;
}

async function findByCode(rvmCode) {
  const result = await pool.query(`SELECT * FROM rvms WHERE rvm_code = $1`, [
    rvmCode,
  ]);
  return result.rows[0] || null;
}

async function findBySerial(serial) {
  const result = await pool.query(
    `SELECT * FROM rvms WHERE serial_number = $1`,
    [serial]
  );
  return result.rows[0] || null;
}

async function createRvm(data, actor) {
  const result = await pool.query(
    `INSERT INTO rvms (
      rvm_code, serial_number, location_name, latitude, longitude,
      status, total_capacity, current_capacity, capacity_unit,
      installed_at, is_simulated
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10, now()), COALESCE($11, true))
    RETURNING *`,
    [
      data.rvm_code,
      data.serial_number,
      data.location_name || null,
      data.latitude ?? null,
      data.longitude ?? null,
      data.status || "ACTIVE",
      data.total_capacity ?? 100,
      data.current_capacity ?? 0,
      data.capacity_unit || "KG",
      data.installed_at || null,
      data.is_simulated !== false,
    ]
  );
  const rvm = result.rows[0];
  await writeAudit({
    actorUserId: actor?.user_id,
    actorType: actor?.role || "ADMIN",
    action: "RVM_CREATE",
    entityType: "rvms",
    entityId: rvm.rvm_id,
    afterData: rvm,
  });
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
  return rvm;
}

async function updateRvm(rvmId, data, actor) {
  const before = await findById(rvmId);
  if (!before) throw Object.assign(new Error("RVM not found"), { status: 404 });

  const result = await pool.query(
    `UPDATE rvms SET
      location_name = COALESCE($1, location_name),
      latitude = COALESCE($2, latitude),
      longitude = COALESCE($3, longitude),
      status = COALESCE($4, status),
      total_capacity = COALESCE($5, total_capacity),
      current_capacity = COALESCE($6, current_capacity),
      capacity_unit = COALESCE($7, capacity_unit),
      updated_at = now()
     WHERE rvm_id = $8
     RETURNING *`,
    [
      data.location_name,
      data.latitude,
      data.longitude,
      data.status,
      data.total_capacity,
      data.current_capacity,
      data.capacity_unit,
      rvmId,
    ]
  );
  const after = result.rows[0];
  await writeAudit({
    actorUserId: actor?.user_id,
    actorType: actor?.role || "ADMIN",
    action: "RVM_UPDATE",
    entityType: "rvms",
    entityId: rvmId,
    beforeData: before,
    afterData: after,
  });
  return after;
}

async function touchLastSeen(rvmId) {
  await pool.query(
    `UPDATE rvms SET last_seen_at = now(), updated_at = now() WHERE rvm_id = $1`,
    [rvmId]
  );
}

async function addCapacity(rvmId, weightKg, client = pool) {
  const result = await client.query(
    `UPDATE rvms SET
      current_capacity = LEAST(total_capacity, current_capacity + $1),
      last_seen_at = now(),
      updated_at = now()
     WHERE rvm_id = $2
     RETURNING *`,
    [weightKg, rvmId]
  );
  return result.rows[0];
}

module.exports = {
  listRvms,
  findById,
  findByCode,
  findBySerial,
  createRvm,
  updateRvm,
  touchLastSeen,
  addCapacity,
};
