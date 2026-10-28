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
     VALUES ($1,$2,$3,$4,$5,COALESCE($6::entity_status, 'ACTIVE'::entity_status)) RETURNING *`,
    [
      data.recycler_name,
      data.registration_number || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.address || null,
      data.status || null,
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
  let totalTransactions = Number(data.total_transactions) || 0;
  let totalRecordedWeightKg = Number(data.total_recorded_weight_kg) || 0;
  let totalVerifiedWeightKg = Number(data.total_verified_weight_kg) || 0;

  // If numbers were not manually provided, dynamically calculate them from transactions for the company and date period
  if (!totalTransactions && !totalRecordedWeightKg) {
    const aggResult = await pool.query(
      `SELECT 
        COUNT(t.transaction_id)::bigint AS count,
        COALESCE(SUM(t.estimated_weight_g) / 1000.0, 0)::numeric(16,3) AS weight_kg
       FROM transactions t
       LEFT JOIN brands b ON t.brand_id = b.brand_id
       LEFT JOIN products p ON t.product_id = p.product_id
       LEFT JOIN brands pb ON p.brand_id = pb.brand_id
       WHERE (b.company_id = $1 OR pb.company_id = $1 OR $1 IS NULL)
         AND t.created_at >= $2::date
         AND t.created_at < ($3::date + INTERVAL '1 day')`,
      [data.company_id, data.period_start, data.period_end]
    );

    const agg = aggResult.rows[0];
    totalTransactions = Number(agg?.count) || 0;
    totalRecordedWeightKg = Number(agg?.weight_kg) || 0;

    // Check for verified weights in recycler receipts
    const verifiedResult = await pool.query(
      `SELECT COALESCE(SUM(received_weight_kg), 0)::numeric(16,3) AS verified_kg
       FROM recycler_receipts
       WHERE verification_status = 'VERIFIED'
         AND received_at >= $1::date
         AND received_at < ($2::date + INTERVAL '1 day')`,
      [data.period_start, data.period_end]
    );
    totalVerifiedWeightKg = Number(verifiedResult.rows[0]?.verified_kg) || 0;
  }

  const result = await pool.query(
    `INSERT INTO epr_reports (
      company_id, period_start, period_end,
      total_transactions, total_recorded_weight_kg, total_verified_weight_kg,
      status, generated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::report_status, 'DRAFT'::report_status),$8)
    RETURNING *`,
    [
      data.company_id,
      data.period_start,
      data.period_end,
      totalTransactions,
      totalRecordedWeightKg,
      totalVerifiedWeightKg,
      data.status || null,
      actor.user_id,
    ]
  );

  const report = result.rows[0];
  await writeAudit({
    actorUserId: actor.user_id,
    actorType: actor.role,
    action: "EPR_REPORT_CREATE",
    entityType: "epr_reports",
    entityId: report.report_id,
    afterData: report,
  });

  return report;
}

async function listEprReports(companyId = null) {
  let query = `
    SELECT er.*, c.company_name, u.full_name AS generated_by_name
    FROM epr_reports er
    JOIN companies c ON c.company_id = er.company_id
    JOIN users u ON u.user_id = er.generated_by
  `;
  const params = [];
  if (companyId) {
    params.push(companyId);
    query += ` WHERE er.company_id = $1`;
  }
  query += ` ORDER BY er.generated_at DESC`;
  const result = await pool.query(query, params);
  return result.rows;
}

async function getEprReport(reportId) {
  const result = await pool.query(
    `SELECT er.*, c.company_name, c.registration_number, u.full_name AS generated_by_name, u.email AS generated_by_email
     FROM epr_reports er
     JOIN companies c ON c.company_id = er.company_id
     JOIN users u ON u.user_id = er.generated_by
     WHERE er.report_id = $1`,
    [reportId]
  );
  if (!result.rows[0]) return null;
  const report = result.rows[0];

  // Material breakdown
  const breakdown = await pool.query(
    `SELECT 
       m.material_code,
       m.material_name,
       COUNT(t.transaction_id)::bigint AS count,
       COALESCE(SUM(t.estimated_weight_g) / 1000.0, 0)::numeric(16,3) AS weight_kg,
       COALESCE(SUM(t.reward_value), 0)::numeric(12,2) AS total_reward
     FROM transactions t
     JOIN materials m ON m.material_id = t.material_id
     LEFT JOIN brands b ON t.brand_id = b.brand_id
     LEFT JOIN products p ON t.product_id = p.product_id
     LEFT JOIN brands pb ON p.brand_id = pb.brand_id
     WHERE (b.company_id = $1 OR pb.company_id = $1 OR $1 IS NULL)
       AND t.created_at >= $2::date
       AND t.created_at < ($3::date + INTERVAL '1 day')
     GROUP BY m.material_code, m.material_name
     ORDER BY weight_kg DESC`,
    [report.company_id, report.period_start, report.period_end]
  );

  return {
    ...report,
    breakdown: breakdown.rows,
  };
}

async function exportEprReportCsv(reportId) {
  const report = await getEprReport(reportId);
  if (!report) throw Object.assign(new Error("Report not found"), { status: 404 });

  const startDate = new Date(report.period_start).toISOString().split("T")[0];
  const endDate = new Date(report.period_end).toISOString().split("T")[0];

  const lines = [
    `"OPENBIN EPR COMPLIANCE REPORT"`,
    `"Report ID","${report.report_id}"`,
    `"Company Name","${report.company_name.replace(/"/g, '""')}"`,
    `"Registration Number","${report.registration_number || 'N/A'}"`,
    `"Period","${startDate} to ${endDate}"`,
    `"Status","${report.status}"`,
    `"Total Recorded Weight (KG)",${report.total_recorded_weight_kg}`,
    `"Total Verified Weight (KG)",${report.total_verified_weight_kg}`,
    `"Total Transactions",${report.total_transactions}`,
    `"Generated At","${new Date(report.generated_at).toISOString()}"`,
    `"Generated By","${(report.generated_by_name || '').replace(/"/g, '""')}"`,
    "",
    `"MATERIAL BREAKDOWN"`,
    `"Material Code","Material Name","Transactions Count","Weight (KG)","Total Rewards (INR)"`,
  ];

  for (const b of report.breakdown) {
    lines.push(
      `"${b.material_code}","${b.material_name.replace(/"/g, '""')}",${b.count},${b.weight_kg},${b.total_reward}`
    );
  }

  return lines.join("\r\n");
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
  getEprReport,
  exportEprReportCsv,
};
