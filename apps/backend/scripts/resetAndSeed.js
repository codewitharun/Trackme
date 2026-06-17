/**
 * Reset & Seed Script
 * Deletes ALL users (Firebase Auth + Firestore) and organisations, then creates one admin.
 *
 * Usage:
 *   node scripts/resetAndSeed.js
 *
 * Env vars (from apps/backend/.env):
 *   FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME  (optional — defaults below)
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const auth = admin.auth();
const db   = admin.firestore();

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@trackme.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin';

async function deleteCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) { console.log(`  [skip] ${collectionName} — already empty`); return; }
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log(`  [✓] Deleted ${snap.size} docs from '${collectionName}'`);
}

async function deleteAllAuthUsers() {
  let deleted = 0;
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    if (result.users.length === 0) break;
    const uids = result.users.map(u => u.uid);
    await auth.deleteUsers(uids);
    deleted += uids.length;
    pageToken = result.pageToken;
  } while (pageToken);
  console.log(`  [✓] Deleted ${deleted} Firebase Auth user(s)`);
}

async function seedAdmin() {
  const userRecord = await auth.createUser({
    email:       ADMIN_EMAIL,
    password:    ADMIN_PASSWORD,
    displayName: ADMIN_NAME,
  });

  await db.collection('users').doc(userRecord.uid).set({
    uid:           userRecord.uid,
    email:         ADMIN_EMAIL,
    name:          ADMIN_NAME,
    role:          'admin',
    organisationId: null,
    createdAt:     new Date().toISOString(),
    streak:        0,
    totalCheckIns: 0,
    isActive:      true,
    fcmToken:      null,
  });

  console.log(`  [✓] Admin created`);
  console.log(`      Email   : ${ADMIN_EMAIL}`);
  console.log(`      Password: ${ADMIN_PASSWORD}`);
  console.log(`      UID     : ${userRecord.uid}`);
}

async function main() {
  console.log('\n🗑  Deleting all data...');
  await deleteAllAuthUsers();
  await deleteCollection('users');
  await deleteCollection('organisations');
  await deleteCollection('checkins');
  await deleteCollection('summaries');
  await deleteCollection('schedules');

  console.log('\n🌱 Seeding admin...');
  await seedAdmin();

  console.log('\n✅ Done. Log in with the credentials above and complete org setup on first launch.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
