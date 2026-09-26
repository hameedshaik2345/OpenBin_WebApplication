const express = require("express");
const {
  requireAuth,
  requireAdmin,
  requireEpr,
  requireRvmCaller,
} = require("../middleware/auth");
const rvmController = require("../controllers/rvmController");
const adminController = require("../controllers/adminController");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = express.Router();

router.get("/", requireAuth, requireEpr, rvmController.list);
router.get("/live", requireAuth, requireEpr, rvmController.liveState);
router.get("/:rvmId", requireAuth, requireEpr, rvmController.getOne);
router.post("/", requireAuth, requireAdmin, rvmController.create);
router.patch("/:rvmId", requireAuth, requireAdmin, rvmController.update);

router.post(
  "/:rvmId/processing",
  requireRvmCaller,
  rvmController.setProcessing
);

router.post(
  "/:rvmId/media",
  requireAuth,
  requireEpr,
  upload.single("file"),
  adminController.uploadMedia
);
router.get("/:rvmId/media", requireAuth, requireEpr, adminController.listMedia);

module.exports = router;
