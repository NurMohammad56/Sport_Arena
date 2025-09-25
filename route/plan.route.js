import express from "express";
import { PlanController } from "../controller/plan.controller.js";
import upload from "../middleware/multer.middleware.js";
import { protect } from "./../middleware/auth.middleware.js";
const router = express.Router();

// Mounting the plan routes
router.get("/", PlanController.getPlans);
router.post("/", upload.single("image"), PlanController.createPlan);
router.get("/:id", PlanController.getPlan);
router.patch("/:id", upload.single("image"), PlanController.updatePlan);
router.delete("/:id", PlanController.deletePlan);

// Payment
router.post(
  "/create-subscription-payment",
  protect,
  PlanController.createSubscriptionPayment
);

router.post(
  "/confirm-subscription-payment",
  protect,
  PlanController.confirmSubscriptionPayment
);

export default router;
