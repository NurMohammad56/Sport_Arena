import AppError from "../errors/AppError";
import { WallPost } from "../model/wall.model";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";


export const createWallPost = catchAsync(async (req, res) => {
  const { teamId, content } = req.body;
  const userId = req.user._id;

//   if (!teamId || !content) throw new AppError(400, "TeamId and content are required");

  const post = await WallPost.create({ teamId, userId, content });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Post created successfully",
    data: post,
  });
});


export const getTeamPosts = catchAsync(async (req, res) => {
  const { teamId } = req.params;
  const posts = await WallPost.find({ teamId })
    .populate("userId", "name email avatar")
    .sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Posts retrieved",
    data: posts,
  });
});


export const addComment = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  if (!text) throw new AppError(400, "Comment text required");

  const post = await WallPost.findById(postId);
  if (!post) throw new AppError(404, "Post not found");

  post.comments.push({ userId, text, createdAt: new Date() });
  await post.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Comment added",
    data: post,
  });
});
