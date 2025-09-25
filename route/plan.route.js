import express from "express";
import { PlanController } from "../controller/plan.controller.js";
import upload from "../middleware/multer.middleware.js";
const router = express.Router();

router.get("/", PlanController.getPlans);
router.post("/", upload.single("image"), PlanController.createPlan);
router.get("/:id", PlanController.getPlan);
router.patch("/:id", upload.single("image"), PlanController.updatePlan);
router.delete("/:id", PlanController.deletePlan);

export default router;
