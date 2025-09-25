import httpStatus from "http-status";
import Stripe from "stripe";
import { Plan } from "../model/plan.model.js";
import { paymentInfo } from "../model/paymentInfo.model.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { User } from "../model/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

export const PlanController = {
  // ============= Plan ===============
  getPlans: catchAsync(async (req, res) => {
    const plans = await Plan.find();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Plans retrieved successfully",
      data: plans,
    });
  }),

  createPlan: catchAsync(async (req, res) => {
    const { name, price, description, benefits, billingCycle } = req.body;

    if (!name || !price || !description || !benefits || !billingCycle) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "All required fields must be provided"
      );
    }

    let image = {};
    if (req.file) {
      const result = await uploadOnCloudinary(req.file.buffer);
      image = { public_id: result.public_id, url: result.secure_url };
    }

    const plan = await Plan.create({
      name,
      price,
      description,
      image,
      benefits,
      billingCycle,
    });
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Plan created successfully",
      data: plan,
    });
  }),

  getPlan: catchAsync(async (req, res) => {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      throw new AppError(httpStatus.NOT_FOUND, "Plan not found");
    }
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Plan retrieved successfully",
      data: plan,
    });
  }),

  updatePlan: catchAsync(async (req, res) => {
    const { name, price, description, benefits, billingCycle } = req.body;
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      throw new AppError(httpStatus.NOT_FOUND, "Plan not found");
    }

    if (name) plan.name = name;
    if (price) plan.price = price;
    if (description) plan.description = description;
    if (benefits) plan.benefits = benefits;
    if (billingCycle) plan.billingCycle = billingCycle;

    if (req.file) {
      const result = await uploadOnCloudinary(req.file.buffer);
      plan.image = { public_id: result.public_id, url: result.secure_url };
    }

    await plan.save();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Plan updated successfully",
      data: plan,
    });
  }),

  deletePlan: catchAsync(async (req, res) => {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) {
      throw new AppError(httpStatus.NOT_FOUND, "Plan not found");
    }
    sendResponse(res, {
      statusCode: httpStatus.NO_CONTENT,
      success: true,
      message: "Plan deleted successfully",
      data: null,
    });
  }),

  // ================= Subscription Payment =================
  createSubscriptionPayment: catchAsync(async (req, res) => {
    const { planId } = req.body;
    const userId = req.user._id; // field owner

    if (!planId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Plan ID is required");
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      throw new AppError(httpStatus.NOT_FOUND, "Plan not found");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(plan.price * 100),
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: userId.toString(),
        planId: planId.toString(),
      },
    });

    // Save subscription record as pending
    const subscriptionPayment = new paymentInfo({
      userId,
      planId,
      price: plan.price,
      transactionId: paymentIntent.id,
      paymentStatus: "pending",
      type: "order",
    });
    await subscriptionPayment.save();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription payment intent created",
      data: {
        transactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      },
    });
  }),

  confirmSubscriptionPayment: catchAsync(async (req, res) => {
    const { paymentIntentId, paymentMethodId } = req.body;
    const userId = req.user._id;

    if (!paymentIntentId || !paymentMethodId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Both paymentIntentId and paymentMethodId are required."
      );
    }

    try {
      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        { payment_method: paymentMethodId }
      );

      const subscriptionPayment = await paymentInfo.findOne({
        transactionId: paymentIntentId,
      });

      if (!subscriptionPayment) {
        throw new AppError(httpStatus.NOT_FOUND, "Payment record not found.");
      }

      if (paymentIntent.status === "succeeded") {
        subscriptionPayment.paymentStatus = "complete";
        subscriptionPayment.paymentMethod =
          paymentIntent.payment_method_types[0];
        await subscriptionPayment.save();

        if (paymentIntent.status === "succeeded") {
          const user = await User.findByIdAndUpdate(userId, {
            status: "paid",
          });

          if (!user) {
            throw new AppError(httpStatus.NOT_FOUND, "User not found.");
          }

          await user.save();
        }

        return sendResponse(res, {
          statusCode: httpStatus.OK,
          success: true,
          message: "Subscription payment successful",
          data: {
            transactionId: paymentIntentId,
            planId: subscriptionPayment.planId,
          },
        });
      } else {
        subscriptionPayment.paymentStatus = "failed";
        await subscriptionPayment.save();
        throw new AppError(httpStatus.BAD_REQUEST, "Payment failed.");
      }
    } catch (error) {
      console.error("Stripe confirm error:", error);
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
    }
  }),
};
