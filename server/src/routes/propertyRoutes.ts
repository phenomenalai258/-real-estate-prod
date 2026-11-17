import express from "express";
import {
  getProperties,
  getProperty,
  createProperty,
  getManagedProperty,
  updateProperty,
} from "../controllers/propertyControllers";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";

const storage = multer.memoryStorage();
const upload = multer({
  storage, limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 30, fieldSize: 20000 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Use fotografias JPEG, PNG ou WebP."));
  },
});

import { getLeases } from "../controllers/leaseControllers";

const router = express.Router();
router.get("/:id/manage", authMiddleware(["manager"]), getManagedProperty);
router.patch("/:id", authMiddleware(["manager"]), updateProperty);
router.get("/:propertyId/leases", authMiddleware(["manager", "tenant"]), getLeases);

router.get("/", getProperties);
router.get("/:id", getProperty);
router.post(
  "/",
  authMiddleware(["manager"]),
  upload.array("photos"),
  createProperty
);

export default router;
