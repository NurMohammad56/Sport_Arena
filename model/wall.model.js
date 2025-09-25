import mongoose, { Schema, Document } from "mongoose";

const wallPostSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    content: { type: String },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        text: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const WallPost = mongoose.model("WallPost", wallPostSchema);
