const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../services/cloudinary');

const authCtrl    = require('../controllers/authController');
const checkinCtrl = require('../controllers/checkinController');
const summaryCtrl = require('../controllers/summaryController');
const scheduleCtrl = require('../controllers/scheduleController');
const orgCtrl     = require('../controllers/orgController');

// ── Organisation ──────────────────────────────────────────────────────────────
router.post('/organisations',        authenticate, requireRole('admin'), orgCtrl.createOrg);
router.get('/organisations/mine',    authenticate, orgCtrl.getMyOrg);
router.put('/organisations/mine',    authenticate, requireRole('admin'), orgCtrl.updateOrg);

// ── Auth / Users ──────────────────────────────────────────────────────────────
router.get('/profile',              authenticate, authCtrl.getProfile);
router.post('/register',            authenticate, requireRole('admin', 'teacher'), authCtrl.register);
router.put('/profile/fcm',          authenticate, authCtrl.updateFcmToken);
router.get('/users',                authenticate, requireRole('admin', 'teacher'), authCtrl.listUsers);
router.put('/users/:uid',           authenticate, requireRole('admin'), authCtrl.updateUser);
router.delete('/users/:uid',        authenticate, requireRole('admin'), authCtrl.deactivateUser);

// ── Check-ins ─────────────────────────────────────────────────────────────────
router.post('/checkins',            authenticate, requireRole('student'), upload.single('image'), checkinCtrl.submitCheckin);
router.get('/checkins',             authenticate, checkinCtrl.getCheckins);
router.put('/checkins/:id/review',  authenticate, requireRole('admin', 'teacher'), checkinCtrl.reviewCheckin);
router.patch('/checkins/:id/checkout', authenticate, requireRole('student'), checkinCtrl.checkoutCheckin);
router.post('/checkins/alert',      authenticate, requireRole('admin', 'teacher'), checkinCtrl.triggerCheckinAlert);

// ── Daily Summaries ───────────────────────────────────────────────────────────
router.post('/summaries',           authenticate, requireRole('student'), summaryCtrl.submitSummary);
router.get('/summaries',            authenticate, summaryCtrl.getSummaries);
router.put('/summaries/:id/feedback', authenticate, requireRole('admin', 'teacher'), summaryCtrl.addFeedback);
router.get('/summaries/missing',    authenticate, requireRole('admin', 'teacher'), summaryCtrl.getMissingSummaries);

// ── Schedules ─────────────────────────────────────────────────────────────────
router.post('/schedules',           authenticate, requireRole('admin', 'teacher'), scheduleCtrl.createSchedule);
router.get('/schedules',            authenticate, scheduleCtrl.getSchedules);
router.put('/schedules/:id',        authenticate, requireRole('admin', 'teacher'), scheduleCtrl.updateSchedule);
router.delete('/schedules/:id',     authenticate, requireRole('admin', 'teacher'), scheduleCtrl.deleteSchedule);
router.get('/analytics',            authenticate, requireRole('admin', 'teacher'), scheduleCtrl.getAnalytics);

module.exports = router;
