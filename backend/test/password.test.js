const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hashPassword,
  verifyPassword,
  MAX_BYTES,
} = require("../src/utils/password");

// TC-Sec-02 (CSQ-SR-002): passwords are hashed, salted, never plaintext.

test("hash is not the plaintext password", async () => {
  const hash = await hashPassword("CorrectHorse1");
  assert.notEqual(hash, "CorrectHorse1");
  assert.ok(!hash.includes("CorrectHorse1"));
});

test("hash uses bcrypt format", async () => {
  const hash = await hashPassword("CorrectHorse1");
  assert.match(hash, /^\$2[aby]\$\d{2}\$.{53}$/);
});

test("same password produces different hashes (random salt)", async () => {
  const a = await hashPassword("CorrectHorse1");
  const b = await hashPassword("CorrectHorse1");
  assert.notEqual(a, b);
});

test("verifyPassword accepts the correct password", async () => {
  const hash = await hashPassword("CorrectHorse1");
  assert.equal(await verifyPassword("CorrectHorse1", hash), true);
});

test("verifyPassword rejects a wrong password", async () => {
  const hash = await hashPassword("CorrectHorse1");
  assert.equal(await verifyPassword("WrongHorse99", hash), false);
});

test("verifyPassword returns false for malformed or missing input", async () => {
  assert.equal(await verifyPassword("CorrectHorse1", "not-a-hash"), false);
  assert.equal(await verifyPassword("CorrectHorse1", undefined), false);
  assert.equal(await verifyPassword(undefined, "x"), false);
});

test("hashPassword rejects non-string, short and over-long passwords", async () => {
  await assert.rejects(() => hashPassword(12345678), TypeError);
  await assert.rejects(() => hashPassword("short"), RangeError);
  await assert.rejects(() => hashPassword("a".repeat(MAX_BYTES + 1)), RangeError);
});
