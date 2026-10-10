const request = require("supertest");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");

test("GET /api/health returns 200 and API status", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(
    response.body.message,
    "Collaborative Study Material & Quiz Platform API is running"
  );
});
