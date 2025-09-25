import { paymentInfo } from "../model/payment.model.js";
import { User } from "../model/user.model.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export const createPayment = catchAsync(async (req, res, next) => {
  const { bookingId, amount } = req.body;
  const userId = req.user._id;

  if (!userId || !bookingId || !amount) {
    return next(new AppError(400, "All fields are required"));
  }

  // Find booking by _id
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError(404, "Booking not found"));
  }

  // Find the owner for the booking
  const owner = await User.findById(booking.ownerId);
  if (!owner || !owner.stripeAccountId) {
    return next(
      new AppError(400, "Owner does not have a Stripe account set up")
    );
  }

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // cents
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    transfer_data: {
      destination: owner.stripeAccountId,
    },
    metadata: {
      userId: userId.toString(),
      bookingId: booking._id.toString(),
    },
  });

  // Save payment info in DB
  const paymentDetails = new paymentInfo({
    userId,
    bookingId: booking._id,
    amount,
    transactionId: paymentIntent.id,
    status: "pending",
  });
  await paymentDetails.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment intent created",
    data: {
      transactionId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    },
  });
});

export const confirmPayment = catchAsync(async (req, res, next) => {
  const { paymentIntentId, paymentMethodId } = req.body;

  if (!paymentIntentId || !paymentMethodId) {
    return next(
      new AppError(
        400,
        "Both paymentIntentId and paymentMethodId are required."
      )
    );
  }

  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    const paymentRecord = await paymentInfo.findOne({
      transactionId: paymentIntentId,
    });
    if (!paymentRecord) {
      return next(new AppError(404, "Payment record not found"));
    }

    const booking = await Booking.findById(paymentRecord.bookingId);
    if (!booking) {
      return next(new AppError(404, "Booking not found"));
    }

    if (paymentIntent.status === "succeeded") {
      paymentRecord.status = "success";
      await paymentRecord.save();

      booking.paymentStatus = "success";
      await booking.save();

      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Payment successful and booking confirmed",
        data: { transactionId: paymentIntentId, bookingId: booking._id },
      });
    } else {
      paymentRecord.status = "failed";
      await paymentRecord.save();
      return next(new AppError(400, "Payment failed"));
    }
  } catch (error) {
    console.error("Stripe confirm error:", error);
    return next(new AppError(500, error.message));
  }
});

export const onboardOwnerPayment = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  if (!userId) return next(new AppError(400, "User ID is required"));
  if (req.user.role !== "owner") {
    return next(new AppError(403, "Only owners can onboard for payments"));
  }

  const user = await User.findById(userId);
  if (user.stripeAccountId) {
    return next(new AppError(400, "Owner already has a Stripe account"));
  }

  const account = await stripe.accounts.create({
    type: "express",
    email: user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { userId: userId.toString() },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.APP_URL}/reauth`,
    return_url: `${process.env.APP_URL}/return`,
    type: "account_onboarding",
  });

  await User.findByIdAndUpdate(userId, { stripeAccountId: account.id });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Onboarding link created",
    data: { url: accountLink.url },
  });
});

export const getStripeDashboardLink = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: "User does not have a connected Stripe account",
      });
    }

    const loginLink = await stripe.accounts.createLoginLink(
      user.stripeAccountId
    );

    return res.status(200).json({
      success: true,
      url: loginLink.url,
    });
  } catch (error) {
    console.error("Error generating login link:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
