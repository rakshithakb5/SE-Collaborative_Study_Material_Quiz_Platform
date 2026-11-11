const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { resetUsers } = require("../src/models/userStore");
const { resetOutbox } = require("../src/services/notifier");
const { verifyToken } = require("../src/utils/jwt");

// TC-Auth-02 (CSQ-F-002): correct credentials return a valid token;
// incorrect credentials are rejected.

const student = {
  email: "student1@example.com",
  password: "CorrectHorse1",
  role: "student",
};
const instructor = {
  email: "teacher@example.com",
  password: "CorrectHorse2",
  role: "instructor",
};

async function setup() {
  resetUsers();
  resetOutbox();
  await request(app).post("/api/auth/register").send(student);
  await request(app).post("/api/auth/register").send(instructor);
}

async function login(creds) {
  return request(app)
    .post("/api/auth/login")
    .send({ email: creds.email, password: creds.password });
}

test("TC-Auth-02: correct credentials return a valid signed token", async () => {
  await setup();
  const res = await login(student);

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.expiresIn, 3600);

  const payload = verifyToken(res.body.token);
  assert.equal(payload.email, "student1@example.com");
  assert.equal(payload.role, "student");
});

test("TC-Auth-02: login is case-insensitive on email", async () => {
  await setup();
  const res = await login({ ...student, email: "STUDENT1@Example.com" });

  assert.equal(res.status, 200);
});

test("TC-Auth-02: wrong password is rejected", async () => {
  await setup();
  const res = await login({ ...student, password: "WrongHorse99" });

  assert.equal(res.status, 401);
  assert.equal(res.body.token, undefined);
});

test("unknown email gets the same error as a wrong password", async () => {
  await setup();
  const wrongPassword = await login({ ...student, password: "WrongHorse99" });
  const unknownEmail = await login({
    email: "nobody@example.com",
    password: "CorrectHorse1",
  });

  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(unknownEmail.body, wrongPassword.body);
});

test("missing credentials are rejected without crashing", async () => {
  await setup();
  const empty = await request(app).post("/api/auth/login");
  const noPassword = await request(app)
    .post("/api/auth/login")
    .send({ email: student.email });

  assert.equal(empty.status, 400);
  assert.equal(noPassword.status, 400);
});

test("login response never contains the password hash", async () => {
  await setup();
  const res = await login(student);

  assert.ok(!JSON.stringify(res.body).includes("passwordHash"));
  assert.ok(!JSON.stringify(res.body).includes("$2"));
});

test("GET /api/auth/me returns the logged-in user", async () => {
  await setup();
  const { body } = await login(student);
  const res = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${body.token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.email, "student1@example.com");
});

test("GET /api/auth/me rejects missing, malformed and tampered tokens", async () => {
  await setup();
  const { body } = await login(student);

  const none = await request(app).get("/api/auth/me");
  const malformed = await request(app)
    .get("/api/auth/me")
    .set("Authorization", "Token abc");
  const tampered = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${body.token}x`);

  assert.equal(none.status, 401);
  assert.equal(malformed.status, 401);
  assert.equal(tampered.status, 401);
});

test("a real login token drives role checks: instructor allowed, student blocked", async () => {
  await setup();
  const t = (await login(instructor)).body.token;
  const s = (await login(student)).body.token;

  const allowed = await request(app)
    .get("/api/question-bank")
    .set("Authorization", `Bearer ${t}`);
  const blocked = await request(app)
    .get("/api/question-bank")
    .set("Authorization", `Bearer ${s}`);
  const anonymous = await request(app).get("/api/question-bank");

  assert.equal(allowed.status, 200);
  assert.equal(blocked.status, 403);
  assert.equal(anonymous.status, 401);
});
