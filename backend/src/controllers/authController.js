const userService = require("../services/userService");

async function syncUser(req, res) {
  try {
    const decoded = req.firebaseUser || req.user;
    // Support both old middleware (during transition) and new
    const firebaseUid = decoded.uid;
    const user = await userService.upsertUser({
      firebaseUid,
      email: decoded.email || req.body?.email,
      fullName:
        req.body?.fullName ||
        req.body?.displayName ||
        decoded.name ||
        decoded.email?.split("@")[0],
      phone: req.body?.phone || null,
    });

    return res.json({ user });
  } catch (err) {
    console.error("syncUser error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to sync user" });
  }
}

async function getMe(req, res) {
  try {
    return res.json({ user: req.dbUser });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
}

async function listUsers(req, res) {
  try {
    const users = await userService.listUsers({
      q: req.query.q,
      role: req.query.role,
      status: req.query.status,
      limit: req.query.limit,
    });
    return res.json({ users });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ error: "Failed to list users" });
  }
}

async function updateStatus(req, res) {
  try {
    const user = await userService.updateUserStatus(
      req.params.userId,
      req.body.status,
      req.dbUser
    );
    return res.json({ user });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function updateRole(req, res) {
  try {
    const { role } = req.body;
    if (!["USER", "ADMIN", "EPR"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const user = await userService.updateUserRole(
      req.params.userId,
      role,
      req.dbUser
    );
    return res.json({ user });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { syncUser, getMe, listUsers, updateStatus, updateRole };
