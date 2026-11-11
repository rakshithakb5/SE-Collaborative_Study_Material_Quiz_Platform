const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { resetUsers, findByEmail } = require("../src/models/userStore");
const { resetOutbox } = require("../src/services/notifier");
const { getAuditLog, resetAuditLog } = require("../src/services/auditLog");
const {
  isLocked,
  recordFailure,
  LOCK_MINUTES,
} = require("../src/services/loginLockout");

// TC-Auth-03 (CSQ-F-003): after 5 failed logins further attempts are blocked
// for 15 minutes, a message is shown and an audit event is recorded.

const user = { email: "student1@example.com", password: "CorrectHorse1", role: "student" };
const other = { email: "other@example.com", password: "CorrectHorse2", role: "student" };

async function setup() {
  resetUsers();
  resetOutbox();
  resetAuditLog();
  await request(app).post("/api/auth/register").send(user);
  await request(app).post("/api/auth/register").send(other);
}

function attempt(email, password) {
  return request(app).post("/api/auth/login").send({ email, password });
}

async function failTimes(n, email = user.email) {
  const results = [];
  for (let i = 0; i < n; i++) results.push(await attempt(email, "WrongHorse99"));
  return results;
}

test("TC-Auth-03: attempts 1-4 are rejected normally, the 5th locks the account", async () => {
  await setup();
  const results = await failTimes(5);

  assert.deepEqual(results.slice(0, 4).map((r) => r.status), [401, 401, 401, 401]);
  assert.equal(results[4].status, 423);
  assert.match(results[4].body.error, /locked/i);
});

test("TC-Auth-03: further attempts are blocked, even with the correct password", async () => {
  await setup();
  await failTimes(5);

  const res = await attempt(user.email, user.password);

  assert.equal(res.status, 423);
  assert.equal(res.body.token, undefined);
  assert.match(res.body.error, /15 minute/);
  assert.ok(res.body.lockedUntil);
});

test("TC-Auth-03: locking records an audit event", async () => {
  await setup();
  await failTimes(5);

  const log = getAuditLog({ action: "account.lock" });
  const stored = findByEmail(user.email);

  assert.equal(log.length, 1);
  assert.equal(log[0].actor.role, "system");
  assert.equal(log[0].target, `user:${stored.id}`);
  assert.match(log[0].reason, /5 consecutive failed login attempts/);
});

test("a successful login resets the failure count", async () => {
  await setup();
  await failTimes(4);
  const ok = await attempt(user.email, user.password);
  const after = await failTimes(4);

  assert.equal(ok.status, 200);
  assert.deepEqual(after.map((r) => r.status), [401, 401, 401, 401]);
  assert.equal(getAuditLog({ action: "account.lock" }).length, 0);
});

test("locking one account does not affect another", async () => {
  await setup();
  await failTimes(5);

  const res = await attempt(other.email, other.password);

  assert.equal(res.status, 200);
});

test("wrong attempts on an unknown email never lock or log anything", async () => {
  await setup();
  const results = await failTimes(6, "nobody@example.com");

  assert.ok(results.every((r) => r.status === 401));
  assert.equal(getAuditLog().length, 0);
});

test("the lock ends after 15 minutes and a fresh count starts", async () => {
  await setup();
  await failTimes(5);
  const stored = findByEmail(user.email);
  const lockedAt = stored.lockedUntil - LOCK_MINUTES * 60 * 1000;

  assert.equal(isLocked(stored, lockedAt + 14 * 60 * 1000), true);
  assert.equal(isLocked(stored, lockedAt + 15 * 60 * 1000 + 1), false);

  // first failure after the lock expired counts as attempt 1, not attempt 6
  const result = recordFailure(stored, lockedAt + 16 * 60 * 1000);
  assert.deepEqual(result, { locked: false, attemptsLeft: 4 });
});

test("a locked account's response never contains the password hash", async () => {
  await setup();
  await failTimes(5);

  const res = await attempt(user.email, user.password);

  assert.ok(!JSON.stringify(res.body).includes("passwordHash"));
});
