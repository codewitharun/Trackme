/**
 * One-time script to bootstrap the first admin account.
 * Usage: node scripts/createAdmin.js
 */
require("dotenv").config({ path: `${__dirname}/../.env` });

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const auth = admin.auth();
const db = admin.firestore();

const EMAIL = process.env.ADMIN_EMAIL || "arun@trackme.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "YourPassword123";
const NAME = process.env.ADMIN_NAME || "Principal Arun";

async function createAdmin() {
  const userRecord = await auth.createUser({
    email: EMAIL,
    password: PASSWORD,
    displayName: NAME,
  });

  await db.collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    email: EMAIL,
    name: NAME,
    role: "admin",
    createdAt: new Date().toISOString(),
    streak: 0,
    totalCheckIns: 0,
    isActive: true,
    fcmToken: null,
  });

  console.log("Admin created:", EMAIL, "| uid:", userRecord.uid);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
