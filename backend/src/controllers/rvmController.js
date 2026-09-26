const rvmService = require("../services/rvmService");
const transactionService = require("../services/transactionService");
const rtdbService = require("../services/rtdbService");
const mediaService = require("../services/mediaService");

async function list(req, res) {
  try {
    const rvms = await rvmService.listRvms();
    return res.json({ rvms });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const rvm = await rvmService.findById(req.params.rvmId);
    if (!rvm) return res.status(404).json({ error: "RVM not found" });
    const media = await mediaService.listMediaForRvm(rvm.rvm_id);
    const transactions = await transactionService.listTransactions({
      rvmId: rvm.rvm_id,
      limit: 50,
    });
    return res.json({ rvm, media, transactions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const rvm = await rvmService.createRvm(req.body, req.dbUser);
    return res.status(201).json({ rvm });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const rvm = await rvmService.updateRvm(req.params.rvmId, req.body, req.dbUser);
    return res.json({ rvm });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function liveState(req, res) {
  try {
    const live = await rtdbService.getLiveSnapshot();
    return res.json({ live });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function setProcessing(req, res) {
  try {
    const rvm = await rvmService.findById(req.params.rvmId);
    if (!rvm) return res.status(404).json({ error: "RVM not found" });
    await rtdbService.setProcessingStatus(rvm.rvm_code, req.body);
    await rtdbService.setRvmStatus(rvm.rvm_code, {
      current_state: req.body.state || "PROCESSING",
      current_transaction_id: req.body.transaction_id || null,
      status: "ONLINE",
      firmware_version: rvm.is_simulated ? "SIMULATOR-1.0" : "1.0.0",
    });
    await rvmService.touchLastSeen(rvm.rvm_id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createTransaction(req, res) {
  try {
    let rvmId = req.body.rvm_id;
    if (req.rvmDevice) {
      rvmId = req.rvmDevice.rvm_id;
    }
    const result = await transactionService.createRvmTransaction(
      { ...req.body, rvm_id: rvmId },
      {
        user_id: req.dbUser?.user_id,
        actorType: req.actorType || "RVM",
      }
    );
    return res.status(result.idempotent ? 200 : 201).json(result);
  } catch (err) {
    console.error("createTransaction error:", err);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  liveState,
  setProcessing,
  createTransaction,
};
