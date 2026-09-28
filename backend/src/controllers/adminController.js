const catalogService = require("../services/catalogService");
const collectionService = require("../services/collectionService");
const mediaService = require("../services/mediaService");
const { listAuditLogs } = require("../services/auditService");

async function materials(req, res) {
  try {
    return res.json({ materials: await catalogService.listMaterials() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createMaterial(req, res) {
  try {
    return res.status(201).json({ material: await catalogService.createMaterial(req.body) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function companies(req, res) {
  try {
    const all = await catalogService.listCompanies();
    if (req.dbUser.role === "EPR" && req.dbUser.company_id) {
      return res.json({ companies: all.filter((c) => c.company_id === req.dbUser.company_id) });
    }
    return res.json({ companies: all });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createCompany(req, res) {
  try {
    return res.status(201).json({ company: await catalogService.createCompany(req.body) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function brands(req, res) {
  try {
    const companyId = req.dbUser.role === "EPR" ? req.dbUser.company_id : (req.query.company_id || null);
    return res.json({ brands: await catalogService.listBrands(companyId) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createBrand(req, res) {
  try {
    return res.status(201).json({ brand: await catalogService.createBrand(req.body) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function products(req, res) {
  try {
    const companyId = req.dbUser.role === "EPR" ? req.dbUser.company_id : (req.query.company_id || null);
    return res.json({ products: await catalogService.listProducts(companyId) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createProduct(req, res) {
  try {
    return res.status(201).json({ product: await catalogService.createProduct(req.body) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function prices(req, res) {
  try {
    return res.json({ prices: await catalogService.listPrices() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function setPrice(req, res) {
  try {
    const price = await catalogService.setMaterialPrice(
      {
        materialId: req.body.material_id,
        pricePerKg: req.body.price_per_kg,
        effectiveFrom: req.body.effective_from,
      },
      req.dbUser
    );
    return res.status(201).json({ price });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function collections(req, res) {
  try {
    return res.json({ batches: await collectionService.listCollectionBatches() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createCollection(req, res) {
  try {
    const batch = await collectionService.createCollectionBatch(req.body, req.dbUser);
    return res.status(201).json({ batch });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function recyclers(req, res) {
  try {
    return res.json({ recyclers: await collectionService.listRecyclers() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createRecycler(req, res) {
  try {
    return res.status(201).json({ recycler: await collectionService.createRecycler(req.body) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function receipts(req, res) {
  try {
    return res.json({ receipts: await collectionService.listReceipts() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createReceipt(req, res) {
  try {
    return res
      .status(201)
      .json({ receipt: await collectionService.createReceipt(req.body, req.dbUser) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function reconciliations(req, res) {
  try {
    return res.json({
      reconciliations: await collectionService.listReconciliations(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createReconciliation(req, res) {
  try {
    return res.status(201).json({
      reconciliation: await collectionService.createReconciliation(req.body, req.dbUser),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function eprReports(req, res) {
  try {
    const companyId = req.dbUser.role === "EPR" ? req.dbUser.company_id : (req.query.company_id || null);
    return res.json({ reports: await collectionService.listEprReports(companyId) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getEprReport(req, res) {
  try {
    const report = await collectionService.getEprReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    if (req.dbUser.role === "EPR" && req.dbUser.company_id && req.dbUser.company_id !== report.company_id) {
      return res.status(403).json({ error: "Forbidden: Not your company" });
    }
    return res.json({ report });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function exportEprReport(req, res) {
  try {
    const report = await collectionService.getEprReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    if (req.dbUser.role === "EPR" && req.dbUser.company_id && req.dbUser.company_id !== report.company_id) {
      return res.status(403).json({ error: "Forbidden: Not your company" });
    }
    const csv = await collectionService.exportEprReportCsv(req.params.reportId);
    const cleanCompany = (report.company_name || "report").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="EPR_${cleanCompany}_${report.period_start}_to_${report.period_end}.csv"`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createEprReport(req, res) {
  try {
    const companyId = req.dbUser.role === "EPR" && req.dbUser.company_id ? req.dbUser.company_id : req.body.company_id;
    return res
      .status(201)
      .json({ report: await collectionService.createEprReport({ ...req.body, company_id: companyId }, req.dbUser) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function audit(req, res) {
  try {
    const logs = await listAuditLogs({
      limit: req.query.limit,
      entityType: req.query.entity_type,
      entityId: req.query.entity_id,
    });
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function uploadMedia(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "file required" });
    const mediaType = (req.body.media_type || "IMAGE").toUpperCase();
    if (!["IMAGE", "VIDEO"].includes(mediaType)) {
      return res.status(400).json({ error: "media_type must be IMAGE or VIDEO" });
    }
    const media = await mediaService.uploadRvmMedia({
      rvmId: req.params.rvmId,
      mediaType,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      title: req.body.title,
      uploadedBy: req.dbUser,
    });
    return res.status(201).json({ media });
  } catch (err) {
    console.error("uploadMedia error:", err);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function listMedia(req, res) {
  try {
    return res.json({ media: await mediaService.listMediaForRvm(req.params.rvmId) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  materials,
  createMaterial,
  companies,
  createCompany,
  brands,
  createBrand,
  products,
  createProduct,
  prices,
  setPrice,
  collections,
  createCollection,
  recyclers,
  createRecycler,
  receipts,
  createReceipt,
  reconciliations,
  createReconciliation,
  eprReports,
  getEprReport,
  exportEprReport,
  createEprReport,
  audit,
  uploadMedia,
  listMedia,
};
