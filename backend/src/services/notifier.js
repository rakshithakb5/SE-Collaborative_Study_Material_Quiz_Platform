// Stand-in for the external Notification Service (email/push gateway).
// It records "sent" emails in memory so features and tests can check them.
// Replace the body of sendVerificationEmail with a real gateway call later.

const outbox = [];

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

function getOutbox() {
  return outbox.slice();
}

function resetOutbox() {
  outbox.length = 0;
}

module.exports = {
  sendVerificationEmail,
  sendWarning,
  getOutbox,
  resetOutbox,
};
