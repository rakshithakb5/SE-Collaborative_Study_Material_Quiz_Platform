const crypto = require("node:crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard IV length for GCM
const DEFAULT_SECRET = "collaborative-quiz-secret-key-32b!"; // 32 chars = 256 bits

function getKey() {
  const secret = process.env.ENCRYPTION_KEY || DEFAULT_SECRET;
  return crypto.createHash("sha256").update(String(secret)).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns an object containing ciphertext, iv, and authTag (in hex).
 */
function encrypt(text) {
  if (typeof text !== "string") {
    throw new TypeError("Plaintext must be a string");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(text, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    algorithm: ALGORITHM,
    ciphertext,
    iv: iv.toString("hex"),
    authTag,
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload back to plaintext.
 */
function decrypt(payload) {
  if (!payload || !payload.ciphertext || !payload.iv || !payload.authTag) {
    throw new Error("Invalid encrypted payload structure");
  }

  const key = getKey();
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(payload.ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

/**
 * Serialize and encrypt any JSON-serializable object.
 */
function encryptObject(obj) {
  const serialized = JSON.stringify(obj);
  return encrypt(serialized);
}

/**
 * Decrypt and deserialize an object encrypted with encryptObject.
 */
function decryptObject(payload) {
  const plaintext = decrypt(payload);
  return JSON.parse(plaintext);
}

module.exports = {
  ALGORITHM,
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
};
