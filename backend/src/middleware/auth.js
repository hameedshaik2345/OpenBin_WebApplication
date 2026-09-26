const { getAuth } = require("firebase-admin/auth");
const { app } = require("../config/firebase");
const userService = require("../services/userService");

async function requireFirebaseAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  try {
    const decoded = await getAuth(app).verifyIdToken(header.slice(7));
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function requireAuth(req, res, next) {
  return requireFirebaseAuth(req, res, async () => {
    try {
      const dbUser = await userService.findUserByFirebaseUid(req.firebaseUser.uid);
      if (!dbUser) {
        return res.status(401).json({
          error: "User not synced. Call /api/auth/sync first.",
        });
      }
      if (dbUser.status !== "ACTIVE") {
        return res.status(403).json({
          error: `Account is ${dbUser.status.toLowerCase()}`,
        });
      }
      req.dbUser = dbUser;
      next();
    } catch (err) {
      console.error("requireAuth error:", err.message);
      return res.status(500).json({ error: "Authorization failed" });
    }
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.dbUser.role)) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }
    next();
  };
}

const requireAdmin = requireRole("ADMIN");
const requireEpr = requireRole("EPR", "ADMIN");
const requireUser = requireRole("USER", "ADMIN", "EPR");

async function requireRvmCaller(req, res, next) {
  const simHeader = req.headers["x-rvm-simulator"];
  if (simHeader) {
    const rvmService = require("../services/rvmService");
    const rvm = await rvmService.findBySerial(simHeader);
    if (!rvm || !rvm.is_simulated) {
      return res.status(401).json({ error: "Unknown simulated RVM identity" });
    }
    req.rvmDevice = rvm;
    req.actorType = "RVM";
    return next();
  }

  return requireAuth(req, res, () => {
    if (req.dbUser.role !== "ADMIN") {
      return res.status(403).json({
        error: "Only ADMIN or simulated RVM may call this endpoint",
      });
    }
    req.actorType = "ADMIN";
    next();
  });
}

module.exports = {
  requireFirebaseAuth,
  requireAuth,
  requireRole,
  requireAdmin,
  requireEpr,
  requireUser,
  requireRvmCaller,
};
