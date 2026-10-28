require("dotenv").config();
const { getAuth } = require("firebase-admin/auth");
const { app } = require("../src/config/firebase");
const userService = require("../src/services/userService");
const pool = require("../src/config/database");

async function setup() {
  const email = "openbinsolutions@gmail.com";
  const password = "openbin123";
  const fullName = "OpenBin Administrator";

  console.log(`Setting up Admin account for ${email}...`);

  const auth = getAuth();
  let firebaseUser;

  try {
    firebaseUser = await auth.getUserByEmail(email);
    console.log(`User exists in Firebase with UID: ${firebaseUser.uid}. Updating password...`);
    await auth.updateUser(firebaseUser.uid, {
      password,
      displayName: fullName,
    });
    console.log("Firebase user password updated to:", password);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      console.log("User not found in Firebase. Creating new user...");
      firebaseUser = await auth.createUser({
        email,
        password,
        displayName: fullName,
        emailVerified: true,
      });
      console.log(`Created Firebase user with UID: ${firebaseUser.uid}`);
    } else {
      throw err;
    }
  }

  // Ensure user in database has ADMIN role
  const existingDbUser = await userService.findUserByFirebaseUid(firebaseUser.uid);
  if (existingDbUser) {
    console.log(`User exists in DB (ID: ${existingDbUser.user_id}). Ensuring role is ADMIN...`);
    await pool.query("UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE user_id = $1", [
      existingDbUser.user_id,
    ]);
  } else {
    console.log("Upserting user into database with ADMIN role...");
    await userService.upsertUser({
      firebaseUid: firebaseUser.uid,
      email,
      fullName,
    });
    await pool.query("UPDATE users SET role = 'ADMIN' WHERE email = $1", [email]);
  }

  const check = await pool.query("SELECT user_id, email, role, status FROM users WHERE email = $1", [email]);
  console.log("Admin setup complete! Verified DB user:", check.rows[0]);
  process.exit(0);
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
