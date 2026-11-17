import express from "express";
import {
  getManager,
  createManager,
  updateManager,
  getManagerProperties,
} from "../controllers/managerControllers";

import { requireOwnProfile } from "../middleware/authMiddleware";

const router = express.Router();
router.use("/:cognitoId", requireOwnProfile);

router.get("/:cognitoId", getManager);
router.put("/:cognitoId", updateManager);
router.get("/:cognitoId/properties", getManagerProperties);
router.post("/", createManager);

export default router;
