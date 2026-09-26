const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getStorage } = require("firebase-admin/storage");
require("dotenv").config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

if (!firebaseConfig.projectId) {
  throw new Error("Missing FIREBASE_PROJECT_ID in .env");
}

let app;

if (!getApps().length) {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId: firebaseConfig.projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: firebaseConfig.storageBucket,
      databaseURL: firebaseConfig.databaseURL,
    });
  } else {
    app = initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      databaseURL: firebaseConfig.databaseURL,
    });
    console.warn(
      "Firebase Admin: running without service account. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env."
    );
  }
} else {
  app = getApps()[0];
}

function getRtdb() {
  if (!firebaseConfig.databaseURL) {
    throw new Error("FIREBASE_DATABASE_URL is not configured");
  }
  return getDatabase(app);
}

function getBucket() {
  return getStorage(app).bucket();
}

module.exports = { app, firebaseConfig, getRtdb, getBucket };
