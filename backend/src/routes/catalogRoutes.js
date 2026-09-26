const express = require("express");
const { requireAuth, requireAdmin, requireEpr } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.get("/materials", requireAuth, adminController.materials);
router.post("/materials", requireAuth, requireAdmin, adminController.createMaterial);

router.get("/companies", requireAuth, requireEpr, adminController.companies);
router.post("/companies", requireAuth, requireAdmin, adminController.createCompany);

router.get("/brands", requireAuth, requireEpr, adminController.brands);
router.post("/brands", requireAuth, requireAdmin, adminController.createBrand);

router.get("/products", requireAuth, adminController.products);
router.post("/products", requireAuth, requireAdmin, adminController.createProduct);

router.get("/prices", requireAuth, adminController.prices);
router.post("/prices", requireAuth, requireAdmin, adminController.setPrice);

router.get("/collections", requireAuth, requireEpr, adminController.collections);
router.post("/collections", requireAuth, requireAdmin, adminController.createCollection);

router.get("/recyclers", requireAuth, requireAdmin, adminController.recyclers);
router.post("/recyclers", requireAuth, requireAdmin, adminController.createRecycler);

router.get("/receipts", requireAuth, requireAdmin, adminController.receipts);
router.post("/receipts", requireAuth, requireAdmin, adminController.createReceipt);

router.get("/reconciliations", requireAuth, requireAdmin, adminController.reconciliations);
router.post(
  "/reconciliations",
  requireAuth,
  requireAdmin,
  adminController.createReconciliation
);

router.get("/epr-reports", requireAuth, requireEpr, adminController.eprReports);
router.post("/epr-reports", requireAuth, requireAdmin, adminController.createEprReport);

router.get("/audit", requireAuth, requireAdmin, adminController.audit);

module.exports = router;
