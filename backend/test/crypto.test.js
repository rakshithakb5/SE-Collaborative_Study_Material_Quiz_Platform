const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  ALGORITHM,
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
} = require("../src/utils/crypto");

test("crypto: uses standard AES-256-GCM cipher", () => {
  assert.equal(ALGORITHM, "aes-256-gcm");
});

test("crypto: encrypts plaintext to hex ciphertext with unique IVs", () => {
  const secret = "SuperSecretAnswerKey";
  const enc1 = encrypt(secret);
  const enc2 = encrypt(secret);

  assert.equal(enc1.algorithm, "aes-256-gcm");
  assert.ok(enc1.ciphertext);
  assert.notEqual(enc1.ciphertext, secret);
  assert.notEqual(enc1.iv, enc2.iv, "Each encryption must use a randomized unique IV");
  assert.notEqual(enc1.ciphertext, enc2.ciphertext);
});

test("crypto: successfully decrypts ciphertext to original plaintext", () => {
  const original = "Software Requirements Specification (SRS)";
  const encrypted = encrypt(original);
  const decrypted = decrypt(encrypted);

  assert.equal(decrypted, original);
});

test("crypto: encrypts and decrypts structured objects with questions and answers", () => {
  const questions = [
    { id: "q1", prompt: "What is encryption?", correctAnswer: "Cryptographic protection" },
    { id: "q2", prompt: "Is AES secure?", correctAnswer: true },
  ];

  const payload = encryptObject(questions);
  assert.ok(payload.ciphertext);
  assert.ok(!JSON.stringify(payload).includes("Cryptographic protection"));

  const restored = decryptObject(payload);
  assert.deepEqual(restored, questions);
});

test("crypto: detects tampering with ciphertext or authTag", () => {
  const encrypted = encrypt("Confidential test data");

  // Tamper with ciphertext
  const tamperedCiphertext = {
    ...encrypted,
    ciphertext: encrypted.ciphertext.slice(0, -2) + "ff",
  };
  assert.throws(() => decrypt(tamperedCiphertext));

  // Tamper with authTag
  const tamperedTag = {
    ...encrypted,
    authTag: "00".repeat(16),
  };
  assert.throws(() => decrypt(tamperedTag));
});
