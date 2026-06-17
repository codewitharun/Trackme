const { db } = require('../services/firebase');
const { sendPushNotifications } = require('../services/push');

// Submit daily study summary (students submit by 11 PM daily)
exports.submitSummary = async (req, res) => {
  try {
    const { content, studyHours, topics, mood } = req.body;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Check if already submitted today — if so, update instead
    const existing = await db.collection('summaries')
      .where('studentId', '==', req.user.uid)
      .where('date', '==', today)
      .limit(1)
      .get();
    const existingDoc = existing.empty ? null : existing.docs[0];

    const deadline = new Date();
    deadline.setHours(23, 0, 0, 0);
    const isOnTime = now <= deadline;

    const summary = {
      studentId: req.user.uid,
      studentName: req.user.name,
      teacherId: req.user.teacherId,
      date: today,
      content,
      studyHours: parseFloat(studyHours) || 0,
      topics: topics || [],
      mood: mood || null, // 😊 great | 🙂 good | 😐 okay | 😔 tired
      submittedAt: now.toISOString(),
      isOnTime,
      feedback: null,
      rating: null,
    };

    let ref, isUpdate = false;
    if (existingDoc) {
      ref = existingDoc.ref;
      await ref.update({ ...summary, updatedAt: now.toISOString() });
      isUpdate = true;
    } else {
      ref = await db.collection('summaries').add(summary);
    }

    // Update streak
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const prevSummary = await db.collection('summaries')
      .where('studentId', '==', req.user.uid)
      .where('date', '==', yesterdayStr)
      .limit(1)
      .get();

    const newStreak = !prevSummary.empty ? (req.user.streak || 0) + 1 : 1;
    await db.collection('users').doc(req.user.uid).update({ streak: newStreak, lastSummaryDate: today });

    // Notify teacher
    if (summary.teacherId) {
      try {
        const teacherDoc = await db.collection('users').doc(summary.teacherId).get();
        const token = teacherDoc.data()?.fcmToken;
        if (token) await sendPushNotifications([token], '📝 Summary Submitted', `${req.user.name} submitted their daily summary`, { type: 'SUMMARY_SUBMIT' });
      } catch (e) { console.warn('[SUMMARY NOTIFY]', e.message); }
    }

    res.status(isUpdate ? 200 : 201).json({ id: ref.id, streak: newStreak, isOnTime, ...summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get summaries
exports.getSummaries = async (req, res) => {
  try {
    const { date, studentId, from, to } = req.query;
    let query = db.collection('summaries');

    if (req.user.role === 'student') {
      query = query.where('studentId', '==', req.user.uid);
    } else if (req.user.role === 'teacher') {
      query = query.where('teacherId', '==', req.user.uid);
      if (studentId) query = query.where('studentId', '==', studentId);
    } else {
      if (studentId) query = query.where('studentId', '==', studentId);
    }

    if (date) query = query.where('date', '==', date);
    if (from) query = query.where('date', '>=', from);
    if (to) query = query.where('date', '<=', to);

    // sort in memory to avoid composite index
    // query = query.orderBy('date', 'desc').limit(50);
    const snapshot = await query.get();
    const summaries = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 50);
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add feedback to a summary (teacher/admin)
exports.addFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, rating } = req.body;

    const summaryRef = db.collection('summaries').doc(id);
    const summary = await summaryRef.get();
    if (!summary.exists) return res.status(404).json({ error: 'Summary not found' });

    if (req.user.role === 'teacher' && summary.data().teacherId !== req.user.uid) {
      return res.status(403).json({ error: 'Cannot review this summary' });
    }

    await summaryRef.update({ feedback, rating: rating || null, reviewedAt: new Date().toISOString(), reviewedBy: req.user.uid });

    // Notify student
    const student = await db.collection('users').doc(summary.data().studentId).get();
    const token = student.data()?.fcmToken;
    if (token) await sendPushNotifications([token], '📝 Summary Feedback', feedback);

    res.json({ message: 'Feedback added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get students who haven't submitted today's summary (teacher/admin)
exports.getMissingSummaries = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let usersQuery = db.collection('users').where('role', '==', 'student').where('isActive', '==', true);
    if (req.user.role === 'teacher') {
      usersQuery = usersQuery.where('teacherId', '==', req.user.uid);
    }

    const [usersSnap, summariesSnap] = await Promise.all([
      usersQuery.get(),
      db.collection('summaries').where('date', '==', today).get(),
    ]);

    const submittedIds = new Set(summariesSnap.docs.map(d => d.data().studentId));
    const missing = usersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => !submittedIds.has(u.id));

    res.json({ date: today, missing, count: missing.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
