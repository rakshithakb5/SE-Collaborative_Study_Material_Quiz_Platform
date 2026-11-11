// Account lockout (CSQ-F-003).
// After 5 consecutive failed logins an account is locked for 15 minutes and an
// audit event is recorded. A successful login resets the counter.
//
// The functions take an optional `now` (milliseconds) so tests can check what
// happens after the lock expires without waiting 15 minutes.

const { recordAuditEvent } = require("./auditLog");

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const LOCK_MS = LOCK_MINUTES * 60 * 1000;

function isLocked(user, now = Date.now()) {
  return Boolean(user.lockedUntil && user.lockedUntil > now);
}

function minutesRemaining(user, now = Date.now()) {
  return Math.max(1, Math.ceil((user.lockedUntil - now) / 60000));
}

// Call after a wrong password for an existing account.
// Returns { locked: true } when this failure caused the lock.
function recordFailure(user, now = Date.now()) {
  // An expired lock starts a fresh count.
  if (user.lockedUntil && user.lockedUntil <= now) {
    user.lockedUntil = null;
    user.failedLoginCount = 0;
  }

  user.failedLoginCount = (user.failedLoginCount || 0) + 1;

  if (user.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
    user.lockedUntil = now + LOCK_MS;
    recordAuditEvent({
      actor: { id: "system", role: "system" },
      action: "account.lock",
      target: `user:${user.id}`,
      reason: `${MAX_FAILED_ATTEMPTS} consecutive failed login attempts; locked for ${LOCK_MINUTES} minutes`,
    });
    return { locked: true };
  }

  return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - user.failedLoginCount };
}

// Call after a successful login.
function recordSuccess(user) {
  user.failedLoginCount = 0;
  user.lockedUntil = null;
}

module.exports = {
  isLocked,
  minutesRemaining,
  recordFailure,
  recordSuccess,
  MAX_FAILED_ATTEMPTS,
  LOCK_MINUTES,
};
