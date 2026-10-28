// Demo data for the live demo and the sprint video. Only runs when the server
// is started with SEED_DEMO=true. It creates one account per role and some
// material, including one upload that the plagiarism check holds for review.
// NEVER enable this in a real deployment: the passwords below are public.

const { createUser, findByEmail } = require("../models/userStore");
const { hashPassword } = require("../utils/password");
const { createMaterial, getMaterial } = require("../routes/materials");
const { scanDocument } = require("./plagiarismService");

const DEMO_USERS = [
  { email: "admin@example.com", password: "Admin@12345", role: "admin" },
  { email: "instructor@example.com", password: "Instructor@123", role: "instructor" },
  { email: "student@example.com", password: "Student@1234", role: "student" },
  { email: "spammer@example.com", password: "Spammer@1234", role: "student" },
];

const DEMO_MATERIALS = [
  {
    id: "demo-bst",
    title: "Binary Search Trees Notes",
    content:
      "A binary search tree keeps smaller keys on the left and larger keys on the right so that lookups insertions and deletions stay fast on average",
  },
  {
    id: "demo-sorting",
    title: "Sorting Algorithms Summary",
    content:
      "Merge sort splits the list in half sorts each half and merges the results while quick sort partitions around a pivot and sorts the parts in place",
  },
  {
    // Copy of the first note, so the plagiarism check holds it for review.
    id: "demo-bst-copy",
    title: "My BST Notes",
    content:
      "A binary search tree keeps smaller keys on the left and larger keys on the right so that lookups insertions and deletions stay fast on average",
  },
];

async function seedDemoData() {
  for (const { email, password, role } of DEMO_USERS) {
    if (findByEmail(email)) continue;
    createUser({ email, passwordHash: await hashPassword(password), role });
  }

  const published = [];
  for (const { id, title, content } of DEMO_MATERIALS) {
    if (getMaterial(id)) continue;
    createMaterial(id, { title, content });
    const material = getMaterial(id);
    const scan = await scanDocument(content, published);
    material.status = scan.available && !scan.flagged ? "published" : scan.available ? "flagged" : "pending_review";
    material.scan = scan.available
      ? { status: "completed", similarity: scan.similarity, matchedMaterialId: scan.matchedMaterialId }
      : { status: "unavailable" };
    if (material.status === "published") published.push({ id, text: content });
  }
}

module.exports = { seedDemoData, DEMO_USERS };
