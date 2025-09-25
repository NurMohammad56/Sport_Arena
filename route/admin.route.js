import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getAdminDashboardOverview,
  getFieldOwnersWithPlan,
} from "../controller/admin.controller.js";

const router = express.Router();

router.get("/field-owners", protect, getAdminDashboardOverview);
router.get("/field-owners-with-plan", protect, getFieldOwnersWithPlan);

export default router;
