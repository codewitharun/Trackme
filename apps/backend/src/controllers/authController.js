const { auth, db } = require('../services/firebase');

exports.register = async (req, res) => {
  try {
    const { email, password, name, role, supervisorId } = req.body;

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (role === 'admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create admin accounts' });
    }
    if (role === 'teacher' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create supervisor accounts' });
    }

    // Require org for admin/teacher creating users
    if (!req.user.organisationId) {
      return res.status(400).json({ error: 'Set up your organisation before creating users' });
    }

    const userRecord = await auth.createUser({ email, password, displayName: name });

    const userData = {
      uid: userRecord.uid,
      email,
      name,
      role,
      organisationId: req.user.organisationId,
      // supervisorId replaces old teacherId — still maps to teacher uid for students
      supervisorId: role === 'student' ? (supervisorId || null) : null,
      // keep teacherId for backwards compat
      teacherId: role === 'student' ? (supervisorId || null) : null,
      createdAt: new Date().toISOString(),
      streak: 0,
      totalCheckIns: 0,
      isActive: true,
      fcmToken: null,
    };

    await db.collection('users').doc(userRecord.uid).set(userData);
    res.status(201).json({ message: 'User created', uid: userRecord.uid });
  } catch (err) {
    console.error('[AUTH] register error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  // Include org config in profile response
  const profile = { ...req.user };
  if (req.org) profile.org = req.org;
  res.json(profile);
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await db.collection('users').doc(req.user.uid).update({ fcmToken });
    res.json({ message: 'FCM token updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = db.collection('users')
      .where('organisationId', '==', req.user.organisationId);

    if (req.user.role === 'teacher') {
      // Teachers see only their own participants
      query = query.where('supervisorId', '==', req.user.uid);
    } else if (role) {
      query = query.where('role', '==', role);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    console.error('[AUTH] listUsers error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = { ...req.body };
    delete updates.uid;
    delete updates.role;
    delete updates.organisationId;
    await db.collection('users').doc(uid).update({ ...updates, updatedAt: new Date().toISOString() });
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const { uid } = req.params;
    await db.collection('users').doc(uid).update({ isActive: false });
    await auth.updateUser(uid, { disabled: true });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
