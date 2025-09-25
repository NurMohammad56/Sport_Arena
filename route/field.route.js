import express from "express";
import {
  createField,
  getAllFields,
  getFieldById,
  updateField,
  deleteField,
  searchFields,
  getFieldsByOwner,
  removeFieldImage,
} from "../controllers/field.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllFields);
router.get("/search", searchFields);
router.get("/:id", getFieldById);

router.post("/", protect, upload.array("images", 5), createField);
router.get("/owner/my-fields", protect, getFieldsByOwner);
router.patch("/:id", protect, upload.array("images", 5), updateField);
router.delete("/:id", protect, deleteField);
router.delete("/:id/images/:imageId", protect, removeFieldImage);

export default router;
