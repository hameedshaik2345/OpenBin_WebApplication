const express = require("express");
const { requireRvmCaller } = require("../middleware/auth");
const rvmController = require("../controllers/rvmController");

const router = express.Router();

// Physical RVM / Simulator → backend transaction ingestion
router.post("/transactions", requireRvmCaller, rvmController.createTransaction);

module.exports = router;
