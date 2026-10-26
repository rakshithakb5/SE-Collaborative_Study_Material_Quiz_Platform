
const express = require("express");
const {
  requireRole,
} = require("../middleware/rbac");

const router = express.Router();
const materials = new Map();

function resetMaterialData() {
  materials.clear();
}

function createMaterial(materialId, material) {
  materials.set(materialId, {
    id: materialId,
    title: material.title,
    versions: [
      {
        version: 1,
        content: material.content,
        updatedAt: new Date().toISOString(),
      },
    ],
  });
}

// Create a new version: instructors and admins only
router.post(
  "/:materialId/versions",
  requireRole("instructor", "admin"),
  (req, res) => {
    const { materialId } = req.params;
    const { content } = req.body;

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        error: "Non-empty content is required",
      });
    }

    const material = materials.get(materialId);

    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    const version = {
      version: material.versions.length + 1,
      content,
      updatedAt: new Date().toISOString(),
    };

    material.versions.push(version);

    return res.status(201).json({ materialId, version });
  }
);

// Read versions: students, instructors and admins
router.get(
  "/:materialId/versions",
  requireRole("student", "instructor", "admin"),
  (req, res) => {
    const material = materials.get(req.params.materialId);

    if (!material) {
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

    if (!material) {
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

module.exports = {
  router,
  createMaterial,
  resetMaterialData,
};

module.exports = {
  router,
  createMaterial,
  resetMaterialData,
};
