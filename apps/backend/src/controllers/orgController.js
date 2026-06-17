const { db } = require('../services/firebase');

exports.createOrg = async (req, res) => {
  try {
    const {
      name, type, typeLabel, icon, purpose,
      adminRole, supervisorRole, participantRole,
      activityLabel, reportLabel,
    } = req.body;

    if (!name?.trim() || !supervisorRole?.trim() || !participantRole?.trim()) {
      return res.status(400).json({ error: 'name, supervisorRole and participantRole are required' });
    }

    // Admin can only own one org
    const existing = await db.collection('organisations')
      .where('adminId', '==', req.user.uid).limit(1).get();
    if (!existing.empty) {
      return res.status(400).json({ error: 'You already have an organisation' });
    }

    const org = {
      name: name.trim(),
      type: type || 'custom',
      typeLabel: typeLabel || 'Custom',
      icon: icon || '🏢',
      purpose: purpose?.trim() || '',
      adminId: req.user.uid,
      adminRole: adminRole?.trim() || 'Admin',
      supervisorRole: supervisorRole.trim(),
      participantRole: participantRole.trim(),
      activityLabel: activityLabel?.trim() || 'Check-in',
      reportLabel: reportLabel?.trim() || 'Daily Report',
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const ref = await db.collection('organisations').add(org);
    // Link admin user to this org
    await db.collection('users').doc(req.user.uid).update({ organisationId: ref.id });

    res.status(201).json({ id: ref.id, ...org });
  } catch (err) {
    console.error('[ORG] createOrg error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getMyOrg = async (req, res) => {
  try {
    if (!req.user.organisationId) {
      return res.status(404).json({ error: 'No organisation linked' });
    }
    const snap = await db.collection('organisations').doc(req.user.organisationId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Organisation not found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrg = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    if (!orgId) return res.status(404).json({ error: 'No organisation linked' });

    const allowed = ['name','purpose','adminRole','supervisorRole','participantRole','activityLabel','reportLabel','icon'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    await db.collection('organisations').doc(orgId).update({
      ...updates, updatedAt: new Date().toISOString(),
    });
    res.json({ message: 'Organisation updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
