import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
  getProfileCompletion,
} from "../controller/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/profile", protect, getProfile);
router.get("/profile-completion", protect, getProfileCompletion);
router.patch(
  "/update-profile",
  protect,
  upload.single("avatar"),
  updateProfile
);
router.post("/change-password", protect, changePassword);

export default router;
