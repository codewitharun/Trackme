const cron = require('node-cron');
const { db, messaging } = require('./firebase');

const sendPushToStudents = async (teacherId, title, body, data = {}) => {
  let query = db.collection('users').where('role', '==', 'student').where('isActive', '==', true);
  if (teacherId) query = query.where('teacherId', '==', teacherId);

  const snapshot = await query.get();
  const tokens = snapshot.docs.map(d => d.data().fcmToken).filter(Boolean);

  if (tokens.length > 0) {
    await messaging.sendEachForMulticast({ tokens, notification: { title, body }, data }).catch(() => {});
  }
  return tokens.length;
};

const startCronJobs = () => {
  // Daily 11 PM reminder to submit summary
  cron.schedule('0 22 * * *', async () => {
    console.log('[CRON] Sending 11 PM summary reminder...');
    const today = new Date().toISOString().split('T')[0];

    // Find students who haven't submitted today
    const [studentsSnap, summariesSnap] = await Promise.all([
      db.collection('users').where('role', '==', 'student').where('isActive', '==', true).get(),
      db.collection('summaries').where('date', '==', today).get(),
    ]);

    const submittedIds = new Set(summariesSnap.docs.map(d => d.data().studentId));
    const missing = studentsSnap.docs.filter(d => !submittedIds.has(d.id));
    const tokens = missing.map(d => d.data().fcmToken).filter(Boolean);

    if (tokens.length > 0) {
      await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: '📝 Daily Summary Due!',
          body: '1 hour left to submit your study summary for today. Don\'t break your streak!',
        },
        data: { type: 'SUMMARY_REMINDER' },
      }).catch(() => {});
    }

    console.log(`[CRON] Reminder sent to ${tokens.length} students`);
  });

  // Daily 11 PM hard deadline (1 minute after to mark late)
  cron.schedule('1 23 * * *', async () => {
    console.log('[CRON] Marking late summaries...');
    const today = new Date().toISOString().split('T')[0];

    const [studentsSnap, summariesSnap] = await Promise.all([
      db.collection('users').where('role', '==', 'student').where('isActive', '==', true).get(),
      db.collection('summaries').where('date', '==', today).get(),
    ]);

    const submittedIds = new Set(summariesSnap.docs.map(d => d.data().studentId));

    // Reset streak for students who missed summary
    const batch = db.batch();
    studentsSnap.docs.forEach(doc => {
      if (!submittedIds.has(doc.id) && (doc.data().streak || 0) > 0) {
        batch.update(doc.ref, { streak: 0 });
      }
    });
    await batch.commit();
  });

  // Morning check-in prompt (8 AM)
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Sending morning check-in prompt...');
    await sendPushToStudents(null, '🌅 Good Morning! Start Studying', 'Open TrackMe to log your study session and check your schedule for today.', { type: 'MORNING_PROMPT' });
  });

  // Mid-day check-in (2 PM on weekdays)
  cron.schedule('0 14 * * 1-5', async () => {
    console.log('[CRON] Sending afternoon check-in prompt...');
    await sendPushToStudents(null, '📸 Afternoon Check-in', 'What are you studying right now? Snap a photo to log your activity!', { type: 'CHECKIN_PROMPT' });
  });

  // Evening check-in (7 PM)
  cron.schedule('0 19 * * *', async () => {
    console.log('[CRON] Sending evening check-in prompt...');
    await sendPushToStudents(null, '📚 Evening Study Session', 'Time for your evening study! Open TrackMe to check in.', { type: 'CHECKIN_PROMPT' });
  });

  console.log('[CRON] All jobs scheduled ✅');
};

module.exports = { startCronJobs };
