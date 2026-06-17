const { db, messaging } = require("../services/firebase");

// Create a study schedule / check-in window
exports.createSchedule = async (req, res) => {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      days,
      targetRoles,
      targetStudentIds,
    } = req.body;
    // days: ['MON','TUE','WED','THU','FRI','SAT','SUN']
    // startTime / endTime: "HH:mm" 24h format

    const schedule = {
      title,
      description: description || "",
      startTime,
      endTime,
      days: days || ["MON", "TUE", "WED", "THU", "FRI"],
      targetRoles: targetRoles || ["student"],
      targetStudentIds: targetStudentIds || [], // empty = all students under this teacher/admin
      createdBy: req.user.uid,
      createdByRole: req.user.role,
      teacherId: req.user.role === "teacher" ? req.user.uid : null,
      isActive: true,
      requireCheckin: true,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection("schedules").add(schedule);
    res.status(201).json({ id: ref.id, ...schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get schedules
exports.getSchedules = async (req, res) => {
  try {
    let query = db.collection("schedules").where("isActive", "==", true);

    if (req.user.role === "teacher") {
      query = query.where("teacherId", "==", req.user.uid);
    } else if (req.user.role === "student") {
      // Get schedules created by their teacher or targeting them
      const teacherQuery = db
        .collection("schedules")
        .where("isActive", "==", true)
        .where("teacherId", "==", req.user.teacherId || "");
      const snap = await teacherQuery.get();
      const schedules = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (s) =>
            s.targetStudentIds.length === 0 ||
            s.targetStudentIds.includes(req.user.uid),
        );
      return res.json(schedules);
    }

    const snapshot = await query.get();
    res.json(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update schedule
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const scheduleRef = db.collection("schedules").doc(id);
    const schedule = await scheduleRef.get();
    if (!schedule.exists)
      return res.status(404).json({ error: "Schedule not found" });

    if (
      req.user.role === "teacher" &&
      schedule.data().createdBy !== req.user.uid
    ) {
      return res.status(403).json({ error: "Cannot edit this schedule" });
    }

    await scheduleRef.update({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
    res.json({ message: "Schedule updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete schedule
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("schedules").doc(id).update({ isActive: false });
    res.json({ message: "Schedule deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get today's analytics (admin/teacher)
exports.getAnalytics = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const from = req.query.from || today;
    const to = req.query.to || today;

    let usersQuery = db
      .collection("users")
      .where("role", "==", "student")
      .where("isActive", "==", true);
    if (req.user.role === "teacher")
      usersQuery = usersQuery.where("teacherId", "==", req.user.uid);

    const [usersSnap, checkinsSnap, summariesSnap] = await Promise.all([
      usersQuery.get(),
      db
        .collection("checkins")
        .where("date", ">=", from)
        .where("date", "<=", to)
        .get(),
      db
        .collection("summaries")
        .where("date", ">=", from)
        .where("date", "<=", to)
        .get(),
    ]);

    const totalStudents = usersSnap.size;
    const students = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Filter to only relevant students for teacher
    const relevantIds = new Set(students.map((s) => s.id));
    const checkins = checkinsSnap.docs
      .map((d) => d.data())
      .filter((c) => relevantIds.has(c.studentId));
    const summaries = summariesSnap.docs
      .map((d) => d.data())
      .filter((s) => relevantIds.has(s.studentId));

    res.json({
      period: { from, to },
      totalStudents,
      checkins: {
        total: checkins.length,
        approved: checkins.filter((c) => c.status === "approved").length,
      },
      summaries: {
        total: summaries.length,
        onTime: summaries.filter((s) => s.isOnTime).length,
      },
      avgStudyHours: summaries.length
        ? (
            summaries.reduce((a, s) => a + (s.studyHours || 0), 0) /
            summaries.length
          ).toFixed(1)
        : 0,
      topStudents: students
        .sort((a, b) => (b.streak || 0) - (a.streak || 0))
        .slice(0, 5)
        .map((s) => ({
          name: s.name,
          streak: s.streak,
          totalCheckIns: s.totalCheckIns,
        })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
