const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { withdrawLimiter } = require("../middleware/security");
const accountController = require("../controllers/accountController");

const router = express.Router();

router.get("/me", requireAuth, accountController.myAccount);
router.post("/withdraw", requireAuth, withdrawLimiter, accountController.withdraw);
router.post("/donate", requireAuth, withdrawLimiter, accountController.donate);

router.get("/", requireAuth, requireAdmin, accountController.listAccounts);
router.get("/charity", requireAuth, requireAdmin, accountController.charity);
router.get(
  "/withdrawals/all",
  requireAuth,
  requireAdmin,
  accountController.listWithdrawals
);
router.get(
  "/donations/all",
  requireAuth,
  requireAdmin,
  accountController.listDonations
);
router.get(
  "/:accountId/ledger",
  requireAuth,
  requireAdmin,
  accountController.getLedger
);

module.exports = router;
