import { Router } from "express";
import { createWallPost, getTeamPosts, addComment, getAllPost, getSinglePost, updatePost } from "../controller/wall.controller";

const router = Router();

router.post("/", createWallPost);
router.get("/:teamId", getTeamPosts);
router.get("/all-post", getAllPost);
router.get("/post/:id", getSinglePost);
router.patch("/post/:id", updatePost);
router.get("/:teamId", getTeamPosts);
router.post("/:postId/comment", addComment);

export default router;
