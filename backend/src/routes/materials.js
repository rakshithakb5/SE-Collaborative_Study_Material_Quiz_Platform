const express = require("express");
const crypto = require("node:crypto");
const { requireRole } = require("../middleware/rbac");
const { scanDocument } = require("../services/plagiarismService");
const { recordActivity } = require("../services/auditLog");
const { notifyNewMaterial } = require("../services/notifier");

const router = express.Router();
const materials = new Map();

function latestContent(material) {
  return material.versions[material.versions.length - 1].content;
}

function corpusExcluding(materialId) {
  return Array.from(materials.values())
    .filter(
      (m) =>
        m.id !== materialId &&
        !m.removed &&
        m.status === "published"
    )
    .map((m) => ({ id: m.id, text: latestContent(m) }));
}

function hiddenFrom(material, user) {
  return (
    !material ||
    material.removed ||
    (material.status !== "published" &&
      user &&
      user.role === "student")
  );
}

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
// List materials without exposing their full content.
router.get(
  "/",
  requireRole("student", "instructor", "admin"),
  (req, res) => {
    const result = Array.from(materials.values())
      .filter((material) => {
        if (material.removed) return false;

        if (
          material.status !== "published" &&
          req.user.role === "student"
        ) {
          return false;
        }

        return true;
      })
      .map((material) => {
        const latest = material.versions[material.versions.length - 1];

        return {
          id: material.id,
          title: material.title,
          latestVersion: latest.version,
          updatedAt: latest.updatedAt,
        };
      });

    return res.status(200).json({ materials: result });
  }
);

// Upload material: instructors and admins only.
router.post("/", requireRole("instructor", "admin"), async (req, res) => {
  const { id: requestedId, title, content } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "Non-empty content is required" });
  }

  if (
  requestedId !== undefined &&
  (typeof requestedId !== "string" || !requestedId.trim())
) {
  return res.status(400).json({ error: "Invalid material ID" });
}

const id = requestedId ? requestedId.trim() : crypto.randomUUID();

if (materials.has(id)) {
  return res.status(409).json({ error: "Material ID already exists" });
}

createMaterial(id, { title: title.trim(), content });

  const material = materials.get(id);
  await screenMaterial(material, content);
  if (material.status === "published") {
    notifyNewMaterial(material);
  }
  recordActivity(
    req.user,
    "material.upload",
    `material:${id}`,
    "Material uploaded"
  );

   return res.status(201).json({
    materialId: material.id,
    status: material.status,
    scan: material.scan,
    material: {
      id: material.id,
      title: material.title,
      status: material.status,
      latestVersion: material.versions.length,
      scan: material.scan,
    },
  });
});

// Create a new version: instructors and admins only.
router.post(
  "/:materialId/versions",
  requireRole("instructor", "admin"),
  async (req, res) => {
    const { materialId } = req.params;
    const { content } = req.body || {};

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
    await screenMaterial(material, content);

    return res.status(201).json({
      materialId,
      version,
      status: material.status,
    });
  }
);

// Read versions: students, instructors and admins.
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

// Download a specific material version.
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

// POST /api/materials/:id/flag - Report/flag material for admin moderation (CSQ-F-061)
router.post(
  "/:id/flag",
  requireRole("student", "instructor", "admin"),
  (req, res) => {
    const { id } = req.params;
    const material = materials.get(id);

    if (!material || material.removed) {
      return res.status(404).json({ error: "Material not found" });
    }

    const { reason } = req.body || {};
    if (typeof reason !== "string" || !reason.trim()) {
      return res
        .status(400)
        .json({ error: "A reason is required to flag content" });
    }

    if (!Array.isArray(material.userFlags)) {
      material.userFlags = [];
    }

    const flagEntry = {
      flagId: `flag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: req.user.id,
      userRole: req.user.role,
      reason: reason.trim(),
      flaggedAt: Date.now(),
    };

    material.userFlags.push(flagEntry);
    material.isUserFlagged = true;

    recordActivity(
      req.user,
      "content.flag",
      `material:${id}`,
      `Material flagged: ${reason.trim()}`
    );

    return res.status(200).json({
      message: "Content flagged for admin moderation review",
      flag: flagEntry,
    });
  }
);

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

function listForReview() {
  return Array.from(materials.values()).filter(
    (material) => !material.removed && material.status !== "published"
  );
}

function listUserFlaggedMaterials() {
  return Array.from(materials.values()).filter(
    (m) => !m.removed && Array.isArray(m.userFlags) && m.userFlags.length > 0
  );
}

function dismissMaterialFlag(materialId) {
  const material = materials.get(materialId);
  if (!material) return null;
  material.userFlags = [];
  material.isUserFlagged = false;
  return material;
}

module.exports = {
  router,
  createMaterial,
  getMaterial,
  listForReview,
  listUserFlaggedMaterials,
  dismissMaterialFlag,
  removeMaterial,
  resetMaterialData,
};
