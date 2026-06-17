const { db } = require('../services/firebase');
const { sendPushNotifications } = require('../services/push');

// ── Punch In ──────────────────────────────────────────────────────────────────
// One per day. Selfie required (anti-cheat). Tracks session duration via checkout.
exports.punchIn = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Selfie is required to punch in' });

    const now  = new Date();
    const date = now.toISOString().split('T')[0];

    // Enforce one punch-in per day
    // Only single-field where clauses to avoid composite index requirement — filter type in memory
    const existingSnap = await db.collection('checkins')
      .where('studentId', '==', req.user.uid)
      .where('date', '==', date)
      .get();
    const existingPunch = existingSnap.docs.map(d => d.data()).find(d => d.type === 'punch');

    if (existingPunch) {
      return res.status(400).json({
        error: existingPunch.checkoutAt
          ? 'Already punched in and out today'
          : 'Already punched in — punch out first',
      });
    }

    const record = {
      type:          'punch',
      studentId:     req.user.uid,
      studentName:   req.user.name,
      teacherId:     req.user.teacherId || null,
      organisationId: req.user.organisationId || null,
      imageUrl:      req.file.path,
      imagePublicId: req.file.filename,
      submittedAt:   now.toISOString(),
      date,
      checkoutAt:    null,
      durationMins:  null,
      punchOutImageUrl:      null,
      punchOutImagePublicId: null,
    };

    const ref = await db.collection('checkins').add(record);
    console.log(`[CHECKIN] punch-in: ${req.user.uid} at ${now.toISOString()}`);
    res.status(201).json({ id: ref.id, ...record });
  } catch (err) {
    console.error('[CHECKIN] punchIn error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Punch Out ─────────────────────────────────────────────────────────────────
// Selfie required (anti-cheat). Closes the punch session.
exports.checkoutCheckin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) return res.status(400).json({ error: 'Selfie is required to punch out' });

    const ref = db.collection('checkins').doc(id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: 'Record not found' });

    const data = doc.data();
    if (data.studentId !== req.user.uid) return res.status(403).json({ error: 'Not your record' });
    if (data.type !== 'punch') return res.status(400).json({ error: 'Can only punch out a punch-in record' });
    if (data.checkoutAt) return res.status(400).json({ error: 'Already punched out' });

    const checkoutAt = new Date().toISOString();
    const durationMins = Math.round(
      (new Date(checkoutAt) - new Date(data.submittedAt)) / 60000
    );

    await ref.update({
      checkoutAt,
      durationMins,
      punchOutImageUrl:      req.file.path,
      punchOutImagePublicId: req.file.filename,
    });

    console.log(`[CHECKIN] punch-out: ${req.user.uid}, duration: ${durationMins}m`);
    res.json({ checkoutAt, durationMins });
  } catch (err) {
    console.error('[CHECKIN] checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Photo Check-in ────────────────────────────────────────────────────────────
// Multiple per day. Image required. Random notifications or manual.
exports.submitCheckin = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    const { activity, scheduleId } = req.body;
    const now = new Date();

    const checkin = {
      type:          'photo',
      studentId:     req.user.uid,
      studentName:   req.user.name,
      teacherId:     req.user.teacherId || null,
      organisationId: req.user.organisationId || null,
      imageUrl:      req.file.path,
      imagePublicId: req.file.filename,
      activity:      activity || '',
      scheduleId:    scheduleId || null,
      submittedAt:   now.toISOString(),
      date:          now.toISOString().split('T')[0],
      status:        'submitted',
      feedback:      null,
    };

    const ref = await db.collection('checkins').add(checkin);
    await db.collection('users').doc(req.user.uid).update({
      totalCheckIns: (req.user.totalCheckIns || 0) + 1,
      lastCheckinAt: now.toISOString(),
    });

    console.log(`[CHECKIN] photo check: ${req.user.uid}`);
    res.status(201).json({ id: ref.id, ...checkin });
  } catch (err) {
    console.error('[CHECKIN] submitCheckin error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Get Check-ins (both types) ────────────────────────────────────────────────
exports.getCheckins = async (req, res) => {
  try {
    const { date, studentId, status, type } = req.query;
    let query = db.collection('checkins');

    if (req.user.role === 'student') {
      query = query.where('studentId', '==', req.user.uid);
    } else if (req.user.role === 'teacher') {
      query = query.where('teacherId', '==', req.user.uid);
      if (studentId) query = query.where('studentId', '==', studentId);
    } else if (req.user.role === 'admin') {
      if (studentId) query = query.where('studentId', '==', studentId);
    }

    if (date)   query = query.where('date',   '==', date);
    if (status) query = query.where('status', '==', status);
    // NOTE: do NOT add type as a Firestore filter — composite index not set up.
    // Filter in memory below.

    const snapshot = await query.limit(200).get();
    let checkins = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.submittedAt > a.submittedAt ? 1 : -1));

    if (type) checkins = checkins.filter(c => (c.type || 'photo') === type);

    res.json(checkins);
  } catch (err) {
    console.error('[CHECKIN] getCheckins error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Review Photo Check-in ─────────────────────────────────────────────────────
exports.reviewCheckin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const checkinRef = db.collection('checkins').doc(id);
    const checkin = await checkinRef.get();
    if (!checkin.exists) return res.status(404).json({ error: 'Check-in not found' });

    if (req.user.role === 'teacher' && checkin.data().teacherId !== req.user.uid) {
      return res.status(403).json({ error: 'Cannot review this check-in' });
    }

    await checkinRef.update({
      status,
      feedback:   feedback || null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.uid,
    });

    const student = await db.collection('users').doc(checkin.data().studentId).get();
    const token = student.data()?.fcmToken;
    if (token) {
      await sendPushNotifications(
        [token],
        status === 'approved' ? '✅ Check-in Approved' : '❌ Check-in Rejected',
        feedback || `Your check-in was ${status}`
      );
    }

    res.json({ message: 'Check-in reviewed' });
  } catch (err) {
    console.error('[CHECKIN] reviewCheckin error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Trigger random photo alert ────────────────────────────────────────────────
exports.triggerCheckinAlert = async (req, res) => {
  try {
    const { message } = req.body;
    let query = db.collection('users').where('role', '==', 'student').where('isActive', '==', true);
    if (req.user.role === 'teacher') query = query.where('teacherId', '==', req.user.uid);

    const snapshot = await query.get();
    const tokens = snapshot.docs.map(d => d.data().fcmToken).filter(Boolean);

    if (tokens.length > 0) {
      await sendPushNotifications(
        tokens,
        '📸 Photo Check',
        message || 'Snap a quick photo — what are you working on?',
        { type: 'PHOTO_CHECK_PROMPT' }
      );
    }

    res.json({ message: 'Alert sent', recipients: tokens.length });
  } catch (err) {
    console.error('[CHECKIN] triggerCheckinAlert error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
