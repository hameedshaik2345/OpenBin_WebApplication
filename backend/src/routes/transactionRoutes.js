const express = require("express");
const { requireAuth, requireAdmin, requireEpr } = require("../middleware/auth");
const { claimLimiter } = require("../middleware/security");
const transactionController = require("../controllers/transactionController");

const router = express.Router();

router.get("/", requireAuth, transactionController.list);
router.get("/:transactionId", requireAuth, transactionController.getOne);
router.post("/claim", requireAuth, claimLimiter, transactionController.claim);

module.exports = router;
