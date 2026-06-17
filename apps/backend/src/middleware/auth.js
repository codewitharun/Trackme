const { auth, db } = require('../services/firebase');

const authenticate = async (req, res, next) => {
  const tag = `[AUTH] ${req.method} ${req.path}`;
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      console.warn(`${tag} → no token`);
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      console.warn(`${tag} → user not found uid=${decoded.uid}`);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = { uid: decoded.uid, ...userDoc.data() };

    // Attach org config if user belongs to one
    if (req.user.organisationId) {
      const orgDoc = await db.collection('organisations').doc(req.user.organisationId).get();
      if (orgDoc.exists) req.org = { id: orgDoc.id, ...orgDoc.data() };
    }

    console.log(`${tag} → ${req.user.email} role=${req.user.role} org=${req.user.organisationId || 'none'}`);
    next();
  } catch (err) {
    console.error(`${tag} → failed:`, err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    console.warn(`[AUTHZ] ${req.method} ${req.path} → role=${req.user?.role} denied`);
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, requireRole };
