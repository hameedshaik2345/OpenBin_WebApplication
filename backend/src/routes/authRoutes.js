const express = require("express");
const { requireFirebaseAuth, requireAuth, requireAdmin } = require("../middleware/auth");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/sync", requireFirebaseAuth, authController.syncUser);
router.get("/me", requireAuth, authController.getMe);
router.get("/users", requireAuth, requireAdmin, authController.listUsers);
router.patch(
  "/users/:userId/status",
  requireAuth,
  requireAdmin,
  authController.updateStatus
);
router.patch(
  "/users/:userId/role",
  requireAuth,
  requireAdmin,
  authController.updateRole
);

module.exports = router;
