
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const {
  requireRole,
  requirePermission,
} = require("../src/middleware/rbac");

function createTestApp(user) {
  const app = express();

  app.use((req, res, next) => {
    if (user) req.user = user;
    next();
  });

  app.get("/student", requireRole("student"), (req, res) => {
    res.sendStatus(200);
  });

  app.get("/instructor", requireRole("instructor"), (req, res) => {
    res.sendStatus(200);
  });

  app.get("/admin", requireRole("admin"), (req, res) => {
    res.sendStatus(200);
  });

  app.get(
    "/materials",
    requirePermission("materials:read"),
    (req, res) => res.sendStatus(200)
  );

  app.get(
    "/create-material",
    requirePermission("materials:create"),
    (req, res) => res.sendStatus(200)
  );

  return app;
}

const roles = ["student", "instructor", "admin"];

for (const role of roles) {
  test(`${role} can access its own role route`, async () => {
    const response = await request(
      createTestApp({ id: `${role}-1`, role })
    ).get(`/${role}`);

    assert.equal(response.status, 200);
  });

  test(`${role} can read materials`, async () => {
    const response = await request(
      createTestApp({ id: `${role}-1`, role })
    ).get("/materials");

    assert.equal(response.status, 200);
  });
}

test("rejects requests without an authenticated user", async () => {
  const response = await request(createTestApp(null)).get("/instructor");
  assert.equal(response.status, 401);
});

test("rejects a student from instructor-only routes", async () => {
  const response = await request(
    createTestApp({ id: "student-1", role: "student" })
  ).get("/instructor");

  assert.equal(response.status, 403);
});

test("rejects an instructor from admin-only routes", async () => {
  const response = await request(
    createTestApp({ id: "instructor-1", role: "instructor" })
  ).get("/admin");

  assert.equal(response.status, 403);
});

test("rejects a student from material creation", async () => {
  const response = await request(
    createTestApp({ id: "student-1", role: "student" })
  ).get("/create-material");

  assert.equal(response.status, 403);
});

test("rejects unknown roles", async () => {
  const response = await request(
    createTestApp({ id: "user-1", role: "unknown" })
  ).get("/materials");

  assert.equal(response.status, 403);
});
