const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { resetMaterialData } = require("../src/routes/materials");
const { setProvider } = require("../src/services/plagiarismService");
const { getAuditLog, resetAuditLog } = require("../src/services/auditLog");

// TC-Mat-02 (CSQ-F-011): material above the similarity threshold is flagged
// for review before publication.

const instructor = { id: "i-1", role: "instructor" };
const admin = { id: "a-1", role: "admin", email: "a@example.com" };
const student = { id: "s-1", role: "student" };
const as = (u) => ({ "x-test-user": JSON.stringify(u) });

const ORIGINAL =
  "Photosynthesis converts light energy into chemical energy stored in glucose inside the chloroplasts of green plants";
const OTHER =
  "A binary search tree keeps smaller keys on the left and larger keys on the right so lookups stay fast";

function reset() {
  resetMaterialData();
  resetAuditLog();
  setProvider(null);
}

function upload(user, body) {
  return request(app).post("/api/materials").set(as(user)).send(body);
}

test("original material is scanned and published", async () => {
  reset();
  const res = await upload(instructor, { title: "Biology", content: ORIGINAL });
  assert.equal(res.status, 201);
  assert.equal(res.body.status, "published");
  assert.equal(res.body.scan.status, "completed");
  assert.equal(res.body.scan.similarity, 0);
});

test("copied material is flagged and hidden from students", async () => {
  reset();
  await upload(instructor, { title: "Biology", content: ORIGINAL });
  const copy = await upload(instructor, { title: "My notes", content: ORIGINAL });
  assert.equal(copy.status, 201);
  assert.equal(copy.body.status, "flagged");
  assert.ok(copy.body.scan.similarity >= 0.3);

  const id = copy.body.materialId;
  assert.equal((await request(app).get(`/api/materials/${id}/versions`).set(as(student))).status, 404);
  assert.equal((await request(app).get(`/api/materials/${id}/versions`).set(as(instructor))).status, 200);
});

test("different material is not flagged", async () => {
  reset();
  await upload(instructor, { title: "Biology", content: ORIGINAL });
  const res = await upload(instructor, { title: "Trees", content: OTHER });
  assert.equal(res.body.status, "published");
});

test("upload needs instructor/admin, a title and content", async () => {
  reset();
  assert.equal((await upload(student, { title: "x", content: "y" })).status, 403);
  assert.equal((await request(app).post("/api/materials").send({})).status, 401);
  assert.equal((await upload(instructor, { content: "y" })).status, 400);
  assert.equal((await upload(instructor, { title: "x", content: "  " })).status, 400);
});

test("service outage: retried once, then held for manual review", async () => {
  reset();
  let calls = 0;
  setProvider(async () => {
    calls++;
    throw new Error("service down");
  });
  const res = await upload(instructor, { title: "Biology", content: ORIGINAL });
  assert.equal(res.status, 201);
  assert.equal(res.body.status, "pending_review");
  assert.equal(res.body.scan.status, "unavailable");
  assert.equal(calls, 2);
  setProvider(null);
});

test("a flaky service that works on the retry still publishes", async () => {
  reset();
  let calls = 0;
  setProvider(async () => {
    calls++;
    if (calls === 1) throw new Error("blip");
    return { similarity: 0, matchedMaterialId: null };
  });
  const res = await upload(instructor, { title: "Biology", content: ORIGINAL });
  assert.equal(res.body.status, "published");
  setProvider(null);
});

test("a copied new version re-flags a published material", async () => {
  reset();
  await upload(instructor, { title: "Biology", content: ORIGINAL });
  const mine = await upload(instructor, { title: "Trees", content: OTHER });
  const res = await request(app)
    .post(`/api/materials/${mine.body.materialId}/versions`)
    .set(as(instructor))
    .send({ content: ORIGINAL });
  assert.equal(res.status, 201);
  assert.equal(res.body.status, "flagged");
});

test("admin review queue lists held items with reason and source", async () => {
  reset();
  await upload(instructor, { title: "Biology", content: ORIGINAL });
  const copy = await upload(instructor, { title: "My notes", content: ORIGINAL });

  assert.equal((await request(app).get("/api/admin/materials/review-queue").set(as(student))).status, 403);
  const res = await request(app).get("/api/admin/materials/review-queue").set(as(admin));
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.items[0].materialId, copy.body.materialId);
  assert.equal(res.body.items[0].source, "plagiarism-service");
  assert.match(res.body.items[0].reason, /Similarity/);
});

test("admin approves a flagged item: it becomes visible and is audit-logged", async () => {
  reset();
  await upload(instructor, { title: "Biology", content: ORIGINAL });
  const copy = await upload(instructor, { title: "My notes", content: ORIGINAL });
  const id = copy.body.materialId;
  const url = `/api/admin/materials/${id}/approve`;

  assert.equal((await request(app).post(url).set(as(admin)).send({})).status, 400);
  assert.equal((await request(app).post(url).set(as(instructor)).send({ reason: "x" })).status, 403);
  assert.equal((await request(app).post(url).set(as(admin)).send({ reason: "Own work, cites source" })).status, 200);
  assert.equal((await request(app).post(url).set(as(admin)).send({ reason: "again" })).status, 409);
  assert.equal((await request(app).get(`/api/materials/${id}/versions`).set(as(student))).status, 200);

  const log = getAuditLog({ action: "content.approve" });
  assert.equal(log.length, 1);
  assert.equal(log[0].target, `material:${id}`);
});
