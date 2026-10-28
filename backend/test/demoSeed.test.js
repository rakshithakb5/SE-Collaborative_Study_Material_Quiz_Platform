const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { resetUsers } = require("../src/models/userStore");
const { resetMaterialData } = require("../src/routes/materials");
const { seedDemoData, DEMO_USERS } = require("../src/services/demoSeed");

test("demo seed creates one account per role that can log in", async () => {
  resetUsers();
  resetMaterialData();
  await seedDemoData();
  for (const { email, password, role } of DEMO_USERS) {
    const res = await request(app).post("/api/auth/login").send({ email, password });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, role);
  }
});

test("demo seed holds the copied upload for admin review", async () => {
  resetUsers();
  resetMaterialData();
  await seedDemoData();
  const admin = { id: "a-1", role: "admin" };
  const res = await request(app)
    .get("/api/admin/materials/review-queue")
    .set({ "x-test-user": JSON.stringify(admin) });
  assert.equal(res.body.count, 1);
  assert.equal(res.body.items[0].materialId, "demo-bst-copy");
});

test("demo seed can run twice without duplicating anything", async () => {
  resetUsers();
  resetMaterialData();
  await seedDemoData();
  await seedDemoData();
  const admin = { id: "a-1", role: "admin" };
  const res = await request(app)
    .get("/api/admin/users")
    .set({ "x-test-user": JSON.stringify(admin) });
  assert.equal(res.body.count, DEMO_USERS.length);
});
