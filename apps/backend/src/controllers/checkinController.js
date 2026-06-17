const { db, messaging } = require('../services/firebase');

exports.submitCheckin = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    const { activity, scheduleId } = req.body;
    const now = new Date();

    const checkin = {
      studentId: req.user.uid,
      studentName: req.user.name,
      teacherId: req.user.teacherId,
      imageUrl: req.file.path,
      imagePublicId: req.file.filename,
      activity: activity || '',
      scheduleId: scheduleId || null,
      submittedAt: now.toISOString(),
      date: now.toISOString().split('T')[0],
      status: 'submitted',
      feedback: null,
    };

    const ref = await db.collection('checkins').add(checkin);
    await db.collection('users').doc(req.user.uid).update({
      totalCheckIns: (req.user.totalCheckIns || 0) + 1,
      lastCheckinAt: now.toISOString(),
    });

    res.status(201).json({ id: ref.id, ...checkin });
  } catch (err) {
    console.error('[CHECKIN] submitCheckin error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getCheckins = async (req, res) => {
  try {
    const { date, studentId, status } = req.query;
    let query = db.collection('checkins');

    // Role-based filtering — only equality filters (no orderBy) to avoid index requirement
    if (req.user.role === 'student') {
      query = query.where('studentId', '==', req.user.uid);
    } else if (req.user.role === 'teacher') {
      query = query.where('teacherId', '==', req.user.uid);
      if (studentId) query = query.where('studentId', '==', studentId);
    } else if (req.user.role === 'admin') {
      if (studentId) query = query.where('studentId', '==', studentId);
    }

    if (date) query = query.where('date', '==', date);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.limit(100).get();

    // Sort in memory — avoids composite index requirement
    const checkins = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.submittedAt > a.submittedAt ? 1 : -1));

    console.log(`[CHECKIN] getCheckins → ${checkins.length} results for role=${req.user.role}`);
    res.json(checkins);
  } catch (err) {
    console.error('[CHECKIN] getCheckins error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

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
      feedback: feedback || null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.uid,
    });

    const student = await db.collection('users').doc(checkin.data().studentId).get();
    if (student.data()?.fcmToken) {
      await messaging.send({
        token: student.data().fcmToken,
        notification: {
          title: status === 'approved' ? '✅ Check-in Approved' : '❌ Check-in Rejected',
          body: feedback || `Your check-in was ${status}`,
        },
      }).catch(() => {});
    }

    res.json({ message: 'Check-in reviewed' });
  } catch (err) {
    console.error('[CHECKIN] reviewCheckin error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.triggerCheckinAlert = async (req, res) => {
  try {
    const { message } = req.body;
    let query = db.collection('users').where('role', '==', 'student').where('isActive', '==', true);
    if (req.user.role === 'teacher') query = query.where('teacherId', '==', req.user.uid);

    const snapshot = await query.get();
    const tokens = snapshot.docs.map(d => d.data().fcmToken).filter(Boolean);

    if (tokens.length > 0) {
      await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: '📸 Study Check-in',
          body: message || 'What are you studying right now? Snap a photo!',
        },
        data: { type: 'CHECKIN_PROMPT' },
      });
    }

    res.json({ message: 'Alert sent', recipients: tokens.length });
  } catch (err) {
    console.error('[CHECKIN] triggerCheckinAlert error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.checkoutCheckin = async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection('checkins').doc(id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: 'Check-in not found' });
    if (doc.data().studentId !== req.user.uid) return res.status(403).json({ error: 'Not your check-in' });
    if (doc.data().checkoutAt) return res.status(400).json({ error: 'Already checked out' });

    const checkoutAt = new Date().toISOString();
    const durationMins = Math.round(
      (new Date(checkoutAt) - new Date(doc.data().submittedAt)) / 60000
    );

    await ref.update({ checkoutAt, durationMins });
    res.json({ checkoutAt, durationMins });
  } catch (err) {
    console.error('[CHECKIN] checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
