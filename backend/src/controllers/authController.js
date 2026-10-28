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

async function createUser(req, res) {
  try {
    const { email, password, fullName, role = "EPR" } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const { getAuth } = require("firebase-admin/auth");
    const auth = getAuth();
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email,
        password,
        displayName: fullName || email.split("@")[0],
      });
    } catch (fbErr) {
      if (fbErr.code === "auth/email-already-exists") {
        firebaseUser = await auth.getUserByEmail(email);
        await auth.updateUser(firebaseUser.uid, { password });
      } else {
        throw fbErr;
      }
    }

    const user = await userService.upsertUser({
      firebaseUid: firebaseUser.uid,
      email,
      fullName: fullName || email.split("@")[0],
    });

    // Target role logic: EPR role can only create brand accounts (EPR)
    // ADMIN can create EPR, USER, or ADMIN (defaults to EPR)
    let targetRole = "EPR";
    if (req.dbUser.role === "ADMIN" && role && ["USER", "ADMIN", "EPR"].includes(role)) {
      targetRole = role;
    }

    if (targetRole) {
      await userService.updateUserRole(user.user_id, targetRole, req.dbUser);
      user.role = targetRole;
    }

    return res.status(201).json({ user });
  } catch (err) {
    console.error("createUser error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to create user" });
  }
}

module.exports = { syncUser, getMe, listUsers, updateStatus, updateRole, createUser };
