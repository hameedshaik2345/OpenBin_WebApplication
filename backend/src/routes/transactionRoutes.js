const express = require("express");
const { requireAuth, requireAdmin, requireEpr } = require("../middleware/auth");
const transactionController = require("../controllers/transactionController");

const router = express.Router();

router.get("/", requireAuth, transactionController.list);
router.get("/:transactionId", requireAuth, transactionController.getOne);
router.post("/claim", requireAuth, transactionController.claim);

module.exports = router;
