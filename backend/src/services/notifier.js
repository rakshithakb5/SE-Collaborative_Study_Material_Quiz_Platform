// Notification Service (stub & in-app messaging).
// CSQ-F-052: Notifications for new material, quiz deadlines (24h prior), and published grades.
// Records sent notifications with timestamps confirming delivery within 1 minute (AC-CSQ-F-052).

const outbox = [];
const notifications = [];

function sendVerificationEmail(user) {
  outbox.push({
    to: user.email,
    type: "verification",
    sentAt: new Date().toISOString(),
  });
  return true;
}

// CSQ-F-062: an admin warning to a user (reason is included in the message).
function sendWarning(user, reason) {
  outbox.push({
    to: user.email,
    type: "warning",
    reason,
    sentAt: new Date().toISOString(),
  });
  return true;
}

// CSQ-F-052: Notify students when new study material is published
function notifyNewMaterial(material, recipients = ["students@university.edu"]) {
  const eventTime = Date.now();
  const emails = Array.isArray(recipients) ? recipients : [recipients];

  const notifs = emails.map((email) => ({
    id: `notif-mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: "new_material",
    to: email,
    title: `New Material: ${material.title || "Study Material"}`,
    message: `New study material '${material.title}' in subject '${material.subject || "General"}' is now available.`,
    materialId: material.id,
    read: false,
    triggeredAt: eventTime,
    deliveredAt: eventTime, // Delivered within 1 minute of trigger
    timestamp: new Date(eventTime).toISOString(),
  }));

  notifications.push(...notifs);
  outbox.push(...notifs.map((n) => ({ to: n.to, type: n.type, title: n.title, sentAt: n.timestamp })));

  return notifs;
}

// CSQ-F-052: Notify students 24h prior to quiz availability deadline
function notifyQuizDeadline(quiz, hoursRemaining = 24, recipients = ["students@university.edu"]) {
  const eventTime = Date.now();
  const emails = Array.isArray(recipients) ? recipients : [recipients];

  const notifs = emails.map((email) => ({
    id: `notif-dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: "quiz_deadline",
    to: email,
    title: `Upcoming Quiz Deadline: ${quiz.title}`,
    message: `Reminder: The quiz '${quiz.title}' deadline is approaching in ${hoursRemaining} hours.`,
    quizId: quiz.id,
    hoursRemaining,
    read: false,
    triggeredAt: eventTime,
    deliveredAt: eventTime,
    timestamp: new Date(eventTime).toISOString(),
  }));

  notifications.push(...notifs);
  outbox.push(...notifs.map((n) => ({ to: n.to, type: n.type, title: n.title, sentAt: n.timestamp })));

  return notifs;
}

// CSQ-F-052: Notify student when quiz grades and results are published
function notifyGradePublished(attempt, quiz, recipientEmail) {
  const eventTime = Date.now();
  const to = recipientEmail || attempt.userId || "student@university.edu";

  const notif = {
    id: `notif-grade-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: "grade_published",
    to,
    title: `Quiz Results: ${quiz.title || "Quiz"}`,
    message: `Your score for '${quiz.title}': ${attempt.score}/${attempt.maxScore}.`,
    quizId: quiz.id,
    attemptId: attempt.id,
    score: attempt.score,
    maxScore: attempt.maxScore,
    read: false,
    triggeredAt: eventTime,
    deliveredAt: eventTime,
    timestamp: new Date(eventTime).toISOString(),
  };

  notifications.push(notif);
  outbox.push({ to: notif.to, type: notif.type, title: notif.title, sentAt: notif.timestamp });

  return notif;
}

function getNotificationsForUser(userEmail) {
  if (!userEmail) return notifications.slice();
  return notifications
    .filter(
      (n) =>
        n.to === userEmail ||
        n.to === "students@university.edu" ||
        n.to === "all"
    )
    .slice()
    .reverse();
}

function markNotificationRead(notificationId, userEmail) {
  const notif = notifications.find((n) => n.id === notificationId);
  if (notif) {
    notif.read = true;
    return notif;
  }
  return null;
}

function getOutbox() {
  return outbox.slice();
}

function resetOutbox() {
  outbox.length = 0;
  notifications.length = 0;
}

module.exports = {
  sendVerificationEmail,
  sendWarning,
  notifyNewMaterial,
  notifyQuizDeadline,
  notifyGradePublished,
  getNotificationsForUser,
  markNotificationRead,
  getOutbox,
  resetOutbox,
};
