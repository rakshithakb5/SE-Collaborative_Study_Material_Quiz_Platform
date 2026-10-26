
const express = require("express");
const {
  requireRole,
} = require("../middleware/rbac");

const crypto = require("node:crypto");
const { scanDocument } = require("../services/plagiarismService");

const router = express.Router();
const materials = new Map();

// status: "published" | "flagged" (similarity too high) |
//         "pending_review" (plagiarism service unavailable)
function latestContent(material) {
  return material.versions[material.versions.length - 1].content;
}

// Texts of the other live, published materials a new document is compared with.
function corpusExcluding(materialId) {
  return Array.from(materials.values())
    .filter((m) => m.id !== materialId && !m.removed && m.status === "published")
    .map((m) => ({ id: m.id, text: latestContent(m) }));
}

// Students may only see published material (CSQ-F-011).
function hiddenFrom(material, user) {
  return (
    !material ||
    material.removed ||
    (material.status !== "published" && user && user.role === "student")
  );
}

// Runs the scan and sets status/scan on the material.
async function screenMaterial(material, text) {
  const scan = await scanDocument(text, corpusExcluding(material.id));
  if (!scan.available) {
    material.status = "pending_review";
    material.scan = { status: "unavailable" };
  } else {
    material.status = scan.flagged ? "flagged" : "published";
    material.scan = {
      status: "completed",
      similarity: scan.similarity,
      matchedMaterialId: scan.matchedMaterialId,
    };
  }
  return material;
}

function resetMaterialData() {
  materials.clear();
}

function createMaterial(materialId, material) {
  materials.set(materialId, {
    id: materialId,
    title: material.title,
    status: "published",
    versions: [
      {
        version: 1,
        content: material.content,
        updatedAt: new Date().toISOString(),
      },
    ],
  });
}

// Upload new material: it is scanned before it can be published (CSQ-F-011).
router.post("/", requireRole("instructor", "admin"), async (req, res) => {
  const { title, content } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "Non-empty content is required" });
  }

  const id = crypto.randomUUID();
  createMaterial(id, { title: title.trim(), content });
  const material = materials.get(id);
  await screenMaterial(material, content);

  return res.status(201).json({
    materialId: id,
    status: material.status,
    scan: material.scan,
  });
});

// Create a new version: instructors and admins only
router.post(
  "/:materialId/versions",
  requireRole("instructor", "admin"),
  async (req, res) => {
    const { materialId } = req.params;
    const { content } = req.body;

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        error: "Non-empty content is required",
      });
    }

    const material = materials.get(materialId);

    if (!material || material.removed) {
      return res.status(404).json({ error: "Material not found" });
    }

    const version = {
      version: material.versions.length + 1,
      content,
      updatedAt: new Date().toISOString(),
    };

    material.versions.push(version);
    // A new version is scanned again so copied text cannot be slipped in later.
    await screenMaterial(material, content);

    return res.status(201).json({ materialId, version, status: material.status });
  }
);

// Read versions: students, instructors and admins
router.get(
  "/:materialId/versions",
  requireRole("student", "instructor", "admin"),
  (req, res) => {
    const material = materials.get(req.params.materialId);

    if (hiddenFrom(material, req.user)) {
      return res.status(404).json({ error: "Material not found" });
    }

    return res.status(200).json({
      materialId: material.id,
      title: material.title,
      versions: material.versions,
    });
  }
);

// Download a specific material version
router.get(
  "/:materialId/versions/:versionNumber/download",
  requireRole("student", "instructor", "admin"),
  (req, res) => {
    const material = materials.get(req.params.materialId);

    if (hiddenFrom(material, req.user)) {
      return res.status(404).json({ error: "Material not found" });
    }

    const versionNumber = Number(req.params.versionNumber);

    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      return res.status(400).json({ error: "Invalid version number" });
    }

    const version = material.versions.find(
      (item) => item.version === versionNumber
    );

    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="material-${material.id}-v${version.version}.txt"`
    );
    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    return res.status(200).send(version.content);
  }
);

// CSQ-F-062: admin content removal. The material is kept (so the audit trail
// still points at something) but is hidden from every read route.
function removeMaterial(materialId) {
  const material = materials.get(materialId);
  if (!material || material.removed) return null;
  material.removed = true;
  material.removedAt = new Date().toISOString();
  return material;
}

function getMaterial(materialId) {
  const material = materials.get(materialId);
  return material && !material.removed ? material : null;
}

// Items waiting for an admin decision (flagged, or scan unavailable).
function listForReview() {
  return Array.from(materials.values()).filter(
    (m) => !m.removed && m.status !== "published"
  );
}

module.exports = {
  router,
  createMaterial,
  getMaterial,
  listForReview,
  removeMaterial,
  resetMaterialData,
};
