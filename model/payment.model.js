import mongoose from "mongoose";

const paymentInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    planId: {
      type: mongoose.Types.ObjectId,
      ref: "Plan",
    },
    price: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["complete", "pending", "failed"],
      default: "pending",
    },
    seasonId: { type: String },
    transactionId: { type: String },
    paymentMethodNonce: { type: String },
    paymentMethod: { type: String },
    type: { type: String, enum: ["donation", "order"] },
  },
  {
    timestamps: true,
  }
);

export const paymentInfo = mongoose.model("paymentInfo", paymentInfoSchema);
