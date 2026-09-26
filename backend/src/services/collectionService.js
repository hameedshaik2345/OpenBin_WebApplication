const pool = require("../config/database");
const { writeAudit } = require("./auditService");

async function createCollectionBatch(data, actor) {
  const result = await pool.query(
    `INSERT INTO collection_batches
      (batch_code, material_id, recorded_weight_kg, collector_reference, collected_at, status)
     VALUES ($1,$2,$3,$4,COALESCE($5, now()), COALESCE($6,'RECORDED'))
     RETURNING *`,
    [
      data.batch_code,
      data.material_id,
      data.recorded_weight_kg,
      data.collector_reference || null,
      data.collected_at || null,
      data.status,
    ]
  );
  const batch = result.rows[0];

  if (Array.isArray(data.rvm_ids)) {
    for (const rvmId of data.rvm_ids) {
      await pool.query(
        `INSERT INTO collection_batch_rvms (collection_batch_id, rvm_id, recorded_quantity_kg)
         VALUES ($1,$2,$3)`,
        [batch.collection_batch_id, rvmId, data.recorded_weight_kg / data.rvm_ids.length]
      );
    }
  }

  await writeAudit({
    actorUserId: actor.user_id,
    actorType: actor.role,
    action: "COLLECTION_BATCH_CREATE",
    entityType: "collection_batches",
    entityId: batch.collection_batch_id,
    afterData: batch,
  });
  return batch;
}

async function listCollectionBatches() {
  const result = await pool.query(
    `SELECT cb.*, m.material_code, m.material_name
     FROM collection_batches cb
     JOIN materials m ON m.material_id = cb.material_id
     ORDER BY cb.collected_at DESC`
  );
  return result.rows;
}

async function createRecycler(data) {
  const result = await pool.query(
    `INSERT INTO recyclers (recycler_name, registration_number, contact_email, contact_phone, address, status)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'ACTIVE')) RETURNING *`,
    [
      data.recycler_name,
      data.registration_number || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.address || null,
      data.status,
    ]
  );
  return result.rows[0];
}

async function listRecyclers() {
  const result = await pool.query(
    `SELECT * FROM recyclers ORDER BY recycler_name`
  );
  return result.rows;
}

async function createReceipt(data, actor) {
  const result = await pool.query(
    `INSERT INTO recycler_receipts
      (collection_batch_id, recycler_id, received_weight_kg, received_at, document_reference, verification_status)
     VALUES ($1,$2,$3,COALESCE($4, now()), $5, COALESCE($6,'PENDING'))
     RETURNING *`,
    [
      data.collection_batch_id,
      data.recycler_id,
      data.received_weight_kg,
      data.received_at || null,
      data.document_reference || null,
      data.verification_status,
    ]
  );
  await writeAudit({
    actorUserId: actor.user_id,
    actorType: actor.role,
    action: "RECYCLER_RECEIPT_CREATE",
    entityType: "recycler_receipts",
    entityId: result.rows[0].receipt_id,
    afterData: result.rows[0],
  });
  return result.rows[0];
}

async function listReceipts() {
  const result = await pool.query(
    `SELECT rr.*, r.recycler_name, cb.batch_code
     FROM recycler_receipts rr
     JOIN recyclers r ON r.recycler_id = rr.recycler_id
     JOIN collection_batches cb ON cb.collection_batch_id = rr.collection_batch_id
     ORDER BY rr.received_at DESC`
  );
  return result.rows;
}

async function createReconciliation(data, actor) {
  const variance =
    Number(data.recorded_quantity_kg) -
    Number(data.received_quantity_kg);
  const tolerance = Number(data.tolerance_kg ?? 1);
  const status =
    Math.abs(variance) <= tolerance ? "RECONCILED" : "FLAGGED";

  const result = await pool.query(
    `INSERT INTO reconciliations (
      collection_batch_id, recorded_quantity_kg, collected_quantity_kg,
      received_quantity_kg, variance_kg, tolerance_kg, status, verified_by, verified_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
    RETURNING *`,
    [
      data.collection_batch_id,
      data.recorded_quantity_kg,
      data.collected_quantity_kg,
      data.received_quantity_kg,
      variance,
      tolerance,
      status,
      actor.user_id,
    ]
  );
  return result.rows[0];
}

async function listReconciliations() {
  const result = await pool.query(
    `SELECT r.*, cb.batch_code
     FROM reconciliations r
     JOIN collection_batches cb ON cb.collection_batch_id = r.collection_batch_id
     ORDER BY r.created_at DESC`
  );
  return result.rows;
}

async function createEprReport(data, actor) {
  const result = await pool.query(
    `INSERT INTO epr_reports (
      company_id, period_start, period_end,
      total_transactions, total_recorded_weight_kg, total_verified_weight_kg,
      status, generated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'DRAFT'),$8)
    RETURNING *`,
    [
      data.company_id,
      data.period_start,
      data.period_end,
      data.total_transactions || 0,
      data.total_recorded_weight_kg || 0,
      data.total_verified_weight_kg || 0,
      data.status,
      actor.user_id,
    ]
  );
  return result.rows[0];
}

async function listEprReports() {
  const result = await pool.query(
    `SELECT er.*, c.company_name, u.full_name AS generated_by_name
     FROM epr_reports er
     JOIN companies c ON c.company_id = er.company_id
     JOIN users u ON u.user_id = er.generated_by
     ORDER BY er.generated_at DESC`
  );
  return result.rows;
}

module.exports = {
  createCollectionBatch,
  listCollectionBatches,
  createRecycler,
  listRecyclers,
  createReceipt,
  listReceipts,
  createReconciliation,
  listReconciliations,
  createEprReport,
  listEprReports,
};
