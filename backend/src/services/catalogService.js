const pool = require("../config/database");
const { writeAudit } = require("./auditService");

async function listMaterials() {
  const result = await pool.query(
    `SELECT * FROM materials ORDER BY material_code`
  );
  return result.rows;
}

async function createMaterial(data) {
  const result = await pool.query(
    `INSERT INTO materials (material_code, material_name, unit, status)
     VALUES ($1,$2,COALESCE($3,'kg'), COALESCE($4,'ACTIVE'))
     RETURNING *`,
    [data.material_code, data.material_name, data.unit, data.status]
  );
  return result.rows[0];
}

async function listCompanies() {
  const result = await pool.query(
    `SELECT * FROM companies ORDER BY company_name`
  );
  return result.rows;
}

async function createCompany(data) {
  const result = await pool.query(
    `INSERT INTO companies (company_name, registration_number, email, phone, address, status)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6::entity_status, 'ACTIVE'::entity_status)) RETURNING *`,
    [
      data.company_name,
      data.registration_number || null,
      data.email || null,
      data.phone || null,
      data.address || null,
      data.status || null,
    ]
  );
  return result.rows[0];
}

async function listBrands(companyId = null) {
  let query = `
    SELECT b.*, c.company_name
    FROM brands b
    JOIN companies c ON c.company_id = b.company_id
  `;
  const params = [];
  if (companyId) {
    params.push(companyId);
    query += ` WHERE b.company_id = $1`;
  }
  query += ` ORDER BY b.brand_name`;
  const result = await pool.query(query, params);
  return result.rows;
}

async function createBrand(data) {
  const result = await pool.query(
    `INSERT INTO brands (company_id, brand_name, status)
     VALUES ($1,$2,COALESCE($3::entity_status, 'ACTIVE'::entity_status)) RETURNING *`,
    [data.company_id, data.brand_name, data.status || null]
  );
  return result.rows[0];
}

async function listProducts(companyId = null) {
  let query = `
    SELECT p.*, b.brand_name, m.material_code, m.material_name
    FROM products p
    JOIN brands b ON b.brand_id = p.brand_id
    JOIN materials m ON m.material_id = p.material_id
  `;
  const params = [];
  if (companyId) {
    params.push(companyId);
    query += ` WHERE b.company_id = $1`;
  }
  query += ` ORDER BY p.product_name`;
  const result = await pool.query(query, params);
  return result.rows;
}

async function createProduct(data) {
  const result = await pool.query(
    `INSERT INTO products (brand_id, material_id, product_name, volume_ml, status)
     VALUES ($1,$2,$3,$4,COALESCE($5::entity_status, 'ACTIVE'::entity_status)) RETURNING *`,
    [
      data.brand_id,
      data.material_id,
      data.product_name,
      data.volume_ml ?? null,
      data.status || null,
    ]
  );
  return result.rows[0];
}

async function getCurrentPrice(materialId, at = new Date()) {
  const result = await pool.query(
    `SELECT * FROM material_prices
     WHERE material_id = $1
       AND effective_from <= $2
       AND (effective_to IS NULL OR effective_to > $2)
     ORDER BY effective_from DESC
     LIMIT 1`,
    [materialId, at]
  );
  return result.rows[0] || null;
}

async function listPrices() {
  const result = await pool.query(
    `SELECT mp.*, m.material_code, m.material_name
     FROM material_prices mp
     JOIN materials m ON m.material_id = mp.material_id
     ORDER BY m.material_code, mp.effective_from DESC`
  );
  return result.rows;
}

async function setMaterialPrice({ materialId, pricePerKg, effectiveFrom }, actor) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const from = effectiveFrom ? new Date(effectiveFrom) : new Date();

    await client.query(
      `UPDATE material_prices
       SET effective_to = $1
       WHERE material_id = $2
         AND effective_to IS NULL
         AND effective_from < $1`,
      [from, materialId]
    );

    const result = await client.query(
      `INSERT INTO material_prices (material_id, price_per_kg, effective_from, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [materialId, pricePerKg, from, actor.user_id]
    );

    await writeAudit({
      actorUserId: actor.user_id,
      actorType: actor.role,
      action: "MATERIAL_PRICE_SET",
      entityType: "material_prices",
      entityId: result.rows[0].price_id,
      afterData: result.rows[0],
      client,
    });

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function findMaterialByCode(code) {
  const result = await pool.query(
    `SELECT * FROM materials WHERE material_code = $1 OR lower(material_name) = lower($1)`,
    [code]
  );
  return result.rows[0] || null;
}

async function findBrandByName(name) {
  if (!name) return null;
  const result = await pool.query(
    `SELECT * FROM brands WHERE lower(brand_name) = lower($1) LIMIT 1`,
    [name]
  );
  return result.rows[0] || null;
}

async function findProductByName(name) {
  if (!name) return null;
  const result = await pool.query(
    `SELECT * FROM products WHERE lower(product_name) = lower($1) LIMIT 1`,
    [name]
  );
  return result.rows[0] || null;
}

module.exports = {
  listMaterials,
  createMaterial,
  listCompanies,
  createCompany,
  listBrands,
  createBrand,
  listProducts,
  createProduct,
  getCurrentPrice,
  listPrices,
  setMaterialPrice,
  findMaterialByCode,
  findBrandByName,
  findProductByName,
};
