const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { resetUsers, findByEmail } = require("../src/models/userStore");
const { getOutbox, resetOutbox } = require("../src/services/notifier");

// TC-Auth-01 (CSQ-F-001): valid details create an active account and send a
// verification email.

function reset() {
  resetUsers();
  resetOutbox();
}

const valid = {
  email: "student1@example.com",
  password: "CorrectHorse1",
  role: "student",
};

test("TC-Auth-01: valid registration creates an active account", async () => {
  reset();
  const res = await request(app).post("/api/auth/register").send(valid);

  assert.equal(res.status, 201);
  assert.equal(res.body.email, "student1@example.com");
  assert.equal(res.body.role, "student");
  assert.equal(res.body.status, "active");
  assert.ok(res.body.id);
});

test("TC-Auth-01: a verification email is sent", async () => {
  reset();
  const res = await request(app).post("/api/auth/register").send(valid);

  assert.equal(res.body.verificationEmailSent, true);
  const outbox = getOutbox();
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "student1@example.com");
  assert.equal(outbox[0].type, "verification");
});

test("response never contains the password or its hash", async () => {
  reset();
  const res = await request(app).post("/api/auth/register").send(valid);

  const text = JSON.stringify(res.body);
  assert.ok(!text.includes("CorrectHorse1"));
  assert.ok(!("password" in res.body));
  assert.ok(!("passwordHash" in res.body));
});

test("stored password is a bcrypt hash, not plaintext (CSQ-SR-002)", async () => {
  reset();
  await request(app).post("/api/auth/register").send(valid);

  const stored = findByEmail("student1@example.com");
  assert.notEqual(stored.passwordHash, "CorrectHorse1");
  assert.match(stored.passwordHash, /^\$2[aby]\$/);
});

test("instructor can register", async () => {
  reset();
  const res = await request(app)
    .post("/api/auth/register")
    .send({ ...valid, email: "teacher@example.com", role: "instructor" });

  assert.equal(res.status, 201);
  assert.equal(res.body.role, "instructor");
});

test("duplicate email is rejected, even with different letter case", async () => {
  reset();
  await request(app).post("/api/auth/register").send(valid);
  const res = await request(app)
    .post("/api/auth/register")
    .send({ ...valid, email: "STUDENT1@example.com" });

  assert.equal(res.status, 409);
  assert.equal(getOutbox().length, 1);
});

test("invalid email is rejected", async () => {
  reset();
  const res = await request(app)
    .post("/api/auth/register")
    .send({ ...valid, email: "not-an-email" });

  assert.equal(res.status, 400);
});

test("weak or missing password is rejected", async () => {
  reset();
  const short = await request(app)
    .post("/api/auth/register")
    .send({ ...valid, password: "abc" });
  const missing = await request(app)
    .post("/api/auth/register")
    .send({ email: valid.email, role: valid.role });

  assert.equal(short.status, 400);
  assert.equal(missing.status, 400);
  assert.equal(findByEmail(valid.email), null);
});

test("cannot self-register as admin or an unknown role", async () => {
  reset();
  const admin = await request(app)
    .post("/api/auth/register")
    .send({ ...valid, role: "admin" });
  const unknown = await request(app)
    .post("/api/auth/register")
    .send({ ...valid, role: "wizard" });

  assert.equal(admin.status, 400);
  assert.equal(unknown.status, 400);
});

test("missing request body is rejected without crashing", async () => {
  reset();
  const res = await request(app).post("/api/auth/register");

  assert.equal(res.status, 400);
});
