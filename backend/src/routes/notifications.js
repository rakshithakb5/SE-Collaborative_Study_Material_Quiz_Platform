const express = require("express");
const { requireRole } = require("../middleware/rbac");
const {
  getNotificationsForUser,
  markNotificationRead,
  notifyQuizDeadline,
} = require("../services/notifier");
const { quizzes } = require("../models/quizStore");

const router = express.Router();

// GET /api/notifications - Get notifications for authenticated user (CSQ-F-052)
router.get("/", (req, res) => {
  const email = req.user ? req.user.email || req.user.id : null;
  const list = getNotificationsForUser(email);
  return res.status(200).json({ count: list.length, notifications: list });
});

// PATCH /api/notifications/:id/read - Mark a notification as read
router.patch("/:id/read", (req, res) => {
  const { id } = req.params;
  const email = req.user ? req.user.email || req.user.id : null;
  const updated = markNotificationRead(id, email);
  if (!updated) {
    return res.status(404).json({ error: "Notification not found" });
  }
  return res.status(200).json({ notification: updated });
});

// POST /api/notifications/deadline-check - Trigger 24h deadline notifications for approaching quizzes (CSQ-F-052)
router.post("/deadline-check", requireRole("instructor", "admin"), (req, res) => {
  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const triggered = [];

  for (const quiz of quizzes.values()) {
    if (!quiz.published || !quiz.availabilityWindow || !quiz.availabilityWindow.end) {
      continue;
    }

    const endTime = new Date(quiz.availabilityWindow.end).getTime();
    const diff = endTime - now;

    // Approaching within 24 hours and not yet closed
    if (diff > 0 && diff <= TWENTY_FOUR_HOURS_MS) {
      const hoursRemaining = Math.max(1, Math.round(diff / (60 * 60 * 1000)));
      const notifs = notifyQuizDeadline(quiz, hoursRemaining);
      triggered.push(...notifs);
    }
  }

  return res.status(200).json({ count: triggered.length, notifications: triggered });
});

module.exports = router;
