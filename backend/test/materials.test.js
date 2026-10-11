
const request = require("supertest");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const {
  createMaterial,
  resetMaterialData,
} = require("../src/routes/materials");

const student = { id: "student-1", role: "student" };
const instructor = { id: "instructor-1", role: "instructor" };

beforeEach(() => {
  resetMaterialData();
  createMaterial("material-1", {
    title: "DBMS Notes",
    content: "Initial notes",
  });
});

test("returns the initial material version", async () => {
  const response = await request(app)
    .get("/api/materials/material-1/versions")
    .set("x-test-user", JSON.stringify(student));

  assert.equal(response.status, 200);
  assert.equal(response.body.versions.length, 1);
  assert.equal(response.body.versions[0].version, 1);
});

test("creates a new material version", async () => {
  const response = await request(app)
    .post("/api/materials/material-1/versions")
    .set("x-test-user", JSON.stringify(instructor))
    .send({ content: "Updated notes" });

  assert.equal(response.status, 201);
  assert.equal(response.body.version.version, 2);
  assert.equal(response.body.version.content, "Updated notes");

  const history = await request(app)
    .get("/api/materials/material-1/versions")
    .set("x-test-user", JSON.stringify(student));

  assert.equal(history.status, 200);
  assert.equal(history.body.versions.length, 2);
  assert.equal(history.body.versions[0].content, "Initial notes");
});

test("rejects an empty version", async () => {
  const response = await request(app)
    .post("/api/materials/material-1/versions")
    .set("x-test-user", JSON.stringify(instructor))
    .send({ content: "   " });

  assert.equal(response.status, 400);
});

test("returns 404 for an unknown material", async () => {
  const response = await request(app)
    .get("/api/materials/unknown/versions")
    .set("x-test-user", JSON.stringify(student));

  assert.equal(response.status, 404);
});

test("rejects a student from creating a material version", async () => {
    const response = await request(app)
      .post("/api/materials/material-1/versions")
      .set("x-test-user", JSON.stringify(student))
      .send({ content: "Student edit" });
  
    assert.equal(response.status, 403);
  });
  
test("rejects unauthenticated access to material versions", async () => {
    const response = await request(app)
      .get("/api/materials/material-1/versions");
  
    assert.equal(response.status, 401);
  });
  
test("downloads a specific material version", async () => {
    const response = await request(app)
      .get("/api/materials/material-1/versions/1/download")
      .set("x-test-user", JSON.stringify(student));
  
    assert.equal(response.status, 200);
    assert.match(
      response.headers["content-disposition"],
      /attachment/
    );
    assert.equal(response.text, "Initial notes");
  });
  
  test("returns 404 when the requested material version does not exist", async () => {
    const response = await request(app)
      .get("/api/materials/material-1/versions/99/download")
      .set("x-test-user", JSON.stringify(student));
  
    assert.equal(response.status, 404);
  });
  