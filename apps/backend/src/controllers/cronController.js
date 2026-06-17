/**
 * Cron endpoint handlers — called by Vercel Cron on schedule.
 * Protected by CRON_SECRET header so only Vercel can trigger them.
 */
const { db, messaging } = require("../services/firebase");

const authorizeCron = (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers["authorization"] !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
};

const sendPush = async (tokens, title, body, data = {}) => {
  if (!tokens.length) return 0;
  await messaging
    .sendEachForMulticast({ tokens, notification: { title, body }, data })
    .catch(() => {});
  return tokens.length;
};

// GET /api/cron/morning   — 8:00 AM daily
exports.morning = async (req, res) => {
  if (!authorizeCron(req, res)) return;
  const snap = await db
    .collection("users")
    .where("role", "==", "student")
    .where("isActive", "==", true)
    .get();
  const tokens = snap.docs.map((d) => d.data().fcmToken).filter(Boolean);
  const count = await sendPush(
    tokens,
    "🌅 Good Morning! Time to Study",
    "Open TrackMe to log your session.",
    { type: "CHECKIN_PROMPT" },
  );
  console.log(`[CRON] morning — notified ${count}`);
  res.json({ ok: true, notified: count });
};

// GET /api/cron/afternoon  — 2:00 PM weekdays
exports.afternoon = async (req, res) => {
  if (!authorizeCron(req, res)) return;
  const snap = await db
    .collection("users")
    .where("role", "==", "student")
    .where("isActive", "==", true)
    .get();
  const tokens = snap.docs.map((d) => d.data().fcmToken).filter(Boolean);
  const count = await sendPush(
    tokens,
    "📸 Afternoon Check-in",
    "Snap a photo to log your current activity!",
    { type: "CHECKIN_PROMPT" },
  );
  console.log(`[CRON] afternoon — notified ${count}`);
  res.json({ ok: true, notified: count });
};

// GET /api/cron/evening   — 7:00 PM daily
exports.evening = async (req, res) => {
  if (!authorizeCron(req, res)) return;
  const snap = await db
    .collection("users")
    .where("role", "==", "student")
    .where("isActive", "==", true)
    .get();
  const tokens = snap.docs.map((d) => d.data().fcmToken).filter(Boolean);
  const count = await sendPush(
    tokens,
    "📚 Evening Session",
    "Time for your evening study! Check in on TrackMe.",
    { type: "CHECKIN_PROMPT" },
  );
  console.log(`[CRON] evening — notified ${count}`);
  res.json({ ok: true, notified: count });
};

// GET /api/cron/summary-reminder  — 10:00 PM daily
exports.summaryReminder = async (req, res) => {
  if (!authorizeCron(req, res)) return;
  const today = new Date().toISOString().split("T")[0];

  const [studentsSnap, summariesSnap] = await Promise.all([
    db
      .collection("users")
      .where("role", "==", "student")
      .where("isActive", "==", true)
      .get(),
    db.collection("summaries").where("date", "==", today).get(),
  ]);

  const submitted = new Set(summariesSnap.docs.map((d) => d.data().studentId));
  const tokens = studentsSnap.docs
    .filter((d) => !submitted.has(d.id))
    .map((d) => d.data().fcmToken)
    .filter(Boolean);

  const count = await sendPush(
    tokens,
    "📝 Summary Due in 1 Hour!",
    "Don't break your streak — submit today's summary before 11 PM!",
    { type: "SUMMARY_REMINDER" },
  );
  console.log(`[CRON] summary-reminder — notified ${count} missing`);
  res.json({ ok: true, notified: count });
};

// GET /api/cron/streak-reset  — 11:01 PM daily
exports.streakReset = async (req, res) => {
  if (!authorizeCron(req, res)) return;
  const today = new Date().toISOString().split("T")[0];

  const [studentsSnap, summariesSnap] = await Promise.all([
    db
      .collection("users")
      .where("role", "==", "student")
      .where("isActive", "==", true)
      .get(),
    db.collection("summaries").where("date", "==", today).get(),
  ]);

  const submitted = new Set(summariesSnap.docs.map((d) => d.data().studentId));
  const batch = db.batch();
  let reset = 0;

  studentsSnap.docs.forEach((doc) => {
    if (!submitted.has(doc.id) && (doc.data().streak || 0) > 0) {
      batch.update(doc.ref, { streak: 0 });
      reset++;
    }
  });

  await batch.commit();
  console.log(`[CRON] streak-reset — reset ${reset} streaks`);
  res.json({ ok: true, reset });
};
