const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { createUser, resetUsers } = require("../src/models/userStore");
const { createMaterial, resetMaterialData } = require("../src/routes/materials");
const { getAuditLog, verifyChain, resetAuditLog } = require("../src/services/auditLog");
const { getOutbox, resetOutbox } = require("../src/services/notifier");
const { hashPassword } = require("../src/utils/password");

// TC-Admin-01..: CSQ-F-060 (suspend/reactivate), CSQ-F-062 (warn, remove content)

const admin = { id: "admin-1", role: "admin", email: "admin@example.com" };
const student = { id: "s-1", role: "student" };
const as = (u) => ({ "x-test-user": JSON.stringify(u) });

async function setup() {
  resetUsers();
  resetAuditLog();
  resetOutbox();
  resetMaterialData();
  const passwordHash = await hashPassword("Password123");
  const user = createUser({ email: "stu@example.com", passwordHash, role: "student" });
  const other = createUser({ email: "adm2@example.com", passwordHash, role: "admin" });
  return { user, other };
}

test("only admins can list users", async () => {
  await setup();
  assert.equal((await request(app).get("/api/admin/users")).status, 401);
  assert.equal((await request(app).get("/api/admin/users").set(as(student))).status, 403);
  const res = await request(app).get("/api/admin/users").set(as(admin));
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.users[0].passwordHash, undefined);
});

test("suspend requires a reason", async () => {
  const { user } = await setup();
  const res = await request(app).post(`/api/admin/users/${user.id}/suspend`).set(as(admin)).send({});
  assert.equal(res.status, 400);
});

test("students cannot suspend users", async () => {
  const { user } = await setup();
  const res = await request(app).post(`/api/admin/users/${user.id}/suspend`).set(as(student)).send({ reason: "x" });
  assert.equal(res.status, 403);
});

test("suspend: unknown user 404, admin target 403, double suspend 409", async () => {
  const { user, other } = await setup();
  const body = { reason: "Spam" };
  assert.equal((await request(app).post("/api/admin/users/nope/suspend").set(as(admin)).send(body)).status, 404);
  assert.equal((await request(app).post(`/api/admin/users/${other.id}/suspend`).set(as(admin)).send(body)).status, 403);
  assert.equal((await request(app).post(`/api/admin/users/${user.id}/suspend`).set(as(admin)).send(body)).status, 200);
  assert.equal((await request(app).post(`/api/admin/users/${user.id}/suspend`).set(as(admin)).send(body)).status, 409);
});

test("a suspended user cannot log in, and an old token stops working", async () => {
  const { user } = await setup();
  const login = await request(app).post("/api/auth/login").send({ email: "stu@example.com", password: "Password123" });
  assert.equal(login.status, 200);
  const token = login.body.token;

  await request(app).post(`/api/admin/users/${user.id}/suspend`).set(as(admin)).send({ reason: "Cheating" });

  const again = await request(app).post("/api/auth/login").send({ email: "stu@example.com", password: "Password123" });
  assert.equal(again.status, 403);
  const old = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  assert.equal(old.status, 403);
});

test("reactivate restores access and needs a suspended user", async () => {
  const { user } = await setup();
  const url = `/api/admin/users/${user.id}/reactivate`;
  assert.equal((await request(app).post(url).set(as(admin)).send({ reason: "Appeal" })).status, 409);
  await request(app).post(`/api/admin/users/${user.id}/suspend`).set(as(admin)).send({ reason: "Cheating" });
  const res = await request(app).post(url).set(as(admin)).send({ reason: "Appeal accepted" });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "active");
  const login = await request(app).post("/api/auth/login").send({ email: "stu@example.com", password: "Password123" });
  assert.equal(login.status, 200);
});

test("suspend and reactivate are audit-logged with actor and reason", async () => {
  const { user } = await setup();
  await request(app).post(`/api/admin/users/${user.id}/suspend`).set(as(admin)).send({ reason: "Cheating" });
  await request(app).post(`/api/admin/users/${user.id}/reactivate`).set(as(admin)).send({ reason: "Appeal" });
  const log = getAuditLog({ target: `user:${user.id}` });
  assert.deepEqual(log.map((e) => e.action), ["user.suspend", "user.reactivate"]);
  assert.equal(log[0].actor.id, "admin-1");
  assert.equal(log[0].reason, "Cheating");
  assert.equal(verifyChain().valid, true);
});

test("warn sends a notification and is audit-logged", async () => {
  const { user } = await setup();
  assert.equal((await request(app).post(`/api/admin/users/${user.id}/warn`).set(as(admin)).send({})).status, 400);
  const res = await request(app).post(`/api/admin/users/${user.id}/warn`).set(as(admin)).send({ reason: "Offensive comment" });
  assert.equal(res.status, 200);
  const mail = getOutbox().find((m) => m.type === "warning");
  assert.equal(mail.to, "stu@example.com");
  assert.equal(mail.reason, "Offensive comment");
  assert.equal(getAuditLog({ action: "user.warn" }).length, 1);
  assert.equal((await request(app).post(`/api/admin/users/${user.id}/warn`).set(as(student)).send({ reason: "x" })).status, 403);
});

test("remove content hides the material and is audit-logged", async () => {
  await setup();
  createMaterial("m1", { title: "Notes", content: "hello" });
  const url = "/api/admin/materials/m1/remove";

  assert.equal((await request(app).post(url).set(as(student)).send({ reason: "x" })).status, 403);
  assert.equal((await request(app).post(url).set(as(admin)).send({})).status, 400);
  assert.equal((await request(app).post("/api/admin/materials/nope/remove").set(as(admin)).send({ reason: "x" })).status, 404);

  const res = await request(app).post(url).set(as(admin)).send({ reason: "Copyright complaint" });
  assert.equal(res.status, 200);

  assert.equal((await request(app).get("/api/materials/m1/versions").set(as(student))).status, 404);
  assert.equal((await request(app).post(url).set(as(admin)).send({ reason: "again" })).status, 404);

  const log = getAuditLog({ action: "content.remove" });
  assert.equal(log.length, 1);
  assert.equal(log[0].target, "material:m1");
  assert.equal(log[0].reason, "Copyright complaint");
});
