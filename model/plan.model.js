import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  billingCycle: { type: String, enum: ["monthly", "yearly"], required: true },
  stripePriceId: { type: String },
  image: {
    public_id: { type: String },
    url: { type: String },
  },
  benefits: { type: [String], required: true },
});

export const Plan = mongoose.model("Plan", planSchema);
